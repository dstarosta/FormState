import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useFormState, formatDate } from '../src';
import { schema, type InitialSchema } from './fixtures';

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

describe('state and status tests', () => {
  it('should initialize with default values', () => {
    const { result } = renderHook(() => useFormState(schema, { validateOnMount: true }));
    const { formState, formStatus } = result.current;

    const expectedData: typeof formState.data = {
      name: '',
      info: {
        uuid: formState.data.info.uuid,
        birthDate: '',
        email: '',
        age: '',
      },
      tags: [],
      category: '',
      isActive: true,
      isArchived: false,
      version: 0,
      registeredOn: '',
      updateDates: [],
      specialNumber: Math.PI,
      password: '',
    };

    expect(formState.data).toStrictEqual(expectedData);
    expect(formState.errors.name).toBe('Name is required');
    expect(formState.errors.get((path) => path.info.age)).toBe('Age is required');
    expect(formStatus.valid).toBe(false);
    expect(formStatus.dirty).toBe(false);
    expect(formStatus.touched).toBe(false);
  });

  it('should accept initial state', () => {
    const initialData: InitialSchema = {
      name: 'John',
      info: {
        age: 30,
      },
      tags: ['a', 'b'],
    };
    const { result } = renderHook(() => useFormState(schema, { initialData }));
    const { formState } = result.current;

    expect(formState.data.name).toBe('John');
    expect(formState.touched.name).toBe(false);
    expect(formState.data.info.age).toBe(30);
    expect(formState.touched.get((path) => path.info.age)).toBe(false);
    expect(formState.data.tags).toStrictEqual(['a', 'b']);
    expect(formState.touched.tags).toBe(false);
  });

  it('should accept initial touched fields', () => {
    const { result } = renderHook(() =>
      useFormState(schema, { initialTouched: ['name', (path) => path.info.age] })
    );
    const { formState } = result.current;

    expect(formState.data.name).toBe('');
    expect(formState.touched.name).toBe(true);
    expect(formState.data.info.age).toBe('');
    expect(formState.touched.get((path) => path.info.age)).toBe(true);
    expect(formState.data.tags).toStrictEqual([]);
    expect(formState.touched.tags).toBe(false);
  });

  it('should accept initial state and initial touched fields', () => {
    const initialData: InitialSchema = {
      name: 'John',
      info: {
        age: 30,
      },
      tags: ['a', 'b'],
    };
    const { result } = renderHook(() =>
      useFormState(schema, { initialData, initialTouched: ['name', (path) => path.info.age] })
    );
    const { formState } = result.current;

    expect(formState.data.name).toBe('John');
    expect(formState.touched.name).toBe(true);
    expect(formState.data.info.age).toBe(30);
    expect(formState.touched.get((path) => path.info.age)).toBe(true);
    expect(formState.data.tags).toStrictEqual(['a', 'b']);
    expect(formState.touched.tags).toBe(false);
  });

  it('should NOT validate on init by default', () => {
    const { result } = renderHook(() => useFormState(schema));
    const { formState, formStatus } = result.current;

    expect(formState.errors).not.toHaveProperty('name');
    expect(formState.errors).not.toHaveProperty('age');
    expect(formStatus.valid).toBeNull();
  });

  it('should validate on init when validateOnMount is true', () => {
    const { result } = renderHook(() => useFormState(schema, { validateOnMount: true }));
    const { formState, formStatus } = result.current;

    expect(formState.errors.name).toBe('Name is required');
    expect(formState.errors.get((path) => path.info.age)).toBe('Age is required');
    expect(formStatus.valid).toBe(false);
  });

  it('should not produce errors on initial state change when validateOnMount is false', () => {
    const initialData: InitialSchema = {
      name: '',
      info: { age: 30 },
    };
    const { result } = renderHook(() => useFormState(schema, { initialData }));

    const { formState, formStatus } = result.current;

    expect(formStatus.valid).toBeNull();
    expect(formState.errors).not.toHaveProperty('name');
    expect(formState.errors).not.toHaveProperty('age');
  });

  it('should produce errors on initial state change when validateOnMount is true', () => {
    const initialData: InitialSchema = {
      name: 'Jonathan@somelongnamevalue...', // too long, contains invalid characters
      info: { age: 0 },
    };
    const { result } = renderHook(() =>
      useFormState(schema, { initialData, validateOnMount: true })
    );

    const { formState, formStatus } = result.current;

    expect(formStatus.valid).toBe(false);
    expect(formState.errors.name).toMatch(/contains invalid characters/);
    expect(formState.errors.name).toMatch(/too long/);
    expect(formState.errors.name).includes('|');
    expect(formState.errors.get((path) => path.info.age)).toBe('Age must be > 0');
    expect(formState.errors.getAll()).toStrictEqual([
      'Name contains invalid characters',
      'Name is too long',
      'Age must be > 0',
    ]);
    expect(formState.errors.getKeys()).toStrictEqual(['name', 'info.age']);
  });

  it('should change initial state after submit', () => {
    const initialData: InitialSchema = {
      name: 'John',
      info: { age: 30 },
      tags: ['a', 'b'],
    };
    const { result } = renderHook(() => useFormState(schema, { initialData }));
    const {
      formActions: { change, validate, reset },
    } = result.current;

    act(() => {
      change('name', 'Jonathan', { touch: true });
      change((path) => path.info.age, 29, { touch: true });
    });

    act(() => {
      validate({
        submit: true,
        callback: (state, status) => {
          expect(state.data.name).toBe('Jonathan');
          expect(state.data.info.age).toBe(29);
          expect(status.valid).toBe(true);
          expect(status.submitted).toBe(true);
        },
      });
    });

    act(() => {
      reset({
        callback: (state) => {
          expect(state.data.name).toBe('Jonathan');
          expect(state.data.info.age).toBe(29);
        },
      });
    });

    const { formState } = result.current;

    expect(formState.data.name).toBe('Jonathan');
    expect(formState.data.info.age).toBe(29);
  });

  it('should not change initial state after submit when updateInitialData=false', () => {
    const initialData: InitialSchema = {
      name: 'John',
      info: { age: 30 },
      tags: ['a', 'b'],
    };
    const { result } = renderHook(() => useFormState(schema, { initialData }));
    const {
      formActions: { change, validate, reset },
    } = result.current;

    act(() => {
      change('name', 'Jonathan', { touch: true });
      change((path) => path.info.age, 29, { touch: true });
    });

    act(() => {
      validate({
        submit: true,
        updateInitialData: false,
        callback: (state, status) => {
          expect(state.data.name).toBe('Jonathan');
          expect(state.data.info.age).toBe(29);
          expect(status.valid).toBe(true);
          expect(status.submitted).toBe(true);
        },
      });
    });

    act(() => {
      reset({
        callback: (state) => {
          expect(state.data.name).toBe('John');
          expect(state.data.info.age).toBe(30);
        },
      });
    });

    const { formState } = result.current;

    expect(formState.data.name).toBe('John');
    expect(formState.data.info.age).toBe(30);
  });

  it('should not validate before submit when validateBeforeSubmit is false', () => {
    const initialData: InitialSchema = {
      name: 'John',
      info: { age: 30 },
      tags: ['a', 'b'],
    };
    const { result } = renderHook(() =>
      useFormState(schema, { initialData, validateBeforeSubmit: false })
    );
    const {
      formActions: { change, validate },
    } = result.current;

    act(() => {
      change('name', '');
    });

    const { formState, formStatus } = result.current;

    expect(formState.data.name).toBe('');
    expect(formState.errors.name).toBeUndefined();
    expect(formStatus.valid).toBeNull();

    act(() => {
      validate({
        submit: true,
      });
    });

    const { formState: submittedState, formStatus: submittedStatus } = result.current;

    expect(submittedState.errors.name).toBe('Name is required');
    expect(submittedStatus.submitted).toBe(false);
    expect(submittedStatus.valid).toBe(false);

    act(() => {
      change('name', 'John');
    });

    const { formState: changedState, formStatus: changedStatus } = result.current;

    expect(changedState.data.name).toBe('John');
    expect(changedState.errors.name).toBeUndefined();
    expect(changedStatus.valid).toBe(true);
  });

  it('should re-validate on replace after validate when validateBeforeSubmit is false', () => {
    const initialData: InitialSchema = {
      name: 'John',
      info: { age: 30 },
      tags: [],
    };
    const { result } = renderHook(() =>
      useFormState(schema, { initialData, validateBeforeSubmit: false })
    );

    act(() => {
      result.current.formActions.validate();
    });
    expect(result.current.formStatus.valid).toBe(true);

    act(() => {
      result.current.formActions.replace({ name: '', info: { age: 30 } }, { validate: true });
    });

    expect(result.current.formState.errors.name).toBe('Name is required');
    expect(result.current.formStatus.valid).toBe(false);
  });

  it('should re-validate on touch after validate when validateBeforeSubmit is false', () => {
    const initialData: InitialSchema = {
      name: 'John',
      info: { age: 30 },
      tags: [],
    };
    const { result } = renderHook(() =>
      useFormState(schema, { initialData, validateBeforeSubmit: false })
    );

    act(() => {
      result.current.formActions.validate();
    });
    expect(result.current.formStatus.valid).toBe(true);

    act(() => {
      result.current.formActions.touch('name');
    });

    expect(result.current.formStatus.valid).toBe(true);
    expect(result.current.formState.touched.name).toBe(true);
  });

  it('should re-validate on setError after validate when validateBeforeSubmit is false', () => {
    const initialData: InitialSchema = {
      name: 'John',
      info: { age: 30 },
      tags: [],
    };
    const { result } = renderHook(() =>
      useFormState(schema, { initialData, validateBeforeSubmit: false })
    );

    act(() => {
      result.current.formActions.validate();
    });
    expect(result.current.formStatus.valid).toBe(true);

    act(() => {
      result.current.formActions.setError('serverError', 'Server failure', { validate: true });
    });

    expect(result.current.formState.errors.getManual('serverError')).toBe('Server failure');
    expect(result.current.formStatus.valid).toBe(false);
  });

  it('should re-validate on clearManualErrors after validate when validateBeforeSubmit is false', () => {
    const initialData: InitialSchema = {
      name: 'John',
      info: { age: 30 },
      tags: [],
    };
    const { result } = renderHook(() =>
      useFormState(schema, { initialData, validateBeforeSubmit: false })
    );

    act(() => {
      result.current.formActions.setError('serverError', 'Server failure');
    });
    act(() => {
      result.current.formActions.validate();
    });
    expect(result.current.formStatus.valid).toBe(false);

    act(() => {
      result.current.formActions.clearManualErrors({ validate: true });
    });

    expect(result.current.formState.errors.getManual('serverError')).toBeUndefined();
    expect(result.current.formStatus.valid).toBe(true);
  });

  it('should handle number and date fields', () => {
    const initialData: InitialSchema = {
      name: 'John',
      info: { age: 30 },
    };
    const { result } = renderHook(() => useFormState(schema, { initialData }));
    const {
      formActions: { change },
    } = result.current;

    act(() => {
      change((path) => path.info.age, 42);
      change((path) => path.info.birthDate, '12-31-2020');
    });

    const { formState, formStatus } = result.current;

    expect(formStatus.valid).toBe(true);
    expect(formState.data.info.age).toBe(42);
    expect(formState.data.info.birthDate).toBeInstanceOf(Date);
    expect((formState.data.info.birthDate as Date).toISOString()).toMatch(/^2020-12-31/);
  });

  it('should handle invalid date', () => {
    const initialData: InitialSchema = {
      name: 'John',
      info: { age: 30 },
    };
    const { result } = renderHook(() => useFormState(schema, { initialData }));
    const {
      formActions: { change },
    } = result.current;

    act(() => {
      change((path) => path.info.birthDate, '2020-12-31'); // unsuported ISO format
    });

    const { formState, formStatus } = result.current;

    expect(formStatus.valid).toBe(false);
    expect(formState.errors.get((path) => path.info.birthDate)).toMatch(/invalid input/i);
    expect(formState.data.info.birthDate).toBe('2020-12-31');
  });

  it('should handle array fields', () => {
    const { result } = renderHook(() => useFormState(schema));
    const {
      change,
      array: { append, clear, insert, remove, swap, update },
    } = result.current.formActions;

    act(() => {
      change('tags', ['a', 'b']);
    });

    const { formState } = result.current;
    expect(formState.data.tags).toStrictEqual(['a', 'b']);

    act(() => {
      append('tags', ['c', 'd'], {
        callback: (state) => {
          expect(state.data.tags).toStrictEqual(['a', 'b', 'c', 'd']);
        },
      });
    });

    act(() => {
      append((path) => path.tags, 'e');
    });

    const { formState: appendedState } = result.current;
    expect(appendedState.data.tags).toStrictEqual(['a', 'b', 'c', 'd', 'e']);

    act(() => {
      insert('tags', 0, ['e', 'f'], {
        callback: (state) => {
          expect(state.data.tags).toStrictEqual(['e', 'f', 'a', 'b', 'c', 'd', 'e']);
        },
      });
    });

    act(() => {
      insert((path) => path.tags, 2, 'g');
    });

    const { formState: insertedState } = result.current;
    expect(insertedState.data.tags).toStrictEqual(['e', 'f', 'g', 'a', 'b', 'c', 'd', 'e']);

    act(() => {
      update((path) => path.tags, -1, 'h');
    });

    act(() => {
      update('tags', 1, insertedState.data.tags[1] ?? 'N/A');
    });

    const { formState: updatedState } = result.current;
    expect(updatedState.data.tags).toStrictEqual(['e', 'f', 'g', 'a', 'b', 'c', 'd', 'h']);

    act(() => {
      swap('tags', 2, 7);
    });

    act(() => {
      swap((path) => path.tags, 5, 5);
    });

    const { formState: swappedState } = result.current;
    expect(swappedState.data.tags).toStrictEqual(['e', 'f', 'h', 'a', 'b', 'c', 'd', 'g']);

    act(() => {
      remove('tags', (value) => value.toUpperCase() === 'C');
    });

    act(() => {
      remove((path) => path.tags, 2);
    });

    const { formState: removedState } = result.current;
    expect(removedState.data.tags).toStrictEqual(['e', 'f', 'a', 'b', 'd', 'g']);

    act(() => {
      clear('tags');
      clear((path) => path.tags);
    });

    const { formState: clearedState } = result.current;
    expect(clearedState.data.tags).toStrictEqual([]);
  });

  it('should throw on non-array fields', () => {
    const { result } = renderHook(() =>
      useFormState(schema, { initialData: { tags: ['a', 'b'] } })
    );
    const {
      array: { append, clear, insert, remove, swap, update },
    } = result.current.formActions;

    expect(() => {
      append('isArchived', true as never);
    }).toThrow(TypeError);

    expect(() => {
      insert('info', 0, true as never);
    }).toThrow(TypeError);

    expect(() => {
      update('name', 0, true as never);
    }).toThrow(TypeError);

    expect(() => {
      swap('registeredOn', 0, 1);
    }).toThrow(TypeError);

    expect(() => {
      swap('tags', 0, -1);
    }).toThrow(Error);

    expect(() => {
      swap('tags', -1, 1);
    }).toThrow(Error);

    expect(() => {
      swap('tags', 0, 9999);
    }).toThrow(Error);

    expect(() => {
      swap('tags', 9999, 0);
    }).toThrow(Error);

    expect(() => {
      remove('version', 0);
    }).toThrow(TypeError);

    expect(() => {
      clear('specialNumber');
    }).toThrow(TypeError);
  });

  it('should update initial state reactively', () => {
    let initialData: InitialSchema = {
      name: 'Jonathan',
      info: { age: 30 },
    };
    const { result, rerender } = renderHook(() => useFormState(schema, { initialData }));
    const {
      formActions: { change },
    } = result.current;

    act(() => {
      change('name', 'Tom');
    });

    initialData = { name: 'Jonathan', info: { age: 29 } };
    rerender(); // required to update the initial state of the hook

    const { formState } = result.current;

    expect(formState.data.name).toBe('Tom'); // changed value
    expect(formState.data.info.age).toBe(29); // unchanged value from the initial state
  });

  it('should not update initial state reactively after calling "replace"', () => {
    let initialData: InitialSchema = {
      name: 'Jonathan',
      info: { age: 30 },
    };
    const { result, rerender } = renderHook(() => useFormState(schema, { initialData }));
    const {
      formActions: { replace },
    } = result.current;

    act(() => {
      replace({
        ...initialData,
        name: 'Tom',
      });
    });

    initialData = { name: 'Jonathan', info: { age: 29 } };
    rerender(); // required to update the initial state of the hook

    const { formState } = result.current;

    expect(formState.data.name).toBe('Tom'); // replaced value
    expect(formState.data.info.age).toBe(30); // replaced value
  });

  it('should replace all the data', () => {
    const { result } = renderHook(() => useFormState(schema));
    const {
      formState: { data },
      formStatus: { valid },
      formActions: { replace },
    } = result.current;

    expect(data.name).toBe('');
    expect(data.info.age).toBe('');
    expect(valid).toBeNull();

    act(() => {
      replace({ name: 'Jonathan', info: { age: 29 } });
    });

    const { formState, formStatus } = result.current;

    expect(formState.data.name).toBe('Jonathan');
    expect(formState.data.info.age).toBe(29);
    expect(formStatus.valid).toBeNull();
  });

  it('should replace and validate all the new data', () => {
    const { result } = renderHook(() => useFormState(schema));
    const {
      formState: { data },
      formStatus: { valid },
      formActions: { replace },
    } = result.current;

    expect(data.name).toBe('');
    expect(data.info.age).toBe('');
    expect(valid).toBeNull();

    act(() => {
      replace(
        { name: 'Jonathan', info: { age: 29 } },
        {
          validate: true,
        }
      );
    });

    const { formState, formStatus } = result.current;

    expect(formState.data.name).toBe('Jonathan');
    expect(formState.data.info.age).toBe(29);
    expect(formStatus.valid).toBe(true);
  });

  it('gets the state values', () => {
    // eslint-disable-next-line unicorn/no-unnecessary-global-this -- bare `isSecureContext` is not defined in this jsdom/vitest environment
    const prevIsSecureContext = globalThis.isSecureContext;

    // Stubbing a secure context value for UUID generation.
    Object.defineProperty(globalThis, 'isSecureContext', {
      value: true,
      writable: true,
      configurable: true,
    });

    const initialData: InitialSchema = {
      name: 'John',
      info: { age: 30, birthDate: new Date(2020, 11, 31) },
      category: 'unconfirmed',
      tags: ['a', 'b'],
      registeredOn: '06/30/2020',
      updateDates: [new Date(2019, 11, 12), new Date(2020, 3, 15)],
    };
    const { result } = renderHook(() =>
      useFormState(schema, { initialData, validateOnMount: true })
    );
    const {
      formState: { data },
      formStatus,
    } = result.current;

    expect(formStatus.valid).toBe(true);

    expect(data.name).toBe('John');
    expect(data.info.uuid).toBeTypeOf('symbol');
    expect(data.info.uuid.description).toMatch(/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/);
    expect(data.info.age).toBe(30);
    expect(data.info.birthDate).toBeInstanceOf(Date);
    expect(data.info.email).toBe('');
    expect(data.tags).toHaveLength(2);
    expect(data.tags[0]).toBe('a');
    expect(data.tags[1]).toBe('b');
    expect(data.category).toBe('unconfirmed');
    expect(data.isActive).toBe(true);
    expect(data.version).toBe(0);
    expect(data.registeredOn).toStrictEqual(new Date(2020, 5, 30));
    expect(
      data.registeredOn instanceof Date && formatDate(data.registeredOn, 'MM/dd/yyyy')
    ).toStrictEqual('06/30/2020');
    expect(data.updateDates).toStrictEqual([new Date(2019, 11, 12), new Date(2020, 3, 15)]);
    expect(data.previousVersions).toBeUndefined();
    expect(data.specialNumber).toBe(Math.PI);

    const apiData = schema.toObject(data);

    expect(apiData.name).toBe('John');
    expect(apiData.info.age).toBe(30);
    expect(apiData.info.birthDate).toBe('12-31-2020');
    expect(apiData.info.email).toBeUndefined();
    expect(apiData.tags).toHaveLength(2);
    expect(apiData.tags[0]).toBe('a');
    expect(apiData.tags[1]).toBe('b');
    expect(apiData.category).toBe('unconfirmed');
    expect(apiData.info.uuid).toBeUndefined();
    expect(apiData.isActive).toBe(true);
    expect(apiData.version).toBe(0);
    expect(apiData.registeredOn).toBe('06/30/2020');
    expect(apiData.updateDates).toStrictEqual(['2019-12-12', '2020-04-15']);
    expect(apiData.previousVersions).toBeUndefined();
    expect(apiData.specialNumber).toBe(Math.PI);

    // Resetting the value
    Object.defineProperty(globalThis, 'isSecureContext', {
      value: prevIsSecureContext,
      writable: true,
      configurable: true,
    });
  });
});

