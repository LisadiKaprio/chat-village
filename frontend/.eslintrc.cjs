/* eslint-env node */
require('@rushstack/eslint-patch/modern-module-resolution')

module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es2021: true,
    node: true,
  },
  root: true,
  overrides: [],
  plugins: ['@typescript-eslint'],
  parserOptions: {
    ecmaVersion: 'latest',
    parser: {
      ts: '@typescript-eslint/parser',
    },
  },
  rules: {
    semi: ['error', 'never'],
    quotes: [
      'error',
      'single',
      {
        avoidEscape: true,
        allowTemplateLiterals: true,
      },
    ],
    'comma-dangle': ['error', 'always-multiline'],
    '@typescript-eslint/no-inferrable-types': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-var-requires': 'off',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '(^log$|^_)',
        caughtErrorsIgnorePattern: '^_',
      },
    ],
  },
  'extends': [
    'plugin:vue/vue3-essential',
    'eslint:recommended',
    '@vue/eslint-config-typescript',
  ],
}
