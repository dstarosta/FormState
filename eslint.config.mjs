import js from '@eslint/js';
import globals from 'globals';
import eslintPluginUnicorn from 'eslint-plugin-unicorn';
import sonarjs from 'eslint-plugin-sonarjs';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';
import testingLibrary from 'eslint-plugin-testing-library';
import { defineConfig, globalIgnores } from 'eslint/config';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import formStatePlugin from './rules/recommended.js';

export default defineConfig([
  globalIgnores(['coverage', 'dist', 'node_modules']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.strictTypeChecked,
      eslintPluginUnicorn.configs.all,
      sonarjs.configs.recommended,
      react.configs.flat.recommended,
      react.configs.flat['jsx-runtime'],
      reactHooks.configs.flat.recommended,
      testingLibrary.configs['flat/dom'],
      eslintConfigPrettier,
      formStatePlugin.configs.recommended,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
      },
    },
    rules: {
      // Non-recommended JS rules that can catch problems
      'array-callback-return': 'error',
      'guard-for-in': 'error',
      'no-await-in-loop': 'error',
      'no-class-assign': 'error',
      'no-control-regex': 'error',
      'no-setter-return': 'error',
      'no-shadow': 'error',
      'no-template-curly-in-string': 'error',
      'no-unreachable-loop': 'error',
      'no-unsafe-finally': 'error',
      'no-unsafe-optional-chaining': 'error',
      'require-atomic-updates': 'error',
      'use-isnan': 'error',
      // TS rules
      '@typescript-eslint/no-dynamic-delete': 'off', // mutable state objects cannot be replaced with Maps due to Zod and strongly typed paths
      '@typescript-eslint/unified-signatures': 'off', // allow various overloads
      // Annoying Sonar rules
      'sonarjs/cognitive-complexity': 'off', // reducers and schema visitors are difficult to break up into _readable_ small functions
      'sonarjs/function-return-type': 'off', // different return types (ex: discriminated unions) are not an issue
      'sonarjs/no-nested-functions': 'off', // nested functions are very useful for closures in TS/JS
      'sonarjs/todo-tag': 'warn', // a TODO comment should not break the build; but it's a good idea to periodically remind you about it
      // Annoying Unicorn rules
      'unicorn/no-null': 'off', // Douglas Crockford is wrong. "null" should be used as a literal when assigned manually, not "undefined".
      'unicorn/no-array-sort': 'off', // This method is only available in ES2023.
      'unicorn/no-useless-undefined': ['error', { checkArguments: false }], // you cannot omit function arguments in strict TS (in tests)
      'unicorn/numeric-separators-style': 'off', // always forcing underscores in numeric constants makes no sense
      'unicorn/prefer-string-replace-all': 'off', // replace(/[set of numbers]/g) is way more terse for fallback GUID generation
      'unicorn/prevent-abbreviations': 'off', // "ref" and "args" abbreviations are commonly used
    },
  },
]);
