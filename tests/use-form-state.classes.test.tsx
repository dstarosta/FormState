import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useFormState, type FormClassCallback } from '../src';
import { schema, type InitialSchema } from './fixtures';

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

describe('formClasses options', () => {
  const baseData: InitialSchema = {
    name: 'John',
    info: { age: 30 },
    tags: [],
  };

  const invalidData: InitialSchema = {
    name: '',
    info: { age: 30 },
    tags: [],
  };

  it('appends a static string of class names regardless of field state', () => {
    const { result } = renderHook(() => useFormState(schema, { initialData: baseData }));

    const classes = result.current.formClasses('name', { classNames: 'input input--lg' });

    expect(classes.split(' ')).toEqual(expect.arrayContaining(['input', 'input--lg']));
    expect(classes).not.toContain('form-state__error');
    expect(classes).not.toContain('form-state__touched');
  });

  it('accepts a static string as the shorthand second argument', () => {
    const { result } = renderHook(() => useFormState(schema, { initialData: baseData }));

    const classes = result.current.formClasses('name', 'input input--lg');

    expect(classes.split(' ')).toEqual(expect.arrayContaining(['input', 'input--lg']));
  });

  it('passes isTouched to the callback', () => {
    const { result } = renderHook(() => useFormState(schema, { initialData: baseData }));

    const before = result.current.formClasses('name', ({ isTouched }) =>
      isTouched ? 'is-touched' : null
    );
    expect(before).not.toContain('is-touched');
    expect(before).not.toContain('form-state__touched');

    act(() => {
      result.current.formActions.touch('name');
    });

    const after = result.current.formClasses('name', ({ isTouched }) =>
      isTouched ? 'is-touched' : null
    );
    expect(after).toContain('form-state__touched');
    expect(after).toContain('is-touched');
  });

  it('passes isError to the callback once the form has been validated', () => {
    const { result } = renderHook(() => useFormState(schema, { initialData: invalidData }));

    const beforeValidate = result.current.formClasses(
      'name',
      ({ isError }) => isError && 'is-invalid'
    );
    expect(beforeValidate).not.toContain('is-invalid');
    expect(beforeValidate).not.toContain('form-state__error');

    act(() => {
      result.current.formActions.validate();
    });

    const afterValidate = result.current.formClasses(
      'name',
      ({ isError }) => isError && 'is-invalid'
    );
    expect(afterValidate).toContain('form-state__error');
    expect(afterValidate).toContain('is-invalid');
  });

  it('supports an object (clsx-style) return from the callback', () => {
    const { result } = renderHook(() => useFormState(schema, { initialData: baseData }));

    // Make 'name' invalid without touching it.
    act(() => {
      result.current.formActions.change('name', '', { validate: true, touch: false });
    });

    const onlyInvalid = result.current.formClasses('name', ({ isError, isTouched }) => ({
      'is-invalid-touched': isError && isTouched,
    }));
    expect(onlyInvalid).toContain('form-state__error');
    expect(onlyInvalid).not.toContain('form-state__touched');
    expect(onlyInvalid).not.toContain('is-invalid-touched');

    act(() => {
      result.current.formActions.touch('name');
    });

    const both = result.current.formClasses('name', ({ isError, isTouched }) => ({
      'is-invalid-touched': isError && isTouched,
    }));
    expect(both).toContain('form-state__error');
    expect(both).toContain('form-state__touched');
    expect(both).toContain('is-invalid-touched');
  });

  it('omits class names whose object values are falsy', () => {
    const { result } = renderHook(() => useFormState(schema, { initialData: baseData }));

    act(() => {
      result.current.formActions.touch('name');
    });

    const classes = result.current.formClasses('name', ({ isError, isTouched }) => ({
      'is-touched': isTouched,
      'is-invalid-touched': isError && isTouched,
    }));

    expect(classes).toContain('form-state__touched');
    expect(classes).toContain('is-touched');
    expect(classes).not.toContain('form-state__error');
    expect(classes).not.toContain('is-invalid-touched');
  });

  it('ignores a truthy non-string, non-array, non-object value from the callback', () => {
    const { result } = renderHook(() => useFormState(schema, { initialData: baseData }));

    const baseline = result.current.formClasses('name');
    const classes = result.current.formClasses('name', (() => 42) as unknown as FormClassCallback);

    expect(classes).toBe(baseline);
  });

  it('supports an array (clsx-style) return from the callback', () => {
    const { result } = renderHook(() => useFormState(schema, { initialData: invalidData }));

    act(() => {
      result.current.formActions.validate();
      result.current.formActions.touch('name');
    });

    const classes = result.current.formClasses('name', ({ isError, isTouched }) => [
      'field',
      isTouched && 'field--touched',
      isError && 'field--error',
      isError && isTouched && 'field--error-touched',
    ]);

    const tokens = classes.split(' ');
    expect(tokens).toEqual(
      expect.arrayContaining([
        'form-state__required',
        'form-state__touched',
        'form-state__error',
        'field',
        'field--touched',
        'field--error',
        'field--error-touched',
      ])
    );
  });

  it('emits only mode-appropriate classes when the callback branches on mode (disabled)', () => {
    const { result } = renderHook(() =>
      useFormState(schema, { initialData: invalidData, initialMode: 'disabled' })
    );

    act(() => {
      result.current.formActions.touch('name');
    });

    const classes = result.current.formClasses('name', ({ mode, isError, isTouched }) => ({
      field: true,
      'field--disabled': mode === 'disabled',
      'field--readonly': mode === 'readOnly',
      'field--touched': mode === 'editable' && isTouched,
      'field--error': mode === 'editable' && isError,
    }));

    expect(classes).toContain('form-state__disabled');
    expect(classes).toContain('field');
    expect(classes).toContain('field--disabled');
    expect(classes).not.toContain('field--readonly');
    expect(classes).not.toContain('field--touched');
    expect(classes).not.toContain('field--error');
    expect(classes).not.toContain('form-state__touched');
    expect(classes).not.toContain('form-state__error');
  });

  it('emits only mode-appropriate classes when the callback branches on mode (readOnly)', () => {
    const { result } = renderHook(() =>
      useFormState(schema, { initialData: invalidData, initialMode: 'readOnly' })
    );

    act(() => {
      result.current.formActions.touch('name');
    });

    const classes = result.current.formClasses('name', ({ mode, isError, isTouched }) => [
      'field',
      mode === 'disabled' && 'field--disabled',
      mode === 'readOnly' && 'field--readonly',
      mode === 'editable' && isTouched && 'field--touched',
      mode === 'editable' && isError && 'field--error',
    ]);

    expect(classes).toContain('form-state__readonly');
    expect(classes).toContain('field');
    expect(classes).toContain('field--readonly');
    expect(classes).not.toContain('field--disabled');
    expect(classes).not.toContain('field--touched');
    expect(classes).not.toContain('field--error');
  });

  it('emits the prefix error class in readOnly mode and lets the callback gate readOnly-error classes', () => {
    const { result } = renderHook(() => useFormState(schema, { initialData: invalidData }));

    // Editable + invalid: must NOT include the readOnly classes.
    act(() => {
      result.current.formActions.validate();
    });

    const editableInvalid = result.current.formClasses('name', ({ mode, isError }) => ({
      'field--readonly': mode === 'readOnly',
      'field--readonly-error': mode === 'readOnly' && isError,
    }));
    expect(editableInvalid).toContain('form-state__error');
    expect(editableInvalid).not.toContain('field--readonly');
    expect(editableInvalid).not.toContain('field--readonly-error');

    // readOnly + valid: must NOT include the readOnly-error class.
    act(() => {
      result.current.formActions.change('name', 'John', { validate: true, touch: false });
      result.current.formActions.setMode('readOnly');
    });

    const readOnlyValid = result.current.formClasses('name', ({ mode, isError }) => ({
      'field--readonly': mode === 'readOnly',
      'field--readonly-error': mode === 'readOnly' && isError,
    }));
    expect(readOnlyValid).toContain('form-state__readonly');
    expect(readOnlyValid).toContain('field--readonly');
    expect(readOnlyValid).not.toContain('field--readonly-error');

    // readOnly + invalid: include the readOnly-error class.
    act(() => {
      result.current.formActions.change('name', '', { validate: true, touch: false });
    });

    const readOnlyInvalid = result.current.formClasses('name', ({ mode, isError }) => ({
      'field--readonly': mode === 'readOnly',
      'field--readonly-error': mode === 'readOnly' && isError,
    }));
    expect(readOnlyInvalid).toContain('form-state__readonly');
    expect(readOnlyInvalid).toContain('form-state__error');
    expect(readOnlyInvalid).toContain('field--readonly');
    expect(readOnlyInvalid).toContain('field--readonly-error');
  });

  it('does not emit prefix__error in disabled mode and lets the callback suppress error classes', () => {
    const { result } = renderHook(() =>
      useFormState(schema, { initialData: invalidData, initialMode: 'disabled' })
    );

    act(() => {
      result.current.formActions.validate();
    });

    const classes = result.current.formClasses('name', ({ mode, isError }) =>
      mode !== 'disabled' && isError ? 'field--error' : null
    );

    expect(classes).toContain('form-state__disabled');
    expect(classes).not.toContain('form-state__error');
    expect(classes).not.toContain('field--error');
  });

  it('lets the callback drop classes outside editable mode', () => {
    const { result } = renderHook(() => useFormState(schema, { initialData: baseData }));

    expect(
      result.current.formClasses('name', ({ mode }) => mode === 'editable' && 'field--editable')
    ).toContain('field--editable');

    act(() => {
      result.current.formActions.setMode('disabled');
    });

    const disabled = result.current.formClasses(
      'name',
      ({ mode }) => mode === 'editable' && 'field--editable'
    );
    expect(disabled).not.toContain('field--editable');
    expect(disabled).toContain('form-state__disabled');

    act(() => {
      result.current.formActions.setMode('readOnly');
    });

    const readOnly = result.current.formClasses(
      'name',
      ({ mode }) => mode === 'editable' && 'field--editable'
    );
    expect(readOnly).not.toContain('field--editable');
    expect(readOnly).toContain('form-state__readonly');
  });

  it('combines mode and field-state classes in a single callback', () => {
    const { result } = renderHook(() => useFormState(schema, { initialData: baseData }));

    act(() => {
      result.current.formActions.change('name', '', { validate: true, touch: false });
    });

    const errored = result.current.formClasses('name', ({ mode, isError, isTouched }) => ({
      'field--editable': mode === 'editable',
      'field--touched': isTouched,
      'field--error': isError,
      'field--error-touched': isError && isTouched,
    }));
    expect(errored).toContain('field--editable');
    expect(errored).toContain('field--error');
    expect(errored).not.toContain('field--error-touched');

    act(() => {
      result.current.formActions.touch('name');
    });

    const erroredTouched = result.current.formClasses('name', ({ mode, isError, isTouched }) => ({
      'field--editable': mode === 'editable',
      'field--touched': isTouched,
      'field--error': isError,
      'field--error-touched': isError && isTouched,
    }));
    const tokens = erroredTouched.split(' ');

    expect(tokens).toEqual(
      expect.arrayContaining([
        'field--editable',
        'field--touched',
        'field--error',
        'field--error-touched',
      ])
    );
  });

  it('switches mode classes as the form mode changes', () => {
    const { result } = renderHook(() => useFormState(schema, { initialData: baseData }));

    act(() => {
      result.current.formActions.setMode('readOnly');
    });

    const readOnly = result.current.formClasses('name', ({ mode }) => ({
      'field--disabled': mode === 'disabled',
      'field--readonly': mode === 'readOnly',
    }));
    expect(readOnly).toContain('field--readonly');
    expect(readOnly).not.toContain('field--disabled');

    act(() => {
      result.current.formActions.setMode('disabled');
    });

    const disabled = result.current.formClasses('name', ({ mode }) => ({
      'field--disabled': mode === 'disabled',
      'field--readonly': mode === 'readOnly',
    }));
    expect(disabled).toContain('field--disabled');
    expect(disabled).not.toContain('field--readonly');

    act(() => {
      result.current.formActions.setMode('editable');
    });

    const editable = result.current.formClasses('name', ({ mode }) => ({
      'field--disabled': mode === 'disabled',
      'field--readonly': mode === 'readOnly',
    }));
    expect(editable).not.toContain('field--disabled');
    expect(editable).not.toContain('field--readonly');
  });

  it('honors the custom prefix together with the callback class names', () => {
    const { result } = renderHook(() => useFormState(schema, { initialData: invalidData }));

    act(() => {
      result.current.formActions.validate();
      result.current.formActions.touch('name');
    });

    const classes = result.current.formClasses('name', {
      prefix: 'fld',
      classNames: ({ isError, isTouched }) => ['field', isError && isTouched && 'field--err-tch'],
    });

    const tokens = classes.split(' ');

    expect(tokens).toEqual(
      expect.arrayContaining(['fld__error', 'fld__touched', 'field', 'field--err-tch'])
    );
    expect(classes).not.toContain('form-state__error');
    expect(classes).not.toContain('form-state__touched');
  });

  it('ignores falsy and empty values from the callback', () => {
    const { result } = renderHook(() => useFormState(schema, { initialData: baseData }));

    act(() => {
      result.current.formActions.touch('name');
    });

    const baseline = result.current.formClasses('name');
    const withEmpty = result.current.formClasses('name', (() => [
      '',
      null,
      false,
      undefined,
    ]) as FormClassCallback);

    expect(withEmpty).toBe(baseline);
    expect(withEmpty).toContain('form-state__touched');
  });

  it('passes isRequired to the callback', () => {
    const { result } = renderHook(() => useFormState(schema, { initialData: baseData }));

    const classes = result.current.formClasses('name', ({ isRequired }) =>
      isRequired ? 'is-required' : 'is-optional'
    );

    expect(classes).toContain('form-state__required');
    expect(classes).toContain('is-required');
    expect(classes).not.toContain('is-optional');
  });
});
