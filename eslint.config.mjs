import js from '@eslint/js';
import globals from 'globals';
import eslintPluginUnicorn from 'eslint-plugin-unicorn';
import formState from './eslint/index.js';
import sonarjs from 'eslint-plugin-sonarjs';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';
import testingLibrary from 'eslint-plugin-testing-library';
import reactYouMightNotNeedAnEffect from 'eslint-plugin-react-you-might-not-need-an-effect';
import { defineConfig, globalIgnores } from 'eslint/config';
import eslintConfigPrettier from 'eslint-config-prettier/flat';

export default defineConfig([
  globalIgnores(['coverage', 'dist', 'docs', 'node_modules']),
  js.configs.recommended,
  eslintPluginUnicorn.configs.all,
  sonarjs.configs.recommended,
  eslintConfigPrettier,
  {
    rules: {
      // Non-recommended JS rules that can catch problems
      'array-callback-return': 'error',
      'func-name-matching': 'error',
      'func-names': ['error', 'as-needed'],
      'guard-for-in': 'error',
      'id-denylist': ['error', 'cb', 'e', 'err'],
      'no-await-in-loop': 'error',
      'no-class-assign': 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-control-regex': 'error',
      'no-debugger': 'error',
      'no-duplicate-imports': 'error',
      'no-extend-native': 'error',
      'no-octal-escape': 'error',
      'no-proto': 'error',
      'no-sequences': 'error',
      'no-setter-return': 'error',
      'no-shadow': 'error',
      'no-template-curly-in-string': 'error',
      'no-unreachable-loop': 'error',
      'no-unsafe-finally': 'error',
      'no-unsafe-optional-chaining': 'error',
      'no-useless-call': 'error',
      'no-useless-concat': 'error',
      'nonblock-statement-body-position': ['error', 'below'],
      'require-atomic-updates': 'error',
      'symbol-description': 'error',
      'use-isnan': 'error',
      curly: ['error', 'multi-line'],
      radix: 'error',
      strict: ['error', 'never'],
      // Annoying Sonar rules
      'sonarjs/cognitive-complexity': 'off', // reducers and schema visitors are difficult to break up into _readable_ small functions
      'sonarjs/function-return-type': 'off', // different return types (ex: discriminated unions) are not an issue
      'sonarjs/no-nested-functions': 'off', // nested functions are very useful for closures in TS/JS
      'sonarjs/todo-tag': 'warn', // a "to do" comment should not break the build; but it's a good idea to periodically remind you about it
      // Annoying Unicorn rules
      'unicorn/no-keyword-prefix': 'off', // We need classNames for formClasses().
      'unicorn/no-null': 'off', // Douglas Crockford is wrong. "null" should be used as a literal when assigned manually, not "undefined".
      'unicorn/no-array-sort': 'off', // This method is only available in ES2023.
      'unicorn/no-useless-undefined': ['error', { checkArguments: false }], // you cannot omit function arguments in strict TS (in tests)
      'unicorn/numeric-separators-style': 'off', // always forcing underscores in numeric constants makes no sense
      'unicorn/prefer-string-replace-all': 'off', // replace(/[set of numbers]/g) is way more terse for fallback GUID generation
      'unicorn/prevent-abbreviations': 'off', // "ref" and "args" abbreviations are commonly used
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      tseslint.configs.strictTypeChecked,
      formState.configs.recommended,
      react.configs.flat.recommended,
      react.configs.flat['jsx-runtime'],
      reactHooks.configs.flat.recommended,
      reactYouMightNotNeedAnEffect.configs.recommended,
      testingLibrary.configs['flat/dom'],
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
      },
    },
    rules: {
      // TS rules
      '@typescript-eslint/no-dynamic-delete': 'off', // mutable state objects cannot be replaced with Maps due to Zod and strongly typed paths
      '@typescript-eslint/unified-signatures': 'off', // allow various overloads
      // You might not need a useEffect
      'react-you-might-not-need-an-effect/no-event-handler': 'off', // handlers cannot be moved to a parent component outside the library
    },
  },
]);
