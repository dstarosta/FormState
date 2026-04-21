# form-state

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

| Peer dependency | Version |
|---|---|
| `react` | >= 19.2.0 |
| `react-dom` | >= 19.2.0 |
| `zod` | >= 4.3.0 < 5.0.0 |
| `fast-equals` | >= 6.0.0 |

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

**[Full Developer Guide →](docs/guide.html)**

The guide covers:

- Schema definition with ranges, descriptions, patterns, and metadata
- Path expressions (string vs arrow function)
- Form state, status, and validation
- Array fields
- Submission handling (sync, async, React 19 server actions)
- Manual / server-side errors
- Readonly and disabled modes
- CSS class helpers
- Context & Provider pattern
- SecureInput for password fields
- TypeScript types reference
- Debounced changes, state listeners, `useWatch`
- DevTools (`form-state-tools`)

## License

MIT © Dmitry Starosta
