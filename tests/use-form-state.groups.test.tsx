import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useFormState, z, type Group } from '../src';
import { useMemo } from 'react';

afterEach(() => {
  cleanup();
});

const groupSchema = z.object({
  email: z.group(
    z
      .formString({ required: true, error: 'Email is required' }, z.regex(z.regexes.email))
      .with(z.describe('Your email address')),
    'contact-info'
  ),
  phone: z.group(z.formString(), 'contact-info'),
  age: z.group(
    z
      .formNumber({ required: true }, z.minimum(18), z.maximum(120))
      .with(z.describe('Your age in years')),
    'demographics'
  ),
  name: z.formString({ required: true, error: 'Name is required' }),
});

const allSlices = [
  'data',
  'errors',
  'touched',
  'dirty',
  'required',
  'ranges',
  'patterns',
  'descriptions',
] as const;

describe('form state groups', () => {
  it('returns a bundle of every slice filtered to the group', () => {
    const { result } = renderHook(() => useFormState(groupSchema, { validateOnMount: true }));
    const contact = result.current.formState.getGroup('contact-info');

    expect(Object.keys(contact.data).sort((a, b) => a.localeCompare(b))).toStrictEqual([
      'email',
      'phone',
    ]);
    expect(contact.data.email).toBe('');

    expect(contact.errors.email).toBe('Email is required');
    expect('age' in contact.errors).toBe(false);
    expect('name' in contact.errors).toBe(false);

    expect(contact.required.email).toBe(true);

    for (const key of allSlices) {
      expect(contact[key]).toBeDefined();
    }
  });

  it('narrows ranges to the requesting group only', () => {
    const { result } = renderHook(() => useFormState(groupSchema));
    const demographics = result.current.formState.getGroup('demographics');

    expect(Object.keys(demographics.data)).toStrictEqual(['age']);
    expect(demographics.ranges.age).toMatchObject({ min: 18, max: 120 });
    expect('email' in demographics.ranges).toBe(false);
  });

  it('filters touched, dirty, patterns and descriptions to the group', () => {
    const { result } = renderHook(() => useFormState(groupSchema));

    act(() => {
      result.current.formActions.change('email', 'user@example.com', { touch: true });
    });

    const contact = result.current.formState.getGroup('contact-info');
    const demographics = result.current.formState.getGroup('demographics');

    expect(contact.touched.email).toBe(true);
    expect('email' in demographics.touched).toBe(false);
    expect('age' in contact.touched).toBe(false);

    expect(contact.dirty.email).toBe(true);
    expect('email' in demographics.dirty).toBe(false);
    expect('age' in contact.dirty).toBe(false);

    expect(contact.patterns.email).toBe(z.regexes.email.source);
    expect('age' in demographics.patterns).toBe(false);
    expect('email' in demographics.patterns).toBe(false);

    expect(contact.descriptions.email).toBe('Your email address');
    expect('age' in contact.descriptions).toBe(false);
    expect(demographics.descriptions.age).toBe('Your age in years');
    expect('email' in demographics.descriptions).toBe(false);
  });

  it('resolves multiple groups independently from the same form', () => {
    const { result } = renderHook(() => useFormState(groupSchema, { validateOnMount: true }));

    const contact = result.current.formState.getGroup('contact-info');
    const demographics = result.current.formState.getGroup('demographics');

    expect(Object.keys(contact.data).sort((a, b) => a.localeCompare(b))).toStrictEqual([
      'email',
      'phone',
    ]);
    expect(Object.keys(demographics.data)).toStrictEqual(['age']);

    expect('age' in contact.data).toBe(false);
    expect('email' in demographics.data).toBe(false);
    expect('phone' in demographics.data).toBe(false);

    expect('name' in contact.data).toBe(false);
    expect('name' in demographics.data).toBe(false);

    expect(contact.required.email).toBe(true);
    expect('age' in contact.required).toBe(false);
    expect(demographics.ranges.age).toMatchObject({ min: 18, max: 120 });
    expect('email' in demographics.ranges).toBe(false);

    expect(contact.errors.email).toBe('Email is required');
    expect('age' in contact.errors).toBe(false);
    expect(demographics.errors.age).toBe('Invalid input');
    expect('email' in demographics.errors).toBe(false);
  });

  it('reflects a field change in only the affected group', () => {
    const { result } = renderHook(() => useFormState(groupSchema, { validateOnMount: true }));

    act(() => {
      result.current.formActions.change('email', 'user@example.com');
    });

    const contact = result.current.formState.getGroup('contact-info');
    const demographics = result.current.formState.getGroup('demographics');

    expect(contact.data.email).toBe('user@example.com');
    expect(contact.errors.email).toBeUndefined();

    expect(demographics.data.age).toBe('');
    expect(demographics.errors.age).toBe('Invalid input');
  });

  it('rejects an unknown group at the type level', () => {
    const { result } = renderHook(() => useFormState(groupSchema));

    // @ts-expect-error -- 'nope' is not a declared group name.
    expect(() => result.current.formState.getGroup('nope')).toThrow();
  });

  it('produces an immutable bundle', () => {
    const { result } = renderHook(() => useFormState(groupSchema));
    const contact = result.current.formState.getGroup('contact-info');

    expect(Object.isFrozen(contact)).toBe(true);
  });

  it('narrows the returned keys to the requested group at the type level', () => {
    const { result } = renderHook(() =>
      useFormState(groupSchema, {
        initialData: {
          name: 'John Doe',
          age: 50,
          email: 'abc@internet.com',
          phone: '212-222-1111',
        },
      })
    );
    const contact = result.current.formState.getGroup('contact-info');

    expect(contact.data).toMatchObject({
      email: 'abc@internet.com',
      phone: '212-222-1111',
    });
  });

  it('accepts a getGroup result as a Group-typed prop', () => {
    const { result } = renderHook(() =>
      useFormState(groupSchema, {
        initialData: { email: 'abc@internet.com', phone: '212-222-1111' },
      })
    );
    const { formState } = result.current;

    const { result: contactResult } = renderHook(() =>
      useMemo(
        () =>
          ({ contactGroup }: { contactGroup: Group<typeof groupSchema, 'contact-info'> }) => {
            return `${contactGroup.data.email}|${contactGroup.data.phone}`;
          },
        []
      )
    );
    const contactInfo = contactResult.current({ contactGroup: formState.getGroup('contact-info') });

    expect(contactInfo).toBe('abc@internet.com|212-222-1111');
  });

  it('throws when a group is declared on a nested property', () => {
    const nestedSchema = z.object({
      info: z.object({
        // eslint-disable-next-line form-state/no-nested-group -- intentionally nested to test the runtime guard
        email: z.group(z.formString(), 'contact-info'),
      }),
    });

    expect(() => renderHook(() => useFormState(nestedSchema))).toThrow(
      'Groups are only allowed on root-level schema properties.'
    );
  });

  it('throws when a group is declared on an array element', () => {
    const arraySchema = z.object({
      // eslint-disable-next-line form-state/no-nested-group -- intentionally nested to test the runtime guard
      tags: z.formArray(z.group(z.formString(), 'contact-info')),
    });

    expect(() => renderHook(() => useFormState(arraySchema))).toThrow(
      'Groups are only allowed on root-level schema properties.'
    );
  });
});
