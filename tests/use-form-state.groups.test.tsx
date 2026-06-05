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
      .formString(
        { required: true, error: 'Email is required' },
        z.regex(z.regexes.email, 'Invalid email format')
      )
      .with(z.describe('Your email address')),
    'contact-info'
  ),
  phone: z.group(z.formString(), 'contact-info'),
  company: z.group(
    z.object({
      name: z
        .formString({ required: true, error: 'Company name is required' })
        .with(z.describe('Legal company name')),
      founded: z.formNumber({ required: true }, z.minimum(1800), z.maximum(2100)),
    }),
    'contact-info'
  ),
  age: z.group(
    z
      .formNumber(
        { required: true, error: 'Age is required' },
        z.minimum(18, 'Age must be 18 or above'),
        z.maximum(120, 'Age must be 120 or below')
      )
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
      'company',
      'email',
      'phone',
    ]);
    expect(contact.data.email).toBe('');
    expect(contact.data.company.name).toBe('');

    expect(contact.errors.email).toBe('Email is required');
    expect('age' in contact.errors).toBe(false);
    expect('name' in contact.errors).toBe(false);

    expect(contact.validGroup).toBe(false);
    expect(contact.errors.get((path) => path.email)).toBe('Email is required');
    expect(contact.errors.get((path) => path.phone)).toBeUndefined();
    expect(contact.errors.get((path) => path.company.name)).toBe('Company name is required');
    expect(contact.errors.getManual('email')).toBe('Email is required');
    expect(contact.errors.getAll()).toContain('Email is required');
    expect(contact.errors.getKeys()).toContain('email');
    expect(contact.errors.getKeys()).toContain('company.name');

    expect(contact.required.email).toBe(true);
    expect(contact.required.get((path) => path.email)).toBe(true);
    expect(contact.required.get((path) => path.company.name)).toBe(true);
    expect(contact.required.getKeys()).toContain('email');

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

    expect(demographics.ranges.get((path) => path.age)).toMatchObject({ min: 18, max: 120 });
    expect(demographics.ranges.getMin((path) => path.age)).toBe(18);
    expect(demographics.ranges.getMax((path) => path.age)).toBe(120);
    expect(demographics.ranges.getMin('age')).toBe(18);
    expect(demographics.ranges.getMax('age')).toBe(120);
    expect(demographics.ranges.getKeys()).toStrictEqual(['age']);

    const contact = result.current.formState.getGroup('contact-info');

    expect(contact.ranges.get((path) => path.phone)).toBeUndefined();
    expect(() => contact.ranges.getMin((path) => path.phone)).toThrow(TypeError);
    expect(() => contact.ranges.getMax((path) => path.phone)).toThrow(TypeError);
  });

  it('filters touched, dirty, patterns and descriptions to the group', () => {
    const { result } = renderHook(() => useFormState(groupSchema));

    act(() => {
      result.current.formActions.change('email', 'user@example.com', { touch: true });
      result.current.formActions.touch((path) => path.company.name);
      result.current.formActions.setDirty('#contactReviewed');
    });

    const contact = result.current.formState.getGroup('contact-info');
    const demographics = result.current.formState.getGroup('demographics');

    expect(contact.touched.email).toBe(true);
    expect('email' in demographics.touched).toBe(false);
    expect('age' in contact.touched).toBe(false);

    expect(contact.touchedGroup).toBe(true);
    expect(contact.touched.get((path) => path.email)).toBe(true);
    expect(contact.touched.get((path) => path.phone)).toBe(false);
    expect(contact.touched.get((path) => path.company.name)).toBe(true);
    expect(contact.touched.getKeys()).toContain('email');

    expect(contact.dirty.email).toBe(true);
    expect('email' in demographics.dirty).toBe(false);
    expect('age' in contact.dirty).toBe(false);

    expect(contact.dirtyGroup).toBe(true);
    expect(contact.dirty.get('#contactReviewed')).toBe(false);
    expect(contact.dirty.get('#missing')).toBe(false);
    expect(contact.dirty.getKeys()).toContain('email');

    expect(contact.patterns.email).toBe(z.regexes.email.source);
    expect('age' in demographics.patterns).toBe(false);
    expect('email' in demographics.patterns).toBe(false);

    expect(contact.patterns.get((path) => path.email)).toBe(z.regexes.email.source);
    expect(contact.patterns.get((path) => path.phone)).toBeUndefined();
    expect(contact.patterns.getKeys()).toContain('email');

    expect(contact.descriptions.email).toBe('Your email address');
    expect('age' in contact.descriptions).toBe(false);
    expect(demographics.descriptions.age).toBe('Your age in years');
    expect('email' in demographics.descriptions).toBe(false);

    expect(contact.descriptions.get((path) => path.email)).toBe('Your email address');
    expect(contact.descriptions.get((path) => path.phone)).toBe('');
    expect(contact.descriptions.get((path) => path.company.name)).toBe('Legal company name');
    expect(demographics.descriptions.get((path) => path.age)).toBe('Your age in years');
    expect(demographics.descriptions.getKeys()).toContain('age');
  });

  it('resolves multiple groups independently from the same form', () => {
    const { result } = renderHook(() => useFormState(groupSchema, { validateOnMount: true }));

    const contact = result.current.formState.getGroup('contact-info');
    const demographics = result.current.formState.getGroup('demographics');

    expect(Object.keys(contact.data).sort((a, b) => a.localeCompare(b))).toStrictEqual([
      'company',
      'email',
      'phone',
    ]);
    expect(Object.keys(demographics.data)).toStrictEqual(['age']);

    expect('age' in contact.data).toBe(false);
    expect('company' in demographics.data).toBe(false);
    expect('email' in demographics.data).toBe(false);
    expect('phone' in demographics.data).toBe(false);

    expect('name' in contact.data).toBe(false);
    expect('name' in demographics.data).toBe(false);

    expect(contact.required.email).toBe(true);
    expect('age' in contact.required).toBe(false);
    expect(contact.ranges.get((path) => path.company.founded)).toMatchObject({
      min: 1800,
      max: 2100,
    });
    expect(contact.ranges.getMin((path) => path.company.founded)).toBe(1800);
    expect(contact.ranges.getMax((path) => path.company.founded)).toBe(2100);
    expect(demographics.ranges.age).toMatchObject({ min: 18, max: 120 });
    expect('email' in demographics.ranges).toBe(false);

    expect(contact.errors.email).toBe('Email is required');
    expect('age' in contact.errors).toBe(false);
    expect(demographics.errors.age).toBe('Age is required');
    expect('email' in demographics.errors).toBe(false);
  });

  it('reflects a field change in only the affected group', () => {
    const { result } = renderHook(() => useFormState(groupSchema, { validateOnMount: true }));

    act(() => {
      result.current.formActions.change('email', 'user@example.com');
    });

    const contact = result.current.formState.getGroup('contact-info');

    expect(contact.data.email).toBe('user@example.com');
    expect(contact.errors.email).toBeUndefined();

    act(() => {
      result.current.formActions.change('age', 17);
    });

    const demographics = result.current.formState.getGroup('demographics');

    expect(demographics.data.age).toBe(17);
    expect(demographics.errors.age).toBe('Age must be 18 or above');
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

  it('group validation states should reflect changes', () => {
    const { result } = renderHook(() =>
      useFormState(groupSchema, {
        initialData: {
          name: 'John Doe',
          age: 50,
          email: 'abc@internet.com',
          phone: '212-222-1111',
          company: {
            name: 'John D. Inc',
            founded: 2022,
          },
        },
        validateOnMount: true,
        validateOnChange: true,
      })
    );

    let contact = result.current.formState.getGroup('contact-info');

    expect(contact.errors.getAll().length).toBe(0);
    expect(contact.validGroup).toBe(true);

    act(() => {
      result.current.formActions.change('email', 'abc');
    });

    contact = result.current.formState.getGroup('contact-info');

    expect(contact.errors.getAll().length).toBe(1);
    expect(contact.errors.email).toBe('Invalid email format');
    expect(contact.validGroup).toBe(false);
  });

  it('excludes the root error from a group and ignores it for validGroup', () => {
    const rootErrorSchema = z
      .object({
        email: z.group(z.formString({ required: true }), 'contact-info'),
        phone: z.group(z.formString({ required: true }), 'contact-info'),
      })
      .check(z.validate((data) => data.email !== data.phone, 'Email and phone must differ'));

    const { result } = renderHook(() =>
      useFormState(rootErrorSchema, {
        initialData: { email: 'same', phone: 'same' },
        validateOnMount: true,
      })
    );

    const contact = result.current.formState.getGroup('contact-info');

    expect(result.current.formState.errors['']).toBe('Email and phone must differ');

    expect('' in contact.errors).toBe(false);
    expect(contact.errors.getAll()).toStrictEqual([]);
    expect(contact.validGroup).toBe(true);
  });

  it('narrows the returned keys to the requested group at the type level', () => {
    const { result } = renderHook(() =>
      useFormState(groupSchema, {
        initialData: {
          name: 'John Doe',
          age: 50,
          email: 'abc@internet.com',
          phone: '212-222-1111',
          company: {
            name: 'John D. Inc',
            founded: 2022,
          },
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
