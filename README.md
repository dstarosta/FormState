# FormState [![CI](https://github.com/dstarosta/FormState/actions/workflows/ci.yml/badge.svg)](https://github.com/dstarosta/FormState/actions/workflows/ci.yml) [![Coverage](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/dstarosta/b309a9068dbbfab248b77492d500bcac/raw/coverage.json)](https://github.com/dstarosta/FormState/actions/workflows/ci.yml)

A type-safe, schema-driven form management library for React 19, built on [Zod](https://zod.dev).

## Features

- **Schema-first** — define your form shape once with Zod, get full TypeScript inference everywhere
- **No render props** — fields are plain controlled inputs; no `<Field>`, `<Controller>`, or wrapper components
- **Zero boilerplate** — `formHandlers`, `formState`, and `formStatus` give you everything without manual wiring
- **Array fields** — dynamic add/remove with full type safety and per-item error tracking
- **Validation modes** — validate on blur, change, submit, or a custom combination
- **Async submission** — built-in `submitting` / `submitted` / `error` states with React 19 `action` support
- **Manual errors** — set server-side or cross-field errors directly into the form state
- **Readonly & disabled** — first-class mode switching without touching individual inputs
- **CSS class helpers** — `formClasses` maps state to class names for styling touched/invalid fields
- **Path expressions** — string keys or arrow functions `(p) => p.address.city`, both fully type-checked
- **DevTools** — optional `form-state-tools` companion package with an in-page inspector panel

## Requirements

| Peer dependency | Version          |
| --------------- | ---------------- |
| `react`         | >= 19.2.0        |
| `react-dom`     | >= 19.2.0        |
| `zod`           | >= 4.3.0 < 5.0.0 |

| Toolchain    | Version   |
| ------------ | --------- |
| `typescript` | >= 5.9.0  |

## Installation

```sh
npm install form-state
```

Zod is a peer dependency — install it alongside:

```sh
npm install zod
```

## Quick start

```tsx
import * as z from 'zod/mini';
import { useFormState } from 'form-state';

const schema = z.object({
  email: z.formString(),
  password: z.formString(),
});

function LoginForm() {
  const { Form, formHandlers, formState, formStatus } = useFormState(schema, {
    onSubmit: async (data) => {
      await api.login(data);
    },
  });

  return (
    <Form>
      <input type="email" {...formHandlers('email')} />
      {formStatus.errors?.email && <p>{formStatus.errors.email}</p>}

      <input type="password" {...formHandlers('password')} />
      {formStatus.errors?.password && <p>{formStatus.errors.password}</p>}

      <button type="submit" disabled={formStatus.submitting}>
        {formStatus.submitting ? 'Logging in…' : 'Log in'}
      </button>
    </Form>
  );
}
```

## Documentation

**[Full Developer Guide →](https://dstarosta.github.io/FormState/)**

**Getting Started** — [Overview](https://dstarosta.github.io/FormState/#overview) · [Installation](https://dstarosta.github.io/FormState/#installation) · [ESLint](https://dstarosta.github.io/FormState/#eslint) · [Philosophy](https://dstarosta.github.io/FormState/#philosophy) · [TypeScript](https://dstarosta.github.io/FormState/#typescript)

**Core Concepts** — [Defining a Schema](https://dstarosta.github.io/FormState/#schema) · [Schema Methods](https://dstarosta.github.io/FormState/#schema-methods) · [Basic Usage](https://dstarosta.github.io/FormState/#basic-usage) · [Path Expressions](https://dstarosta.github.io/FormState/#path-expressions) · [Form State](https://dstarosta.github.io/FormState/#form-state) · [Form Status](https://dstarosta.github.io/FormState/#form-status) · [Schema Metadata](https://dstarosta.github.io/FormState/#ranges-descriptions)

**Features** — [Array Fields](https://dstarosta.github.io/FormState/#arrays) · [Validation](https://dstarosta.github.io/FormState/#validation) · [Form Submission](https://dstarosta.github.io/FormState/#submission) · [Manual Errors](https://dstarosta.github.io/FormState/#manual-errors) · [Readonly & Disabled](https://dstarosta.github.io/FormState/#readonly-disabled) · [CSS Classes](https://dstarosta.github.io/FormState/#css-classes) · [Context & Provider](https://dstarosta.github.io/FormState/#context) · [Input Controls](https://dstarosta.github.io/FormState/#input-controls)

**Advanced** — [Selectors](https://dstarosta.github.io/FormState/#selectors) · [Debounced Changes](https://dstarosta.github.io/FormState/#debounce) · [State Listener](https://dstarosta.github.io/FormState/#listener) · [useWatch](https://dstarosta.github.io/FormState/#watch) · [inferName](https://dstarosta.github.io/FormState/#infer-name) · [Value Helpers](https://dstarosta.github.io/FormState/#helpers) · [Next.js](https://dstarosta.github.io/FormState/#nextjs) · [React Router 7](https://dstarosta.github.io/FormState/#remix) · [TanStack Query](https://dstarosta.github.io/FormState/#tanstack-query) · [DevTools](https://dstarosta.github.io/FormState/#devtools)

**Reference** — [Form Library Comparison](https://dstarosta.github.io/FormState/#comparison)

## License

MIT © Dmitry Starosta
