import eslintConfigAt26 from 'eslint-config-at-26';
import globals from 'globals';

export default [
  ...eslintConfigAt26,
  {
    rules: {
      'import/extensions': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'prefer-arrow/prefer-arrow-functions': 'off',
    },
  },
  {
    files: ['**/*.test.ts', '**/*.spec.ts'],
    languageOptions: { globals: globals.jest },
  },
  // Уникальные ignores проекта (не входят в eslint-config-at-26)
  {
    ignores: [
      'tmp/',
      '**/*.json',
      'test/',
    ],
  },
];