it('validates schema descriptions', () => {
  const { result } = renderHook(() => useFormState(schema));

  const {
    formState: { descriptions },
  } = result.current;

  const expectedDescriptions = {
    '': 'Test schema',
    name: 'Name',
    info: 'Info',
    'info.age': 'Age',
    'info.email': 'Email',
    'info.birthDate': 'Birth date',
    tags: 'Tags',
    'tags.0': 'Tag',
    category: 'Category',
    isActive: 'Is record active?',
    isArchived: 'Is record archived?',
    version: 'Record version',
    registeredOn: 'Registered on',
    updateDates: 'Update dates',
    'updateDates.0': 'Update date',
    previousVersions: 'Previous versions',
    'previousVersions.0': 'Previous version',
    specialNumber: 'Special number',
  };

  const { get, getKeys, ...actualDescriptions } = descriptions;

  expect(expectedDescriptions).toStrictEqual(actualDescriptions);
  expect(descriptions['']).toBe('Test schema');
  expect(get((path) => path.tags[1])).toBe('Tag');
  expect(getKeys()).toHaveLength(Object.keys(expectedDescriptions).length);
});

it('validates schema ranges', () => {
  const { result } = renderHook(() => useFormState(schema));

  const {
    formState: { ranges },
  } = result.current;

  const expectedRanges = {
    'info.age': { type: 'range', format: 'integer', min: 1, max: undefined },
    'info.birthDate': {
      type: 'range',
      format: 'MM-dd-yyyy',
      min: new Date(Date.UTC(2020, 0, 1)),
      max: new Date(Date.UTC(2039, 11, 31)),
    },
    version: { type: 'range', format: 'integer', min: 0, max: 9999999 },
    'updateDates.0': {
      type: 'range',
      format: 'yyyy-MM-dd',
      min: undefined,
      max: new Date(Date.UTC(2099, 11, 31)),
    },
    'previousVersions.0': { type: 'range', format: 'integer', min: undefined, max: 9999 },
    specialNumber: { type: 'range', format: 'numeric', min: 3.1 + 1e-9, max: 3.15 - 1e-9 },
    name: {
      type: 'length',
      format: 'integer',
      min: 1,
      max: 25,
    },
    tags: {
      type: 'length',
      format: 'integer',
      min: 0,
      max: 5,
    },
    'tags.0': {
      type: 'length',
      format: 'integer',
      min: 1,
      max: 255,
    },
  };

  const { get, getMax, getMin, getKeys, ...actualRanges } = ranges;

  expect(expectedRanges).toStrictEqual(actualRanges);
  expect(get((path) => path.info.age)).toStrictEqual(expectedRanges['info.age']);
  expect(getKeys()).toHaveLength(Object.keys(expectedRanges).length);
  expect(getMax('name')).toBe(25);
  expect(getMax((path) => path.name)).toBe(25);
  expect(getMax('version')).toBe(9999999);
  expect(getMax((path) => path.version)).toBe(9999999);
  expect(getMax((path) => path.info.birthDate)).toEqual(new Date(Date.UTC(2039, 11, 31)));
  expect(getMin('name')).toBe(1);
  expect(getMin((path) => path.name)).toBe(1);
  expect(getMin('version')).toBe(0);
  expect(getMin((path) => path.version)).toBe(0);
  expect(getMin((path) => path.info.birthDate)).toEqual(new Date(Date.UTC(2020, 0, 1)));
  expect(() => getMin('category')).toThrow("No min range value is defined for path 'category'.");
  expect(() => getMax((path) => path.info.email)).toThrow(
    "No max range value is defined for path 'info.email'."
  );
});

