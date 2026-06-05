import { StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useFormState, z, type FormState } from '../src';
import { schema, type Schema, type InitialSchema } from './fixtures';

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

describe('form actions', () => {
  it('should produce errors on initial state change when validateOnMount is false but previous errors exist', () => {
    let initialData: InitialSchema = {
      name: 'John',
      info: { age: 18 },
    };
    const { result, rerender } = renderHook(() => useFormState(schema, { initialData }));
    const {
      formActions: { change },
    } = result.current;

    act(() => {
      change('name', '');
    });

    initialData = { name: 'John', info: { age: 30 } };
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
    expect(formState.data.version).toBe(1);
    expect(formState.errors.name).toBeUndefined();
    expect(formState.errors.get((path) => path.name)).toBeUndefined();
    expect(formState.errors.getManual('name')).toBeUndefined();
    expect(formState.touched.name).toBe(true);
    expect(formState.touched.get((path) => path.name)).toBe(true);
    expect(formState.dirty.name).toBe(true);
    expect(formState.dirty.get('#name')).toBe(false);
    expect(formState.patterns.name?.length).toBeGreaterThan(0);
    expect(formState.patterns.get((path) => path.name)?.length).toBeGreaterThan(0);
    expect(formState.patterns.get((path) => path.info.uuid)).toBeUndefined();
    expect(formState.descriptions.name).toBe('Name');
    expect(formState.descriptions.get((path) => path.name)).toBe('Name');
    expect(formState.descriptions.get((path) => path.info.uuid)).toBe('');
    expect(formState.descriptions.version).toBe('Record version');
    expect(formState.descriptions.get((path) => path.version)).toBe('Record version');
    expect(formState.descriptions.tags).toBe('Tags');
    expect(formState.descriptions.get((path) => path.tags[0])).toBe('Tag');
    expect(formState.ranges.name).toStrictEqual({
      type: 'length',
      format: 'integer',
      min: 1,
      max: 25,
    });
    expect(formState.ranges.get((path) => path.name)).toStrictEqual({
      type: 'length',
      format: 'integer',
      min: 1,
      max: 25,
    });
    expect(formState.ranges.getMax((path) => path.name)).toBe(25);
    expect(formState.ranges.tags).toStrictEqual({
      type: 'length',
      format: 'integer',
      min: 0,
      max: 5,
    });
    expect(formState.ranges.get((path) => path.tags)).toStrictEqual({
      type: 'length',
      format: 'integer',
      min: 0,
      max: 5,
    });
    expect(formState.ranges.getMax((path) => path.tags)).toBe(5);
    expect(formState.ranges.getMax((path) => path.tags[0])).toBe(255);
    expect(formState.ranges.version).toStrictEqual({
      type: 'range',
      format: 'integer',
      min: 0,
      max: 9999999,
    });
    expect(formState.ranges.get((path) => path.version)).toStrictEqual({
      type: 'range',
      format: 'integer',
      min: 0,
      max: 9999999,
    });
    expect(formState.ranges.get((path) => path.info.birthDate)).toStrictEqual({
      type: 'range',
      format: 'MM-dd-yyyy',
      min: new Date('2020-01-01'),
      max: new Date('2039-12-31'),
    });
    expect(formState.ranges.isActive).toBeUndefined();
    expect(formState.ranges.get((path) => path.isActive as unknown as number)).toBeUndefined();
  });

  it('should update field, validate and change a variable in change callback', () => {
    const initialData: InitialSchema = {
      name: 'John',
      info: { age: 18 },
    };
    const { result } = renderHook(() => useFormState(schema, { initialData }));
    const {
      formState: { data },
      formActions: { change },
    } = result.current;

    let updateCounter = 0;

    const callback = (state: FormState<Schema>) => {
      ++updateCounter;

      expect(state.data.name).toBe('Alice');
      expect(state.data.version).toBe(1);
      expect(state.data.info.age).toBe(51);
      expect(state.errors.name).toBeUndefined();
      expect(state.errors.get((path) => path.name)).toBeUndefined();
      expect(state.errors.getManual('name')).toBeUndefined();
      expect(state.touched.name).toBe(true);
      expect(state.touched.get((path) => path.name)).toBe(true);
      expect(state.dirty.name).toBe(true);
      expect(state.dirty.get('#name')).toBe(false);
      expect(state.patterns.name?.length).toBeGreaterThan(0);
      expect(state.patterns.get((path) => path.name)?.length).toBeGreaterThan(0);
      expect(state.patterns.get((path) => path.info.uuid)).toBeUndefined();
      expect(state.descriptions.name).toBe('Name');
      expect(state.descriptions.get((path) => path.name)).toBe('Name');
      expect(state.descriptions.get((path) => path.info.uuid)).toBe('');
      expect(state.descriptions.version).toBe('Record version');
      expect(state.descriptions.get((path) => path.version)).toBe('Record version');
      expect(state.descriptions.tags).toBe('Tags');
      expect(state.descriptions.get((path) => path.tags[0])).toBe('Tag');
      expect(state.ranges.name).toStrictEqual({
        type: 'length',
        format: 'integer',
        min: 1,
        max: 25,
      });
      expect(state.ranges.get((path) => path.name)).toStrictEqual({
        type: 'length',
        format: 'integer',
        min: 1,
        max: 25,
      });
      expect(state.ranges.tags).toStrictEqual({
        type: 'length',
        format: 'integer',
        min: 0,
        max: 5,
      });
      expect(state.ranges.get((path) => path.tags)).toStrictEqual({
        type: 'length',
        format: 'integer',
        min: 0,
        max: 5,
      });
      expect(state.ranges.get((path) => path.tags[0])).toStrictEqual({
        type: 'length',
        format: 'integer',
        min: 1,
        max: 255,
      });
      expect(state.ranges.version).toStrictEqual({
        type: 'range',
        format: 'integer',
        min: 0,
        max: 9999999,
      });
      expect(state.ranges.get((path) => path.version)).toStrictEqual({
        type: 'range',
        format: 'integer',
        min: 0,
        max: 9999999,
      });
      expect(state.ranges.get((path) => path.info.birthDate)).toStrictEqual({
        type: 'range',
        format: 'MM-dd-yyyy',
        min: new Date('2020-01-01'),
        max: new Date('2039-12-31'),
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

  it('should change an updated value', () => {
    const initialData: InitialSchema = {
      name: 'Mike',
      info: { age: 18 },
    };
    const { result } = renderHook(() => useFormState(schema, { initialData }));
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
    expect(dirty.name).toBe(true);
    expect(touched.name).toBe(false);
    expect(dirty.getKeys()).toHaveLength(1);
    expect(touched.getKeys()).toHaveLength(0);
  });

  it('should not change an un-updated value', () => {
    const initialData: InitialSchema = {
      name: 'John',
      info: { age: 18 },
    };
    const { result } = renderHook(() => useFormState(schema, { initialData }));
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
    expect(dirty.getKeys()).toHaveLength(0);
    expect(touched.getKeys()).toHaveLength(0);
  });

  it('should touch an un-updated value', () => {
    const initialData: InitialSchema = {
      name: 'John',
      info: { age: 18 },
    };
    const { result } = renderHook(() => useFormState(schema, { initialData }));
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
    expect(dirty.getKeys()).toHaveLength(0);
    expect(touched.getKeys()).toHaveLength(1);
  });

  it('should touch an un-updated but touched value', () => {
    const initialData: InitialSchema = {
      name: 'John',
      info: { age: 18 },
    };
    const { result } = renderHook(() => useFormState(schema, { initialData }));

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
    expect(dirty.getKeys()).toHaveLength(0);
    expect(touched.getKeys()).toHaveLength(1);
  });

  it('should call a debounced change callback per field', () => {
    vi.useFakeTimers();

    const initialData: InitialSchema = {
      name: 'John',
      info: { age: 18 },
    };
    const { result } = renderHook(() => useFormState(schema, { initialData }));
    const {
      formState: { data },
      formActions: { change },
    } = result.current;

    let updateCounter = 0;

    const callback = (state: FormState<Schema>) => {
      ++updateCounter;

      expect(state.data.name).toBe('Alice');
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

    const initialData: InitialSchema = {
      name: 'John',
      info: { age: 18 },
    };
    const { result } = renderHook(() =>
      useFormState(schema, { initialData, debounceCacheCapacity: 1 })
    );
    const {
      formActions: { change },
    } = result.current;

    let updateCounter = 0;

    const interval = 1000;

    act(() => {
      change('name', 'A', {
        touch: true,
        // eslint-disable-next-line form-state/stable-debounced-callback
        callback: () => {
          ++updateCounter;
        },
        debounceIntervalMs: interval,
      });
      change('name', 'Ali', {
        touch: true,
        // eslint-disable-next-line form-state/stable-debounced-callback
        callback: () => {
          ++updateCounter;
        },
        debounceIntervalMs: interval,
      });
      change('name', 'Alice', {
        touch: true,
        // eslint-disable-next-line form-state/stable-debounced-callback
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

    const initialData: InitialSchema = {
      name: 'John',
      info: { age: 18 },
    };
    const { result } = renderHook(() => useFormState(schema, { initialData }));
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

    const initialData: InitialSchema = {
      name: 'John',
      info: { age: 18 },
    };
    const { result } = renderHook(() => useFormState(schema, { initialData }));
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

    const initialData: InitialSchema = {
      name: 'John',
      info: { age: 18 },
    };
    const { result } = renderHook(() => useFormState(schema, { initialData }));

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

    const initialData: InitialSchema = {
      name: 'John',
      info: { age: 18 },
    };
    const { result } = renderHook(() => useFormState(schema, { initialData }));

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

    const initialData: InitialSchema = {
      name: 'John',
      info: { age: 18 },
    };
    const { result } = renderHook(() => useFormState(schema, { initialData }));

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

    const initialData: InitialSchema = {
      name: 'John',
      info: { age: 18 },
    };
    const { result } = renderHook(() =>
      useFormState(schema, { initialData, debounceCacheCapacity: 1 })
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

    const initialData: InitialSchema = {
      name: 'John',
      info: { age: 18 },
    };
    const { result } = renderHook(() =>
      useFormState(schema, { initialData, debounceCacheCapacity: 1 })
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

    const initialData: InitialSchema = {
      name: 'John',
      info: { age: 18 },
    };
    const { result } = renderHook(() => useFormState(schema, { initialData }));

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

  it('should apply debounced change under StrictMode (mount/cleanup/mount cycle)', () => {
    expect(process.env['NODE_ENV']).toBe('development');

    vi.useFakeTimers();

    const initialData: InitialSchema = {
      name: 'John',
      info: { age: 18 },
    };

    const interval = 500;
    let callbackCount = 0;
    const callback = (state: FormState<Schema>) => {
      ++callbackCount;
      expect(state.data.name).toBe('Alice');
    };

    let formRef!: ReturnType<typeof useFormState<typeof schema>>;

    const Probe = () => {
      formRef = useFormState(schema, { initialData });
      return null;
    };

    render(
      <StrictMode>
        <Probe />
      </StrictMode>
    );

    act(() => {
      formRef.formActions.change('name', 'Alice', {
        touch: true,
        callback,
        debounceIntervalMs: interval,
      });
    });

    act(() => {
      vi.advanceTimersByTime(interval);
    });

    expect(formRef.formState.data.name).toBe('Alice');
    expect(callbackCount).toBe(1);
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
      formState: { data },
      formStatus,
      formActions: { touch },
    } = result.current;

    act(() => {
      touch();
    });

    expect(formStatus.touched).toBe(false);
    expect(schema.toObject(data)).toStrictEqual({});
  });

  it('should validate field on touch by default', () => {
    const { result } = renderHook(() => useFormState(schema));
    const {
      formActions: { touch },
    } = result.current;

    act(() => {
      touch('name');
    });

    const { formState } = result.current;

    expect(formState.errors.name).toBe('Name is required');
    expect(formState.touched.name).toBe(true);
  });

  it('should not validate field on touch when validateOnTouch is false', () => {
    const { result } = renderHook(() => useFormState(schema, { validateOnTouch: false }));
    const {
      formActions: { touch },
    } = result.current;

    act(() => {
      touch('name');
    });

    const { formState } = result.current;

    expect(formState.errors.name).toBeUndefined();
    expect(formState.touched.name).toBe(true);
  });

  it('should reset the form', () => {
    const initialData: InitialSchema = {
      name: 'John',
      info: { age: 30 },
    };
    const { result } = renderHook(() =>
      useFormState(schema, { initialData, validateOnMount: true })
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

  it('should reset the form while retaining the data', () => {
    const initialData: InitialSchema = {
      name: 'John',
      info: { age: 30 },
    };
    const { result } = renderHook(() => useFormState(schema, { initialData }));
    const {
      formActions: { change, touch, reset },
    } = result.current;

    act(() => {
      touch('name');
      change('name', 'Jonathan');
      change((path) => path.info.age, 29);
    });

    act(() => {
      reset({
        retainData: true,
        resetTouched: true,
        callback: (state) => {
          expect(state.data.name).toBe('Jonathan');
          expect(state.data.info.age).toBe(29);
          expect(state.dirty.name).toBe(false);
          expect(state.dirty.info).toBe(false);
          expect(state.touched.name).toBe(false);
        },
      });
    });

    const { formState, formStatus } = result.current;

    expect(formState.data.name).toBe('Jonathan');
    expect(formState.data.info.age).toBe(29);
    expect(formStatus.dirty).toBe(false);
    expect(formStatus.touched).toBe(false);
  });

  it('should reset specific fields', () => {
    const initialData: InitialSchema = {
      name: 'John',
      info: { age: 30 },
    };
    const { result } = renderHook(() => useFormState(schema, { initialData }));
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
    const initialData: InitialSchema = {
      name: 'John',
      info: { age: 30 },
    };
    const { result } = renderHook(() => useFormState(schema, { initialData }));
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
    const initialData: InitialSchema = {
      name: 'John',
      info: { age: 30 },
    };
    const { result } = renderHook(() => useFormState(schema, { initialData }));
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
    expect(formState.touched.get((path) => path.info.age)).toBe(true);
  });

  it('should reset the form to custom data instead of the initial data', () => {
    const initialData: InitialSchema = {
      name: 'John',
      info: { age: 30 },
    };
    const { result } = renderHook(() => useFormState(schema, { initialData }));
    const {
      formActions: { change, reset },
    } = result.current;

    act(() => {
      change('name', 'Jonathan');
      change((path) => path.info.age, 29);
    });

    act(() => {
      reset({
        data: { name: 'Jane', info: { age: 40 } },
        callback: (state) => {
          expect(state.data.name).toBe('Jane');
          expect(state.data.info.age).toBe(40);
          expect(state.dirty.name).toBe(false);
          expect(state.dirty.info).toBe(false);
        },
      });
    });

    const { formState, formStatus } = result.current;

    expect(formState.data.name).toBe('Jane');
    expect(formState.data.info.age).toBe(40);
    expect(formStatus.dirty).toBe(false);
  });

  it('should ignore custom reset data when retainData is true', () => {
    const initialData: InitialSchema = {
      name: 'John',
      info: { age: 30 },
    };
    const { result } = renderHook(() => useFormState(schema, { initialData }));
    const {
      formActions: { change, reset },
    } = result.current;

    act(() => {
      change('name', 'Jonathan');
      change((path) => path.info.age, 29);
    });

    act(() => {
      reset({
        retainData: true,
        data: { name: 'Jane', info: { age: 40 } },
        callback: (state) => {
          expect(state.data.name).toBe('Jonathan');
          expect(state.data.info.age).toBe(29);
          expect(state.dirty.name).toBe(false);
          expect(state.dirty.info).toBe(false);
        },
      });
    });

    const { formState, formStatus } = result.current;

    expect(formState.data.name).toBe('Jonathan');
    expect(formState.data.info.age).toBe(29);
    expect(formStatus.dirty).toBe(false);
  });

  it('should not revert custom reset data via reactive initial data sync', () => {
    const initialData: InitialSchema = {
      name: 'John',
      info: { age: 30 },
    };
    const { result } = renderHook(() => useFormState(schema, { initialData }));
    const {
      formActions: { change, reset },
    } = result.current;

    act(() => {
      change('name', 'Jonathan');
      change((path) => path.info.age, 29);
    });

    act(() => {
      reset({ data: { name: 'Jane', info: { age: 40 } } });
    });

    const { formState } = result.current;

    expect(formState.data.name).toBe('Jane');
    expect(formState.data.info.age).toBe(40);
  });

  it('should leave the form initialData untouched after a custom-data reset', () => {
    const initialData: InitialSchema = {
      name: 'John',
      info: { age: 30 },
    };
    const { result } = renderHook(() => useFormState(schema, { initialData }));
    const {
      formActions: { change, reset },
    } = result.current;

    act(() => {
      reset({ data: { name: 'Jane', info: { age: 40 } } });
    });

    act(() => {
      change('name', 'Jonathan');
      change((path) => path.info.age, 29);
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

  it('should reset specific fields to the custom data (names path)', () => {
    const initialData: InitialSchema = {
      name: 'John',
      info: { age: 30 },
    };
    const { result } = renderHook(() => useFormState(schema, { initialData }));
    const {
      formActions: { change, reset },
    } = result.current;

    act(() => {
      change('name', 'Jonathan');
      change((path) => path.info.age, 29);
    });

    act(() => {
      reset({
        names: ['name'],
        data: { name: 'Jane', info: { age: 40 } },
        callback: (state) => {
          expect(state.data.name).toBe('Jane');
          expect(state.data.info.age).toBe(29);
          expect(state.dirty.name).toBe(false);
          expect(state.dirty.info).toBe(true);
        },
      });
    });

    const { formState } = result.current;

    expect(formState.data.name).toBe('Jane');
    expect(formState.data.info.age).toBe(29);
    expect(formState.dirty.name).toBe(false);
    expect(formState.dirty.info).toBe(true);
  });

  it('should fall back to initialData for listed fields absent from the custom data (names path)', () => {
    const initialData: InitialSchema = {
      name: 'John',
      info: { age: 30 },
    };
    const { result } = renderHook(() => useFormState(schema, { initialData }));
    const {
      formActions: { change, reset },
    } = result.current;

    act(() => {
      change('name', 'Jonathan');
      change((path) => path.info.age, 29);
    });

    act(() => {
      reset({
        names: ['name', 'info'],
        data: { name: 'Jane' },
        callback: (state) => {
          expect(state.data.name).toBe('Jane');
          expect(state.data.info.age).toBe(30);
          expect(state.dirty.name).toBe(false);
          expect(state.dirty.info).toBe(false);
        },
      });
    });

    const { formState } = result.current;

    expect(formState.data.name).toBe('Jane');
    expect(formState.data.info.age).toBe(30);
    expect(formState.dirty.name).toBe(false);
    expect(formState.dirty.info).toBe(false);
  });

  it('should ignore custom reset data for specific fields when retainData is true (names path)', () => {
    const initialData: InitialSchema = {
      name: 'John',
      info: { age: 30 },
    };
    const { result } = renderHook(() => useFormState(schema, { initialData }));
    const {
      formActions: { change, reset },
    } = result.current;

    act(() => {
      change('name', 'Jonathan');
      change((path) => path.info.age, 29);
    });

    act(() => {
      reset({
        names: ['name'],
        retainData: true,
        data: { name: 'Jane' },
        callback: (state) => {
          expect(state.data.name).toBe('Jonathan');
          expect(state.dirty.name).toBe(false);
        },
      });
    });

    const { formState } = result.current;

    expect(formState.data.name).toBe('Jonathan');
    expect(formState.dirty.name).toBe(false);
  });

  it('should reset the form and keep errors empty without validation', () => {
    const initialData: InitialSchema = {
      name: 'John',
      info: { age: 30 },
    };
    const { result } = renderHook(() => useFormState(schema, { initialData }));
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
    const initialData: InitialSchema = {
      name: 'John',
      info: { age: 30 },
    };
    const { result } = renderHook(() =>
      useFormState(schema, { initialData, validateOnMount: true })
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
    const initialData: InitialSchema = {
      name: 'John',
      info: { age: 30 },
    };
    const { result } = renderHook(() => useFormState(schema, { initialData }));
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
    const initialData: InitialSchema = {
      name: 'John',
      info: { age: 30 },
    };
    const { result } = renderHook(() => useFormState(schema, { initialData }));
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

  it('should validate form', () => {
    const { result } = renderHook(() => useFormState(schema));
    const {
      formState,
      formActions: { validate },
    } = result.current;

    expect(formState.errors.name).toBeUndefined();

    act(() => {
      validate();
    });

    const { formState: validatedState } = result.current;

    expect(validatedState.errors.name).toBe('Name is required');
  });

  it('should validate form with additional logic', () => {
    const { result } = renderHook(() => useFormState(schema, { initialData: { name: 'John' } }));
    const {
      formState,
      formActions: { validate },
    } = result.current;

    act(() => {
      validate(() => {
        if (formState.data.name !== 'John') {
          return {
            name: 'The name is must be John',
          };
        }

        return true;
      });
    });

    const { formState: validatedState } = result.current;

    expect(validatedState.data.name).toBe('John');
  });

  it('should not validate form with failed additional logic', () => {
    const { result } = renderHook(() => useFormState(schema, { initialData: {} }));
    const {
      formState,
      formActions: { validate },
    } = result.current;

    act(() => {
      validate(() => {
        if (formState.data.name !== 'John') {
          return {
            name: 'The name is must be John',
          };
        }

        return true;
      });
    });

    const { formState: validatedState } = result.current;

    expect(validatedState.errors.name).toBe('The name is must be John');
  });

  it('should submit form', () => {
    const initialData: InitialSchema = {
      name: 'John',
      info: { age: 30 },
      tags: ['a', 'b'],
    };
    const { result } = renderHook(() => useFormState(schema, { initialData }));
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
    const initialData: InitialSchema = {
      name: 'John',
      info: { age: 30 },
      tags: ['a', 'b'],
    };
    const { result } = renderHook(() => useFormState(schema, { initialData }));
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
    const initialData: InitialSchema = {
      name: 'John',
      info: { age: 30 },
      tags: ['a', 'b'],
    };
    const { result } = renderHook(() => useFormState(schema, { initialData }));
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
    const initialData: InitialSchema = {
      name: 'John',
      info: { age: 30 },
      tags: ['a', 'b'],
    };
    const { result } = renderHook(() => useFormState(schema, { initialData }));
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
    const initialData: InitialSchema = {
      name: 'Jonathan',
      info: { age: 30 },
      tags: ['a', 'b'],
    };
    const { result } = renderHook(() => useFormState(schema, { initialData }));
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

  it('should mark all errored fields as touched on validate', () => {
    const { result } = renderHook(() => useFormState(schema));
    const {
      formActions: { validate },
    } = result.current;

    const { formStatus: initialFormStatus } = result.current;

    expect(initialFormStatus.touched).toBe(false);

    act(() => {
      validate();
    });

    const { formState, formStatus } = result.current;

    expect(formState.errors.name).toBe('Name is required');
    expect(formState.touched.name).toBe(true);
    expect(formState.touched.get((path) => path.info.age)).toBe(true);
    expect(formStatus.touched).toBe(true);
  });

  it('should mark all errored fields as touched on validate with submit when invalid', () => {
    const { result } = renderHook(() => useFormState(schema));
    const {
      formActions: { validate },
    } = result.current;

    act(() => {
      validate({ submit: true });
    });

    const { formState, formStatus } = result.current;

    expect(formStatus.submitted).toBe(false);
    expect(formState.touched.name).toBe(true);
    expect(formState.touched.get((path) => path.info.age)).toBe(true);
  });

  it('should mark matching manual errors as touched on validate', () => {
    const initialData: InitialSchema = {
      name: 'John',
      info: { age: 30 },
      tags: [],
    };
    const { result } = renderHook(() => useFormState(schema, { initialData }));
    const {
      formActions: { setError, validate },
    } = result.current;

    act(() => {
      setError('name', 'Manual name error');
    });

    act(() => {
      validate();
    });

    const { formState } = result.current;

    expect(formState.errors.name).toBe('Manual name error');
    expect(formState.touched.name).toBe(true);
  });

  it('should NOT touch manual error keys that do not match any field on validate', () => {
    const initialData: InitialSchema = {
      name: 'John',
      info: { age: 30 },
      tags: [],
    };
    const { result } = renderHook(() => useFormState(schema, { initialData }));
    const {
      formActions: { setError, validate },
    } = result.current;

    act(() => {
      setError('serverError', 'Something went wrong');
    });

    act(() => {
      validate();
    });

    const { formState, formStatus } = result.current;

    expect(formState.errors.getManual('serverError')).toBe('Something went wrong');
    expect(formState.touched.getKeys()).not.toContain('serverError');
    expect(formStatus.touched).toBe(false);
  });

  it('should mark nested errored fields as touched on validate', () => {
    const initialData: InitialSchema = {
      name: 'John',
      tags: [],
    };
    const { result } = renderHook(() => useFormState(schema, { initialData }));
    const {
      formActions: { validate },
    } = result.current;

    act(() => {
      validate();
    });

    const { formState } = result.current;

    expect(formState.errors.get((path) => path.info.age)).toBe('Age is required');
    expect(formState.touched.get((path) => path.info.age)).toBe(true);
    expect(formState.touched.name).toBe(false);
  });

  it('should not mark any fields as touched on validate when there are no errors', () => {
    const initialData: InitialSchema = {
      name: 'John',
      info: { age: 30 },
      tags: [],
    };
    const { result } = renderHook(() => useFormState(schema, { initialData }));
    const {
      formActions: { validate },
    } = result.current;

    act(() => {
      validate();
    });

    const { formState, formStatus } = result.current;

    expect(formStatus.touched).toBe(false);
    expect(formState.touched.name).toBe(false);
  });

  it('should mark errored fields as touched on validate with custom onValidate logic', () => {
    const initialData: InitialSchema = {
      name: 'John',
      info: { age: 30 },
      tags: [],
    };
    const { result } = renderHook(() => useFormState(schema, { initialData }));
    const {
      formActions: { validate },
    } = result.current;

    act(() => {
      validate(() => ({ name: 'The name must not be John' }));
    });

    const { formState, formStatus } = result.current;

    expect(formState.errors.name).toBe('The name must not be John');
    expect(formState.touched.name).toBe(true);
    expect(formStatus.touched).toBe(true);
  });

  it('should mark errored fields as touched on handleSubmit', async () => {
    const { result } = renderHook(() => useFormState(schema));
    const {
      formHandlers: { handleSubmit },
    } = result.current;

    await act(async () => {
      await handleSubmit(() => Promise.resolve(true))(new FormData());
    });

    const { formState, formStatus } = result.current;

    expect(formStatus.submitted).toBe(false);
    expect(formState.errors.name).toBe('Name is required');
    expect(formState.touched.name).toBe(true);
    expect(formState.touched.get((path) => path.info.age)).toBe(true);
  });

  it('should mark matching manual submission errors as touched on handleSubmit', async () => {
    const initialData: InitialSchema = {
      name: 'John',
      info: { age: 30 },
      tags: [],
    };
    const { result } = renderHook(() => useFormState(schema, { initialData }));
    const {
      formHandlers: { handleSubmit },
    } = result.current;

    await act(async () => {
      await handleSubmit(() => Promise.resolve({ name: 'Submission rejected the name' }))(
        new FormData()
      );
    });

    const { formState, formStatus } = result.current;

    expect(formStatus.submitted).toBe(false);
    expect(formState.errors.name).toBe('Submission rejected the name');
    expect(formState.touched.name).toBe(true);
  });

  it('should NOT touch non-matching manual submission errors on handleSubmit', async () => {
    const initialData: InitialSchema = {
      name: 'John',
      info: { age: 30 },
      tags: [],
    };
    const { result } = renderHook(() => useFormState(schema, { initialData }));
    const {
      formHandlers: { handleSubmit },
    } = result.current;

    await act(async () => {
      await handleSubmit(() => Promise.resolve({ serverError: 'Backend went down' }))(
        new FormData()
      );
    });

    const { formState, formStatus } = result.current;

    expect(formStatus.submitted).toBe(false);
    expect(formState.errors.getManual('serverError')).toBe('Backend went down');
    expect(formState.touched.getKeys()).not.toContain('serverError');
    expect(formStatus.touched).toBe(false);
  });

  it('should still honor resetTouched on a successful validate submit (no errors)', () => {
    const initialData: InitialSchema = {
      name: 'John',
      info: { age: 30 },
      tags: [],
    };
    const { result } = renderHook(() => useFormState(schema, { initialData }));
    const {
      formActions: { change, validate },
    } = result.current;

    act(() => {
      change('name', 'Jonathan', { touch: true });
    });

    act(() => {
      validate({ submit: true, resetTouched: false });
    });

    const { formState, formStatus } = result.current;

    expect(formStatus.submitted).toBe(true);
    expect(formStatus.touched).toBe(true);
    expect(formState.touched.name).toBe(true);
  });

  it('should set and clear manual errors', () => {
    const initialData: InitialSchema = {
      name: 'John',
      info: { age: 30 },
      tags: ['a', 'b'],
    };
    const { result } = renderHook(() => useFormState(schema, { initialData }));
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

  it('validSchema should become true after fixing a schema validation error', async () => {
    let validSchemaCapture: boolean | null = null;

    function TestForm() {
      const { formStatus, formActions } = useFormState(schema, {
        initialData: { info: { age: 30 }, tags: [] } satisfies InitialSchema,
      });

      validSchemaCapture = formStatus.validSchema; // accessed during render

      return (
        <>
          <button
            type="button"
            data-testid="validate"
            onClick={() => {
              formActions.validate();
            }}
          >
            Validate
          </button>
          <button
            type="button"
            data-testid="fix"
            onClick={() => {
              formActions.change('name', 'John');
            }}
          >
            Fix
          </button>
        </>
      );
    }

    render(<TestForm />);

    await userEvent.click(screen.getByTestId('validate'));
    expect(validSchemaCapture).toBe(false);

    await userEvent.click(screen.getByTestId('fix'));
    expect(validSchemaCapture).toBe(true);
  });

  it('should set and clear manual errors conditionally', () => {
    const initialData: InitialSchema = {
      name: 'John',
      info: { age: 30 },
      tags: ['a', 'b'],
    };
    const { result } = renderHook(() => useFormState(schema, { initialData }));
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
    const initialData: InitialSchema = {
      info: { age: 30 },
    };
    const { result } = renderHook(() => useFormState(schema, { initialData }));
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

  it('preserves prior parse errors when setError is called with validate:false', () => {
    const initialData: InitialSchema = {
      info: { age: 30 },
    };
    const { result } = renderHook(() => useFormState(schema, { initialData }));

    // Prime the form to populate state.errors with a parse-slice error.
    act(() => {
      result.current.formActions.validate();
    });

    expect(result.current.formState.errors.get((path) => path.name)).toBeDefined();

    // Add a manual error without re-validating — the !shouldValidate branch
    // composes the next errors via `difference(prevState.errors, prevManualErrors)`,
    // exercising the survivor path inside `difference`.
    act(() => {
      result.current.formActions.setError('serverError', 'Backend failure', {
        validate: false,
      });
    });

    const { formState } = result.current;

    expect(formState.errors.get((path) => path.name)).toBeDefined();
    expect(formState.errors.getManual('serverError')).toBe('Backend failure');
  });

  it('should clear manual errors and do not validate schema', () => {
    const initialData: InitialSchema = {
      info: { age: 30 },
    };
    const { result } = renderHook(() => useFormState(schema, { initialData }));
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
    const initialData: InitialSchema = {
      info: { age: 30 },
    };
    const { result } = renderHook(() => useFormState(schema, { initialData }));
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
    const initialData: InitialSchema = {
      name: 'John',
      info: { age: 30 },
      tags: ['a', 'b'],
    };
    const { result } = renderHook(() => useFormState(schema, { initialData }));
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
    const initialData: InitialSchema = {
      name: 'John',
      info: { age: 30 },
      tags: ['a', 'b'],
    };
    const { result } = renderHook(() => useFormState(schema, { initialData }));
    const {
      formActions: { setDirty },
    } = result.current;

    expect(() => {
      setDirty('test' as '#test');
    }).toThrow(TypeError);
  });

  it('should change the form mode', () => {
    const initialData: InitialSchema = {
      name: 'John',
      info: { age: 30 },
      tags: ['a', 'b'],
    };
    const { result } = renderHook(() => useFormState(schema, { initialData }));
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

  it('should not re-render when setError is called with the same error', () => {
    const initialData: InitialSchema = { info: { age: 30 }, tags: [] };
    const { result } = renderHook(() => useFormState(schema, { initialData }));

    act(() => {
      result.current.formActions.setError('id', 'Bad ID');
    });

    const beforeFormState = result.current.formState;
    const beforeFormStatus = result.current.formStatus;

    act(() => {
      result.current.formActions.setError('id', 'Bad ID');
    });

    expect(result.current.formState).toBe(beforeFormState);
    expect(result.current.formStatus).toBe(beforeFormStatus);
  });

  it('should not re-render when setError is called with null on a field with no error', () => {
    const initialData: InitialSchema = { info: { age: 30 }, tags: [] };
    const { result } = renderHook(() => useFormState(schema, { initialData }));

    const before = result.current.formState;

    act(() => {
      result.current.formActions.setError('id', null);
    });

    expect(result.current.formState).toBe(before);
  });

  it('should apply both setError calls when set and clear happen in the same batch', () => {
    const initialData: InitialSchema = { info: { age: 30 }, tags: [] };
    const { result } = renderHook(() => useFormState(schema, { initialData }));

    act(() => {
      result.current.formActions.setError('id', 'Bad ID');
      result.current.formActions.setError('id', null);
    });

    expect(result.current.formState.errors.getManual('id')).toBeUndefined();
  });

  it('should not re-render when clearManualErrors is called with no manual errors', () => {
    const initialData: InitialSchema = { info: { age: 30 }, tags: [] };
    const { result } = renderHook(() => useFormState(schema, { initialData }));

    const before = result.current.formState;

    act(() => {
      result.current.formActions.clearManualErrors();
    });

    expect(result.current.formState).toBe(before);
  });

  it('should not re-render when clearManualErrors predicate matches nothing', () => {
    const initialData: InitialSchema = { info: { age: 30 }, tags: [] };
    const { result } = renderHook(() => useFormState(schema, { initialData }));

    act(() => {
      result.current.formActions.setError('id', 'Bad ID');
    });

    const before = result.current.formState;

    act(() => {
      result.current.formActions.clearManualErrors({ predicate: (key) => key === 'other' });
    });

    expect(result.current.formState).toBe(before);
  });

  it('should not re-render when setMode is called with the current mode', () => {
    const initialData: InitialSchema = { info: { age: 30 }, tags: [] };
    const { result } = renderHook(() => useFormState(schema, { initialData }));

    const before = result.current.formState;

    act(() => {
      result.current.formActions.setMode('editable');
    });

    expect(result.current.formState).toBe(before);
  });

  it('should not re-render when setDirty is called with the same value', () => {
    const initialData: InitialSchema = { info: { age: 30 }, tags: [] };
    const { result } = renderHook(() => useFormState(schema, { initialData }));

    act(() => {
      result.current.formActions.setDirty('#flag', true);
    });

    const before = result.current.formState;

    act(() => {
      result.current.formActions.setDirty('#flag', true);
    });

    expect(result.current.formState).toBe(before);
  });

  it('should not re-render when touch is called on an already-touched field without validation', () => {
    const initialData: InitialSchema = { info: { age: 30 }, tags: [] };
    const { result } = renderHook(() =>
      useFormState(schema, { initialData, validateOnTouch: false })
    );

    act(() => {
      result.current.formActions.touch('name');
    });

    const before = result.current.formState;

    act(() => {
      result.current.formActions.touch('name');
    });

    expect(result.current.formState).toBe(before);
  });
});
