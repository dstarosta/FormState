import { useEffect, useRef } from 'react';
import { describe, expect, it, afterEach, vi } from 'vitest';
import { act, cleanup, fireEvent, render, renderHook, waitFor } from '@testing-library/react';

import { submitForm, useFormState, z, type DeepPartial, type FormState } from '.';
import type { SubmitState } from './form-types';

describe('useFormState', () => {
  const schema = z.strictObject({
    name: z
      .formString(
        z
          .string()
          .regex(/^[\d'A-Za-z-]*$/)
          .max(25),
        {
          required: true,
          error: 'Name is required',
        }
      )
      .describe('Name'),
    info: z
      .object({
        uuid: z.symbol(),
        age: z
          .formNumber(z.number().min(1, 'Age must be > 0'), {
            required: true,
            error: 'Age is required',
          })
          .describe('Age'),
        email: z.formString(z.string({ error: 'Invalid email' })).describe('Email'),
        birthDate: z
          .formDate(
            z
              .date()
              .min(new Date(2020, 0, 1), 'Invalid date range')
              .max(new Date(2039, 11, 31), 'Invalid date range'),
            { required: false, dateFormat: 'MM/dd/yyyy' }
          )
          .describe('Birth date'),
      })
      .describe('Info'),
    tags: z
      .formArray(
        z
          .string()
          .max(255)
          .regex(/^[\w\\-]*$/)
          .describe('Tag'),
        {
          required: true,
          minLength: 0,
          maxLength: 5,
        }
      )
      .nonoptional()
      .describe('Tags'),
    category: z.formValues(['legacy', 'unconfirmed']).describe('Category'),
    isActive: z.formBoolean(z.boolean()).describe('Is record active?'),
    version: z.formNumber(z.number().min(0).max(9999999)).describe('Record version'),
    registeredOn: z.formDate(z.date()),
    updateDates: z.formArray(z.date().max(new Date(2099, 11, 31))),
    previousVersions: z.formArray(z.number().max(9999)),
  });

  type Schema = z.infer<typeof schema>;
  type InitialSchema = DeepPartial<Schema>;

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  describe('state and status tests', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useFormState(schema, { validateOnInit: true }));
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
        isActive: '',
        version: '',
        registeredOn: '',
        previousVersions: [],
        updateDates: [],
        toObject: formState.data.toObject,
      };

      expect(formState.data).toEqual(expectedData);
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
      expect(formState.data.tags).toEqual(['a', 'b']);
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
      expect(formState.data.tags).toEqual([]);
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
      expect(formState.data.tags).toEqual(['a', 'b']);
      expect(formState.touched.tags).toBe(false);
    });

    it('should NOT validate on init by default', () => {
      const { result } = renderHook(() => useFormState(schema));
      const { formState, formStatus } = result.current;

      expect(formState.errors).not.toHaveProperty('name');
      expect(formState.errors).not.toHaveProperty('age');
      expect(formStatus.valid).toBeNull();
    });

    it('should validate on init when validateOnInit is true', () => {
      const { result } = renderHook(() => useFormState(schema, { validateOnInit: true }));
      const { formState, formStatus } = result.current;

      expect(formState.errors.name).toBe('Name is required');
      expect(formState.errors.get((path) => path.info.age)).toBe('Age is required');
      expect(formStatus.valid).toBe(false);
    });

    it('should not produce errors on initial state change when validateOnInit is false', async () => {
      const initialState: InitialSchema = {
        name: '',
        info: { age: 30 },
      };
      const { result } = renderHook(() => useFormState(schema, { initialState }));

      await waitFor(() => {
        const { formState, formStatus } = result.current;

        expect(formStatus.valid).toBeNull();
        expect(formState.errors).not.toHaveProperty('name');
        expect(formState.errors).not.toHaveProperty('age');
      });
    });

    it('should produce errors on initial state change when validateOnInit is true', async () => {
      const initialState: InitialSchema = {
        name: '',
        info: { age: 0 },
      };
      const { result } = renderHook(() =>
        useFormState(schema, { initialState, validateOnInit: true })
      );

      await waitFor(() => {
        const { formState, formStatus } = result.current;

        expect(formStatus.valid).toBe(false);
        expect(formState.errors.name).toBe('Name is required');
        expect(formState.errors.get((path) => path.info.age)).toBe('Age must be > 0');
      });
    });

    it('should change initial state after submit', async () => {
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

      validate({
        submit: true,
        callback: (state, status) => {
          expect(state.data.name).toBe('Jonathan');
          expect(state.data.info.age).toBe(29);
          expect(status.valid).toBe(true);
          expect(status.submitted).toBe(true);
        },
      });

      act(() => {
        reset();
      });

      await waitFor(() => {
        const { formState } = result.current;

        expect(formState.data.name).toBe('Jonathan');
        expect(formState.data.info.age).toBe(29);
      });
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
      expect((formState.data.info.birthDate as Date).toISOString()).toMatch(/^2020-12-31T00:00:00/);
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

      expect(formState.data.tags).toEqual(['x', 'y']);
    });

    it('should update initial state reactively', async () => {
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
      rerender(); // required to updated the initial state of the hook

      await waitFor(() => {
        const { formState } = result.current;

        expect(formState.data.name).toBe('Tom');
        expect(formState.data.info.age).toBe(29);
      });
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
      };
      const { result } = renderHook(() =>
        useFormState(schema, { initialState, validateOnInit: true })
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
      expect(data.isActive).toBe('');
      expect(data.version).toBe('');

      const request = data.toObject();

      expect(request.name).toBe('John');
      expect(request.info.age).toBe(30);
      expect(request.info.birthDate).toBeInstanceOf(Date);
      expect(request.info.email).toBe('');
      expect(request.tags).toHaveLength(2);
      expect(request.tags[0]).toBe('a');
      expect(request.tags[1]).toBe('b');
      expect(request.category).toBe('unconfirmed');
      expect(request.info.uuid).toBeUndefined();
      expect(request.isActive).toBeUndefined();
      expect(request.version).toBeUndefined();

      // Resetting the value
      Object.defineProperty(globalThis, 'isSecureContext', {
        value: prevIsSecureContext,
        writable: true,
        configurable: true,
      });
    });
  });

  describe('form actions', () => {
    it('should produce errors on initial state change when validateOnInit is false but previous errors exist', async () => {
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

      await waitFor(() => {
        const { formState } = result.current;

        expect(formState.errors.name).toBe('Name is required');
        expect(formState.data.name).toBe('');
        expect(formState.data.info.age).toBe(30); // was not modified, so affected by the initial state change
      });
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
      expect(formState.ranges.version).toEqual({ min: 0, max: 9999999, format: 'integer' });
      expect(formState.ranges.get((path) => path.version)).toEqual({
        min: 0,
        max: 9999999,
        format: 'integer',
      });
      expect(formState.ranges.get((path) => path.info.birthDate)).toEqual({
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

      const validateState = (state: FormState<Schema>) => {
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
        expect(state.ranges.version).toEqual({ min: 0, max: 9999999, format: 'integer' });
        expect(state.ranges.get((path) => path.version)).toEqual({
          min: 0,
          max: 9999999,
          format: 'integer',
        });
        expect(state.ranges.get((path) => path.info.birthDate)).toEqual({
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
          callback: validateState,
        });
        change('version', 1, {
          callback: validateState,
        });
        change((path) => path.info.age, 51, {
          callback: validateState,
        });
      });

      expect(data.name).toBe('John');
      expect(data.version).toBe('');
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

    it('should call a debounced change callback once', () => {
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

      const validateState = (state: FormState<Schema>) => {
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
          callback: validateState,
          callbackInterval: interval,
        });
        change('version', 1, {
          callback: validateState,
          callbackInterval: interval,
        });
        change((path) => path.info.age, 51, {
          callback: validateState,
          callbackInterval: interval,
        });
      });

      act(() => {
        vi.advanceTimersByTime(interval * 5);
      });

      expect(data.name).toBe('John');
      expect(data.version).toBe('');
      expect(data.info.age).toBe(18);

      expect(updateCounter).toBe(1); // debounced callbacks
    });

    it('should call an unstable debounced change callback n times while keeping cache size in check', () => {
      vi.useFakeTimers();

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
        change('name', 'Alice', {
          touch: true,
          callback: () => {
            ++updateCounter;
          },
          callbackInterval: interval,
        });
        change('version', 1, {
          callback: () => {
            ++updateCounter;
          },
          callbackInterval: interval,
        });
        change((path) => path.info.age, 51, {
          callback: () => {
            ++updateCounter;
          },
          callbackInterval: interval,
        });
      });

      act(() => {
        vi.advanceTimersByTime(interval * 5);
      });

      expect(updateCounter).toBe(3); // debounced callbacks
    });

    it('should call the second debounced change callback', () => {
      vi.useFakeTimers();

      const { result } = renderHook(() => useFormState(schema));
      const {
        formActions: { change },
      } = result.current;

      let updateCounter = 0;

      const validateState = () => {
        ++updateCounter;
      };

      const interval = 1000;

      act(() => {
        change('name', 'Alice', {
          touch: true,
          callback: validateState,
        });
        change('version', 1, {
          callback: validateState,
          callbackInterval: interval,
        });
        change((path) => path.info.age, 51, {
          callback: validateState,
        });
      });

      act(() => {
        vi.advanceTimersByTime(interval * 5);
      });

      expect(updateCounter).toBe(2);
    });

    it('should call the debounced change callback once for rapid changes', () => {
      vi.useFakeTimers();

      const { result } = renderHook(() => useFormState(schema));
      const {
        formActions: { change },
      } = result.current;

      let updateCounter = 0;

      const validateState = () => {
        ++updateCounter;
      };

      const interval = 1000;

      act(() => {
        change('name', 'Alice', {
          touch: true,
          callback: validateState,
          callbackInterval: interval,
        });
        change('version', 1, {
          callback: validateState,
          callbackInterval: interval,
        });
        change((path) => path.info.age, 51, {
          callback: validateState,
          callbackInterval: interval,
        });
      });

      act(() => {
        vi.advanceTimersByTime(interval / 5);
      });

      act(() => {
        change('name', 'Allison', {
          touch: true,
          callback: validateState,
          callbackInterval: interval,
        });
        change('version', 2, {
          callback: validateState,
          callbackInterval: interval,
        });
      });

      act(() => {
        vi.advanceTimersByTime(interval * 5);
      });

      expect(updateCounter).toBe(1);
    });

    it('should call the debounced change callback twice for sequential changes', () => {
      vi.useFakeTimers();

      const { result } = renderHook(() => useFormState(schema));
      const {
        formActions: { change },
      } = result.current;

      let updateCounter = 0;

      const validateState = () => {
        ++updateCounter;
      };

      const interval = 1000;

      act(() => {
        change('name', 'Alice', {
          touch: true,
          callback: validateState,
          callbackInterval: interval,
        });
        change('version', 1, {
          callback: validateState,
          callbackInterval: interval,
        });
        change((path) => path.info.age, 51, {
          callback: validateState,
          callbackInterval: interval,
        });
      });

      act(() => {
        vi.advanceTimersByTime(interval + 1);
      });

      act(() => {
        change('name', 'Allison', {
          touch: true,
          callback: validateState,
          callbackInterval: interval,
        });
        change('version', 2, {
          callback: validateState,
          callbackInterval: interval,
        });
      });

      act(() => {
        vi.advanceTimersByTime(interval * 5);
      });

      expect(updateCounter).toBe(2);
    });

    it('should not called debounced change callbacks if unmounted', () => {
      vi.useFakeTimers();

      const { result, unmount } = renderHook(() => useFormState(schema));
      const {
        formActions: { change },
      } = result.current;

      let updateCounter = 0;

      const validateState = () => {
        ++updateCounter;
      };

      const interval = 1000;

      act(() => {
        change('name', 'Alice', {
          touch: true,
          callback: validateState,
          callbackInterval: interval,
        });
        change('version', 1, {
          callback: validateState,
          callbackInterval: interval,
        });
        change((path) => path.info.age, 51, {
          callback: validateState,
          callbackInterval: interval,
        });
      });

      unmount();

      act(() => {
        vi.advanceTimersByTime(interval * 5);
      });

      expect(updateCounter).toBe(0);
    });

    it('should update field without validation when validate is false', () => {
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

      expect(formState.data.toObject()).toEqual({});
      expect(formStatus.touched).toEqual(false);
    });

    it('should validate field when touched and validate option is true', () => {
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
        useFormState(schema, { initialState, validateOnInit: true })
      );
      const {
        formActions: { change, reset },
      } = result.current;

      act(() => {
        change('name', 'Jonathan');
        change((path) => path.info.age, 29);
        reset();
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

        setError('name', 'Unsupported name');
        setError('isActive', '');

        reset({ names: ['name'], resetTouched: false });
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

        reset({ names: ['name'], retainData: true });
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

        reset({ names: ['name'], resetTouched: true, resetSubmitted: true });
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
        reset();
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
        useFormState(schema, { initialState, validateOnInit: true })
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
        change('name', '');
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

        reset({ resetTouched: true, resetSubmitted: true });
      });

      const { formState, formStatus } = result.current;

      expect(formState.data.name).toBe('John');
      expect(formState.data.info.age).toBe(30);
      expect(formStatus.dirty).toBe(false);
      expect(formStatus.touched).toBe(false);
    });

    it('should reset the form and reset submitted but retain data', () => {
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

        reset({ retainData: true, resetSubmitted: true, resetTouched: false });
      });

      const { formState, formStatus } = result.current;

      expect(formState.data.name).toBe('Jonathan');
      expect(formState.data.info.age).toBe(29);
      expect(formStatus.dirty).toBe(false);
      expect(formStatus.touched).toBe(true);
    });

    it('should submit form', async () => {
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

      validate({ submit: true });

      await waitFor(() => {
        const { formStatus } = result.current;

        expect(formStatus.submitted).toBe(true);
        expect(formStatus.valid).toBe(true);
        expect(formStatus.dirty).toBe(false);
        expect(formStatus.touched).toBe(false);
      });
    });

    it('should submit form without resetting touched or dirty states', async () => {
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

      validate({
        submit: true,
        resetDirty: false,
        resetTouched: false,
      });

      await waitFor(() => {
        const { formStatus } = result.current;

        expect(formStatus.submitted).toBe(true);
        expect(formStatus.dirty).toBe(true);
        expect(formStatus.touched).toBe(true);
      });
    });

    it('should not submit form with errors', async () => {
      const { result } = renderHook(() => useFormState(schema));
      const {
        formActions: { change, validate },
      } = result.current;

      act(() => {
        change('name', 'Jonathan', { touch: true });
        change((path) => path.info.age, 29, { touch: true });
      });

      validate({ submit: true });

      await waitFor(() => {
        const { formStatus } = result.current;

        expect(formStatus.submitted).toBe(false);
        expect(formStatus.dirty).toBe(true);
        expect(formStatus.touched).toBe(true);
      });
    });

    it('should not submit form with manual errors', async () => {
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

      validate({ submit: true });

      await waitFor(() => {
        const { formStatus } = result.current;

        expect(formStatus.submitted).toBe(false);
        expect(formStatus.valid).toBe(false);
      });
    });

    it('should set and clear manual errors', async () => {
      const initialState: InitialSchema = {
        name: 'John',
        info: { age: 30 },
        tags: ['a', 'b'],
      };
      const { result } = renderHook(() => useFormState(schema, { initialState }));
      const {
        formActions: { clearManualErrors, setError, validate },
      } = result.current;

      act(() => {
        setError('id', 'Invalid ID');
        setError((path) => path.isActive, 'What is active?');
        setError((path) => path.isActive); // cleared the error

        validate();
      });

      await waitFor(() => {
        const { formState, formStatus } = result.current;

        expect(formStatus.validSchema).toBe(true);
        expect(formStatus.valid).toBe(false);
        expect(formState.errors.getManual('id')).toMatch('Invalid ID');
        expect(formState.errors.getManual('isActive')).toBeUndefined();
      });

      act(() => {
        clearManualErrors();
      });

      await waitFor(() => {
        const { formState, formStatus } = result.current;

        expect(formStatus.validSchema).toBe(true);
        expect(formStatus.valid).toBe(true);
        expect(formState.errors.getManual('id')).toBeUndefined();
      });
    });

    it('should mark the form dirty with a manual key', async () => {
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

      await waitFor(() => {
        const { formState, formStatus } = result.current;

        expect(formStatus.dirty).toBe(true);
        expect(formState.dirty.get('#test')).toBe(true);
      });
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

      expect(() => setDirty('test' as '#test')).toThrow(TypeError);
    });
  });

  describe('form element tests', () => {
    const submitFn = vi.fn();

    afterEach(() => {
      submitFn.mockReset();
    });

    const FormComponent = ({
      initialValue,
      manualError,
    }: {
      initialValue?: string;
      manualError?: string;
    }) => {
      const formRef = useRef<HTMLFormElement>(null);

      const {
        formState: { data },
        formStatus,
        formActions: { change, touch, setError },
        formHandlers: { handleSubmit },
        formClasses,
        Form,
      } = useFormState(schema, {
        initialState: {
          name: initialValue ?? '',
          info: {
            age: 30,
          },
        },
      });

      useEffect(() => {
        if (manualError) {
          setError('someProp', 'manualError');
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

          submitFn(false);
          return false;
        }

        if (!formStatus.valid || !submitState.data) {
          throw new Error('Mismatched form status');
        }

        await Promise.resolve(submitState.data);

        submitFn(true);
        return true;
      };

      return (
        <Form ref={formRef} action={handleSubmit(onSubmit)} aria-label="main-form">
          {formStatus.submitting && <p>Submitting...</p>}
          {formStatus.submitted && <p>Form Submitted</p>}
          <p title="name" className={formClasses('name', 'block', { classPrefix: 'form-text' })}>
            {data.name}
          </p>
          <input
            type="text"
            name="name"
            className={formClasses((path) => path.name)}
            value={data.name}
            onBlur={() => touch('name')}
            onChange={(event) => change('name', event.target.value)}
          />
          <button type="submit">Submit</button>
          <button type="button" onClick={() => submitForm(formRef.current)}>
            Submit Manually
          </button>
          <button type="button" onClick={() => formRef.current?.submit()}>
            Submit Fail
          </button>
          <button type="reset">Reset</button>
        </Form>
      );
    };

    it('should render form with properties', () => {
      const { getByRole, getByTitle, queryByText } = render(<FormComponent />);

      const form = getByRole('form');
      const input = getByRole('textbox');
      const name = getByTitle('name');
      const submittedInfo = queryByText('Form Submitted');

      act(() => {
        fireEvent.change(input, { target: { value: 'John' } });
        fireEvent.keyDown(input, { key: 'Enter' });
      });

      expect(form.hasAttribute('novalidate')).toBe(true);
      expect(name).toContainHTML('John');
      expect(submittedInfo).not.toBeInTheDocument();
    });

    it('should add error and touched CSS classes', () => {
      const { getByRole, getByTitle } = render(<FormComponent initialValue="John" />);

      const input = getByRole('textbox');
      const name = getByTitle('name');

      act(() => {
        fireEvent.change(input, { target: { value: '' } });
        fireEvent.blur(input);
      });

      expect(input.classList).toContain('form-state__error');
      expect(input.classList).toContain('form-state__touched');
      expect(name.classList).toContain('form-text__error');
      expect(name.classList).toContain('form-text__touched');
    });

    it('should submit form programatically', async () => {
      const { getByRole, getByText, getByTitle, queryByText, findByText } = render(
        <FormComponent />
      );

      const input = getByRole('textbox');
      const name = getByTitle('name');
      const submitButton = getByText('Submit Manually');

      act(() => {
        fireEvent.change(input, { target: { value: 'John' } });
        fireEvent.keyDown(input, { key: 'Enter' });
      });

      act(() => {
        fireEvent.click(submitButton);
      });

      expect(getByText('Submitting...')).toBeInTheDocument();

      const submittedInfo = await findByText('Form Submitted');

      expect(queryByText('Submitting...')).not.toBeInTheDocument();
      expect(submitFn).toBeCalledWith(true);
      expect(name).toContainHTML('John');
      expect(submittedInfo).toBeInTheDocument();
    });

    it('should submit form with "handleSubmit"', async () => {
      const { getByRole, getByTitle, getByText, queryByText, findByText } = render(
        <FormComponent />
      );

      const input = getByRole('textbox');
      const name = getByTitle('name');
      const submitButton = getByText('Submit');

      act(() => {
        fireEvent.change(input, { target: { value: 'John' } });
        fireEvent.keyDown(input, { key: 'Enter' });
      });

      act(() => {
        fireEvent.click(submitButton);
      });

      expect(getByText('Submitting...')).toBeInTheDocument();

      const submittedInfo = await findByText('Form Submitted');

      expect(queryByText('Submitting...')).not.toBeInTheDocument();
      expect(submitFn).toBeCalledWith(true);
      expect(name).toContainHTML('John');
      expect(submittedInfo).toBeInTheDocument();
    });

    it('should fail to submit form using "submit"', async () => {
      const { getByRole, getByText, queryByText } = render(<FormComponent />);

      const input = getByRole('textbox');
      const submitButton = getByText('Submit Fail');

      act(() => {
        fireEvent.change(input, { target: { value: 'John' } });
        fireEvent.keyDown(input, { key: 'Enter' });
      });

      act(() => {
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(queryByText('Form Submitted')).not.toBeInTheDocument();
      });
    });

    it('should not submit form with "handleSubmit" with manual errors', async () => {
      const { getByRole, getByText, queryByText } = render(
        <FormComponent manualError="A manual error" />
      );

      const input = getByRole('textbox');
      const submitButton = getByText('Submit');

      act(() => {
        fireEvent.change(input, { target: { value: 'John' } });
        fireEvent.keyDown(input, { key: 'Enter' });
      });

      act(() => {
        fireEvent.click(submitButton);
      });

      expect(submitFn).toBeCalledWith(false);

      await waitFor(() => {
        expect(queryByText('Form Submitted')).not.toBeInTheDocument();
      });
    });

    it('should not submit form with "handleSubmit" with errors', async () => {
      const { getByRole, getByText, queryByText } = render(<FormComponent initialValue="John" />);

      const input = getByRole('textbox');
      const submitButton = getByText('Submit');

      act(() => {
        fireEvent.change(input, { target: { value: '' } });
        fireEvent.blur(input);
      });

      await waitFor(() => {
        expect(input.classList).toContain('form-state__error');
        expect(input.classList).toContain('form-state__touched');
      });

      act(() => {
        fireEvent.click(submitButton);
      });

      expect(submitFn).toBeCalledWith(false);

      await waitFor(() => {
        expect(queryByText('Form Submitted')).not.toBeInTheDocument();
      });
    });

    it('should not submit form with "handleSubmit" with initial errors without validations', async () => {
      const { getByText, queryByText } = render(<FormComponent />);

      const submitButton = getByText('Submit');

      act(() => {
        fireEvent.click(submitButton);
      });

      expect(submitFn).toBeCalledWith(false);

      await waitFor(() => {
        expect(queryByText('Form Submitted')).not.toBeInTheDocument();
      });
    });

    it('should not submit form with "handleSubmit" with manual errors without validations', async () => {
      const { getByText, queryByText } = render(
        <FormComponent initialValue="John" manualError="A manual error" />
      );

      const submitButton = getByText('Submit');

      act(() => {
        fireEvent.click(submitButton);
      });

      expect(submitFn).toBeCalledWith(false);

      await waitFor(() => {
        expect(queryByText('Form Submitted')).not.toBeInTheDocument();
      });
    });

    it('should reset form with properties', () => {
      const { getByRole, getByText, getByTitle } = render(<FormComponent />);

      const input = getByRole('textbox');
      const name = getByTitle('name');
      const resetButton = getByText('Reset');

      act(() => {
        fireEvent.change(input, { target: { value: 'John' } });
        fireEvent.keyDown(input, { key: 'Enter' });
      });

      expect(name).toContainHTML('John');

      act(() => {
        fireEvent.click(resetButton);
      });

      expect(name).toContainHTML('');
    });
  });
});
