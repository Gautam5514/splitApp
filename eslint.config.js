// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    // Jest globals (describe/test/expect/jest) for test files.
    files: ['**/__tests__/**', '**/*.test.{js,jsx,ts,tsx}'],
    languageOptions: {
      globals: {
        describe: 'readonly', test: 'readonly', it: 'readonly', expect: 'readonly',
        jest: 'readonly', beforeEach: 'readonly', afterEach: 'readonly',
        beforeAll: 'readonly', afterAll: 'readonly',
      },
    },
    rules: { 'react/display-name': 'off' },
  },
]);
