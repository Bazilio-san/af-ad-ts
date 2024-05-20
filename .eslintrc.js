module.exports = {
  root: true,
  extends: [
    'eslint-config-af-24',
  ],
  env: {
    browser: true,
    commonjs: true,
    es2021: true,
    jest: true,
  },
  globals: {},
  parser: '@typescript-eslint/parser',
  parserOptions: { sourceType: 'module' },
  plugins: ['prefer-arrow', 'import', '@typescript-eslint'],
  ignorePatterns: [
    '_tmp/',
    'tmp/',
    'node_modules/',
    '**/*.json',
    '**/dist/**/*.*',
    'test/',
  ],
  rules: {
    'no-shadow': 'off',
    '@typescript-eslint/no-shadow': ['error'],
    '@typescript-eslint/no-unused-vars': 'warn',
  },
};
