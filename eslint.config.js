import narwhal from 'eslint-config-narwhal';
import { defineConfig } from 'eslint/config';

export default defineConfig(
  { ignores: ['dist/**', 'src/css.ts'] },
  {
    files: ['src/**/*.ts'],
    extends: [
      ...narwhal({
        typechecked: true,
        strict: true,
        stylistic: true,
        prettier: true,
      }),
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Sonar prefers RegExp#exec; Unicorn prefers RegExp#test.
      'unicorn/prefer-regexp-test': 'off',
      'unicorn/name-replacements': [
        'error',
        { allowList: { Env: true, env: true } },
      ],
      'unicorn/consistent-boolean-name': [
        'error',
        { ignore: ['timingSafeEqual'] },
      ],
    },
  },
);
