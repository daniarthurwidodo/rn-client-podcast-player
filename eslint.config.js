// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

// Layers depend downwards only: presentation -> business -> data. See documentation/tehnical-solution/three layer architecture.md.
const PRESENTATION_PATTERNS = ['**/presentation/**', '**/src/app/**'];
const BUSINESS_PATTERNS = ['**/business/**'];

const DEVICE_PACKAGES = ['react-native', 'react-native-*', 'expo-*', 'lucide-react-native', '@react-native-async-storage/*'];
// What presentation may not reach for itself; it uses `expo-router`, `expo-font`, `expo-status-bar`, `expo-splash-screen` and React Native.
const STORAGE_AND_DEVICE_PACKAGES = ['@react-native-async-storage/*', 'expo-audio', 'expo-clipboard', 'expo-notifications'];

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    files: ['src/data/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: [...BUSINESS_PATTERNS, ...PRESENTATION_PATTERNS], message: 'The data layer must not import from the business or presentation layer.' },
          ],
        },
      ],
    },
  },
  {
    files: ['src/business/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: PRESENTATION_PATTERNS, message: 'The business layer must not import from the presentation layer.' },
            { group: DEVICE_PACKAGES, message: 'The business layer reaches devices and storage through src/data, not directly.' },
          ],
        },
      ],
    },
  },
  {
    files: ['src/presentation/**/*.{ts,tsx}', 'src/app/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            // Types of stored data may be imported for rendering; values (repositories, adapters, native modules) may not.
            { group: ['**/data/**', '**/modules/**'], allowTypeImports: true, message: 'The presentation layer reaches data through the business layer; only types from data/models may be imported.' },
            { group: STORAGE_AND_DEVICE_PACKAGES, message: 'The presentation layer does not use storage or device packages directly; go through a business hook.' },
          ],
        },
      ],
    },
  },
]);
