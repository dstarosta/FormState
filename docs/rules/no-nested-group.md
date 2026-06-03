# no-nested-group

Disallows `z.group()` on nested schema properties. Groups are only allowed on root-level schema properties.

**Severity:** error  
**Fixable:** no — the correct fix is to move the group to a root-level property, which is a structural change.

## Why

`z.group(schema, name)` tags a root-level schema property so it can be retrieved together with the other properties of the same group via `formState.getGroup(name)`. Groups are a flat, root-level concept: `getGroup` returns a bundle of root-level fields. Placing a group on a nested property (an object field, an array element, or any deeper field) has no meaning and throws a `TypeError` when the form is initialized.

This rule surfaces the mistake in the editor instead of at runtime.

## Rule Details

The rule fires when a `z.group(...)` call is enclosed by more than one schema container (`z.object`, `z.strictObject`, or `z.array`). The single legal placement is as the value of a property in the outermost object schema — exactly one enclosing container.

Wrapping modifiers such as `z.catch(...)`, `z.default(...)`, or a chained `.with(...)` / `.catch(...)` around a root-level group are fine: they are not schema containers and do not change the group's placement.

### ❌ Incorrect

```jsx
import { z } from 'form-state';

// Group on a nested object field.
const schema = z.object({
  info: z.object({
    email: z.group(z.formString(), 'contact-info'),
  }),
});

// Group on an array element.
const schema2 = z.object({
  tags: z.array(z.group(z.formString(), 'contact-info')),
});
```

### ✅ Correct

```jsx
import { z } from 'form-state';

const schema = z.object({
  email: z.group(z.formString({ required: true }), 'contact-info'),
  phone: z.group(z.formString(), 'contact-info'),
  age: z.group(z.formNumber(), 'demographics'),
  name: z.formString(),
});
```

Modifiers around a root-level group are allowed:

```jsx
const schema = z.object({
  email: z.catch(z.group(z.formString(), 'contact-info'), ''),
  phone: z.group(z.formString(), 'contact-info').with(z.describe('Phone')),
});
```

## Options

This rule has no options.
