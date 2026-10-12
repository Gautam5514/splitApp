// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    ignores: ['dist/*'],
  },
  {
    // Only warn/error are permitted for production crash reporting; the noisy
    // log/debug/info must go through the logger facade instead.
    files: ['app/**', 'components/**', 'context/**', 'hooks/**', 'widgets/**', 'lib/**'],
    rules: {
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['lib/logger.js', 'lib/__tests__/**'],
    rules: {
      'no-console': 'off',
    },
  },
]);
