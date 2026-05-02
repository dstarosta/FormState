import { describe, it } from 'vitest';
import { RuleTester } from 'eslint';
import { avoidInputPassword } from './avoid-input-password.js';

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('avoid-input-password', avoidInputPassword, {
  valid: [
    // No form ancestor
    { code: '<input type="password" />' },
    { code: '<div><input type="password" /></div>' },

    // Form with no action/onSubmit handler (string or absent)
    { code: '<form><input type="password" /></form>' },
    { code: '<form action="/submit"><input type="password" /></form>' },
    { code: '<form method="post"><input type="password" /></form>' },

    // Form with handler but input is not type="password"
    { code: '<form onSubmit={fn}><input type="text" /></form>' },
    { code: '<form onSubmit={fn}><input type="checkbox" /></form>' },
    { code: '<form action={fn}><input /></form>' },

    // Nearest form has no handler even if outer does
    { code: '<form action={fn}><form><input type="password" /></form></form>' },

    // type={"password"} but form has no handler
    { code: '<form><input type={"password"} /></form>' },
  ],
  invalid: [
    // onSubmit handler
    {
      code: '<form onSubmit={fn}><input type="password" /></form>',
      errors: [{ messageId: 'useSecureInput' }],
    },
    // action as function
    {
      code: '<form action={fn}><input type="password" /></form>',
      errors: [{ messageId: 'useSecureInput' }],
    },
    // Inline onSubmit handler
    {
      code: '<form onSubmit={() => {}}><input type="password" /></form>',
      errors: [{ messageId: 'useSecureInput' }],
    },
    // Nested inside other elements
    {
      code: '<form onSubmit={fn}><div><input type="password" /></div></form>',
      errors: [{ messageId: 'useSecureInput' }],
    },
    {
      code: '<form action={fn}><fieldset><div><input type="password" /></div></fieldset></form>',
      errors: [{ messageId: 'useSecureInput' }],
    },
    // Additional attributes on the input
    {
      code: '<form action={fn}><input type="password" name="csrf" value="token" /></form>',
      errors: [{ messageId: 'useSecureInput' }],
    },
    // Both action and onSubmit
    {
      code: '<form action={fn} onSubmit={handleSubmit}><input type="password" /></form>',
      errors: [{ messageId: 'useSecureInput' }],
    },
    // type={"password"} — JSXExpressionContainer with string literal
    {
      code: '<form onSubmit={fn}><input type={"password"} /></form>',
      errors: [{ messageId: 'useSecureInput' }],
    },
    // Multiple password inputs — each reported separately
    {
      code: '<form onSubmit={fn}><input type="password" /><input type="password" /></form>',
      errors: [{ messageId: 'useSecureInput' }, { messageId: 'useSecureInput' }],
    },
  ],
});