it('validates required fields in the schema', () => {
  const { result } = renderHook(() => useFormState(schema));

  const {
    formState: { required },
  } = result.current;

  const expectedRequired = {
    name: true,
    info: true,
    'info.uuid': true,
    'info.age': true,
    tags: true,
    'tags.0': true,
    isActive: true,
    isArchived: true,
    updateDates: true,
    'updateDates.0': true,
    'previousVersions.0': true,
  };

  const { get, getKeys, ...actualRequired } = required;

  expect(expectedRequired).toStrictEqual(actualRequired);
  expect(get((path) => path.info.uuid)).toBe(true);
  expect(get((path) => path.info.email)).toBe(false);
  expect(getKeys()).toHaveLength(Object.keys(expectedRequired).length);
});

it('validates schema regular expression patterns', () => {
  const { result } = renderHook(() => useFormState(schema));

  const {
    formState: { patterns },
  } = result.current;

  const expectedPatterns = {
    name: String.raw`^[\d'A-Za-z-]*$`,
    'tags.0': String.raw`^[\w\\-]*$`,
    'info.birthDate': 'MM-dd-yyyy',
    registeredOn: 'MM/dd/yyyy',
    'updateDates.0': 'yyyy-MM-dd',
  };

  const { get, getKeys, ...actualPatterns } = patterns;

  expect(expectedPatterns).toStrictEqual(actualPatterns);
  expect(get((path) => path.tags[1])).toBe(expectedPatterns['tags.0']);
  expect(getKeys()).toHaveLength(Object.keys(expectedPatterns).length);
});
