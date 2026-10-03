import eslint from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import sonarjs from 'eslint-plugin-sonarjs';
import unicorn from 'eslint-plugin-unicorn';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'src/css.ts'] },
  {
    files: ['src/**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      unicorn.configs.recommended,
      // After Unicorn so a shared rule id would keep the SonarJS setting.
      sonarjs.configs.recommended,
      // Last: turn off stylistic rules that conflict with Prettier.
      eslintConfigPrettier,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // `strict` already sets `noImplicitAny`. These reject explicit `any`
      // and any value that flows through as `any`.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-unsafe-unary-minus': 'error',
      // `String#match()`: SonarJS wants `RegExp#exec()`; Unicorn wants `RegExp#test()`.
      'unicorn/prefer-regexp-test': 'off',
      // Unicorn suggests `switch` from 3 cases up. SonarJS rejects smaller switches.
      'unicorn/prefer-switch': ['error', { minimumCases: 3 }],
      'unicorn/name-replacements': [
        'error',
        {
          allowList: {
            Env: true,
            env: true,
          },
        },
      ],
      'unicorn/consistent-boolean-name': [
        'error',
        { ignore: ['timingSafeEqual'] },
      ],
    },
  },
);
