// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

// Layers depend downwards only: presentation -> business -> data. See documentation/tehnical-solution/three layer architecture.md.
const UPPER_LAYER_PATTERNS = [
  '**/lib/**',
  '**/stores/**',
  '**/hooks/**',
  '**/components/**',
  '**/app/**',
  '**/business/**',
  '**/presentation/**',
];

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
        { patterns: [{ group: UPPER_LAYER_PATTERNS, message: 'The data layer must not import from the business or presentation layer.' }] },
      ],
    },
  },
]);
