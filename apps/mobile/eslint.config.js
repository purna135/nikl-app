// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // .expo/ holds files Expo generates (typed routes), not our code.
    ignores: ['dist/*', '.expo/*'],
  },
]);
