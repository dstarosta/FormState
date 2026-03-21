import React, { useEffect, useRef, type Ref } from 'react';
import { describe, expect, it, afterEach, vi } from 'vitest';
import { act, cleanup, fireEvent, render, renderHook, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  submitForm,
  useFormState,
  convert,
  formatDate,
  z,
  type DeepPartial,
  type FormEventType,
  type FormMode,
  type FormPath,
  type FormState,
  type SubmitState,
} from '.';

describe('useFormState', () => {
  const schema = z.strictObject({
    name: z
      .formString(
        {
          required: true,
          error: 'Name is required',
        },
        z.regex(/^[\d'A-Za-z-]*$/, 'Name contains invalid characters'),
        z.maxLength(25, 'Name is too long')
      )
      .with(z.describe('Name')),
    info: z
      .object({
        uuid: z.symbol(),
        age: z
          .formNumber(
            {
              required: true,
              error: 'Age is required',
            },
            z.gte(1, 'Age must be > 0')
          )
          .with(z.describe('Age')),
        email: z.formString({ error: 'Invalid email' }).with(z.describe('Email')),
        birthDate: z
          .formDate(
            { required: false, dateFormat: 'MM/dd/yyyy' },
            z.gte(new Date(2020, 0, 1), 'Invalid date range'),
            z.lte(new Date(2039, 11, 31), 'Invalid date range')
          )
          .with(z.describe('Birth date')),
      })
      .with(z.describe('Info')),
    tags: z
      .formArray(
        z
          .string()
          .check(
            z.maxLength(255, 'Tag is too long'),
            z.regex(/^[\w\\-]*$/, 'Tag contains invalid characters')
          )
          .with(z.describe('Tag')),
        {
          minLength: 0,
          maxLength: 5,
        }
      )
      .with(z.describe('Tags')),
    category: z.formValues(['legacy', 'unconfirmed']).with(z.describe('Category')),
    isActive: z
      .default(z.formBoolean({ required: true, error: 'Is active is required' }), true)
      .with(z.describe('Is record active?')),
    isArchived: z.default(z.formBoolean(), false).with(z.describe('Is record archived?')),
    version: z
      .catch(z.formNumber(z.gte(0, 'Negative version'), z.lte(9999999, 'Version is too high')), 0)
      .with(z.describe('Record version')),
    registeredOn: z
      .formDate({ required: false, dateFormat: 'MM/dd/yyyy' })
      .with(z.describe('Registered on')),
    updateDates: z
      .formArray(
        z
          .date()
          .check(z.lte(new Date(2099, 11, 31), 'Date is too early'))
          .with(z.describe('Update date'))
      )
      .with(z.describe('Update dates')),
    previousVersions: z
      .formArray(z.number().check(z.lte(9999)).with(z.describe('Previous version')))
      .with(z.describe('Previous versions')),
    specialNumber: z
      .default(
        z.formNumber(z.gt(3.1, 'Number is too short'), z.lt(3.15, 'Number is too long')),
        Math.PI
      )
      .with(z.describe('Special number')),
  });

  type Schema = z.infer<typeof schema>;
  type InitialSchema = DeepPartial<Schema>;

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
        previousVersions: [],
        updateDates: [],
        specialNumber: Math.PI,
        toObject: formState.data.toObject,
      };

      expect(formState.data).toStrictEqual(expectedData);
      expect(formState.errors.name).toBe('Name is required');
      expect(formState.errors.get((path) => path.info.age)).toBe('Age is required');
      expect(formStatus.valid).toBe(false);
      expect(formStatus.dirty).toBe(false);
      expect(formStatus.touched).toBe(false);
    });

    it('should accept initial state', () => {
      const initialState: InitialSchema = {
        name: 'John',
        info: {
          age: 30,
        },
        tags: ['a', 'b'],
      };
      const { result } = renderHook(() => useFormState(schema, { initialState }));
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
      const initialState: InitialSchema = {
        name: 'John',
        info: {
          age: 30,
        },
        tags: ['a', 'b'],
      };
      const { result } = renderHook(() =>
        useFormState(schema, { initialState, initialTouched: ['name', (path) => path.info.age] })
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
      const initialState: InitialSchema = {
        name: '',
        info: { age: 30 },
      };
      const { result } = renderHook(() => useFormState(schema, { initialState }));

      const { formState, formStatus } = result.current;

      expect(formStatus.valid).toBeNull();
      expect(formState.errors).not.toHaveProperty('name');
      expect(formState.errors).not.toHaveProperty('age');
    });

    it('should produce errors on initial state change when validateOnMount is true', () => {
      const initialState: InitialSchema = {
        name: 'Jonathan@somelongnamevalue...', // too long, contains invalid characters
        info: { age: 0 },
      };
      const { result } = renderHook(() =>
        useFormState(schema, { initialState, validateOnMount: true })
      );

      const { formState, formStatus } = result.current;

      expect(formStatus.valid).toBe(false);
      expect(formState.errors.name).toMatch(/contains invalid characters/);
      expect(formState.errors.name).toMatch(/too long/);
      expect(formState.errors.name).includes('|');
      expect(formState.errors.get((path) => path.info.age)).toBe('Age must be > 0');
    });

    it('should change initial state after submit', () => {
      const initialState: InitialSchema = {
        name: 'John',
        info: { age: 30 },
        tags: ['a', 'b'],
      };
      const { result } = renderHook(() => useFormState(schema, { initialState }));
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

    it('should not validate before submit when validateBeforeSubmit is false', () => {
      const initialState: InitialSchema = {
        name: 'John',
        info: { age: 30 },
        tags: ['a', 'b'],
      };
      const { result } = renderHook(() =>
        useFormState(schema, { initialState, validateBeforeSubmit: false })
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

    it('should handle number and date fields', () => {
      const initialState: InitialSchema = {
        name: 'John',
        info: { age: 30 },
      };
      const { result } = renderHook(() => useFormState(schema, { initialState }));
      const {
        formActions: { change },
      } = result.current;

      act(() => {
        change((path) => path.info.age, 42);
        change((path) => path.info.birthDate, '12/31/2020');
      });

      const { formState, formStatus } = result.current;

      expect(formStatus.valid).toBe(true);
      expect(formState.data.info.age).toBe(42);
      expect(formState.data.info.birthDate).toBeInstanceOf(Date);
      expect((formState.data.info.birthDate as Date).toISOString()).toMatch(/^2020-12-31/);
    });

    it('should handle invalid date', () => {
      const initialState: InitialSchema = {
        name: 'John',
        info: { age: 30 },
      };
      const { result } = renderHook(() => useFormState(schema, { initialState }));
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
        formActions: { change },
      } = result.current;

      act(() => {
        change('tags', ['x', 'y']);
      });

      const { formState } = result.current;

      expect(formState.data.tags).toStrictEqual(['x', 'y']);
    });

    it('should update initial state reactively', () => {
      let initialState: InitialSchema = {
        name: 'Jonathan',
        info: { age: 30 },
      };
      const { result, rerender } = renderHook(() => useFormState(schema, { initialState }));
      const {
        formActions: { change },
      } = result.current;

      act(() => {
        change('name', 'Tom');
      });

      initialState = { name: 'Jonathan', info: { age: 29 } };
      rerender(); // required to update the initial state of the hook

      const { formState } = result.current;

      expect(formState.data.name).toBe('Tom'); // changed value
      expect(formState.data.info.age).toBe(29); // unchanged value from the initial state
    });

    it('should not update initial state reactively after calling "replace"', () => {
      let initialState: InitialSchema = {
        name: 'Jonathan',
        info: { age: 30 },
      };
      const { result, rerender } = renderHook(() => useFormState(schema, { initialState }));
      const {
        formActions: { replace },
      } = result.current;

      act(() => {
        replace({
          ...initialState,
          name: 'Tom',
        });
      });

      initialState = { name: 'Jonathan', info: { age: 29 } };
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
      const prevIsSecureContext = globalThis.isSecureContext;

      // Stubbing a secure context value for UUID generation.
      Object.defineProperty(globalThis, 'isSecureContext', {
        value: true,
        writable: true,
        configurable: true,
      });

      const initialState: InitialSchema = {
        name: 'John',
        info: { age: 30, birthDate: new Date(2020, 11, 31) },
        category: 'unconfirmed',
        tags: ['a', 'b'],
        registeredOn: '06/30/2020',
        updateDates: [new Date(2019, 11, 12), new Date(2020, 3, 15)],
      };
      const { result } = renderHook(() =>
        useFormState(schema, { initialState, validateOnMount: true })
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
      expect(data.previousVersions).toStrictEqual([]);
      expect(data.specialNumber).toBe(Math.PI);

      const apiData = data.toObject();

      expect(apiData.name).toBe('John');
      expect(apiData.info.age).toBe(30);
      expect(apiData.info.birthDate).toBeInstanceOf(Date);
      expect(apiData.info.email).toBe('');
      expect(apiData.tags).toHaveLength(2);
      expect(apiData.tags[0]).toBe('a');
      expect(apiData.tags[1]).toBe('b');
      expect(apiData.category).toBe('unconfirmed');
      expect(apiData.info.uuid).toBeUndefined();
      expect(apiData.isActive).toBe(true);
      expect(apiData.version).toBe(0);
      expect(apiData.registeredOn).toStrictEqual(new Date(2020, 5, 30));
      expect(apiData.updateDates).toStrictEqual([new Date(2019, 11, 12), new Date(2020, 3, 15)]);
      expect(apiData.previousVersions).toStrictEqual([]);
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

    const { get, ...actualDescriptions } = descriptions;

    expect(expectedDescriptions).toStrictEqual(actualDescriptions);
    expect(get).toBeTypeOf('function');
  });

  it('validates schema ranges', () => {
    const { result } = renderHook(() => useFormState(schema));

    const {
      formState: { ranges },
    } = result.current;

    const expectedRanges = {
      'info.age': { min: 1, max: undefined, format: 'integer' },
      'info.birthDate': {
        min: new Date(Date.UTC(2020, 0, 1)),
        max: new Date(Date.UTC(2039, 11, 31)),
        format: 'MM/dd/yyyy',
      },
      version: { min: 0, max: 9999999, format: 'integer' },
      'updateDates.0': {
        min: undefined,
        max: new Date(Date.UTC(2099, 11, 31)),
        format: 'yyyy-MM-dd',
      },
      'previousVersions.0': { min: undefined, max: 9999, format: 'integer' },
      specialNumber: { min: 3.1 + 1e-9, max: 3.15 - 1e-9, format: 'numeric' },
    };

    const { get, ...actualRanges } = ranges;

    expect(expectedRanges).toStrictEqual(actualRanges);
    expect(get).toBeTypeOf('function');
  });

  it('validates schema max lengths', () => {
    const { result } = renderHook(() => useFormState(schema));

    const {
      formState: { maxLengths },
    } = result.current;

    const expectedMaxLengths = { name: 25, tags: 5, 'tags.0': 255 };

    const { get, ...actualMaxLengths } = maxLengths;

    expect(expectedMaxLengths).toStrictEqual(actualMaxLengths);
    expect(get).toBeTypeOf('function');
  });

  it('validates schema regular expression patterns', () => {
    const { result } = renderHook(() => useFormState(schema));

    const {
      formState: { patterns },
    } = result.current;

    const expectedPatterns = {
      name: String.raw`^[\d'A-Za-z-]*$`,
      'tags.0': String.raw`^[\w\\-]*$`,
    };

    const { get, ...actualPatterns } = patterns;

    expect(expectedPatterns).toStrictEqual(actualPatterns);
    expect(get).toBeTypeOf('function');
  });

  describe('form actions', () => {
    it('should produce errors on initial state change when validateOnMount is false but previous errors exist', () => {
      let initialState: InitialSchema = {
        name: 'John',
        info: { age: 18 },
      };
      const { result, rerender } = renderHook(() => useFormState(schema, { initialState }));
      const {
        formActions: { change },
      } = result.current;

      act(() => {
        change('name', '');
      });

      initialState = { name: 'John', info: { age: 30 } };
      rerender();

      const { formState } = result.current;

      expect(formState.errors.name).toBe('Name is required');
      expect(formState.data.name).toBe('');
      expect(formState.data.info.age).toBe(30); // was not modified, so affected by the initial state change
    });

    it('should update and validate fields', () => {
      const { result } = renderHook(() => useFormState(schema));
      const {
        formActions: { change },
      } = result.current;

      act(() => {
        change('name', 'Alice', { touch: true });
        change('version', 1, { touch: true });
      });

      const { formState } = result.current;

      expect(formState.data.name).toBe('Alice');
      expect(formState.data.toObject().name).toBe('Alice');
      expect(formState.data.version).toBe(1);
      expect(formState.errors.name).toBeUndefined();
      expect(formState.errors.get((path) => path.name)).toBeUndefined();
      expect(formState.errors.getManual('name')).toBeUndefined();
      expect(formState.touched.name).toBe(true);
      expect(formState.touched.get((path) => path.name)).toBe(true);
      expect(formState.dirty.name).toBe(true);
      expect(formState.dirty.get('#name')).toBe(false);
      expect(formState.maxLengths.name).toBe(25);
      expect(formState.maxLengths.get((path) => path.name)).toBe(25);
      expect(formState.maxLengths.get((path) => path.tags[0])).toBe(255);
      expect(formState.patterns.name?.length).toBeGreaterThan(0);
      expect(formState.patterns.get((path) => path.name)?.length).toBeGreaterThan(0);
      expect(formState.patterns.get((path) => path.info.uuid)).toBe('');
      expect(formState.descriptions.name).toBe('Name');
      expect(formState.descriptions.get((path) => path.name)).toBe('Name');
      expect(formState.descriptions.get((path) => path.info.uuid)).toBe('');
      expect(formState.descriptions.version).toBe('Record version');
      expect(formState.descriptions.get((path) => path.version)).toBe('Record version');
      expect(formState.descriptions.tags).toBe('Tags');
      expect(formState.descriptions.get((path) => path.tags[0])).toBe('Tag');
      expect(formState.ranges.version).toStrictEqual({ min: 0, max: 9999999, format: 'integer' });
      expect(formState.ranges.get((path) => path.version)).toStrictEqual({
        min: 0,
        max: 9999999,
        format: 'integer',
      });
      expect(formState.ranges.get((path) => path.info.birthDate)).toStrictEqual({
        min: new Date('2020-01-01'),
        max: new Date('2039-12-31'),
        format: 'MM/dd/yyyy',
      });
      expect(formState.ranges.isActive).toBeUndefined();
      expect(formState.ranges.get((path) => path.isActive as unknown as number)).toBeUndefined();
    });

    it('should update field, validate and change a variable in change callback', () => {
      const initialState: InitialSchema = {
        name: 'John',
        info: { age: 18 },
      };
      const { result } = renderHook(() => useFormState(schema, { initialState }));
      const {
        formState: { data },
        formActions: { change },
      } = result.current;

      let updateCounter = 0;

      const callback = (state: FormState<Schema>) => {
        ++updateCounter;

        expect(state.data.name).toBe('Alice');
        expect(state.data.toObject().name).toBe('Alice');
        expect(state.data.version).toBe(1);
        expect(state.data.info.age).toBe(51);
        expect(state.errors.name).toBeUndefined();
        expect(state.errors.get((path) => path.name)).toBeUndefined();
        expect(state.errors.getManual('name')).toBeUndefined();
        expect(state.touched.name).toBe(true);
        expect(state.touched.get((path) => path.name)).toBe(true);
        expect(state.dirty.name).toBe(true);
        expect(state.dirty.get('#name')).toBe(false);
        expect(state.maxLengths.name).toBe(25);
        expect(state.maxLengths.get((path) => path.name)).toBe(25);
        expect(state.maxLengths.get((path) => path.tags[0])).toBe(255);
        expect(state.patterns.name?.length).toBeGreaterThan(0);
        expect(state.patterns.get((path) => path.name)?.length).toBeGreaterThan(0);
        expect(state.patterns.get((path) => path.info.uuid)).toBe('');
        expect(state.descriptions.name).toBe('Name');
        expect(state.descriptions.get((path) => path.name)).toBe('Name');
        expect(state.descriptions.get((path) => path.info.uuid)).toBe('');
        expect(state.descriptions.version).toBe('Record version');
        expect(state.descriptions.get((path) => path.version)).toBe('Record version');
        expect(state.descriptions.tags).toBe('Tags');
        expect(state.descriptions.get((path) => path.tags[0])).toBe('Tag');
        expect(state.ranges.version).toStrictEqual({ min: 0, max: 9999999, format: 'integer' });
        expect(state.ranges.get((path) => path.version)).toStrictEqual({
          min: 0,
          max: 9999999,
          format: 'integer',
        });
        expect(state.ranges.get((path) => path.info.birthDate)).toStrictEqual({
          min: new Date('2020-01-01'),
          max: new Date('2039-12-31'),
          format: 'MM/dd/yyyy',
        });
        expect(state.ranges.isActive).toBeUndefined();
        expect(state.ranges.get((path) => path.isActive as unknown as number)).toBeUndefined();
      };

      act(() => {
        // all callbacks are going to receive the same state with all the state changes
        change('name', 'Alice', {
          touch: true,
          callback: callback,
        });
        change('version', 1, {
          callback: callback,
        });
        change((path) => path.info.age, 51, {
          callback: callback,
        });
      });

      expect(data.name).toBe('John');
      expect(data.version).toBe(0);
      expect(data.info.age).toBe(18);

      expect(updateCounter).toBe(3);
    });

    it('should not change an un-updated value', () => {
      const initialState: InitialSchema = {
        name: 'John',
        info: { age: 18 },
      };
      const { result } = renderHook(() => useFormState(schema, { initialState }));
      const {
        formActions: { change },
      } = result.current;

      act(() => {
        change('name', 'John');
      });

      const {
        formState: { data, dirty, touched },
      } = result.current;

      expect(data.name).toBe('John');
      expect(dirty.name).toBe(false);
      expect(touched.name).toBe(false);
    });

    it('should touch an un-updated value', () => {
      const initialState: InitialSchema = {
        name: 'John',
        info: { age: 18 },
      };
      const { result } = renderHook(() => useFormState(schema, { initialState }));
      const {
        formActions: { change },
      } = result.current;

      act(() => {
        change('name', 'John', {
          touch: true,
        });
      });

      const {
        formState: { data, dirty, touched },
      } = result.current;

      expect(data.name).toBe('John');
      expect(dirty.name).toBe(false);
      expect(touched.name).toBe(true);
    });

    it('should touch an un-updated but touched value', () => {
      const initialState: InitialSchema = {
        name: 'John',
        info: { age: 18 },
      };
      const { result } = renderHook(() => useFormState(schema, { initialState }));

      const {
        formActions: { touch },
      } = result.current;

      act(() => {
        touch('name');
      });

      const {
        formActions: { change },
      } = result.current;

      act(() => {
        change('name', 'John', {
          touch: true,
        });
      });

      const {
        formState: { data, dirty, touched },
      } = result.current;

      expect(data.name).toBe('John');
      expect(dirty.name).toBe(false);
      expect(touched.name).toBe(true);
    });

    it('should call a debounced change callback per field', () => {
      vi.useFakeTimers();

      const initialState: InitialSchema = {
        name: 'John',
        info: { age: 18 },
      };
      const { result } = renderHook(() => useFormState(schema, { initialState }));
      const {
        formState: { data },
        formActions: { change },
      } = result.current;

      let updateCounter = 0;

      const callback = (state: FormState<Schema>) => {
        ++updateCounter;

        expect(state.data.name).toBe('Alice');
        expect(state.data.toObject().name).toBe('Alice');
        expect(state.data.version).toBe(1);
        expect(state.data.info.age).toBe(51);
      };

      const interval = 1000;

      act(() => {
        change('name', 'Alice', {
          touch: true,
          callback: callback,
          debounceIntervalMs: interval,
        });
        change('version', 1, {
          callback: callback,
          debounceIntervalMs: interval,
        });
        change((path) => path.info.age, 51, {
          callback: callback,
          debounceIntervalMs: interval,
        });
      });

      act(() => {
        vi.advanceTimersByTime(interval * 5);
      });

      expect(data.name).toBe('John');
      expect(data.version).toBe(0);
      expect(data.info.age).toBe(18);

      expect(updateCounter).toBe(3);
    });

    it('should debounce unstable callbacks for the same field without extra calls but warn the user', () => {
      vi.useFakeTimers();

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const initialState: InitialSchema = {
        name: 'John',
        info: { age: 18 },
      };
      const { result } = renderHook(() =>
        useFormState(schema, { initialState, debounceCacheCapacity: 1 })
      );
      const {
        formActions: { change },
      } = result.current;

      let updateCounter = 0;

      const interval = 1000;

      act(() => {
        change('name', 'A', {
          touch: true,
          callback: () => {
            ++updateCounter;
          },
          debounceIntervalMs: interval,
        });
        change('name', 'Ali', {
          touch: true,
          callback: () => {
            ++updateCounter;
          },
          debounceIntervalMs: interval,
        });
        change('name', 'Alice', {
          touch: true,
          callback: () => {
            ++updateCounter;
          },
          debounceIntervalMs: interval,
        });
      });

      act(() => {
        vi.advanceTimersByTime(interval * 5);
      });

      expect(updateCounter).toBe(1);
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);

      consoleWarnSpy.mockReset();
    });

    it('should call the debounced change callback once for rapid same-field changes', () => {
      vi.useFakeTimers();

      const initialState: InitialSchema = {
        name: 'John',
        info: { age: 18 },
      };
      const { result } = renderHook(() => useFormState(schema, { initialState }));
      const {
        formActions: { change },
      } = result.current;

      let updateCounter = 0;

      const callback = (state: FormState<Schema>) => {
        ++updateCounter;

        expect(state.data.name).toBe('Alice');
      };

      const interval = 1000;

      act(() => {
        change('name', 'A', {
          touch: true,
          callback: callback,
          debounceIntervalMs: interval,
        });
        change('name', 'Ali', {
          touch: true,
          callback: callback,
          debounceIntervalMs: interval,
        });
        change('name', 'Alice', {
          touch: true,
          callback: callback,
          debounceIntervalMs: interval,
        });
      });

      act(() => {
        vi.advanceTimersByTime(interval * 5);
      });

      expect(updateCounter).toBe(1);
    });

    it('should call the debounced change callback twice for sequential same-field changes', () => {
      vi.useFakeTimers();

      const initialState: InitialSchema = {
        name: 'John',
        info: { age: 18 },
      };
      const { result } = renderHook(() => useFormState(schema, { initialState }));
      const {
        formActions: { change },
      } = result.current;

      let updateCounter = 0;

      const callback = () => {
        ++updateCounter;
      };

      const interval = 1000;

      act(() => {
        change('name', 'Alice', {
          touch: true,
          callback: callback,
          debounceIntervalMs: interval,
        });
      });

      act(() => {
        vi.advanceTimersByTime(interval + 1);
      });

      act(() => {
        change('name', 'Allison', {
          touch: true,
          callback: callback,
          debounceIntervalMs: interval,
        });
      });

      act(() => {
        vi.advanceTimersByTime(interval * 5);
      });

      expect(updateCounter).toBe(2);
    });

    it('should debounce dispatch without a callback', () => {
      vi.useFakeTimers();

      const initialState: InitialSchema = {
        name: 'John',
        info: { age: 18 },
      };
      const { result } = renderHook(() => useFormState(schema, { initialState }));

      const interval = 1000;

      act(() => {
        change('name', 'Alice', { debounceIntervalMs: interval });
        change('version', 1, { debounceIntervalMs: interval });
      });

      // Data should not have changed yet (dispatch is pending).
      expect(result.current.formState.data.name).toBe('John');
      expect(result.current.formState.data.version).toBe(0);

      act(() => {
        vi.advanceTimersByTime(interval + 1);
      });

      // After the debounce period, both values should be applied.
      expect(result.current.formState.data.name).toBe('Alice');
      expect(result.current.formState.data.version).toBe(1);

      function change(...args: Parameters<typeof result.current.formActions.change>) {
        result.current.formActions.change(...args);
      }
    });

    it('should cancel pending debounce when value reverts to original without a callback', () => {
      vi.useFakeTimers();

      const initialState: InitialSchema = {
        name: 'John',
        info: { age: 18 },
      };
      const { result } = renderHook(() => useFormState(schema, { initialState }));

      const interval = 1000;

      act(() => {
        change('name', 'Alice', { debounceIntervalMs: interval });
      });

      // Revert to the original value before debounce fires.
      act(() => {
        change('name', 'John', { debounceIntervalMs: interval });
      });

      act(() => {
        vi.advanceTimersByTime(interval * 5);
      });

      // The pending dispatch should have been cancelled; value stays at initial.
      expect(result.current.formState.data.name).toBe('John');
      expect(result.current.formState.dirty.name).toBe(false);

      function change(...args: Parameters<typeof result.current.formActions.change>) {
        result.current.formActions.change(...args);
      }
    });

    it('should cancel only the reverted path and keep other pending changes without a callback', () => {
      vi.useFakeTimers();

      const initialState: InitialSchema = {
        name: 'John',
        info: { age: 18 },
      };
      const { result } = renderHook(() => useFormState(schema, { initialState }));

      const interval = 1000;

      act(() => {
        change('name', 'Alice', { debounceIntervalMs: interval });
        change('version', 1, { debounceIntervalMs: interval });
      });

      // Revert only name; version should remain pending.
      act(() => {
        change('name', 'John', { debounceIntervalMs: interval });
      });

      act(() => {
        vi.advanceTimersByTime(interval + 1);
      });

      expect(result.current.formState.data.name).toBe('John');
      expect(result.current.formState.data.version).toBe(1);

      function change(...args: Parameters<typeof result.current.formActions.change>) {
        result.current.formActions.change(...args);
      }
    });

    it('should flush pending changes on cache eviction without a callback', () => {
      vi.useFakeTimers();

      const initialState: InitialSchema = {
        name: 'John',
        info: { age: 18 },
      };
      const { result } = renderHook(() =>
        useFormState(schema, { initialState, debounceCacheCapacity: 1 })
      );

      const interval = 1000;

      act(() => {
        change('name', 'Alice', { debounceIntervalMs: interval });
      });

      // Data should still be pending.
      expect(result.current.formState.data.name).toBe('John');

      // A second change for a different field evicts the first entry,
      // flushing the pending change immediately.
      const callback = vi.fn();

      act(() => {
        change('version', 1, { callback, debounceIntervalMs: interval });
      });

      // The evicted name change should have been dispatched immediately.
      expect(result.current.formState.data.name).toBe('Alice');

      // The callback-based change is still pending.
      expect(result.current.formState.data.version).toBe(0);

      act(() => {
        vi.advanceTimersByTime(interval + 1);
      });

      expect(result.current.formState.data.version).toBe(1);
      expect(callback).toHaveBeenCalledTimes(1);

      function change(...args: Parameters<typeof result.current.formActions.change>) {
        result.current.formActions.change(...args);
      }
    });

    it('should flush pending changes and call callback on cache eviction', () => {
      vi.useFakeTimers();

      const initialState: InitialSchema = {
        name: 'John',
        info: { age: 18 },
      };
      const { result } = renderHook(() =>
        useFormState(schema, { initialState, debounceCacheCapacity: 1 })
      );

      const interval = 1000;
      const evictedCallback = vi.fn();
      const secondCallback = vi.fn();

      act(() => {
        change('name', 'Alice', { callback: evictedCallback, debounceIntervalMs: interval });
      });

      expect(result.current.formState.data.name).toBe('John');
      expect(evictedCallback).not.toHaveBeenCalled();

      act(() => {
        change('version', 1, { callback: secondCallback, debounceIntervalMs: interval });
      });

      // The evicted entry's change should have been dispatched and its callback called.
      expect(result.current.formState.data.name).toBe('Alice');
      expect(evictedCallback).toHaveBeenCalledTimes(1);

      expect(result.current.formState.data.version).toBe(0);

      act(() => {
        vi.advanceTimersByTime(interval + 1);
      });

      expect(result.current.formState.data.version).toBe(1);
      expect(secondCallback).toHaveBeenCalledTimes(1);

      function change(...args: Parameters<typeof result.current.formActions.change>) {
        result.current.formActions.change(...args);
      }
    });

    it('should cancel pending debounce and call callback immediately when switching to non-debounced', () => {
      vi.useFakeTimers();

      const initialState: InitialSchema = {
        name: 'John',
        info: { age: 18 },
      };
      const { result } = renderHook(() => useFormState(schema, { initialState }));

      let updateCounter = 0;

      const callback = () => {
        ++updateCounter;
      };

      const interval = 1000;

      // Debounced change — creates a pending entry for 'name'.
      act(() => {
        result.current.formActions.change('name', 'Alice', {
          callback,
          debounceIntervalMs: interval,
        });
      });

      // Data should not have changed yet.
      expect(result.current.formState.data.name).toBe('John');
      expect(updateCounter).toBe(0);

      // Non-debounced change for the same field and callback — should cancel
      // the pending debounce, dispatch immediately, and call the callback.
      act(() => {
        result.current.formActions.change('name', 'Bob', {
          callback,
        });
      });

      expect(result.current.formState.data.name).toBe('Bob');
      expect(updateCounter).toBe(1);

      // Advancing timers should not trigger another callback.
      act(() => {
        vi.advanceTimersByTime(interval * 5);
      });

      expect(updateCounter).toBe(1);
    });

    it('should not called debounced change callbacks if unmounted', () => {
      vi.useFakeTimers();

      const { result, unmount } = renderHook(() => useFormState(schema));
      const {
        formActions: { change },
      } = result.current;

      let updateCounter = 0;

      const callback = () => {
        ++updateCounter;
      };

      const interval = 1000;

      act(() => {
        change('name', 'Alice', {
          touch: true,
          callback: callback,
          debounceIntervalMs: interval,
        });
        change('version', 1, {
          callback: callback,
          debounceIntervalMs: interval,
        });
        change((path) => path.info.age, 51, {
          callback: callback,
          debounceIntervalMs: interval,
        });
      });

      unmount();

      act(() => {
        vi.advanceTimersByTime(interval * 5);
      });

      expect(updateCounter).toBe(0);
    });

    it('should update field without validation when validate is "manually"', () => {
      const { result } = renderHook(() => useFormState(schema));
      const {
        formActions: { change },
      } = result.current;

      act(() => {
        change('name', '', { validate: false });
      });

      const { formState, formStatus } = result.current;

      expect(formState.errors).not.toHaveProperty('name');
      expect(formStatus.valid).toBeNull();
    });

    it('should update field and not mark as touched when touch is false', () => {
      const { result } = renderHook(() => useFormState(schema));
      const {
        formActions: { change },
      } = result.current;

      act(() => {
        change('name', 'Alice', { touch: false });
      });

      const { formState } = result.current;

      expect(formState.touched.name).toBe(false);
      expect(formState.data.name).toBe('Alice');
    });

    it('should update field and mark as touched when touch is true', () => {
      const { result } = renderHook(() => useFormState(schema));
      const {
        formActions: { change },
      } = result.current;

      act(() => {
        change('name', 'Alice', { touch: true });
      });

      const { formState } = result.current;

      expect(formState.touched.name).toBe(true);
      expect(formState.data.name).toBe('Alice');
    });

    it('should mark form as touched', () => {
      const { result } = renderHook(() => useFormState(schema));
      const {
        formActions: { touch },
      } = result.current;

      act(() => {
        touch();
      });

      const { formState, formStatus } = result.current;

      expect(formState.touched.name).toBe(true);
      expect(formState.touched.get((path) => path.name)).toBe(true);
      expect(formStatus.touched).toBe(true);
    });

    it('should mark field as touched', () => {
      const { result } = renderHook(() => useFormState(schema));
      const {
        formActions: { touch },
      } = result.current;

      act(() => {
        touch('name');
      });

      const { formState, formStatus } = result.current;

      expect(formState.touched.name).toBe(true);
      expect(formStatus.touched).toBe(true);
    });

    it('should do nothing when touching en empty schema', () => {
      const emptySchema = z.object({});
      const { result } = renderHook(() => useFormState(emptySchema));
      const {
        formState,
        formStatus,
        formActions: { touch },
      } = result.current;

      act(() => {
        touch();
      });

      expect(formState.data.toObject()).toStrictEqual({});
      expect(formStatus.touched).toBe(false);
    });

    it('should validate field when touched and validate option is "always"', () => {
      const { result } = renderHook(() => useFormState(schema));
      const {
        formActions: { touch },
      } = result.current;

      act(() => {
        touch('name', { validate: true });
      });

      const { formState } = result.current;

      expect(formState.errors.name).toBe('Name is required');
      expect(formState.touched.name).toBe(true);
    });

    it('should reset the form', () => {
      const initialState: InitialSchema = {
        name: 'John',
        info: { age: 30 },
      };
      const { result } = renderHook(() =>
        useFormState(schema, { initialState, validateOnMount: true })
      );
      const {
        formActions: { change, reset },
      } = result.current;

      act(() => {
        change('name', 'Jonathan');
        change((path) => path.info.age, 29);
        reset({
          callback: (state) => {
            expect(state.data.name).toBe('John');
            expect(state.data.info.age).toBe(30);
            expect(state.dirty.name).toBe(false);
            expect(state.dirty.info).toBe(false);
          },
        });
      });

      const { formState } = result.current;

      expect(formState.data.name).toBe('John');
      expect(formState.data.info.age).toBe(30);
      expect(formState.dirty.name).toBe(false);
      expect(formState.dirty.info).toBe(false);
    });

    it('should reset specific fields', () => {
      const initialState: InitialSchema = {
        name: 'John',
        info: { age: 30 },
      };
      const { result } = renderHook(() => useFormState(schema, { initialState }));
      const {
        formActions: { change, touch, reset, setError },
      } = result.current;

      act(() => {
        touch('name');
        change('name', 'Jonathan', { validate: false });

        touch((path) => path.info.age);
        change((path) => path.info.age, 29);
      });

      act(() => {
        setError('name', 'Unsupported name');
        setError('isActive', '');
      });

      act(() => {
        reset({
          names: ['name'],
          resetTouched: false,
          callback: (state) => {
            expect(state.data.name).toBe('John');
            expect(state.data.info.age).toBe(29);
            expect(state.dirty.name).toBe(false);
            expect(state.dirty.info).toBe(true);
            expect(state.touched.name).toBe(true);
            expect(state.touched.get((path) => path.info.age)).toBe(true);
            expect(state.errors.isActive).toBeDefined();
          },
        });
      });

      const { formState } = result.current;

      expect(formState.data.name).toBe('John');
      expect(formState.data.info.age).toBe(29);
      expect(formState.dirty.name).toBe(false);
      expect(formState.dirty.info).toBe(true);
      expect(formState.touched.name).toBe(true);
      expect(formState.touched.get((path) => path.info.age)).toBe(true);
      expect(formState.errors.isActive).toBeDefined();
    });

    it('should reset specific fields while retaining the data', () => {
      const initialState: InitialSchema = {
        name: 'John',
        info: { age: 30 },
      };
      const { result } = renderHook(() => useFormState(schema, { initialState }));
      const {
        formActions: { change, touch, reset },
      } = result.current;

      act(() => {
        touch('name');
        change('name', 'Jonathan');

        touch((path) => path.info.age);
        change((path) => path.info.age, 29);
      });

      act(() => {
        reset({
          names: ['name'],
          retainData: true,
          callback: (state) => {
            expect(state.data.name).toBe('Jonathan');
            expect(state.data.info.age).toBe(29);
            expect(state.dirty.name).toBe(false);
            expect(state.dirty.info).toBe(true);
            expect(state.touched.name).toBe(true);
            expect(state.touched.get((path) => path.info.age)).toBe(true);
          },
        });
      });

      const { formState } = result.current;

      expect(formState.data.name).toBe('Jonathan');
      expect(formState.data.info.age).toBe(29);
      expect(formState.dirty.name).toBe(false);
      expect(formState.dirty.info).toBe(true);
      expect(formState.touched.name).toBe(true);
      expect(formState.touched.get((path) => path.info.age)).toBe(true);
    });

    it('should reset specific fields and the corresponding touched values', () => {
      const initialState: InitialSchema = {
        name: 'John',
        info: { age: 30 },
      };
      const { result } = renderHook(() => useFormState(schema, { initialState }));
      const {
        formActions: { change, touch, reset },
      } = result.current;

      act(() => {
        touch('name');
        change('name', 'Jonathan');

        touch('name.test' as 'name');
        change((path) => path.info.age, 29, { touch: true });
      });

      act(() => {
        reset({
          names: ['name'],
          resetTouched: true,
          callback: (state) => {
            expect(state.data.name).toBe('John');
            expect(state.data.info.age).toBe(29);
            expect(state.dirty.info).toBe(true);
            expect(state.touched.name).toBe(false);
            expect(state.touched.get((path) => path.info.age)).toBe(true);
          },
        });
      });

      const { formState } = result.current;

      expect(formState.data.name).toBe('John');
      expect(formState.data.info.age).toBe(29);
      expect(formState.dirty.info).toBe(true);
      expect(formState.touched.name).toBe(false);
      expect(formState.touched.get((path) => path.info.age)).toBe(true); // other fields should remain touched
    });

    it('should reset the form and keep errors empty without validation', () => {
      const initialState: InitialSchema = {
        name: 'John',
        info: { age: 30 },
      };
      const { result } = renderHook(() => useFormState(schema, { initialState }));
      const {
        formActions: { change, reset },
      } = result.current;

      act(() => {
        change('name', '');
        reset({
          callback: (state) => {
            expect(state.data.name).toBe('John');
          },
        });
      });

      const { formState, formStatus } = result.current;

      expect(formState.data.name).toBe('John');
      expect(formStatus.valid).toBeNull();
    });

    it('should reset the form and keep errors empty (validate on init)', () => {
      const initialState: InitialSchema = {
        name: 'John',
        info: { age: 30 },
      };
      const { result } = renderHook(() =>
        useFormState(schema, { initialState, validateOnMount: true })
      );
      const {
        formActions: { change, reset },
      } = result.current;

      act(() => {
        change('name', '');
        reset();
      });

      const { formState, formStatus } = result.current;

      expect(formState.data.name).toBe('John');
      expect(formStatus.valid).toBe(true);
    });

    it('should keep the validated status after submission', () => {
      const initialState: InitialSchema = {
        name: 'John',
        info: { age: 30 },
      };
      const { result } = renderHook(() => useFormState(schema, { initialState }));
      const {
        formActions: { change, reset, validate },
      } = result.current;

      act(() => {
        validate({ submit: true });
      });

      act(() => {
        change('name', '');
      });

      act(() => {
        reset();
      });

      const { formState, formStatus } = result.current;

      expect(formState.data.name).toBe('John');
      expect(formStatus.valid).toBe(true);
    });

    it('should reset the form and reset touched when resetTouched is true and no errors', () => {
      const initialState: InitialSchema = {
        name: 'John',
        info: { age: 30 },
      };
      const { result } = renderHook(() => useFormState(schema, { initialState }));
      const {
        formActions: { change, reset },
      } = result.current;

      act(() => {
        change('name', 'Jonathan', { touch: true });
        change((path) => path.info.age, 29, { touch: true });
      });

      act(() => {
        reset({ resetTouched: true });
      });

      const { formState, formStatus } = result.current;

      expect(formState.data.name).toBe('John');
      expect(formState.data.info.age).toBe(30);
      expect(formStatus.dirty).toBe(false);
      expect(formStatus.touched).toBe(false);
    });

    it('should submit form', () => {
      const initialState: InitialSchema = {
        name: 'John',
        info: { age: 30 },
        tags: ['a', 'b'],
      };
      const { result } = renderHook(() => useFormState(schema, { initialState }));
      const {
        formActions: { change, validate },
      } = result.current;

      act(() => {
        change('name', 'Jonathan', { touch: true });
        change((path) => path.info.age, 29, { touch: true });
      });

      act(() => {
        validate({ submit: true });
      });

      const { formStatus } = result.current;

      expect(formStatus.submitted).toBe(true);
      expect(formStatus.valid).toBe(true);
      expect(formStatus.dirty).toBe(false);
      expect(formStatus.touched).toBe(false);
    });

    it('should submit form without resetting touched or dirty states', () => {
      const initialState: InitialSchema = {
        name: 'John',
        info: { age: 30 },
        tags: ['a', 'b'],
      };
      const { result } = renderHook(() => useFormState(schema, { initialState }));
      const {
        formActions: { change, validate },
      } = result.current;

      act(() => {
        change('name', 'Jonathan', { touch: true });
        change((path) => path.info.age, 29, { touch: true });
      });

      act(() => {
        validate({
          submit: true,
          resetDirty: false,
          resetTouched: false,
        });
      });

      const { formStatus } = result.current;

      expect(formStatus.submitted).toBe(true);
      expect(formStatus.dirty).toBe(true);
      expect(formStatus.touched).toBe(true);
    });

    it('should not submit form with initial errors', () => {
      const { result } = renderHook(() => useFormState(schema));
      const {
        formActions: { validate },
      } = result.current;

      act(() => {
        validate({
          submit: true,
          callback(state, status) {
            expect(status.submitted).toBe(false);
            expect(status.valid).toBe(false);
            expect(state.errors.name).toBe('Name is required');
          },
        });
      });

      const { formState, formStatus } = result.current;

      expect(formStatus.submitted).toBe(false);
      expect(formStatus.valid).toBe(false);
      expect(formState.errors.name).toBe('Name is required');
    });

    it('should not submit form with runtime errors', () => {
      const initialState: InitialSchema = {
        name: 'John',
        info: { age: 30 },
        tags: ['a', 'b'],
      };
      const { result } = renderHook(() => useFormState(schema, { initialState }));
      const {
        formActions: { change, validate },
      } = result.current;

      act(() => {
        change('name', '');
        change((path) => path.info.age, 29);
      });

      act(() => {
        validate({
          submit: true,
          callback(state, status) {
            expect(status.submitted).toBe(false);
            expect(status.valid).toBe(false);
            expect(state.errors.name).toBe('Name is required');
          },
        });
      });

      const { formState, formStatus } = result.current;

      expect(formStatus.submitted).toBe(false);
      expect(formStatus.valid).toBe(false);
      expect(formState.errors.name).toBe('Name is required');
    });

    it('should not submit form with manual errors', () => {
      const initialState: InitialSchema = {
        name: 'John',
        info: { age: 30 },
        tags: ['a', 'b'],
      };
      const { result } = renderHook(() => useFormState(schema, { initialState }));
      const {
        formActions: { change, setError, validate },
      } = result.current;

      act(() => {
        change('name', 'Jonathan', { touch: true });
        change((path) => path.info.age, 29, { touch: true });
      });

      act(() => {
        setError('custom', 'Jonathan is not an acceptable name');
      });

      act(() => {
        validate({
          submit: true,
          callback(state, status) {
            expect(status.submitted).toBe(false);
            expect(status.valid).toBe(false);
            expect(state.errors.getManual('custom')).toBe('Jonathan is not an acceptable name');
          },
        });
      });

      const { formState, formStatus } = result.current;

      expect(formStatus.submitted).toBe(false);
      expect(formStatus.valid).toBe(false);
      expect(formState.errors.getManual('custom')).toBe('Jonathan is not an acceptable name');
    });

    it('should not submit form with manual errors without validation', () => {
      const initialState: InitialSchema = {
        name: 'Jonathan',
        info: { age: 30 },
        tags: ['a', 'b'],
      };
      const { result } = renderHook(() => useFormState(schema, { initialState }));
      const {
        formActions: { setError, validate },
      } = result.current;

      act(() => {
        setError('custom', 'Jonathan is not an acceptable name');
      });

      act(() => {
        validate({
          submit: true,
          callback(state, status) {
            expect(status.submitted).toBe(false);
            expect(status.valid).toBe(false);
            expect(state.errors.getManual('custom')).toBe('Jonathan is not an acceptable name');
          },
        });
      });

      const { formState, formStatus } = result.current;

      expect(formStatus.submitted).toBe(false);
      expect(formStatus.valid).toBe(false);
      expect(formState.errors.getManual('custom')).toBe('Jonathan is not an acceptable name');
    });

    it('should set and clear manual errors', () => {
      const initialState: InitialSchema = {
        name: 'John',
        info: { age: 30 },
        tags: ['a', 'b'],
      };
      const { result } = renderHook(() => useFormState(schema, { initialState }));
      const {
        formActions: { clearManualErrors, setError, validate },
      } = result.current;

      const { formStatus: initialFormStatus } = result.current;

      expect(initialFormStatus.validSchema).toBeNull();
      expect(initialFormStatus.valid).toBeNull();

      act(() => {
        setError('id', 'Invalid ID');
        setError((path) => path.isActive, 'What is active?');
        setError((path) => path.isActive); // cleared the error
      });

      act(() => {
        validate();
      });

      const { formState: errorFormState, formStatus: errorFormStatus } = result.current;

      expect(errorFormStatus.validSchema).toBe(true);
      expect(errorFormStatus.validSchema).toBe(true); // hitting a cached value
      expect(errorFormStatus.valid).toBe(false);
      expect(errorFormState.errors.getManual('id')).toMatch('Invalid ID');
      expect(errorFormState.errors.getManual('isActive')).toBeUndefined();

      act(() => {
        clearManualErrors();
      });

      act(() => {
        validate();
      });

      const { formState: cleanFormState, formStatus: cleanFormStatus } = result.current;

      expect(cleanFormStatus.validSchema).toBe(true);
      expect(cleanFormStatus.valid).toBe(true);
      expect(cleanFormState.errors.getManual('id')).toBeUndefined();
    });

    it('should set and clear manual errors conditionally', () => {
      const initialState: InitialSchema = {
        name: 'John',
        info: { age: 30 },
        tags: ['a', 'b'],
      };
      const { result } = renderHook(() => useFormState(schema, { initialState }));
      const {
        formActions: { clearManualErrors, setError },
      } = result.current;

      const { formStatus: initialFormStatus } = result.current;

      expect(initialFormStatus.validSchema).toBeNull();
      expect(initialFormStatus.valid).toBeNull();

      act(() => {
        setError('id', 'Invalid ID', { validate: true });
        setError((path) => path.isActive, 'What is active?', { validate: true });
      });

      const { formState: errorFormState, formStatus: errorFormStatus } = result.current;

      expect(errorFormStatus.valid).toBe(false);
      expect(errorFormState.errors.getManual('id')).toMatch('Invalid ID');
      expect(errorFormState.errors.getManual('isActive')).toMatch('What is active?');

      act(() => {
        clearManualErrors({ predicate: (key) => key.toLowerCase() !== key });
      });

      const { formState: cleanFormState, formStatus: cleanFormStatus } = result.current;

      expect(cleanFormStatus.valid).toBe(false);
      expect(cleanFormState.errors.getManual('id')).toMatch('Invalid ID');
      expect(cleanFormState.errors.getManual('isActive')).toBeUndefined();
    });

    it('should clear manual errors and validate schema', () => {
      const initialState: InitialSchema = {
        info: { age: 30 },
      };
      const { result } = renderHook(() => useFormState(schema, { initialState }));
      const {
        formActions: { clearManualErrors, setError },
      } = result.current;

      act(() => {
        setError('manual', 'error');
      });

      act(() => {
        clearManualErrors();
      });

      const { formStatus } = result.current;

      expect(formStatus.valid).toBe(false);
    });

    it('should clear manual errors and do not validate schema', () => {
      const initialState: InitialSchema = {
        info: { age: 30 },
      };
      const { result } = renderHook(() => useFormState(schema, { initialState }));
      const {
        formActions: { clearManualErrors, setError },
      } = result.current;

      act(() => {
        setError('manual', 'error', { validate: false });
      });

      act(() => {
        clearManualErrors({ validate: false });
      });

      const { formStatus } = result.current;

      expect(formStatus.valid).toBeNull();
    });

    it('should try to clear manual errors but not validate schema since there are no errors', () => {
      const initialState: InitialSchema = {
        info: { age: 30 },
      };
      const { result } = renderHook(() => useFormState(schema, { initialState }));
      const {
        formActions: { clearManualErrors },
      } = result.current;

      act(() => {
        clearManualErrors();
      });

      const { formStatus } = result.current;

      expect(formStatus.valid).toBeNull();
    });

    it('should mark the form dirty with a manual key', () => {
      const initialState: InitialSchema = {
        name: 'John',
        info: { age: 30 },
        tags: ['a', 'b'],
      };
      const { result } = renderHook(() => useFormState(schema, { initialState }));
      const {
        formActions: { setDirty },
      } = result.current;

      act(() => {
        setDirty('#test');
      });

      const { formState, formStatus } = result.current;

      expect(formStatus.dirty).toBe(true);
      expect(formState.dirty.get('#test')).toBe(true);
    });

    it('should throw if set dirty with a manual key does not start with #', () => {
      const initialState: InitialSchema = {
        name: 'John',
        info: { age: 30 },
        tags: ['a', 'b'],
      };
      const { result } = renderHook(() => useFormState(schema, { initialState }));
      const {
        formActions: { setDirty },
      } = result.current;

      expect(() => {
        setDirty('test' as '#test');
      }).toThrow(TypeError);
    });

    it('should subscribe to changes', () => {
      const callback = vi.fn(
        (
          type: FormEventType,
          data: FormState<Schema>['data'],
          errors: FormState<Schema>['errors']
        ) => {
          expect(type).toBeOneOf(['change', 'submit']);
          expect(data.toObject().info.age).toBe(42);
          expect(errors.get((path) => path.info.age)).toBeUndefined();
          expect(errors.getManual('age')).toBeUndefined();
        }
      );

      const initialState: InitialSchema = {
        name: 'John',
        info: { age: 30 },
      };
      const { result } = renderHook(() => useFormState(schema, { initialState }));
      const {
        formActions: { change, validate },
        subscribe,
      } = result.current;

      const unsubscribe = subscribe(callback);

      act(() => {
        change((path) => path.info.age, 42);
        change((path) => path.info.email, 'some@email.org');
      });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(
        'change',
        expect.objectContaining({
          info: expect.objectContaining({ age: 42 }) as object,
        }),
        expect.objectContaining({}),
        0
      );

      act(() => {
        change((path) => path.info.birthDate, '12/31/2020');
      });

      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenCalledWith(
        'change',
        expect.objectContaining({
          info: expect.objectContaining({ birthDate: new Date(2020, 11, 31) }) as object,
        }),
        expect.objectContaining({}),
        0
      );

      act(() => {
        validate({ submit: true });
      });

      const { formStatus } = result.current;

      expect(formStatus.submitted).toBe(true);

      expect(callback).toHaveBeenCalledTimes(3);
      expect(callback).toHaveBeenCalledWith(
        'submit',
        expect.objectContaining({
          info: expect.objectContaining({ age: 42, birthDate: new Date(2020, 11, 31) }) as object,
        }),
        expect.objectContaining({}),
        1
      );

      act(() => {
        change('name', '');
      });

      expect(callback).toHaveBeenCalledTimes(4);
      expect(callback).toHaveBeenCalledWith(
        'change',
        expect.objectContaining({ name: '' }),
        expect.objectContaining({ name: 'Name is required' }),
        1
      );

      unsubscribe();

      act(() => {
        change('name', 'Tom');
      });

      expect(callback).toHaveBeenCalledTimes(4);
    });

    it('should change the form mode', () => {
      const initialState: InitialSchema = {
        name: 'John',
        info: { age: 30 },
        tags: ['a', 'b'],
      };
      const { result } = renderHook(() => useFormState(schema, { initialState }));
      const {
        formStatus,
        formActions: { setMode },
      } = result.current;

      expect(formStatus.mode).toBe('editable');
      expect(formStatus.disabled).toBe(false);
      expect(formStatus.readOnly).toBe(false);

      act(() => {
        setMode('readOnly');
      });

      const { formStatus: readOnlyFormStatus } = result.current;

      expect(readOnlyFormStatus.mode).toBe('readOnly');
      expect(readOnlyFormStatus.disabled).toBe(false);
      expect(readOnlyFormStatus.readOnly).toBe(true);

      act(() => {
        setMode('disabled');
      });

      const { formStatus: disabledFormStatus } = result.current;

      expect(disabledFormStatus.mode).toBe('disabled');
      expect(disabledFormStatus.disabled).toBe(true);
      expect(disabledFormStatus.readOnly).toBe(false);

      act(() => {
        setMode('editable');
      });

      const { formStatus: editableFormStatus } = result.current;

      expect(editableFormStatus.mode).toBe('editable');
      expect(editableFormStatus.disabled).toBe(false);
      expect(editableFormStatus.readOnly).toBe(false);
    });
  });

  describe('form element tests', () => {
    const submitFn = vi.fn();
    const errorFn = vi.fn();

    afterEach(() => {
      submitFn.mockReset();
      errorFn.mockReset();
    });

    const WatchedComponent = ({
      inferName,
      useWatch,
    }: {
      inferName: (nameOrPath: FormPath<typeof schema>, format?: 'bracket' | 'dot') => string;
      useWatch: (name: string, compute?: (value: string) => string) => string;
    }) => {
      const nameValue = useWatch(inferName((path) => path.name, 'dot'));
      const ageValue = useWatch(
        inferName((path) => path.info.age),
        (value) => (value === '0' ? '' : value)
      );
      const categoryValue = useWatch(inferName((path) => path.category));
      const activeValue = useWatch(inferName('isActive'));
      const archivedValue = useWatch('archivedSelector');
      const tag0Value = useWatch(inferName((path) => path.tags[0]));

      expect(() => {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        useWatch(' ');
      }).toThrow(TypeError);

      return (
        <>
          <p data-testid="watched-name">{nameValue}</p>
          <p data-testid="watched-age">{ageValue}</p>
          <p data-testid="watched-category">{categoryValue}</p>
          <p data-testid="watched-active">{activeValue}</p>
          <p data-testid="watched-archived">{archivedValue}</p>
          {tag0Value && <p data-testid="watched-tag-0">{tag0Value}</p>}
        </>
      );
    };

    const FormComponent = ({
      initialValue,
      initialMode,
      manualError,
      forwardRef,
      watch,
    }: {
      initialValue?: string;
      initialMode?: FormMode;
      manualError?: string;
      forwardRef?: Ref<HTMLFormElement>;
      watch?: boolean;
    }) => {
      const formRef = useRef<HTMLFormElement>(null);

      const {
        formState: { data },
        formStatus,
        formActions: { change, inferName, touch, setError, getSubmittedData },
        formHandlers: { handleSubmit },
        formClasses,
        Form,
        useWatch,
      } = useFormState(schema, {
        initialState: {
          name: initialValue ?? '',
          info: {
            age: 30,
          },
        },
        initialMode,
        watch: watch === true,
      });

      useEffect(() => {
        if (manualError) {
          setError('someProp', manualError);
        }
      }, [manualError, setError]);

      const onSubmit = async (submitState: SubmitState<Schema>) => {
        if (!submitState.valid) {
          if (
            formStatus.valid ||
            (!submitState.errors.get((path) => path.name) &&
              !submitState.errors.getManual('someProp'))
          ) {
            throw new Error('Mismatched form status');
          }

          return {}; // the state already has errors
        }

        if (!formStatus.valid) {
          throw new Error('Mismatched form status');
        }

        if (submitState.data.name === 'Ivan') {
          return { name: 'The name Ivan is not allowed', customError: 'true' };
        }

        await Promise.resolve(submitState.data);

        return true;
      };

      return (
        <Form
          ref={forwardRef ?? formRef}
          action={handleSubmit(onSubmit, { onSuccess: submitFn, onError: errorFn })}
          aria-label="main-form"
        >
          {formStatus.submitting && <p>Submitting...</p>}
          {formStatus.submitted && Boolean(getSubmittedData()?.data) && <p>Form Submitted</p>}
          <p title="name" className={formClasses('name', 'block', { prefix: 'form-text' })}>
            {data.name}
          </p>
          {watch !== false && <WatchedComponent inferName={inferName} useWatch={useWatch} />}
          <fieldset disabled={formStatus.disabled}>
            <label htmlFor="name">Name</label>
            <input
              type="hidden"
              name="id"
              defaultValue={data.name}
              onChange={(event) => {
                change('name', event.target.value);
              }}
            />
            <input
              type="text"
              id="name"
              name={inferName((path) => path.name, 'dot')}
              className={formClasses((path) => path.name)}
              readOnly={formStatus.readOnly}
              value={data.name}
              onBlur={() => {
                touch('name');
              }}
              onChange={(event) => {
                change('name', event.target.value);
              }}
            />
            <label htmlFor="age">Age</label>
            <textarea
              id="age"
              name={inferName((path) => path.info.age)}
              readOnly={formStatus.readOnly}
              defaultValue={data.info.age}
              onBlur={(event) => {
                change((path) => path.info.age, convert.toInt(event.target.value), {
                  touch: true,
                });
              }}
            />
            <label htmlFor="category">Category</label>
            {formStatus.readOnly ? (
              <input
                type="readonly"
                id="category"
                name={inferName((path) => path.category)}
                readOnly
                value={data.category}
              />
            ) : (
              <select
                id="category"
                name={inferName((path) => path.category)}
                value={data.category}
                onChange={(event) => {
                  change(
                    (path) => path.category,
                    convert.toLiteral<typeof data.category>(event.target.value, [
                      '',
                      'legacy',
                      'unconfirmed',
                    ]),
                    {
                      touch: true,
                    }
                  );
                }}
              >
                <option value="">None</option>
                <option value="legacy">Legacy</option>
                <option value="unconfirmed">Unconfirmed</option>
              </select>
            )}
            <label htmlFor="active">Active</label>
            <input
              type="checkbox"
              id="active"
              name={inferName((path) => path.isActive)}
              readOnly={formStatus.readOnly}
              checked={Boolean(data.isActive)}
              onChange={(event) => {
                change('isActive', event.target.checked, { touch: true });
              }}
            />
            <span role="group">
              <label className="inline-block cursor-pointer">
                <input
                  type="radio"
                  className="cursor-pointer mr-1.5"
                  id="archivedYes"
                  name="archivedSelector"
                  data-testid="archivedYes"
                  readOnly={formStatus.readOnly}
                  value={convert.toString(data.isArchived, { emptyStringAsFalse: true })}
                  checked={Boolean(data.isArchived)}
                  onChange={() => {
                    change('isArchived', true, { touch: true });
                  }}
                />
                Yes
              </label>
              <label className="inline-block cursor-pointer ml-3">
                <input
                  type="radio"
                  className="cursor-pointer mr-1.5"
                  id="archivedNo"
                  name="archivedSelector"
                  data-testid="archivedNo"
                  readOnly={formStatus.readOnly}
                  value={convert.toString(data.isArchived, { emptyStringAsFalse: true })}
                  checked={!data.isArchived}
                  onChange={() => {
                    change('isArchived', false, { touch: true });
                  }}
                />
                No
              </label>
            </span>
            {!formStatus.disabled && !formStatus.readOnly && (
              <>
                <button name="submitter" value="submit">
                  Submit
                </button>
                <button
                  name="submitter"
                  value="submitManual"
                  onClick={(e) => {
                    e.preventDefault();
                    submitForm(
                      formRef.current,
                      document.querySelector<HTMLElement>('button[value="submit"]')
                    );
                  }}
                >
                  Submit Manually
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    formRef.current?.submit();
                  }}
                >
                  Submit Fail
                </button>
                <button type="reset">Reset</button>
              </>
            )}
          </fieldset>
        </Form>
      );
    };

    const SimpleFormComponent = ({
      submitWithEnter,
    }: {
      submitWithEnter?: boolean | undefined;
    }) => {
      const {
        formState: { data, errors },
        formStatus: { submitted },
        formActions: { change, validate },
        Form,
      } = useFormState(schema, {
        initialState: {
          name: 'John',
          info: {
            age: 30,
          },
        },
      });

      const handleSubmit = (event: React.SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();

        validate({ submit: true });
      };

      return (
        <Form onSubmit={handleSubmit} submitWithEnter={submitWithEnter === true}>
          <p>Name: {data.name}</p>
          <input
            type="input"
            data-testid="nameInput"
            value={data.name}
            onChange={(e) => {
              change('name', e.target.value);
            }}
          />
          {errors.name && <p data-testid="nameError">Error: {errors.name}</p>}
          {submitted && <p>Submitted</p>}
          <button>Submit Form</button>
        </Form>
      );
    };

    it.each([true, false])('should render form with properties', (watch) => {
      const { getByLabelText, getByRole, getByTitle, queryByText } = render(
        <FormComponent watch={watch} />
      );

      const form = getByRole('form');
      const input = getByLabelText('Name');
      const name = getByTitle('name');
      const submittedInfo = queryByText('Form Submitted');

      fireEvent.change(input, { target: { value: 'John' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(form.hasAttribute('novalidate')).toBe(true);
      expect(name).toContainHTML('John');
      expect(submittedInfo).not.toBeInTheDocument();
    });

    it.each([true, false])('should add error and touched CSS classes', (watch) => {
      const { getByLabelText, getByTitle } = render(
        <FormComponent initialValue="John" watch={watch} />
      );

      const input = getByLabelText('Name');
      const name = getByTitle('name');

      fireEvent.change(input, { target: { value: '' } });
      fireEvent.blur(input);

      expect(input.classList).toContain('form-state__error');
      expect(input.classList).toContain('form-state__touched');
      expect(name.classList).toContain('form-text__error');
      expect(name.classList).toContain('form-text__touched');
    });

    it.each([true, false])('should submit form programatically', async (watch) => {
      const { getByLabelText, getByText, getByTitle, queryByText, findByText } = render(
        <FormComponent watch={watch} />
      );

      const input = getByLabelText('Name');
      const name = getByTitle('name');
      const submitButton = getByText('Submit Manually');

      fireEvent.change(input, { target: { value: 'John' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      fireEvent.click(submitButton);

      expect(getByText('Submitting...')).toBeInTheDocument();

      const submittedInfo = await findByText('Form Submitted');

      await waitFor(() => {
        expect(queryByText('Submitting...')).not.toBeInTheDocument();

        expect(submitFn).toHaveBeenCalledWith(
          expect.objectContaining({ name: 'John' }),
          expect.any(FormData)
        );
        expect(errorFn).not.toHaveBeenCalled();

        expect(name).toContainHTML('John');
        expect(submittedInfo).toBeInTheDocument();
      });
    });

    it.each([true, false])('should submit form with "handleSubmit"', async (watch) => {
      const { getByLabelText, getByTitle, getByText, queryByText, findByText } = render(
        <FormComponent watch={watch} />
      );

      const input = getByLabelText('Name');
      const name = getByTitle('name');
      const submitButton = getByText('Submit');

      fireEvent.change(input, { target: { value: 'John' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      fireEvent.click(submitButton);

      expect(getByText('Submitting...')).toBeInTheDocument();

      const submittedInfo = await findByText('Form Submitted');

      await waitFor(() => {
        expect(queryByText('Submitting...')).not.toBeInTheDocument();

        expect(submitFn).toHaveBeenCalledWith(
          expect.objectContaining({ name: 'John' }),
          expect.any(FormData)
        );
        expect(errorFn).not.toHaveBeenCalled();

        expect(name).toContainHTML('John');
        expect(submittedInfo).toBeInTheDocument();

        const formData = submitFn.mock.calls[0]?.[1] as FormData;
        expect(formData).toBeInstanceOf(FormData);

        expect(formData.has('id')).toBe(true);
        expect(formData.get('submitter')).toBe('submit');
      });
    });

    it.each([true, false])('should fail to submit form using "submit"', async (watch) => {
      const domConsoleSpy = vi
        .spyOn(
          (
            globalThis as typeof globalThis & {
              _virtualConsole: {
                emit: ReturnType<typeof vi.fn>;
              };
            }
          )._virtualConsole,
          'emit'
        )
        .mockImplementation(() => {});

      const { getByLabelText, getByText, queryByText } = render(<FormComponent watch={watch} />);

      const input = getByLabelText('Name');
      const submitButton = getByText('Submit Fail');

      fireEvent.change(input, { target: { value: 'John' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(queryByText('Form Submitted')).not.toBeInTheDocument();
      });

      expect(domConsoleSpy).toHaveBeenCalledTimes(1);

      domConsoleSpy.mockReset();
    });

    it.each([true, false])('should fail to submit form with name "Ivan"', async (watch) => {
      const { getByLabelText, getByText, queryByText } = render(<FormComponent watch={watch} />);

      const input = getByLabelText('Name');
      const submitButton = getByText('Submit');

      fireEvent.change(input, { target: { value: 'Ivan' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(submitFn).not.toHaveBeenCalled();
        expect(errorFn).toHaveBeenCalledWith(
          expect.objectContaining({
            errors: expect.objectContaining({
              name: 'The name Ivan is not allowed',
              customError: 'true',
            }) as object,
          }),
          expect.objectContaining({ valid: false, submitted: false })
        );

        expect(queryByText('Form Submitted')).not.toBeInTheDocument();
      });
    });

    it.each([true, false])(
      'should not submit form with "handleSubmit" with errors',
      async (watch) => {
        const { getByLabelText, getByText, queryByText } = render(
          <FormComponent initialValue="John" watch={watch} />
        );

        const input = getByLabelText('Name');
        const submitButton = getByText('Submit');

        fireEvent.change(input, { target: { value: '' } });
        fireEvent.blur(input);

        expect(input.classList).toContain('form-state__error');
        expect(input.classList).toContain('form-state__touched');

        fireEvent.click(submitButton);

        await waitFor(() => {
          expect(submitFn).not.toHaveBeenCalled();
          expect(errorFn).toHaveBeenCalledWith(
            expect.objectContaining({
              errors: expect.objectContaining({ name: 'Name is required' }) as object,
            }),
            expect.objectContaining({ valid: false, submitted: false })
          );

          expect(queryByText('Form Submitted')).not.toBeInTheDocument();
        });
      }
    );

    it.each([true, false])(
      'should not submit form with "handleSubmit" with errors without validation',
      async (watch) => {
        const { getByText, queryByText } = render(<FormComponent watch={watch} />);

        const submitButton = getByText('Submit');

        fireEvent.click(submitButton);

        await waitFor(() => {
          expect(submitFn).not.toHaveBeenCalled();
          expect(errorFn).toHaveBeenCalledWith(
            expect.objectContaining({
              errors: expect.objectContaining({ name: 'Name is required' }) as object,
            }),
            expect.objectContaining({ valid: false, submitted: false })
          );

          expect(queryByText('Form Submitted')).not.toBeInTheDocument();
        });
      }
    );

    it.each([true, false])(
      'should not submit form with "handleSubmit" with initial errors',
      async (watch) => {
        const { getByLabelText, getByText, queryByText } = render(<FormComponent watch={watch} />);

        const input = getByLabelText('Name');
        const submitButton = getByText('Submit');

        fireEvent.change(input, { target: { value: '' } });
        fireEvent.blur(input);

        fireEvent.click(submitButton);

        await waitFor(() => {
          expect(submitFn).not.toHaveBeenCalled();
          expect(errorFn).toHaveBeenCalledWith(
            expect.objectContaining({
              errors: expect.objectContaining({ name: 'Name is required' }) as object,
            }),
            expect.objectContaining({ valid: false, submitted: false })
          );

          expect(queryByText('Form Submitted')).not.toBeInTheDocument();
        });
      }
    );

    it.each([true, false])(
      'should not submit form with "handleSubmit" with initial errors without validations',
      async (watch) => {
        const { getByText, queryByText } = render(<FormComponent watch={watch} />);

        const submitButton = getByText('Submit');

        fireEvent.click(submitButton);

        await waitFor(() => {
          expect(submitFn).not.toHaveBeenCalled();
          expect(errorFn).toHaveBeenCalledWith(
            expect.objectContaining({
              errors: expect.objectContaining({ name: 'Name is required' }) as object,
            }),
            expect.objectContaining({ valid: false, submitted: false })
          );

          expect(queryByText('Form Submitted')).not.toBeInTheDocument();
        });
      }
    );

    it.each([true, false])(
      'should not submit form with "handleSubmit" with manual errors',
      async (watch) => {
        const { getByLabelText, getByText, queryByText } = render(
          <FormComponent manualError="A manual error" watch={watch} />
        );

        const input = getByLabelText('Name');
        const submitButton = getByText('Submit');

        fireEvent.change(input, { target: { value: 'John' } });
        fireEvent.keyDown(input, { key: 'Enter' });

        fireEvent.click(submitButton);

        await waitFor(() => {
          expect(submitFn).not.toHaveBeenCalled();
          expect(errorFn).toHaveBeenCalledWith(
            expect.objectContaining({
              errors: expect.objectContaining({ someProp: 'A manual error' }) as object,
            }),
            expect.objectContaining({ valid: false, submitted: false })
          );

          expect(queryByText('Form Submitted')).not.toBeInTheDocument();
        });
      }
    );

    it.each([true, false])(
      'should not submit form with "handleSubmit" with manual errors without validations',
      async (watch) => {
        const { getByText, queryByText } = render(
          <FormComponent initialValue="John" manualError="A manual error" watch={watch} />
        );

        const submitButton = getByText('Submit');

        fireEvent.click(submitButton);

        await waitFor(() => {
          expect(submitFn).not.toHaveBeenCalled();
          expect(errorFn).toHaveBeenCalledWith(
            expect.objectContaining({
              errors: expect.objectContaining({ someProp: 'A manual error' }) as object,
            }),
            expect.objectContaining({ valid: false, submitted: false })
          );

          expect(queryByText('Form Submitted')).not.toBeInTheDocument();
        });
      }
    );

    it.each([true, false])('should reset form with properties', (watch) => {
      const { getByLabelText, getByText, getByTitle } = render(<FormComponent watch={watch} />);

      const input = getByLabelText('Name');
      const name = getByTitle('name');
      const resetButton = getByText('Reset');

      fireEvent.change(input, { target: { value: 'John' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(name).toContainHTML('John');

      fireEvent.click(resetButton);

      expect(name).toContainHTML('');
    });

    it('should watch the changes', async () => {
      const user = userEvent.setup();

      const { getByLabelText, getByTestId, getByText } = render(
        <FormComponent initialValue="Tom" watch />
      );

      const nameInput = getByLabelText('Name');
      const ageInput = getByLabelText('Age');
      const categorySelect = getByLabelText('Category');
      const activeCheckbox = getByLabelText('Active');
      const archivedYesRadio = getByTestId('archivedYes');
      const archivedNoRadio = getByTestId('archivedNo');
      const resetButton = getByText('Reset');

      const watchedName = getByTestId('watched-name');
      const watchedAge = getByTestId('watched-age');
      const watchedCategory = getByTestId('watched-category');
      const watchedActive = getByTestId('watched-active');
      const watchedArchived = getByTestId('watched-archived');

      expect(nameInput).toHaveValue('Tom');
      expect(watchedName).toHaveTextContent('Tom');

      expect(ageInput).toHaveValue('30');
      expect(watchedAge).toHaveTextContent('30');

      expect(categorySelect).toHaveValue('');
      expect(watchedCategory).toHaveTextContent('');

      expect(activeCheckbox).toBeChecked();
      expect(watchedActive).toHaveTextContent('on');

      expect(archivedYesRadio).not.toBeChecked();
      expect(archivedNoRadio).toBeChecked();
      expect(watchedArchived).toHaveTextContent('false');

      await user.clear(nameInput);
      await user.keyboard('John{Tab}');

      await user.clear(ageInput);
      await user.keyboard('25{Tab}');

      await user.selectOptions(categorySelect, 'legacy');

      await user.click(activeCheckbox);
      await user.click(archivedYesRadio);

      expect(nameInput).toHaveValue('John');
      expect(watchedName).toHaveTextContent('John');

      expect(ageInput).toHaveValue('25');
      expect(watchedAge).toHaveTextContent('25');

      expect(categorySelect).toHaveValue('legacy');
      expect(watchedCategory).toHaveTextContent('legacy');

      expect(activeCheckbox).not.toBeChecked();
      expect(watchedActive).toHaveTextContent('');

      expect(archivedYesRadio).toBeChecked();
      expect(archivedNoRadio).not.toBeChecked();
      expect(watchedArchived).toHaveTextContent('true');

      await user.click(resetButton);

      expect(nameInput).toHaveValue('Tom');
      expect(watchedName).toHaveTextContent('Tom');

      expect(ageInput).toHaveValue('30');
      expect(watchedAge).toHaveTextContent('30');

      expect(categorySelect).toHaveValue('');
      expect(watchedCategory).toHaveTextContent('');

      expect(activeCheckbox).toBeChecked();
      expect(watchedActive).toHaveTextContent('on');

      expect(archivedYesRadio).not.toBeChecked();
      expect(archivedNoRadio).toBeChecked();
      expect(watchedArchived).toHaveTextContent('false');
    });

    it('should watch the changes with a custom ref', async () => {
      const user = userEvent.setup();

      const { getByLabelText, getByTestId } = render(<FormComponent forwardRef={() => {}} watch />);

      const input = getByLabelText('Name');
      const watchedName = getByTestId('watched-name');

      await user.click(input);
      await user.keyboard('John{Enter}');

      expect(input).toHaveValue('John');
      expect(watchedName).toHaveTextContent('John');
    });

    it('throws when watch is not enabled and useWatch is defined', () => {
      expect(() => render(<FormComponent forwardRef={() => {}} />)).toThrow(/"watch" property/);
    });

    it('should render form is the editable mode', () => {
      const { getByLabelText } = render(<FormComponent watch={false} />);

      const nameInput = getByLabelText('Name');
      const categorySelect = getByLabelText('Category');

      expect(nameInput).toBeEnabled();
      expect(nameInput).not.toHaveAttribute('readonly');

      expect(categorySelect).toBeEnabled();
      expect(categorySelect).not.toHaveAttribute('readonly');
      expect(categorySelect.nodeName.toLowerCase()).toBe('select');
    });

    it('should render form is the editable mode when the mode is set', () => {
      const { getByLabelText } = render(<FormComponent initialMode="editable" watch={false} />);

      const nameInput = getByLabelText('Name');
      const categorySelect = getByLabelText('Category');

      expect(nameInput).toBeEnabled();
      expect(nameInput).not.toHaveAttribute('readonly');

      expect(categorySelect).toBeEnabled();
      expect(categorySelect).not.toHaveAttribute('readonly');
      expect(categorySelect.nodeName.toLowerCase()).toBe('select');
    });

    it('should mark inputs readonly and hide selects/buttons when the form is readOnly', () => {
      const { getByLabelText, getByTestId, queryByText } = render(
        <FormComponent initialMode="readOnly" watch={false} />
      );

      const nameInput = getByLabelText('Name');
      const ageInput = getByLabelText('Age');
      const categorySelect = getByLabelText('Category');
      const activeCheckbox = getByLabelText('Active');
      const archivedYesRadio = getByTestId('archivedYes');
      const archivedNoRadio = getByTestId('archivedNo');
      const resetButton = queryByText('Reset');

      expect(nameInput).toHaveAttribute('readonly');
      expect(ageInput).toHaveAttribute('readonly');
      expect(categorySelect).toHaveAttribute('readonly');
      expect(categorySelect.nodeName.toLowerCase()).toBe('input');
      expect(activeCheckbox).toHaveAttribute('readonly');
      expect(archivedYesRadio).toHaveAttribute('readonly');
      expect(archivedNoRadio).toHaveAttribute('readonly');
      expect(resetButton).not.toBeInTheDocument();

      expect(nameInput.classList).toContain('form-state__readonly');
    });

    it('should disable inputs and hide buttons when the form is disabled', () => {
      const { getByLabelText, getByTestId, queryByText } = render(
        <FormComponent initialMode="disabled" watch={false} />
      );

      const nameInput = getByLabelText('Name');
      const ageInput = getByLabelText('Age');
      const categorySelect = getByLabelText('Category');
      const activeCheckbox = getByLabelText('Active');
      const archivedYesRadio = getByTestId('archivedYes');
      const archivedNoRadio = getByTestId('archivedNo');
      const resetButton = queryByText('Reset');

      expect(nameInput).toBeDisabled();
      expect(ageInput).toBeDisabled();
      expect(categorySelect).toBeDisabled();
      expect(categorySelect.nodeName.toLowerCase()).toBe('select');
      expect(activeCheckbox).toBeDisabled();
      expect(archivedYesRadio).toBeDisabled();
      expect(archivedNoRadio).toBeDisabled();
      expect(resetButton).not.toBeInTheDocument();

      expect(nameInput.classList).toContain('form-state__disabled');
    });

    it('submits a simple form using onSubmit method', () => {
      const { getByText, queryByTestId } = render(<SimpleFormComponent />);

      const submitButton = getByText('Submit Form');
      fireEvent.click(submitButton);

      const nameError = queryByTestId('nameError');
      const submittedElement = getByText('Submitted');

      expect(nameError).not.toBeInTheDocument();
      expect(submittedElement).toBeInTheDocument();
    });

    it('does not submit a simple form by pressing Enter', async () => {
      const user = userEvent.setup();

      const { getByTestId, queryByText } = render(<SimpleFormComponent />);

      const input = getByTestId('nameInput');

      await user.click(input);
      await user.keyboard('{Enter}');

      const submittedElement = queryByText('Submitted');

      expect(submittedElement).not.toBeInTheDocument();
    });

    it('submits a simple form with the "submitWithEnter" prop by pressing Enter', async () => {
      const user = userEvent.setup();

      const { getByTestId, getByText, queryByTestId } = render(
        <SimpleFormComponent submitWithEnter />
      );

      const input = getByTestId('nameInput');

      await user.click(input);
      await user.keyboard('{Enter}');

      const nameError = queryByTestId('nameError');
      const submittedElement = getByText('Submitted');

      expect(nameError).not.toBeInTheDocument();
      expect(submittedElement).toBeInTheDocument();
    });

    it('submits a simple form after changing the name', () => {
      const { getByTestId, getByText, queryByTestId } = render(<SimpleFormComponent />);

      const input = getByTestId('nameInput');
      fireEvent.change(input, { target: { value: 'Todd' } });

      const nameElement = getByText('Name: Todd');

      const submitButton = getByText('Submit Form');
      fireEvent.click(submitButton);

      const nameError = queryByTestId('nameError');
      const submittedElement = getByText('Submitted');

      expect(nameElement).toBeInTheDocument();
      expect(nameError).not.toBeInTheDocument();
      expect(submittedElement).toBeInTheDocument();
    });

    it('fails to submit a simple form after clearing the name', () => {
      const { getByTestId, getByText, queryByText } = render(<SimpleFormComponent />);

      const input = getByTestId('nameInput');
      fireEvent.change(input, { target: { value: '' } });

      const submitButton = getByText('Submit Form');
      fireEvent.click(submitButton);

      const nameError = getByTestId('nameError');
      const submittedElement = queryByText('Submitted');

      expect(nameError).toBeInTheDocument();
      expect(submittedElement).not.toBeInTheDocument();
    });

    it('fails to find the submit button in an unmounted form', () => {
      const { queryByText, unmount } = render(<SimpleFormComponent />);

      unmount();

      const submitButton = queryByText('Submit Form');

      expect(submitButton).not.toBeInTheDocument();
    });
  });
});
