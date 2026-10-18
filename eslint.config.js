// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

// Layers depend downwards only: presentation -> business -> data. See documentation/tehnical-solution/three layer architecture.md.
// `lib/`, `components/` and `app/` still hold presentation code until the presentation phase moves it under src/presentation.
const PRESENTATION_PATTERNS = ['**/lib/**', '**/components/**', '**/app/**', '**/presentation/**'];
const BUSINESS_PATTERNS = ['**/business/**'];

const DEVICE_PACKAGES = ['react-native', 'react-native-*', 'expo-*', 'lucide-react-native', '@react-native-async-storage/*'];

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
]);
