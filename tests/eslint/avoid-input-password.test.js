import { describe, it } from 'vitest';
import { RuleTester } from 'eslint';
import { avoidInputPassword } from '../../eslint/rules/avoid-input-password.js';

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
    // onSubmit handler — adds new import
    {
      code: '<form onSubmit={fn}><input type="password" /></form>',
      errors: [{ messageId: 'useSecureInput' }],
      output:
        "import { SecureInput } from 'form-state';\n<form onSubmit={fn}><SecureInput /></form>",
    },
    // action as function — adds new import
    {
      code: '<form action={fn}><input type="password" /></form>',
      errors: [{ messageId: 'useSecureInput' }],
      output: "import { SecureInput } from 'form-state';\n<form action={fn}><SecureInput /></form>",
    },
    // Inline onSubmit handler
    {
      code: '<form onSubmit={() => {}}><input type="password" /></form>',
      errors: [{ messageId: 'useSecureInput' }],
      output:
        "import { SecureInput } from 'form-state';\n<form onSubmit={() => {}}><SecureInput /></form>",
    },
    // Nested inside other elements
    {
      code: '<form onSubmit={fn}><div><input type="password" /></div></form>',
      errors: [{ messageId: 'useSecureInput' }],
      output:
        "import { SecureInput } from 'form-state';\n<form onSubmit={fn}><div><SecureInput /></div></form>",
    },
    {
      code: '<form action={fn}><fieldset><div><input type="password" /></div></fieldset></form>',
      errors: [{ messageId: 'useSecureInput' }],
      output:
        "import { SecureInput } from 'form-state';\n<form action={fn}><fieldset><div><SecureInput /></div></fieldset></form>",
    },
    // Additional attributes on the input — type removed, others preserved
    {
      code: '<form action={fn}><input type="password" name="csrf" value="token" /></form>',
      errors: [{ messageId: 'useSecureInput' }],
      output:
        'import { SecureInput } from \'form-state\';\n<form action={fn}><SecureInput name="csrf" value="token" /></form>',
    },
    // Both action and onSubmit
    {
      code: '<form action={fn} onSubmit={handleSubmit}><input type="password" /></form>',
      errors: [{ messageId: 'useSecureInput' }],
      output:
        "import { SecureInput } from 'form-state';\n<form action={fn} onSubmit={handleSubmit}><SecureInput /></form>",
    },
    // type={"password"} — JSXExpressionContainer with string literal
    {
      code: '<form onSubmit={fn}><input type={"password"} /></form>',
      errors: [{ messageId: 'useSecureInput' }],
      output:
        "import { SecureInput } from 'form-state';\n<form onSubmit={fn}><SecureInput /></form>",
    },
    // Multiple password inputs — each reported separately (import added on first fix pass)
    {
      code: '<form onSubmit={fn}><input type="password" /><input type="password" /></form>',
      errors: [{ messageId: 'useSecureInput' }, { messageId: 'useSecureInput' }],
      output:
        'import { SecureInput } from \'form-state\';\n<form onSubmit={fn}><SecureInput /><input type="password" /></form>',
    },
    // Existing import from 'form-state' without SecureInput — appends to specifiers
    {
      code: 'import { useForm } from \'form-state\';\n<form onSubmit={fn}><input type="password" /></form>',
      errors: [{ messageId: 'useSecureInput' }],
      output:
        "import { useForm, SecureInput } from 'form-state';\n<form onSubmit={fn}><SecureInput /></form>",
    },
    // Existing import from 'form-state' already includes SecureInput — no import change
    {
      code: 'import { SecureInput } from \'form-state\';\n<form onSubmit={fn}><input type="password" /></form>',
      errors: [{ messageId: 'useSecureInput' }],
      output:
        "import { SecureInput } from 'form-state';\n<form onSubmit={fn}><SecureInput /></form>",
    },
    // Other imports present — new import added after last import
    {
      code: 'import React from \'react\';\n<form onSubmit={fn}><input type="password" /></form>',
      errors: [{ messageId: 'useSecureInput' }],
      output:
        "import React from 'react';\nimport { SecureInput } from 'form-state';\n<form onSubmit={fn}><SecureInput /></form>",
    },
    // Bare side-effect import from 'form-state' (no specifiers) — replaced with named import
    {
      code: 'import {} from \'form-state\';\n<form onSubmit={fn}><input type="password" /></form>',
      errors: [{ messageId: 'useSecureInput' }],
      output:
        "import { SecureInput } from 'form-state';\n<form onSubmit={fn}><SecureInput /></form>",
    },
    // Non-self-closing input (unusual but valid JSX) — both opening and closing tags renamed
    {
      code: '<form onSubmit={fn}><input type="password"></input></form>',
      errors: [{ messageId: 'useSecureInput' }],
      output:
        "import { SecureInput } from 'form-state';\n<form onSubmit={fn}><SecureInput></SecureInput></form>",
    },
  ],
});
