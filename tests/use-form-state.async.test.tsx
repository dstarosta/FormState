import React, { StrictMode, useLayoutEffect } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react';
import { useFormState, z, type StateChangeEvent, type StateChangeListener } from '../src';
import { swallowNetworkDown, buildAsyncSchema, makeComboSchema } from './fixtures';

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

describe('async schema validation', () => {
  it('should mark the form as validating on mount and resolve to invalid for a disallowed value', async () => {
    const asyncSchema = buildAsyncSchema(new Set(['Mike', 'John']), 50);

    const { result } = renderHook(() =>
      useFormState(asyncSchema, {
        initialData: { name: 'Xavier' },
        validateOnMount: true,
      })
    );

    expect(result.current.formStatus.validating).toBe(true);
    expect(result.current.formStatus.valid).toBe(null);

    await waitFor(() => {
      expect(result.current.formStatus.validating).toBe(false);
    });

    expect(result.current.formStatus.valid).toBe(false);
    expect(result.current.formState.errors.get((path) => path.name)).toBe('Name is not allowed');
  });

  it('should resolve to valid on mount for an allowed value', async () => {
    const asyncSchema = buildAsyncSchema(new Set(['Mike', 'John']));

    const { result } = renderHook(() =>
      useFormState(asyncSchema, {
        initialData: { name: 'Mike' },
        validateOnMount: true,
      })
    );

    expect(result.current.formStatus.validating).toBe(true);

    await waitFor(() => {
      expect(result.current.formStatus.validating).toBe(false);
    });

    expect(result.current.formStatus.valid).toBe(true);
    expect(result.current.formState.errors.getAll()).toStrictEqual([]);
  });

  it('should not run async validation on mount when validateOnMount is false', () => {
    const asyncSchema = buildAsyncSchema(new Set(['Mike']));

    const { result } = renderHook(() =>
      useFormState(asyncSchema, { initialData: { name: 'Xavier' } })
    );

    expect(result.current.formStatus.validating).toBe(false);
    expect(result.current.formStatus.valid).toBe(null);
  });

  it('should re-run async validation after a change action', async () => {
    const asyncSchema = buildAsyncSchema(new Set(['Mike', 'John']));

    const { result } = renderHook(() =>
      useFormState(asyncSchema, {
        initialData: { name: 'Xavier' },
        validateOnMount: true,
      })
    );

    await waitFor(() => {
      expect(result.current.formStatus.validating).toBe(false);
    });
    expect(result.current.formStatus.valid).toBe(false);

    act(() => {
      result.current.formActions.change('name', 'Mike');
    });

    expect(result.current.formStatus.validating).toBe(true);
    expect(result.current.formStatus.valid).toBe(null);

    await waitFor(() => {
      expect(result.current.formStatus.validating).toBe(false);
    });

    expect(result.current.formStatus.valid).toBe(true);
    expect(result.current.formState.errors.get((path) => path.name)).toBeUndefined();
  });

  it('should surface an async predicate rejection as a root error and unfreeze validating', async () => {
    process.on('unhandledRejection', swallowNetworkDown);

    try {
      const rejectingSchema = z.object({
        name: z.formString({ required: true }).check(
          z.validateAsync(
            () =>
              new Promise<boolean>((_resolve, reject) => {
                setTimeout(() => {
                  reject(new Error('Network down'));
                }, 0);
              }),
            'unused'
          )
        ),
      });

      const { result } = renderHook(() =>
        useFormState(rejectingSchema, {
          initialData: { name: 'Mike' },
          validateOnMount: true,
        })
      );

      expect(result.current.formStatus.validating).toBe(true);

      await waitFor(() => {
        expect(result.current.formStatus.validating).toBe(false);
      });

      // Form is no longer frozen; rejection is surfaced as a root error.
      expect(result.current.formStatus.valid).toBe(false);
      expect(result.current.formState.errors.getAll()).toContain('Network down');
    } finally {
      process.off('unhandledRejection', swallowNetworkDown);
    }
  });

  it('should discard stale async results when superseded by a newer change', async () => {
    const delays = new Map<string, number>([
      ['Slow', 60],
      ['Fast', 5],
    ]);

    const allowed = new Set(['Fast']);
    const asyncSchema = z.object({
      name: z.formString({ required: true, error: 'Name is required' }).check(
        z.validateAsync(
          (name) =>
            new Promise<boolean>((resolve) => {
              setTimeout(
                () => {
                  resolve(allowed.has(name));
                },
                delays.get(name) ?? 0
              );
            }),
          'Name is not allowed'
        )
      ),
    });

    const { result } = renderHook(() =>
      useFormState(asyncSchema, {
        initialData: { name: 'Slow' },
        validateOnMount: true,
      })
    );

    act(() => {
      result.current.formActions.change('name', 'Fast');
    });

    await waitFor(() => {
      expect(result.current.formStatus.validating).toBe(false);
    });

    expect(result.current.formStatus.valid).toBe(true);
    expect(result.current.formState.data.name).toBe('Fast');
    expect(result.current.formState.errors.get((path) => path.name)).toBeUndefined();

    await act(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 100);
      });
    });

    expect(result.current.formStatus.valid).toBe(true);
    expect(result.current.formState.data.name).toBe('Fast');
    expect(result.current.formState.errors.get((path) => path.name)).toBeUndefined();
  });

  describe('manual errors with async schemas', () => {
    it('should not flip validating when setError is called on an async schema', async () => {
      const asyncSchema = buildAsyncSchema(new Set(['Mike']));

      const { result } = renderHook(() =>
        useFormState(asyncSchema, {
          initialData: { name: 'Mike' },
          validateOnMount: true,
        })
      );

      await waitFor(() => {
        expect(result.current.formStatus.validating).toBe(false);
      });

      act(() => {
        result.current.formActions.setError('serverError', 'Server failure');
      });

      expect(result.current.formStatus.validating).toBe(false);
      expect(result.current.formState.errors.getManual('serverError')).toBe('Server failure');
    });

    it('should not flip validating when setError is called with validate:true on an async schema', async () => {
      const asyncSchema = buildAsyncSchema(new Set(['Mike']));

      const { result } = renderHook(() =>
        useFormState(asyncSchema, {
          initialData: { name: 'Mike' },
          validateOnMount: true,
        })
      );

      await waitFor(() => {
        expect(result.current.formStatus.validating).toBe(false);
      });

      act(() => {
        result.current.formActions.setError('serverError', 'Server failure', { validate: true });
      });

      expect(result.current.formStatus.validating).toBe(false);
      expect(result.current.formState.errors.getManual('serverError')).toBe('Server failure');
    });

    it('should not flip validating when clearManualErrors is called on an async schema', async () => {
      const asyncSchema = buildAsyncSchema(new Set(['Mike']));

      const { result } = renderHook(() =>
        useFormState(asyncSchema, {
          initialData: { name: 'Mike' },
          validateOnMount: true,
        })
      );

      await waitFor(() => {
        expect(result.current.formStatus.validating).toBe(false);
      });

      act(() => {
        result.current.formActions.setError('serverError', 'Server failure');
      });

      expect(result.current.formStatus.validating).toBe(false);

      act(() => {
        result.current.formActions.clearManualErrors({ validate: true });
      });

      expect(result.current.formStatus.validating).toBe(false);
      expect(result.current.formState.errors.getManual('serverError')).toBeUndefined();
    });

    it('should preserve existing sync errors when setError is called on an async schema', async () => {
      const asyncSchema = z.object({
        name: z
          .formString(
            { required: true, error: 'Name is required' },
            z.maxLength(5, 'Name too long')
          )
          .check(
            z.validateAsync((name) => Promise.resolve(name === 'Mike'), 'Name is not allowed')
          ),
      });

      const { result } = renderHook(() =>
        useFormState(asyncSchema, {
          initialData: { name: 'Christopher' },
          validateOnMount: true,
        })
      );

      await waitFor(() => {
        expect(result.current.formStatus.validating).toBe(false);
      });

      expect(result.current.formState.errors.get((path) => path.name)).toBe(
        'Name too long|Name is not allowed'
      );

      act(() => {
        result.current.formActions.setError('serverError', 'Server failure', { validate: true });
      });

      expect(result.current.formStatus.validating).toBe(false);
      expect(result.current.formState.errors.get((path) => path.name)).toBe(
        'Name too long|Name is not allowed'
      );
      expect(result.current.formState.errors.getManual('serverError')).toBe('Server failure');
    });

    it('should preserve existing sync errors when clearManualErrors is called on an async schema', async () => {
      const asyncSchema = z.object({
        name: z
          .formString(
            { required: true, error: 'Name is required' },
            z.maxLength(5, 'Name too long')
          )
          .check(
            z.validateAsync((name) => Promise.resolve(name === 'Mike'), 'Name is not allowed')
          ),
      });

      const { result } = renderHook(() =>
        useFormState(asyncSchema, {
          initialData: { name: 'Christopher' },
          validateOnMount: true,
        })
      );

      await waitFor(() => {
        expect(result.current.formStatus.validating).toBe(false);
      });

      act(() => {
        result.current.formActions.setError('serverError', 'Server failure');
      });

      expect(result.current.formState.errors.get((path) => path.name)).toBe(
        'Name too long|Name is not allowed'
      );

      act(() => {
        result.current.formActions.clearManualErrors({ validate: true });
      });

      expect(result.current.formStatus.validating).toBe(false);
      expect(result.current.formState.errors.get((path) => path.name)).toBe(
        'Name too long|Name is not allowed'
      );
      expect(result.current.formState.errors.getManual('serverError')).toBeUndefined();
    });

    it('should preserve existing async errors when setError is called', async () => {
      const asyncSchema = buildAsyncSchema(new Set(['Mike']));

      const { result } = renderHook(() =>
        useFormState(asyncSchema, {
          initialData: { name: 'Xavier' },
          validateOnMount: true,
        })
      );

      await waitFor(() => {
        expect(result.current.formStatus.validating).toBe(false);
      });

      expect(result.current.formState.errors.get((path) => path.name)).toBe('Name is not allowed');

      act(() => {
        result.current.formActions.setError('serverError', 'Server failure');
      });

      expect(result.current.formState.errors.get((path) => path.name)).toBe('Name is not allowed');
      expect(result.current.formState.errors.getManual('serverError')).toBe('Server failure');
    });

    it('should preserve existing async errors when clearManualErrors is called', async () => {
      const asyncSchema = buildAsyncSchema(new Set(['Mike']));

      const { result } = renderHook(() =>
        useFormState(asyncSchema, {
          initialData: { name: 'Xavier' },
          validateOnMount: true,
        })
      );

      await waitFor(() => {
        expect(result.current.formStatus.validating).toBe(false);
      });

      act(() => {
        result.current.formActions.setError('serverError', 'Server failure');
      });

      expect(result.current.formState.errors.get((path) => path.name)).toBe('Name is not allowed');

      act(() => {
        result.current.formActions.clearManualErrors({ validate: true });
      });

      expect(result.current.formStatus.validating).toBe(false);
      expect(result.current.formState.errors.get((path) => path.name)).toBe('Name is not allowed');
      expect(result.current.formState.errors.getManual('serverError')).toBeUndefined();
    });

    it('should not show stale parse errors during the burst after replace on an async schema', async () => {
      const asyncSchema = buildAsyncSchema(new Set(['Mike']));

      const { result } = renderHook(() =>
        useFormState(asyncSchema, {
          initialData: { name: 'Xavier' },
          validateOnMount: true,
        })
      );

      await waitFor(() => {
        expect(result.current.formStatus.validating).toBe(false);
      });

      expect(result.current.formState.errors.get((path) => path.name)).toBe('Name is not allowed');

      act(() => {
        result.current.formActions.replace({ name: 'Mike' }, { validate: true });
      });

      // During the in-flight async burst the stale parse-slice must be gone.
      expect(result.current.formStatus.validating).toBe(true);
      expect(result.current.formState.errors.get((path) => path.name)).toBeUndefined();

      await waitFor(() => {
        expect(result.current.formStatus.validating).toBe(false);
      });

      expect(result.current.formState.errors.get((path) => path.name)).toBeUndefined();
    });

    it('prunes async-slice entries on nested paths when their parent is reset', async () => {
      const nestedAsyncSchema = z.object({
        info: z.object({
          handle: z
            .formString({ required: true, error: 'Handle is required' })
            .check(
              z.validateAsync(
                (value: string) => Promise.resolve(value === 'mike'),
                'Handle is not allowed'
              )
            ),
        }),
      });

      const { result } = renderHook(() =>
        useFormState(nestedAsyncSchema, {
          initialData: { info: { handle: 'mike' } },
          validateOnMount: true,
        })
      );

      await waitFor(() => {
        expect(result.current.formStatus.validating).toBe(false);
      });

      act(() => {
        result.current.formActions.change((data) => data.info.handle, 'taken');
      });

      await waitFor(() => {
        expect(result.current.formStatus.validating).toBe(false);
      });

      expect(result.current.formState.errors.get((path) => path.info.handle)).toBe(
        'Handle is not allowed'
      );

      // Reset the parent field. resetFields builds prefixes=['info.'] and the
      // prune predicate hits the `prefixes.some(...)` branch to drop the
      // nested 'info.handle' async entry.
      act(() => {
        result.current.formActions.reset({ names: ['info'] });
      });

      expect(result.current.formStatus.validating).toBe(true);
      expect(result.current.formState.errors.get((path) => path.info.handle)).toBeUndefined();

      await waitFor(() => {
        expect(result.current.formStatus.validating).toBe(false);
      });

      expect(result.current.formState.errors.get((path) => path.info.handle)).toBeUndefined();
      expect(result.current.formState.data.info.handle).toBe('mike');
    });

    it('should not show stale parse errors during the burst after resetFields on an async schema', async () => {
      const asyncSchema = buildAsyncSchema(new Set(['Mike']));

      const { result } = renderHook(() =>
        useFormState(asyncSchema, {
          initialData: { name: 'Mike' },
          validateOnMount: true,
        })
      );

      await waitFor(() => {
        expect(result.current.formStatus.validating).toBe(false);
      });

      act(() => {
        result.current.formActions.change('name', 'Xavier');
      });

      await waitFor(() => {
        expect(result.current.formStatus.validating).toBe(false);
      });

      expect(result.current.formState.errors.get((path) => path.name)).toBe('Name is not allowed');

      act(() => {
        result.current.formActions.reset({ names: ['name'] });
      });

      expect(result.current.formStatus.validating).toBe(true);
      expect(result.current.formState.errors.get((path) => path.name)).toBeUndefined();

      await waitFor(() => {
        expect(result.current.formStatus.validating).toBe(false);
      });

      expect(result.current.formState.errors.get((path) => path.name)).toBeUndefined();
    });

    it('should not show stale parse errors during the burst after change on an async schema', async () => {
      const asyncSchema = buildAsyncSchema(new Set(['Mike']));

      const { result } = renderHook(() =>
        useFormState(asyncSchema, {
          initialData: { name: 'Xavier' },
          validateOnMount: true,
        })
      );

      await waitFor(() => {
        expect(result.current.formStatus.validating).toBe(false);
      });

      expect(result.current.formState.errors.get((path) => path.name)).toBe('Name is not allowed');

      act(() => {
        result.current.formActions.change('name', 'Mike');
      });

      expect(result.current.formStatus.validating).toBe(true);
      expect(result.current.formState.errors.get((path) => path.name)).toBeUndefined();

      await waitFor(() => {
        expect(result.current.formStatus.validating).toBe(false);
      });

      expect(result.current.formState.errors.get((path) => path.name)).toBeUndefined();
    });

    it('should drop stale async-slice entries for non-dirty fields when initialData changes', async () => {
      const asyncSchema = buildAsyncSchema(new Set(['Mike']));

      let initialData = { name: 'Xavier' };

      const { result, rerender } = renderHook(() =>
        useFormState(asyncSchema, { initialData, validateOnMount: true })
      );

      await waitFor(() => {
        expect(result.current.formStatus.validating).toBe(false);
      });

      expect(result.current.formState.errors.get((path) => path.name)).toBe('Name is not allowed');

      // The 'name' field is non-dirty (no user change), so the new initial
      // data flows in and the stale async-slice entry should be pruned.
      initialData = { name: 'Mike' };
      rerender();

      expect(result.current.formStatus.validating).toBe(true);
      expect(result.current.formState.errors.get((path) => path.name)).toBeUndefined();

      await waitFor(() => {
        expect(result.current.formStatus.validating).toBe(false);
      });

      expect(result.current.formState.errors.get((path) => path.name)).toBeUndefined();
      expect(result.current.formState.data.name).toBe('Mike');
    });
  });

  describe('validateAsync', () => {
    it('should resolve true on a passing async schema', async () => {
      const asyncSchema = buildAsyncSchema(new Set(['Mike']));

      const { result } = renderHook(() =>
        useFormState(asyncSchema, { initialData: { name: 'Mike' } })
      );

      let isValid: boolean | undefined;

      await act(async () => {
        isValid = await result.current.formActions.validateAsync();
      });

      expect(isValid).toBe(true);
      expect(result.current.formStatus.valid).toBe(true);
      expect(result.current.formState.errors.getAll()).toStrictEqual([]);
    });

    it('should resolve false on a failing async schema', async () => {
      const asyncSchema = buildAsyncSchema(new Set(['Mike']));

      const { result } = renderHook(() =>
        useFormState(asyncSchema, { initialData: { name: 'Xavier' } })
      );

      let isValid: boolean | undefined;

      await act(async () => {
        isValid = await result.current.formActions.validateAsync();
      });

      expect(isValid).toBe(false);
      expect(result.current.formStatus.valid).toBe(false);
      expect(result.current.formState.errors.get((path) => path.name)).toBe('Name is not allowed');
    });

    it('should work on a sync schema too', async () => {
      const syncSchema = z.object({
        name: z.formString({ required: true, error: 'Name is required' }),
      });

      const { result } = renderHook(() => useFormState(syncSchema, { initialData: { name: '' } }));

      let isValid: boolean | undefined;

      await act(async () => {
        isValid = await result.current.formActions.validateAsync();
      });

      expect(isValid).toBe(false);
      expect(result.current.formStatus.valid).toBe(false);
      expect(result.current.formState.errors.get((path) => path.name)).toBe('Name is required');
    });

    it('should reflect updated data after a change', async () => {
      const asyncSchema = buildAsyncSchema(new Set(['Mike']));

      const { result } = renderHook(() =>
        useFormState(asyncSchema, { initialData: { name: 'Xavier' } })
      );

      let firstResult: boolean | undefined;
      await act(async () => {
        firstResult = await result.current.formActions.validateAsync();
      });
      expect(firstResult).toBe(false);
      expect(result.current.formStatus.valid).toBe(false);

      act(() => {
        result.current.formActions.change('name', 'Mike');
      });

      await waitFor(() => {
        expect(result.current.formStatus.validating).toBe(false);
      });

      let secondResult: boolean | undefined;

      await act(async () => {
        secondResult = await result.current.formActions.validateAsync();
      });
      expect(secondResult).toBe(true);
      expect(result.current.formStatus.valid).toBe(true);
    });

    it('should resolve false when a manual error is present even if async parse passes', async () => {
      const asyncSchema = buildAsyncSchema(new Set(['Mike']));

      const { result } = renderHook(() =>
        useFormState(asyncSchema, { initialData: { name: 'Mike' } })
      );

      act(() => {
        result.current.formActions.setError('name', 'Manual block');
      });

      let isValid: boolean | undefined;

      await act(async () => {
        isValid = await result.current.formActions.validateAsync();
      });

      expect(isValid).toBe(false);
      expect(result.current.formStatus.valid).toBe(false);
      expect(result.current.formState.errors.get((path) => path.name)).toBe('Manual block');
    });

    it('should not touch fields for errors that do not map to schema data (e.g. root errors)', async () => {
      const rootErrorSchema = z
        .object({
          name: z.formString({ required: true, error: 'Name is required' }),
        })
        .check(z.validateAsync(() => Promise.resolve(false), 'Root rule failed'));

      const { result } = renderHook(() =>
        useFormState(rootErrorSchema, { initialData: { name: 'Mike' } })
      );

      let isValid: boolean | undefined;

      await act(async () => {
        isValid = await result.current.formActions.validateAsync();
      });

      expect(isValid).toBe(false);
      expect(result.current.formStatus.valid).toBe(false);
      expect(result.current.formState.errors.getAll()).toContain('Root rule failed');
      expect(Object.keys(result.current.formState.touched)).not.toContain('');
      expect(result.current.formState.touched['name' as never]).toBeFalsy();
    });
  });

  describe('asyncValidating / asyncValidated listener events', () => {
    type AsyncSchemaData = { name: string };
    type AsyncEvent = StateChangeEvent<AsyncSchemaData>;

    const renderListenerHarness = (
      listenerSchema: ReturnType<typeof buildAsyncSchema>,
      listener: StateChangeListener<AsyncSchemaData>,
      initOptions: { initialData: AsyncSchemaData; validateOnMount?: boolean }
    ) =>
      renderHook(() => {
        const {
          formStatus,
          formActions: { change, validateAsync },
          formHooks: { useListener },
        } = useFormState(listenerSchema, initOptions);
        useListener(listener);
        return { formStatus, change, validateAsync };
      });

    it('fires asyncValidating before and asyncValidated after a change-triggered async pass', async () => {
      const events: AsyncEvent[] = [];
      const listener = vi.fn((event: AsyncEvent) => {
        events.push(event);
      });
      const asyncSchema = buildAsyncSchema(new Set(['Mike']));

      const { result } = renderListenerHarness(asyncSchema, listener, {
        initialData: { name: 'Xavier' },
        validateOnMount: true,
      });

      await waitFor(() => {
        expect(result.current.formStatus.validating).toBe(false);
      });
      events.length = 0;

      act(() => {
        result.current.change('name', 'Mike');
      });

      await waitFor(() => {
        expect(result.current.formStatus.validating).toBe(false);
      });

      const asyncEvents = events.filter(
        (evt) => evt.type === 'asyncValidating' || evt.type === 'asyncValidated'
      );
      expect(asyncEvents.map((evt) => evt.type)).toStrictEqual([
        'asyncValidating',
        'asyncValidated',
      ]);
      expect(asyncEvents[0]?.triggerField).toBe('name');
      expect(asyncEvents[1]?.triggerField).toBe('name');
    });

    it('exposes schemaPath with the dot-path of the async check', async () => {
      const events: AsyncEvent[] = [];
      const listener = vi.fn((event: AsyncEvent) => {
        events.push(event);
      });
      const asyncSchema = buildAsyncSchema(new Set(['Mike']));

      const { result } = renderListenerHarness(asyncSchema, listener, {
        initialData: { name: 'Mike' },
      });

      await act(async () => {
        await result.current.validateAsync();
      });

      const validating = events.find((evt) => evt.type === 'asyncValidating');
      expect(validating?.schemaPath).toBe('name');
    });

    it('uses an empty string in schemaPath for a top-level async check without a path', async () => {
      type RootSchemaData = { name: string };
      const events: StateChangeEvent<RootSchemaData>[] = [];
      const listener = vi.fn((event: StateChangeEvent<RootSchemaData>) => {
        events.push(event);
      });

      const rootAsyncSchema = z
        .object({ name: z.formString({ required: true }) })
        .check(z.validateAsync(() => Promise.resolve(true), 'fails'));

      const Component = () => {
        const {
          formActions: { validateAsync },
          formHooks: { useListener },
        } = useFormState(rootAsyncSchema, { initialData: { name: 'Mike' } });
        useListener(listener);
        return { validateAsync };
      };
      const { result } = renderHook(() => Component());

      await act(async () => {
        await result.current.validateAsync();
      });

      const validating = events.find((evt) => evt.type === 'asyncValidating');
      expect(validating?.schemaPath).toBe('');
    });

    it('fires no asyncValidating/asyncValidated events for programmatic validateAsync() on a sync-only schema', async () => {
      const events: AsyncEvent[] = [];
      const listener = vi.fn((event: AsyncEvent) => {
        events.push(event);
      });
      const syncSchema = z.object({
        name: z.formString({ required: true, error: 'Name is required' }),
      });

      const Component = () => {
        const {
          formActions: { validateAsync },
          formHooks: { useListener },
        } = useFormState(syncSchema, { initialData: { name: 'Mike' } });
        useListener(listener);
        return { validateAsync };
      };
      const { result } = renderHook(() => Component());

      await act(async () => {
        await result.current.validateAsync();
      });

      const asyncEvents = events.filter(
        (evt) => evt.type === 'asyncValidating' || evt.type === 'asyncValidated'
      );
      expect(asyncEvents).toStrictEqual([]);
    });

    it('isolates per-form async state when two forms share the same schema', async () => {
      const predicate = vi.fn((value: string) => Promise.resolve(value.length > 0));

      const sharedSchema = z.object({
        name: z.formString({ required: true }).check(z.validateAsync(predicate, 'nope')),
      });

      const useFormA = () => useFormState(sharedSchema, { initialData: { name: 'Mike' } });
      const useFormB = () => useFormState(sharedSchema, { initialData: { name: 'Mike' } });

      const formA = renderHook(() => useFormA());
      const formB = renderHook(() => useFormB());

      act(() => {
        formA.result.current.formActions.change('name', 'Alice');
      });

      await waitFor(() => {
        expect(formA.result.current.formStatus.validating).toBe(false);
      });

      expect(predicate).toHaveBeenCalledTimes(1);
      expect(predicate).toHaveBeenLastCalledWith('Alice');

      act(() => {
        formB.result.current.formActions.change('name', 'Alice');
      });

      await waitFor(() => {
        expect(formB.result.current.formStatus.validating).toBe(false);
      });

      expect(predicate).toHaveBeenCalledTimes(2);
      expect(predicate).toHaveBeenLastCalledWith('Alice');
    });

    it('fires no events and keeps formStatus.validating false when skipWhen returns true', async () => {
      type SkipData = { name: string };
      const events: StateChangeEvent<SkipData>[] = [];
      const listener = vi.fn((event: StateChangeEvent<SkipData>) => {
        events.push(event);
      });

      const skipSchema = z.object({
        name: z.formString({ required: true }).check(
          z.validateAsync(() => Promise.resolve(true), {
            error: 'nope',
            skipWhen: () => true,
          })
        ),
      });

      const Component = () => {
        const {
          formStatus,
          formActions: { change, validateAsync },
          formHooks: { useListener },
        } = useFormState(skipSchema, { initialData: { name: 'Mike' } });
        useListener(listener);
        return { formStatus, change, validateAsync };
      };
      const { result } = renderHook(() => Component());

      act(() => {
        result.current.change('name', 'Alice');
      });
      await act(async () => {
        await result.current.validateAsync();
      });

      const asyncEvents = events.filter(
        (evt) => evt.type === 'asyncValidating' || evt.type === 'asyncValidated'
      );
      expect(asyncEvents).toStrictEqual([]);
      expect(result.current.formStatus.validating).toBe(false);
    });

    it('fires asyncValidating then asyncValidated when replace() triggers async validation', async () => {
      type ReplaceData = { name: string };
      const events: StateChangeEvent<ReplaceData>[] = [];
      const listener = vi.fn((event: StateChangeEvent<ReplaceData>) => {
        events.push(event);
      });

      const replaceSchema = z.object({
        name: z
          .formString({ required: true })
          .check(z.validateAsync(() => Promise.resolve(true), 'nope')),
      });

      const Component = () => {
        const {
          formActions: { replace },
          formHooks: { useListener },
        } = useFormState(replaceSchema);
        useListener(listener);
        return { replace };
      };
      const { result } = renderHook(() => Component());

      act(() => {
        result.current.replace({ name: 'Alice' }, { validate: true });
      });

      await waitFor(() => {
        expect(events.some((evt) => evt.type === 'asyncValidated')).toBe(true);
      });

      const asyncEvents = events.filter(
        (evt) => evt.type === 'asyncValidating' || evt.type === 'asyncValidated'
      );

      expect(asyncEvents.map((evt) => evt.type)).toStrictEqual([
        'asyncValidating',
        'asyncValidated',
      ]);
    });

    it('fires asyncValidating then asyncValidated when replace() runs after Suspense resolves (React Query pattern)', async () => {
      type SuspenseData = { name: string };
      const events: StateChangeEvent<SuspenseData>[] = [];
      const listener = vi.fn((event: StateChangeEvent<SuspenseData>) => {
        events.push(event);
      });

      const suspenseSchema = z.object({
        name: z
          .formString({ required: true })
          .check(z.validateAsync(() => Promise.resolve(true), 'nope')),
      });

      let resolveFetch: ((value: SuspenseData) => void) | undefined;
      let fetched: SuspenseData | undefined;
      let pendingPromise: Promise<SuspenseData> | undefined;

      const useSuspendingFetch = () => {
        if (fetched) {
          return fetched;
        }

        if (!pendingPromise) {
          pendingPromise = new Promise<SuspenseData>((resolve) => {
            resolveFetch = (value) => {
              fetched = value;
              resolve(value);
            };
          });
        }

        // React Suspense protocol — throwing a Promise suspends the component.
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw pendingPromise;
      };

      const Inner = () => {
        const data = useSuspendingFetch();
        const {
          formActions: { replace },
          formHooks: { useListener },
        } = useFormState(suspenseSchema);
        useListener(listener);

        useLayoutEffect(() => {
          replace(data);
        }, [data, replace]);

        return null;
      };

      render(
        <StrictMode>
          <React.Suspense fallback={null}>
            <Inner />
          </React.Suspense>
        </StrictMode>
      );

      await act(async () => {
        resolveFetch?.({ name: 'Alice' });
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(events.some((evt) => evt.type === 'asyncValidated')).toBe(true);
      });

      const asyncEvents = events.filter(
        (evt) => evt.type === 'asyncValidating' || evt.type === 'asyncValidated'
      );

      expect(asyncEvents.map((evt) => evt.type)).toStrictEqual([
        'asyncValidating',
        'asyncValidated',
      ]);
    });

    it('fires asyncValidating then asyncValidated when replace() runs from a post-mount effect (React Query pattern)', async () => {
      type ReplaceData = { name: string };
      const events: StateChangeEvent<ReplaceData>[] = [];
      const listener = vi.fn((event: StateChangeEvent<ReplaceData>) => {
        events.push(event);
      });

      const replaceSchema = z.object({
        name: z
          .formString({ required: true })
          .check(z.validateAsync(() => Promise.resolve(true), 'nope')),
      });

      const Component = ({ data }: { data: ReplaceData | undefined }) => {
        const {
          formActions: { replace },
          formHooks: { useListener },
        } = useFormState(replaceSchema);
        useListener(listener);

        useLayoutEffect(() => {
          if (data) {
            replace(data);
          }
        }, [data, replace]);

        return null;
      };

      const { rerender } = render(<Component data={undefined} />);

      act(() => {
        rerender(<Component data={{ name: 'Alice' }} />);
      });

      await waitFor(() => {
        expect(events.some((evt) => evt.type === 'asyncValidated')).toBe(true);
      });

      const asyncEvents = events.filter(
        (evt) => evt.type === 'asyncValidating' || evt.type === 'asyncValidated'
      );

      expect(asyncEvents.map((evt) => evt.type)).toStrictEqual([
        'asyncValidating',
        'asyncValidated',
      ]);
    });

    it('fires asyncValidating with the pre-change state and asyncValidated with the post-change state across multiple bursts', async () => {
      type PrevData = { name: string };
      const events: StateChangeEvent<PrevData>[] = [];
      const listener = vi.fn((event: StateChangeEvent<PrevData>) => {
        events.push(event);
      });

      const asyncSchema = z.object({
        name: z
          .formString({ required: true })
          .check(z.validateAsync(() => Promise.resolve(true), 'nope')),
      });

      const Component = () => {
        const {
          formActions: { change },
          formHooks: { useListener },
        } = useFormState(asyncSchema, { initialData: { name: 'Mike' } });
        useListener(listener);
        return { change };
      };
      const { result } = renderHook(() => Component());

      act(() => {
        result.current.change('name', 'Alice');
      });

      await waitFor(() => {
        expect(events.filter((evt) => evt.type === 'asyncValidated').length).toBe(1);
      });

      // First burst: prev is the initial mount state ('Mike').
      expect(events.find((evt) => evt.type === 'asyncValidating')?.data.name).toBe('Mike');
      expect(events.find((evt) => evt.type === 'asyncValidated')?.data.name).toBe('Alice');

      events.length = 0;

      act(() => {
        result.current.change('name', 'Bob');
      });

      await waitFor(() => {
        expect(events.some((evt) => evt.type === 'asyncValidated')).toBe(true);
      });

      // Second burst: prev is the result of the first burst ('Alice').
      expect(events.find((evt) => evt.type === 'asyncValidating')?.data.name).toBe('Alice');
      expect(events.find((evt) => evt.type === 'asyncValidated')?.data.name).toBe('Bob');
    });

    it('does not run submitOnly checks or fire async events on change, but runs them on validateAsync()', async () => {
      type SubmitOnlyData = { name: string };
      const events: StateChangeEvent<SubmitOnlyData>[] = [];
      const listener = vi.fn((event: StateChangeEvent<SubmitOnlyData>) => {
        events.push(event);
      });
      const predicate = vi.fn((value: string) => Promise.resolve(value.length > 0));

      const submitOnlySchema = z.object({
        name: z.formString({ required: true }).check(
          z.validateAsync(predicate, {
            error: 'nope',
            submitOnly: true,
          })
        ),
      });

      const Component = () => {
        const {
          formStatus,
          formActions: { change, validateAsync },
          formHooks: { useListener },
        } = useFormState(submitOnlySchema, { initialData: { name: 'Mike' } });
        useListener(listener);
        return { formStatus, change, validateAsync };
      };
      const { result } = renderHook(() => Component());

      act(() => {
        result.current.change('name', 'Alice');
      });

      await waitFor(() => {
        expect(result.current.formStatus.validating).toBe(false);
      });

      expect(predicate).not.toHaveBeenCalled();
      expect(
        events.filter((evt) => evt.type === 'asyncValidating' || evt.type === 'asyncValidated')
      ).toStrictEqual([]);

      await act(async () => {
        await result.current.validateAsync();
      });

      expect(predicate).toHaveBeenCalledTimes(1);
      expect(events.some((evt) => evt.type === 'asyncValidating')).toBe(true);
      expect(events.some((evt) => evt.type === 'asyncValidated')).toBe(true);
    });

    it('does submit when sync validation has no errors', async () => {
      const predicate = vi.fn((value: string) => value.length > 0);

      const submitSchema = z.object({
        name: z.formString({ required: true }).check(
          z.validate(predicate, {
            error: 'Validation error',
          })
        ),
      });

      const Component = () => {
        const {
          formStatus,
          formActions: { change },
          formHandlers: { handleSubmit },
        } = useFormState(submitSchema, { initialData: { name: 'Jack' } });

        return { formStatus, change, handleSubmit };
      };

      const { result } = renderHook(() => Component());

      act(() => {
        result.current.change('name', 'Alice');
      });

      await act(async () => {
        await result.current.handleSubmit(() => Promise.resolve(true), {
          onError() {
            throw new Error('Not to be called');
          },
          onSuccess(state) {
            expect(state.data.name).toBe('Alice');
          },
        })(new FormData());
      });

      expect(result.current.formStatus.submitted).toBe(true);
    });

    it('does not submit when sync validation has an error', async () => {
      const predicate = vi.fn((value: string) => value.length < 0);

      const submitSchema = z.object({
        name: z.formString({ required: true }).check(
          z.validate(predicate, {
            error: 'Validation error',
          })
        ),
      });

      const Component = () => {
        const {
          formStatus,
          formActions: { change },
          formHandlers: { handleSubmit },
        } = useFormState(submitSchema, { initialData: { name: 'Mitch' } });

        return { formStatus, change, handleSubmit };
      };

      const { result } = renderHook(() => Component());

      act(() => {
        result.current.change('name', 'Alice');
      });

      await act(async () => {
        await result.current.handleSubmit(() => Promise.resolve(true), {
          onError(state) {
            expect(state.errors.name).toBe('Validation error');
          },
          onSuccess() {
            throw new Error('Not to be called');
          },
        })(new FormData());
      });

      expect(result.current.formStatus.submitted).toBe(false);
    });

    it('does submit when async validation has no errors', async () => {
      const predicate = vi.fn((value: string) => Promise.resolve(value.length > 0));

      const submitSchema = z.object({
        name: z.formString({ required: true }).check(
          z.validateAsync(predicate, {
            error: 'Validation error',
          })
        ),
      });

      const Component = () => {
        const {
          formStatus,
          formActions: { change },
          formHandlers: { handleSubmit },
        } = useFormState(submitSchema, { initialData: { name: 'Mike' } });

        return { formStatus, change, handleSubmit };
      };

      const { result } = renderHook(() => Component());

      act(() => {
        result.current.change('name', 'Alice');
      });

      await waitFor(() => {
        expect(result.current.formStatus.validating).toBe(false);
      });

      await act(async () => {
        await result.current.handleSubmit(() => Promise.resolve(true), {
          onError() {
            throw new Error('Not to be called');
          },
          onSuccess(state) {
            expect(state.data.name).toBe('Alice');
          },
        })(new FormData());
      });

      expect(result.current.formStatus.submitted).toBe(true);
    });

    it.each([true, false])(
      'does not submit when async validation has an error (submitOnly=%s)',
      async (submitOnly) => {
        const predicate = vi.fn((value: string) => Promise.resolve(value.length < 0));

        const submitSchema = z.object({
          name: z.formString({ required: true }).check(
            z.validateAsync(predicate, {
              error: 'Validation error',
              submitOnly: submitOnly,
            })
          ),
        });

        const Component = () => {
          const {
            formStatus,
            formActions: { change },
            formHandlers: { handleSubmit },
          } = useFormState(submitSchema, { initialData: { name: 'John' } });

          return { formStatus, change, handleSubmit };
        };

        const { result } = renderHook(() => Component());

        act(() => {
          result.current.change('name', 'Alice');
        });

        await waitFor(() => {
          expect(result.current.formStatus.validating).toBe(false);
        });

        await act(async () => {
          await result.current.handleSubmit(() => Promise.resolve(true), {
            onError(state) {
              expect(state.errors.name).toBe('Validation error');
            },
            onSuccess() {
              throw new Error('Not to be called');
            },
          })(new FormData());
        });

        expect(result.current.formStatus.submitted).toBe(false);
      }
    );

    it('clears post submit errors when sync validation has an error', async () => {
      const predicate = vi.fn((value: string) => value.length > 0);

      const submitSchema = z.object({
        name: z.formString().check(
          z.validate(predicate, {
            error: 'Validation error',
          })
        ),
      });

      const Component = () => {
        const {
          formState: { errors },
          formStatus,
          formActions: { change },
          formHandlers: { handleSubmit },
        } = useFormState(submitSchema);

        return { errors, formStatus, change, handleSubmit };
      };

      const { result } = renderHook(() => Component());

      act(() => {
        result.current.change('name', '');
      });

      await act(async () => {
        await result.current.handleSubmit(() => Promise.resolve(true), {
          onError(state) {
            expect(state.errors.name).toBe('Validation error');
          },
          onSuccess() {
            throw new Error('Not to be called');
          },
        })(new FormData());
      });

      act(() => {
        result.current.change('name', 'Alice');
      });

      await act(async () => {
        await result.current.handleSubmit(() => Promise.resolve(true), {
          onError() {
            throw new Error('Not to be called');
          },
          onSuccess(state) {
            expect(state.data.name).toBe('Alice');
          },
        })(new FormData());
      });

      expect(result.current.errors.name).toBeUndefined();
      expect(result.current.formStatus.valid).toBe(true);
    });

    it('clears post submit errors when async validation has an error', async () => {
      const predicate = vi.fn((value: string) => Promise.resolve(value.length > 0));

      const submitSchema = z.object({
        name: z.formString().check(
          z.validateAsync(predicate, {
            error: 'Validation error',
            submitOnly: true,
          })
        ),
      });

      // eslint-disable-next-line sonarjs/no-identical-functions
      const Component = () => {
        const {
          formState: { errors },
          formStatus,
          formActions: { change },
          formHandlers: { handleSubmit },
        } = useFormState(submitSchema);

        return { errors, formStatus, change, handleSubmit };
      };

      const { result } = renderHook(() => Component());

      act(() => {
        result.current.change('name', '');
      });

      await waitFor(() => {
        expect(result.current.formStatus.validating).toBe(false);
      });

      await act(async () => {
        await result.current.handleSubmit(() => Promise.resolve(true), {
          onError(state) {
            expect(state.errors.name).toBe('Validation error');
          },
          onSuccess() {
            throw new Error('Not to be called');
          },
        })(new FormData());
      });

      act(() => {
        result.current.change('name', 'Alice');
      });

      await waitFor(() => {
        expect(result.current.formStatus.validating).toBe(false);
      });

      await act(async () => {
        await result.current.handleSubmit(() => Promise.resolve(true), {
          onError() {
            throw new Error('Not to be called');
          },
          onSuccess(state) {
            expect(state.data.name).toBe('Alice');
          },
        })(new FormData());
      });

      expect(result.current.errors.name).toBeUndefined();
      expect(result.current.formStatus.valid).toBe(true);
    });

    it('keeps the submitOnly async error across repeated submits with unchanged failing data', async () => {
      const submitSchema = z.object({
        name: z.formString().check(
          z.validateAsync((value: string) => Promise.resolve(value === 'allowed'), {
            error: 'Validation error',
            submitOnly: true,
          })
        ),
      });

      const Component = () => {
        const {
          formState: { errors },
          formStatus,
          formHandlers: { handleSubmit },
        } = useFormState(submitSchema, { initialData: { name: 'rejected' } });

        return { errors, formStatus, handleSubmit };
      };

      const { result } = renderHook(() => Component());

      const onError = vi.fn();
      const onSuccess = vi.fn();
      const submit = result.current.handleSubmit(() => Promise.resolve(true), {
        onError,
        onSuccess,
      });

      await act(async () => {
        await submit(new FormData());
      });

      await waitFor(() => {
        expect(onError).toHaveBeenCalledTimes(1);
      });

      expect(result.current.errors.name).toBe('Validation error');

      await act(async () => {
        await submit(new FormData());
      });

      await waitFor(() => {
        expect(onError).toHaveBeenCalledTimes(2);
      });

      expect(onSuccess).not.toHaveBeenCalled();
      expect(result.current.errors.name).toBe('Validation error');
      expect(result.current.formStatus.valid).toBe(false);
    });

    it('REPRO: re-runs a submitOnly check when a round-trip change restores the previously-committed value', async () => {
      const PRIORITY_TYPE = 2;

      type FormShape = { priority: boolean | ''; notes: { typeId: number | '' }[] };

      const submitSchema = z
        .object({
          priority: z.formBoolean(),
          notes: z.array(z.object({ typeId: z.formNumber({ required: true }) })),
        })
        .check(
          z.validateAsync(
            (data: FormShape) => {
              const hasPriorityType = data.notes.some((n) => n.typeId === PRIORITY_TYPE);
              return Promise.resolve(Boolean(data.priority) || !hasPriorityType);
            },
            {
              path: ['priority'],
              error: 'Priority must be set to allow priority notes.',
              submitOnly: true,
              skipWhen: (data: FormShape, prevData?: FormShape) => {
                const hasPriorityType = data.notes.some((n) => n.typeId === PRIORITY_TYPE);
                const prevHasPriorityType = prevData?.notes.some((n) => n.typeId === PRIORITY_TYPE);
                return (
                  data.priority === prevData?.priority && hasPriorityType === prevHasPriorityType
                );
              },
            }
          )
        );

      const onSuccess = vi.fn();
      const onError = vi.fn();

      const Component = () => {
        const {
          formState: { errors },
          formActions: { change },
          formHandlers: { handleSubmit },
        } = useFormState(submitSchema, {
          initialData: { priority: true, notes: [{ typeId: PRIORITY_TYPE }] },
        });
        return { errors, change, handleSubmit };
      };
      const { result } = renderHook(() => Component());
      const submit = result.current.handleSubmit(() => Promise.resolve(true), {
        onSuccess,
        onError,
      });

      // 1. Submit with priority=true -> succeeds.
      await act(async () => {
        await submit(new FormData());
      });
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onError).not.toHaveBeenCalled();

      // 2. Uncheck priority -> submit fails.
      act(() => {
        result.current.change('priority', false);
      });
      await act(async () => {
        await submit(new FormData());
      });
      expect(result.current.errors.priority).toBe('Priority must be set to allow priority notes.');
      expect(onError).toHaveBeenCalledTimes(1);

      // 3. Toggle priority true then back to false (round-trip).
      act(() => {
        result.current.change('priority', true);
      });
      act(() => {
        result.current.change('priority', false);
      });

      // 4. Submit again -> the check must still fail
      onSuccess.mockClear();
      await act(async () => {
        await submit(new FormData());
      });
      expect(onSuccess).not.toHaveBeenCalled();
      expect(result.current.errors.priority).toBe('Priority must be set to allow priority notes.');
    });

    it('preserves a submitOnly async error across 2x submits when a prior change ran the async pipeline', async () => {
      // Regression: when a schema mixes a non-submitOnly async check with a
      // submitOnly check, the change-async pipeline used to commit the
      // submitOnly check's prev value during change phase. On the next
      // submit, the submitOnly skipWhen saw current === prev and skipped
      // the predicate — clearing the error on subsequent submits even
      // though the data still failed.
      const submitSchema = z
        .object({
          name: z
            .formString({ required: true })
            .check(z.validateAsync((value: string) => Promise.resolve(value !== ''), 'name async')),
        })
        .check(
          z.validateAsync(
            (data: { name: string }) => Promise.resolve(Boolean(data.name && data.name !== 'bad')),
            {
              error: 'submitOnly error',
              submitOnly: true,
            }
          )
        );

      const Component = () => {
        const {
          formState: { errors },
          formStatus,
          formActions: { change },
          formHandlers: { handleSubmit },
        } = useFormState(submitSchema, { initialData: { name: 'initial' } });

        return { errors, formStatus, change, handleSubmit };
      };

      const { result } = renderHook(() => Component());

      act(() => {
        result.current.change('name', 'bad');
      });

      await waitFor(() => {
        expect(result.current.formStatus.validating).toBe(false);
      });

      // Submit twice with unchanged failing data — the submitOnly error
      // must persist on both submits.
      await act(async () => {
        await result.current.handleSubmit(() => Promise.resolve(true))(new FormData());
      });
      expect(result.current.errors['']).toBe('submitOnly error');

      await act(async () => {
        await result.current.handleSubmit(() => Promise.resolve(true))(new FormData());
      });
      expect(result.current.errors['']).toBe('submitOnly error');
    });

    it('clears a submitOnly async error when the user edits that same path', async () => {
      const submitSchema = z.object({
        name: z.formString({ required: true }).check(
          z.validateAsync((value: string) => Promise.resolve(value === 'allowed'), {
            error: 'submitOnly error',
            submitOnly: true,
          })
        ),
      });

      const Component = () => {
        const {
          formState: { errors },
          formActions: { change },
          formHandlers: { handleSubmit },
        } = useFormState(submitSchema, { initialData: { name: 'rejected' } });

        return { errors, change, handleSubmit };
      };

      const { result } = renderHook(() => Component());

      await act(async () => {
        await result.current.handleSubmit(() => Promise.resolve(true))(new FormData());
      });

      expect(result.current.errors.name).toBe('submitOnly error');

      // User edits the same path → the stale submitOnly error should clear
      // optimistically (it'll re-run on next submit).
      act(() => {
        result.current.change('name', 'editing');
      });

      expect(result.current.errors.name).toBeUndefined();
    });

    it('surfaces sync field errors on change even when a submitOnly async check exists', () => {
      const submitSchema = z.object({
        name: z.formString({ required: true }, z.maxLength(3, 'Too long')),
        email: z.formString({ required: true }).check(
          z.validateAsync((value: string) => Promise.resolve(value === 'allowed@x'), {
            error: 'submitOnly email error',
            submitOnly: true,
          })
        ),
      });

      const Component = () => {
        const {
          formState: { errors },
          formActions: { change },
        } = useFormState(submitSchema, {
          initialData: { name: 'Al', email: 'rejected@x' },
        });

        return { errors, change };
      };

      const { result } = renderHook(() => Component());

      act(() => {
        result.current.change('name', 'TooLongName');
      });

      expect(result.current.errors.name).toBe('Too long');
      expect(result.current.errors.email).toBeUndefined();
    });

    describe('sync + async + submitOnly async combinations', () => {
      it('on change: surfaces the sync error, runs the regular async, skips submitOnly', async () => {
        const asyncSpy = vi.fn();
        const submitOnlySpy = vi.fn();
        const comboSchema = makeComboSchema({ asyncSpy, submitOnlySpy });

        const Component = () => {
          const {
            formState: { errors },
            formStatus,
            formActions: { change },
          } = useFormState(comboSchema, { initialData: { name: 'ok', email: 'ok@x' } });

          return { errors, formStatus, change };
        };

        const { result } = renderHook(() => Component());

        act(() => {
          result.current.change('name', 'TooLong');
        });

        await waitFor(() => {
          expect(result.current.formStatus.validating).toBe(false);
        });

        expect(result.current.errors.name).toBe('Name too long');
        expect(asyncSpy).toHaveBeenCalled();
        expect(submitOnlySpy).not.toHaveBeenCalled();
      });

      it('on change: regular async error surfaces while submitOnly stays dormant', async () => {
        const submitOnlySpy = vi.fn();
        const comboSchema = makeComboSchema({ submitOnlySpy });

        const Component = () => {
          const {
            formState: { errors },
            formStatus,
            formActions: { change },
          } = useFormState(comboSchema, { initialData: { name: 'yes', email: 'ok@x' } });

          return { errors, formStatus, change };
        };

        const { result } = renderHook(() => Component());

        act(() => {
          result.current.change('email', 'bad@x');
        });

        await waitFor(() => {
          expect(result.current.formStatus.validating).toBe(false);
        });

        expect(result.current.errors.email).toBe('Email async error');
        expect(result.current.errors.name).toBeUndefined();
        expect(submitOnlySpy).not.toHaveBeenCalled();
      });

      it('on submit: a sync error blocks submission before any async check runs', async () => {
        const asyncSpy = vi.fn();
        const submitOnlySpy = vi.fn();
        const comboSchema = makeComboSchema({ asyncSpy, submitOnlySpy });

        const onSuccess = vi.fn();
        const onError = vi.fn();

        const Component = () => {
          const {
            formState: { errors },
            formActions: { change },
            formHandlers: { handleSubmit },
          } = useFormState(comboSchema, { initialData: { name: 'ok', email: 'ok@x' } });

          return { errors, change, handleSubmit };
        };

        const { result } = renderHook(() => Component());

        act(() => {
          result.current.change('name', 'TooLong');
        });

        await act(async () => {
          await result.current.handleSubmit(() => Promise.resolve(true), {
            onSuccess,
            onError,
          })(new FormData());
        });

        expect(result.current.errors.name).toBe('Name too long');
        expect(onSuccess).not.toHaveBeenCalled();
        expect(onError).toHaveBeenCalledTimes(1);
      });

      it('on submit: sync valid, runs both async checks and surfaces the submitOnly error', async () => {
        const asyncSpy = vi.fn();
        const submitOnlySpy = vi.fn();
        const comboSchema = makeComboSchema({ asyncSpy, submitOnlySpy });

        const onSuccess = vi.fn();
        const onError = vi.fn();

        const Component = () => {
          const {
            formState: { errors },
            formStatus,
            formActions: { change },
            formHandlers: { handleSubmit },
          } = useFormState(comboSchema, { initialData: { name: 'yes', email: 'ok@x' } });

          return { errors, formStatus, change, handleSubmit };
        };

        const { result } = renderHook(() => Component());

        act(() => {
          result.current.change('name', 'no');
        });

        await waitFor(() => {
          expect(result.current.formStatus.validating).toBe(false);
        });

        // No sync error (within length), email async passes, submitOnly silent on change.
        expect(result.current.errors.name).toBeUndefined();
        expect(submitOnlySpy).not.toHaveBeenCalled();

        await act(async () => {
          await result.current.handleSubmit(() => Promise.resolve(true), {
            onSuccess,
            onError,
          })(new FormData());
        });

        // On submit, both async checks ran; the submitOnly error now appears.
        expect(submitOnlySpy).toHaveBeenCalled();
        expect(asyncSpy).toHaveBeenCalled();
        expect(result.current.errors.name).toBe('submitOnly name error');
        expect(onSuccess).not.toHaveBeenCalled();
        expect(onError).toHaveBeenCalledTimes(1);
      });

      it('on submit: all checks pass and the form submits successfully', async () => {
        const comboSchema = makeComboSchema();

        const onSuccess = vi.fn();
        const onError = vi.fn();

        const Component = () => {
          const {
            formStatus,
            formHandlers: { handleSubmit },
          } = useFormState(comboSchema, { initialData: { name: 'ok', email: 'ok@x' } });

          return { formStatus, handleSubmit };
        };

        const { result } = renderHook(() => Component());

        await act(async () => {
          await result.current.handleSubmit(() => Promise.resolve(true), {
            onSuccess,
            onError,
          })(new FormData());
        });

        expect(onError).not.toHaveBeenCalled();
        expect(onSuccess).toHaveBeenCalledTimes(1);
        expect(result.current.formStatus.submitted).toBe(true);
      });
    });

    it('keeps a submitOnly async error when an unrelated path is changed', async () => {
      const submitSchema = z.object({
        name: z.formString({ required: true }),
        email: z.formString({ required: true }).check(
          z.validateAsync((value: string) => Promise.resolve(value === 'allowed@x'), {
            error: 'submitOnly email error',
            submitOnly: true,
          })
        ),
      });

      const Component = () => {
        const {
          formState: { errors },
          formActions: { change },
          formHandlers: { handleSubmit },
        } = useFormState(submitSchema, {
          initialData: { name: 'Alice', email: 'rejected@x' },
        });

        return { errors, change, handleSubmit };
      };

      const { result } = renderHook(() => Component());

      await act(async () => {
        await result.current.handleSubmit(() => Promise.resolve(true))(new FormData());
      });

      expect(result.current.errors.email).toBe('submitOnly email error');

      // Editing an unrelated field must NOT clear the email's submitOnly
      // error — it's still about the current email value.
      act(() => {
        result.current.change('name', 'Alicia');
      });

      expect(result.current.errors.email).toBe('submitOnly email error');
    });

    it('keeps the submitOnly async error across repeated <Form action> submits with unchanged failing data', async () => {
      const submitSchema = z.object({
        name: z.formString().check(
          z.validateAsync((value: string) => Promise.resolve(value === 'allowed'), {
            error: 'Validation error',
            submitOnly: true,
          })
        ),
      });

      const onError = vi.fn();
      const onSuccess = vi.fn();

      const SubmitForm = () => {
        const {
          formState: { errors },
          formStatus,
          formHandlers: { handleSubmit },
          Form,
        } = useFormState(submitSchema, { initialData: { name: 'rejected' } });

        // Mirror the app pattern: onSubmit returns {} on invalid (instead of true).
        return (
          <Form
            action={handleSubmit(
              (state) => (state.valid ? Promise.resolve(true) : Promise.resolve({})),
              {
                onError,
                onSuccess,
              }
            )}
          >
            <p data-testid="name-error">{errors.name ?? 'no-error'}</p>
            <p data-testid="valid">{String(formStatus.valid)}</p>
            <button>Submit</button>
          </Form>
        );
      };

      render(
        <StrictMode>
          <SubmitForm />
        </StrictMode>
      );

      fireEvent.click(screen.getByText('Submit'));

      await waitFor(() => {
        expect(onError).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => {
        expect(screen.getByTestId('name-error')).toHaveTextContent('Validation error');
      });

      // Click submit again WITHOUT changing data. The submitOnly async error must persist.
      fireEvent.click(screen.getByText('Submit'));

      await waitFor(() => {
        expect(onError).toHaveBeenCalledTimes(2);
      });

      expect(onSuccess).not.toHaveBeenCalled();
      expect(screen.getByTestId('name-error')).toHaveTextContent('Validation error');
      expect(screen.getByTestId('valid')).toHaveTextContent('false');
    });

    it.each([
      {
        label: 'sync',
        buildSchema: () =>
          z.object({
            name: z
              .formString()
              .check(
                z.validate((value: string) => value.length > 0, { error: 'Validation error' })
              ),
          }),
      },
      {
        label: 'async',
        buildSchema: () =>
          z.object({
            name: z.formString().check(
              z.validateAsync((value: string) => Promise.resolve(value.length > 0), {
                error: 'Validation error',
                submitOnly: true,
              })
            ),
          }),
      },
    ])(
      'calls onError on every failed $label submit and keeps the error',
      async ({ buildSchema }) => {
        const submitSchema = buildSchema();

        const Component = () => {
          const {
            formState: { errors },
            formActions: { change },
            formHandlers: { handleSubmit },
          } = useFormState(submitSchema);

          return { errors, change, handleSubmit };
        };

        const { result } = renderHook(() => Component());

        act(() => {
          result.current.change('name', '');
        });

        const onSubmit = vi.fn(() => Promise.resolve(true as const));
        const onError = vi.fn();
        const onSuccess = vi.fn();
        const submit = result.current.handleSubmit(onSubmit, { onError, onSuccess });

        await act(async () => {
          await submit(new FormData());
        });

        await waitFor(() => {
          expect(onError).toHaveBeenCalledTimes(1);
        });

        expect(result.current.errors.name).toBe('Validation error');

        await act(async () => {
          await submit(new FormData());
        });

        await waitFor(() => {
          expect(onError).toHaveBeenCalledTimes(2);
        });

        expect(onSuccess).not.toHaveBeenCalled();
        expect(result.current.errors.name).toBe('Validation error');
        const firstErrorState = onError.mock.calls[0]?.[0] as { errors: { name?: string } };
        const secondErrorState = onError.mock.calls[1]?.[0] as { errors: { name?: string } };
        expect(firstErrorState.errors.name).toBe('Validation error');
        expect(secondErrorState.errors.name).toBe('Validation error');
      }
    );

    it.each([true, false])(
      'clears post validation errors when sync validation has an error (submit=%s)',
      (submit) => {
        const predicate = vi.fn((value: string) => value.length > 0);

        const submitSchema = z.object({
          name: z.formString().check(
            z.validate(predicate, {
              error: 'Validation error',
            })
          ),
        });

        const Component = () => {
          const {
            formState: { errors },
            formStatus,
            formActions: { change, validate },
          } = useFormState(submitSchema);

          return { errors, formStatus, change, validate };
        };

        const { result } = renderHook(() => Component());

        act(() => {
          result.current.change('name', '');
        });

        result.current.validate({ submit });

        act(() => {
          result.current.change('name', 'Alice');
        });

        result.current.validate({ submit });

        expect(result.current.errors.name).toBeUndefined();
        expect(result.current.formStatus.valid).toBe(true);
      }
    );

    it('clears post validation errors when async validation has an error', async () => {
      const predicate = vi.fn((value: string) => Promise.resolve(value.length > 0));

      const submitSchema = z.object({
        name: z.formString().check(
          z.validateAsync(predicate, {
            error: 'Validation error',
            submitOnly: true,
          })
        ),
      });

      const Component = () => {
        const {
          formState: { errors },
          formStatus,
          formActions: { change, validateAsync },
        } = useFormState(submitSchema);

        return { errors, formStatus, change, validateAsync };
      };

      const { result } = renderHook(() => Component());

      act(() => {
        result.current.change('name', '');
      });

      await waitFor(() => {
        expect(result.current.formStatus.validating).toBe(false);
      });

      await act(async () => {
        await result.current.validateAsync();
      });

      act(() => {
        result.current.change('name', 'Alice');
      });

      await waitFor(() => {
        expect(result.current.formStatus.validating).toBe(false);
      });

      await act(async () => {
        await result.current.validateAsync();
      });

      expect(result.current.errors.name).toBeUndefined();
      expect(result.current.formStatus.valid).toBe(true);
    });

    it('discards a submit when the asyncRequestId changes during the schema parse', async () => {
      let releaseParse: (() => void) | undefined;
      const gate = new Promise<void>((resolve) => {
        releaseParse = resolve;
      });

      const predicate = vi.fn(async (value: string) => {
        if (value === 'Submitting') {
          await gate;
        }
        return value !== 'taken';
      });

      const racySchema = z.object({
        name: z
          .formString({ required: true })
          .check(z.validateAsync(predicate, { error: 'Validation error' })),
      });

      const onSuccess = vi.fn();
      const onError = vi.fn();

      const Component = () => {
        const {
          formStatus,
          formActions: { change },
          formHandlers: { handleSubmit },
        } = useFormState(racySchema, { initialData: { name: 'Submitting' } });

        return { formStatus, change, handleSubmit };
      };

      const { result } = renderHook(() => Component());

      const submit = result.current.handleSubmit(() => Promise.resolve(true), {
        onSuccess,
        onError,
      });

      let submitPromise: Promise<void> | undefined;

      await act(async () => {
        submitPromise = submit(new FormData());
        await Promise.resolve();
      });

      act(() => {
        result.current.change('name', 'Updated');
      });

      await act(async () => {
        releaseParse?.();
        await submitPromise;
      });

      expect(onSuccess).not.toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
      expect(result.current.formStatus.submitted).toBe(false);
    });

    it('discards a submit when the asyncRequestId changes during the onSubmit handler', async () => {
      const racySchema = z.object({
        name: z
          .formString({ required: true })
          .check(z.validateAsync(() => Promise.resolve(true), { error: 'Validation error' })),
      });

      const onSuccess = vi.fn();
      const onError = vi.fn();

      let resolveHandler: ((value: true) => void) | undefined;
      const onSubmitHandler = vi.fn(
        () =>
          new Promise<true>((resolve) => {
            resolveHandler = resolve;
          })
      );

      const Component = () => {
        const {
          formStatus,
          formActions: { change },
          formHandlers: { handleSubmit },
        } = useFormState(racySchema, { initialData: { name: 'Initial' } });

        return { formStatus, change, handleSubmit };
      };

      const { result } = renderHook(() => Component());

      const submit = result.current.handleSubmit(onSubmitHandler, {
        onSuccess,
        onError,
      });

      let submitPromise: Promise<void> | undefined;

      act(() => {
        submitPromise = submit(new FormData());
      });

      await waitFor(() => {
        expect(onSubmitHandler).toHaveBeenCalled();
      });

      act(() => {
        result.current.change('name', 'Updated');
      });

      await act(async () => {
        resolveHandler?.(true);
        await submitPromise;
      });

      expect(onSuccess).not.toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
      expect(result.current.formStatus.submitted).toBe(false);
    });

    it('keeps the async error on a repeated submit with unchanged data', async () => {
      const predicate = vi.fn((value: string) => Promise.resolve(value !== 'taken'));

      const submitSchema = z.object({
        name: z.formString({ required: true }).check(
          z.validateAsync(predicate, {
            error: 'Validation error',
          })
        ),
      });

      const Component = () => {
        const {
          formStatus,
          formActions: { change },
          formHandlers: { handleSubmit },
        } = useFormState(submitSchema, { initialData: { name: 'Carol' } });

        return { formStatus, change, handleSubmit };
      };

      const { result } = renderHook(() => Component());

      act(() => {
        result.current.change('name', 'taken');
      });

      await waitFor(() => {
        expect(result.current.formStatus.validating).toBe(false);
      });

      const submit = result.current.handleSubmit(() => Promise.resolve(true), {
        onError(state) {
          expect(state.errors.name).toBe('Validation error');
        },
        onSuccess() {
          throw new Error('onSuccess must not be called');
        },
      });

      await act(async () => {
        await submit(new FormData());
      });

      expect(result.current.formStatus.submitted).toBe(false);

      await act(async () => {
        await submit(new FormData());
      });

      expect(result.current.formStatus.submitted).toBe(false);
    });

    it('preserves an async error on field B when an unrelated field A changes', async () => {
      const namePredicate = vi.fn((value: string) => Promise.resolve(value !== 'taken'));
      const emailPredicate = vi.fn((value: string) => Promise.resolve(!value.startsWith('used')));

      const crossSchema = z.object({
        name: z
          .formString({ required: true })
          .check(z.validateAsync(namePredicate, { error: 'Name taken' })),
        email: z
          .formString({ required: true })
          .check(z.validateAsync(emailPredicate, { error: 'Email used' })),
      });

      const Component = () => {
        const {
          formState,
          formStatus,
          formActions: { change },
        } = useFormState(crossSchema, { initialData: { name: 'Alice', email: 'a@x.com' } });

        return { formState, formStatus, change };
      };

      const { result } = renderHook(() => Component());

      act(() => {
        result.current.change('email', 'used@x.com');
      });

      await waitFor(() => {
        expect(result.current.formStatus.validating).toBe(false);
      });
      expect(result.current.formState.errors.email).toBe('Email used');

      act(() => {
        result.current.change('name', 'Bob');
      });

      await waitFor(() => {
        expect(result.current.formStatus.validating).toBe(false);
      });

      expect(result.current.formState.errors.email).toBe('Email used');
      expect(emailPredicate).toHaveBeenCalledTimes(1);
    });

    it('clears the async error for a field once its value changes to a valid one', async () => {
      const predicate = vi.fn((value: string) => Promise.resolve(value !== 'taken'));

      const clearSchema = z.object({
        name: z
          .formString({ required: true })
          .check(z.validateAsync(predicate, { error: 'Name taken' })),
      });

      const Component = () => {
        const {
          formState,
          formStatus,
          formActions: { change },
        } = useFormState(clearSchema, { initialData: { name: 'Alice' } });

        return { formState, formStatus, change };
      };

      const { result } = renderHook(() => Component());

      act(() => {
        result.current.change('name', 'taken');
      });
      await waitFor(() => {
        expect(result.current.formStatus.validating).toBe(false);
      });
      expect(result.current.formState.errors.name).toBe('Name taken');

      act(() => {
        result.current.change('name', 'fresh');
      });
      await waitFor(() => {
        expect(result.current.formStatus.validating).toBe(false);
      });

      expect(result.current.formState.errors.name).toBeUndefined();
    });

    it.each([false, true])(
      'does not validate/submit a sync schema (submit=%s)',
      async (shouldSubmit: boolean) => {
        const predicate = vi.fn((value: string) => value.length < 0);

        const submitSchema = z.object({
          name: z.formString({ required: true }).check(
            z.validate(predicate, {
              error: 'Validation error',
            })
          ),
        });

        const Component = () => {
          const {
            formStatus,
            formActions: { change, validate },
          } = useFormState(submitSchema, { initialData: { name: 'Karl' } });

          return { formStatus, change, validate };
        };

        const { result } = renderHook(() => Component());

        act(() => {
          result.current.change('name', 'Alice');
        });

        await waitFor(() => {
          expect(result.current.formStatus.validating).toBe(false);
        });

        act(() => {
          result.current.validate({ submit: shouldSubmit });
        });

        expect(result.current.formStatus.valid).toBe(false);
        expect(result.current.formStatus.submitted).toBe(false);
      }
    );

    it.each([false, true])(
      'throws from validate() on an async schema (submit=%s)',
      (shouldSubmit: boolean) => {
        const submitSchema = z.object({
          name: z
            .formString({ required: true })
            .check(z.validateAsync(() => Promise.resolve(true), { error: 'Validation error' })),
        });

        const Component = () => {
          const {
            formActions: { validate },
          } = useFormState(submitSchema, { initialData: { name: 'Bob' } });

          return { validate };
        };

        const { result } = renderHook(() => Component());

        expect(() => {
          result.current.validate({ submit: shouldSubmit });
        }).toThrow(/validate\(\) cannot be used with a schema that has async checks/);
      }
    );

    it('validateAsync() returns false when async validation has an error', async () => {
      const predicate = vi.fn((value: string) => Promise.resolve(value.length < 0));

      const asyncSchema = z.object({
        name: z
          .formString({ required: true })
          .check(z.validateAsync(predicate, { error: 'Validation error' })),
      });

      const Component = () => {
        const {
          formStatus,
          formActions: { change, validateAsync },
        } = useFormState(asyncSchema, { initialData: { name: 'Bob' } });

        return { formStatus, change, validateAsync };
      };

      const { result } = renderHook(() => Component());

      act(() => {
        result.current.change('name', 'Alice');
      });

      await waitFor(() => {
        expect(result.current.formStatus.validating).toBe(false);
      });

      let isValid: boolean | undefined;
      await act(async () => {
        isValid = await result.current.validateAsync();
      });

      expect(isValid).toBe(false);
      expect(result.current.formStatus.valid).toBe(false);
    });

    it('validateAsync() returns true when async validation passes', async () => {
      const predicate = vi.fn((value: string) => Promise.resolve(value.length > 0));

      const asyncSchema = z.object({
        name: z
          .formString({ required: true })
          .check(z.validateAsync(predicate, { error: 'Validation error' })),
      });

      const Component = () => {
        const {
          formStatus,
          formActions: { change, validateAsync },
        } = useFormState(asyncSchema, { initialData: { name: 'Carol' } });

        return { formStatus, change, validateAsync };
      };

      const { result } = renderHook(() => Component());

      act(() => {
        result.current.change('name', 'Alice');
      });

      await waitFor(() => {
        expect(result.current.formStatus.validating).toBe(false);
      });

      let isValid: boolean | undefined;
      await act(async () => {
        isValid = await result.current.validateAsync();
      });

      expect(isValid).toBe(true);
      expect(result.current.formStatus.valid).toBe(true);
    });

    it('fires one asyncValidating / asyncValidated pair per active async check', async () => {
      type TwoCheckData = { name: string; email: string };
      const events: StateChangeEvent<TwoCheckData>[] = [];
      const listener = vi.fn((event: StateChangeEvent<TwoCheckData>) => {
        events.push(event);
      });

      const twoCheckSchema = z.object({
        name: z
          .formString({ required: true })
          .check(z.validateAsync(() => Promise.resolve(true), 'name failed')),
        email: z
          .formString({ required: true })
          .check(z.validateAsync(() => Promise.resolve(true), 'email failed')),
      });

      const Component = () => {
        const {
          formActions: { validateAsync },
          formHooks: { useListener },
        } = useFormState(twoCheckSchema, {
          initialData: { name: 'Mike', email: 'mike@x.com' },
        });
        useListener(listener);
        return { validateAsync };
      };
      const { result } = renderHook(() => Component());

      await act(async () => {
        await result.current.validateAsync();
      });

      const asyncEvents = events.filter(
        (evt) => evt.type === 'asyncValidating' || evt.type === 'asyncValidated'
      );
      expect(asyncEvents.map((evt) => evt.type)).toStrictEqual([
        'asyncValidating',
        'asyncValidating',
        'asyncValidated',
        'asyncValidated',
      ]);
      const validatingPaths = new Set(
        asyncEvents.filter((evt) => evt.type === 'asyncValidating').map((evt) => evt.schemaPath)
      );
      const validatedPaths = new Set(
        asyncEvents.filter((evt) => evt.type === 'asyncValidated').map((evt) => evt.schemaPath)
      );
      expect(validatingPaths).toStrictEqual(new Set(['email', 'name']));
      expect(validatedPaths).toStrictEqual(new Set(['email', 'name']));
    });

    it('fires asyncValidating / asyncValidated during handleSubmit, including submitOnly checks', async () => {
      type SubmitEventData = { name: string };
      const events: StateChangeEvent<SubmitEventData>[] = [];
      const listener = vi.fn((event: StateChangeEvent<SubmitEventData>) => {
        events.push(event);
      });

      const submitSchema = z
        .object({
          name: z
            .formString({ required: true })
            .check(z.validateAsync(() => Promise.resolve(true), 'name failed')),
        })
        .check(
          z.validateAsync((data: { name: string }) => Promise.resolve(data.name !== 'bad'), {
            path: ['name'],
            error: 'submitOnly error',
            submitOnly: true,
          })
        );

      const Component = () => {
        const {
          formHandlers: { handleSubmit },
          formHooks: { useListener },
        } = useFormState(submitSchema, { initialData: { name: 'Mike' } });
        useListener(listener);
        return { handleSubmit };
      };
      const { result } = renderHook(() => Component());

      await act(async () => {
        await result.current.handleSubmit(() => Promise.resolve(true))(new FormData());
      });

      const asyncEvents = events.filter(
        (evt) => evt.type === 'asyncValidating' || evt.type === 'asyncValidated'
      );

      expect(asyncEvents.some((evt) => evt.type === 'asyncValidating')).toBe(true);
      expect(asyncEvents.some((evt) => evt.type === 'asyncValidated')).toBe(true);

      const validatedPaths = new Set(
        asyncEvents.filter((evt) => evt.type === 'asyncValidated').map((evt) => evt.schemaPath)
      );
      // Both the regular async check and the submit-only one fire on submit.
      expect(validatedPaths.has('name')).toBe(true);
    });

    describe('handleSubmit-triggered async events (mirror of change-phase coverage)', () => {
      it('exposes schemaPath with the dot-path of the async check on submit', async () => {
        const events: AsyncEvent[] = [];
        const listener = vi.fn((event: AsyncEvent) => {
          events.push(event);
        });
        const asyncSchema = buildAsyncSchema(new Set(['Mike']));

        const Component = () => {
          const {
            formHandlers: { handleSubmit },
            formHooks: { useListener },
          } = useFormState(asyncSchema, { initialData: { name: 'Mike' } });
          useListener(listener);
          return { handleSubmit };
        };
        const { result } = renderHook(() => Component());

        await act(async () => {
          await result.current.handleSubmit(() => Promise.resolve(true))(new FormData());
        });

        const validating = events.find((evt) => evt.type === 'asyncValidating');
        expect(validating?.schemaPath).toBe('name');
      });

      it('uses an empty string in schemaPath for a top-level async check on submit', async () => {
        type RootSchemaData = { name: string };
        const events: StateChangeEvent<RootSchemaData>[] = [];
        const listener = vi.fn((event: StateChangeEvent<RootSchemaData>) => {
          events.push(event);
        });

        const rootAsyncSchema = z
          .object({ name: z.formString({ required: true }) })
          .check(z.validateAsync(() => Promise.resolve(true), 'fails'));

        const Component = () => {
          const {
            formHandlers: { handleSubmit },
            formHooks: { useListener },
          } = useFormState(rootAsyncSchema, { initialData: { name: 'Mike' } });
          useListener(listener);
          return { handleSubmit };
        };
        const { result } = renderHook(() => Component());

        await act(async () => {
          await result.current.handleSubmit(() => Promise.resolve(true))(new FormData());
        });

        const validating = events.find((evt) => evt.type === 'asyncValidating');
        expect(validating?.schemaPath).toBe('');
      });

      it('fires no asyncValidating/asyncValidated events on submit for a sync-only schema', async () => {
        const events: AsyncEvent[] = [];
        const listener = vi.fn((event: AsyncEvent) => {
          events.push(event);
        });
        const syncSchema = z.object({
          name: z.formString({ required: true, error: 'Name is required' }),
        });

        const Component = () => {
          const {
            formHandlers: { handleSubmit },
            formHooks: { useListener },
          } = useFormState(syncSchema, { initialData: { name: 'Mike' } });
          useListener(listener);
          return { handleSubmit };
        };
        const { result } = renderHook(() => Component());

        await act(async () => {
          await result.current.handleSubmit(() => Promise.resolve(true))(new FormData());
        });

        const asyncEvents = events.filter(
          (evt) => evt.type === 'asyncValidating' || evt.type === 'asyncValidated'
        );
        expect(asyncEvents).toStrictEqual([]);
      });

      it('isolates per-form async submit events when two forms share the same schema', async () => {
        const eventsA: AsyncEvent[] = [];
        const eventsB: AsyncEvent[] = [];
        const sharedSchema = buildAsyncSchema(new Set(['Mike']));

        const useFormA = () => {
          const form = useFormState(sharedSchema, { initialData: { name: 'Mike' } });
          form.formHooks.useListener((evt) => {
            eventsA.push(evt);
          });
          return form;
        };
        const useFormB = () => {
          const form = useFormState(sharedSchema, { initialData: { name: 'Mike' } });
          form.formHooks.useListener((evt) => {
            eventsB.push(evt);
          });
          return form;
        };

        const formA = renderHook(() => useFormA());
        renderHook(() => useFormB());

        await act(async () => {
          await formA.result.current.formHandlers.handleSubmit(() => Promise.resolve(true))(
            new FormData()
          );
        });

        const asyncA = eventsA.filter(
          (evt) => evt.type === 'asyncValidating' || evt.type === 'asyncValidated'
        );
        const asyncB = eventsB.filter(
          (evt) => evt.type === 'asyncValidating' || evt.type === 'asyncValidated'
        );
        expect(asyncA.length).toBeGreaterThan(0);
        expect(asyncB).toStrictEqual([]);
      });

      it('fires no events on submit when skipWhen returns true for every async check', async () => {
        type SkipData = { name: string };
        const events: StateChangeEvent<SkipData>[] = [];
        const listener = vi.fn((event: StateChangeEvent<SkipData>) => {
          events.push(event);
        });

        const skipSchema = z.object({
          name: z.formString({ required: true }).check(
            z.validateAsync(() => Promise.resolve(true), {
              error: 'nope',
              skipWhen: () => true,
            })
          ),
        });

        const Component = () => {
          const {
            formHandlers: { handleSubmit },
            formHooks: { useListener },
          } = useFormState(skipSchema, { initialData: { name: 'Mike' } });
          useListener(listener);
          return { handleSubmit };
        };
        const { result } = renderHook(() => Component());

        await act(async () => {
          await result.current.handleSubmit(() => Promise.resolve(true))(new FormData());
        });

        const asyncEvents = events.filter(
          (evt) => evt.type === 'asyncValidating' || evt.type === 'asyncValidated'
        );
        expect(asyncEvents).toStrictEqual([]);
      });

      it('only fires submit events for the non-skipped check when one of two checks has skipWhen=true', async () => {
        type MixedData = { name: string; email: string };
        const events: StateChangeEvent<MixedData>[] = [];
        const listener = vi.fn((event: StateChangeEvent<MixedData>) => {
          events.push(event);
        });

        const mixedSchema = z.object({
          name: z.formString({ required: true }).check(
            z.validateAsync(() => Promise.resolve(true), {
              error: 'nope',
              skipWhen: () => true,
            })
          ),
          email: z
            .formString({ required: true })
            .check(z.validateAsync(() => Promise.resolve(true), 'email failed')),
        });

        const Component = () => {
          const {
            formHandlers: { handleSubmit },
            formHooks: { useListener },
          } = useFormState(mixedSchema, {
            initialData: { name: 'Mike', email: 'mike@x.com' },
          });
          useListener(listener);
          return { handleSubmit };
        };
        const { result } = renderHook(() => Component());

        await act(async () => {
          await result.current.handleSubmit(() => Promise.resolve(true))(new FormData());
        });

        const asyncEvents = events.filter(
          (evt) => evt.type === 'asyncValidating' || evt.type === 'asyncValidated'
        );
        const paths = new Set(asyncEvents.map((evt) => evt.schemaPath));
        expect(paths).toStrictEqual(new Set(['email']));
      });

      it('sets triggerField to undefined for handleSubmit-triggered events', async () => {
        const events: AsyncEvent[] = [];
        const listener = vi.fn((event: AsyncEvent) => {
          events.push(event);
        });
        const asyncSchema = buildAsyncSchema(new Set(['Alice']));

        const Component = () => {
          const {
            formHandlers: { handleSubmit },
            formHooks: { useListener },
          } = useFormState(asyncSchema, { initialData: { name: 'Alice' } });
          useListener(listener);
          return { handleSubmit };
        };
        const { result } = renderHook(() => Component());

        await act(async () => {
          await result.current.handleSubmit(() => Promise.resolve(true))(new FormData());
        });

        const asyncEvents = events.filter(
          (evt) => evt.type === 'asyncValidating' || evt.type === 'asyncValidated'
        );
        expect(asyncEvents[0]?.triggerField).toBeUndefined();
        expect(asyncEvents.at(-1)?.triggerField).toBeUndefined();
      });

      it('fires one asyncValidating / asyncValidated pair per active async check on submit', async () => {
        type TwoCheckData = { name: string; email: string };
        const events: StateChangeEvent<TwoCheckData>[] = [];
        const listener = vi.fn((event: StateChangeEvent<TwoCheckData>) => {
          events.push(event);
        });

        const twoCheckSchema = z.object({
          name: z
            .formString({ required: true })
            .check(z.validateAsync(() => Promise.resolve(true), 'name failed')),
          email: z
            .formString({ required: true })
            .check(z.validateAsync(() => Promise.resolve(true), 'email failed')),
        });

        const Component = () => {
          const {
            formHandlers: { handleSubmit },
            formHooks: { useListener },
          } = useFormState(twoCheckSchema, {
            initialData: { name: 'Mike', email: 'mike@x.com' },
          });
          useListener(listener);
          return { handleSubmit };
        };
        const { result } = renderHook(() => Component());

        await act(async () => {
          await result.current.handleSubmit(() => Promise.resolve(true))(new FormData());
        });

        const asyncEvents = events.filter(
          (evt) => evt.type === 'asyncValidating' || evt.type === 'asyncValidated'
        );
        expect(asyncEvents.map((evt) => evt.type)).toStrictEqual([
          'asyncValidating',
          'asyncValidating',
          'asyncValidated',
          'asyncValidated',
        ]);
        const validatingPaths = new Set(
          asyncEvents.filter((evt) => evt.type === 'asyncValidating').map((evt) => evt.schemaPath)
        );
        const validatedPaths = new Set(
          asyncEvents.filter((evt) => evt.type === 'asyncValidated').map((evt) => evt.schemaPath)
        );
        expect(validatingPaths).toStrictEqual(new Set(['email', 'name']));
        expect(validatedPaths).toStrictEqual(new Set(['email', 'name']));
      });

      it('surfaces an async predicate rejection on submit as a root error and fires asyncValidated', async () => {
        process.on('unhandledRejection', swallowNetworkDown);

        try {
          type RejectingData = { name: string };
          const events: StateChangeEvent<RejectingData>[] = [];
          const listener = vi.fn((event: StateChangeEvent<RejectingData>) => {
            events.push(event);
          });

          const rejectingSchema = z.object({
            name: z.formString({ required: true }).check(
              z.validateAsync(
                () =>
                  new Promise<boolean>((_resolve, reject) => {
                    setTimeout(() => {
                      reject(new Error('Network down'));
                    }, 0);
                  }),
                'unused'
              )
            ),
          });

          const onError = vi.fn();
          const onSuccess = vi.fn();

          const Component = () => {
            const {
              formState: { errors },
              formHandlers: { handleSubmit },
              formHooks: { useListener },
            } = useFormState(rejectingSchema, { initialData: { name: 'Mike' } });
            useListener(listener);
            return { errors, handleSubmit };
          };
          const { result } = renderHook(() => Component());

          await act(async () => {
            await result.current.handleSubmit(() => Promise.resolve(true), {
              onError,
              onSuccess,
            })(new FormData());
          });

          // Rejection becomes a root error and submission is blocked.
          expect(result.current.errors.getAll()).toContain('Network down');
          expect(onError).toHaveBeenCalledTimes(1);
          expect(onSuccess).not.toHaveBeenCalled();

          // Listener still sees asyncValidating followed by asyncValidated.
          const asyncEvents = events.filter(
            (evt) => evt.type === 'asyncValidating' || evt.type === 'asyncValidated'
          );
          expect(asyncEvents.map((evt) => evt.type)).toStrictEqual([
            'asyncValidating',
            'asyncValidated',
          ]);
        } finally {
          process.off('unhandledRejection', swallowNetworkDown);
        }
      });

      it('surfaces an async predicate rejection on validateAsync() as a root error and fires asyncValidated', async () => {
        process.on('unhandledRejection', swallowNetworkDown);

        try {
          type RejectingData = { name: string };
          const events: StateChangeEvent<RejectingData>[] = [];
          const listener = vi.fn((event: StateChangeEvent<RejectingData>) => {
            events.push(event);
          });

          const rejectingSchema = z.object({
            name: z.formString({ required: true }).check(
              z.validateAsync(
                () =>
                  new Promise<boolean>((_resolve, reject) => {
                    setTimeout(() => {
                      reject(new Error('Network down'));
                    }, 0);
                  }),
                'unused'
              )
            ),
          });

          const Component = () => {
            const {
              formState: { errors },
              formStatus,
              formActions: { validateAsync },
              formHooks: { useListener },
            } = useFormState(rejectingSchema, { initialData: { name: 'Mike' } });
            useListener(listener);
            return { errors, formStatus, validateAsync };
          };
          const { result } = renderHook(() => Component());

          let outcome: boolean | undefined;
          await act(async () => {
            outcome = await result.current.validateAsync();
          });

          // validateAsync() resolves false instead of throwing, and the root error appears.
          expect(outcome).toBe(false);
          expect(result.current.errors.getAll()).toContain('Network down');
          expect(result.current.formStatus.validating).toBe(false);

          const asyncEvents = events.filter(
            (evt) => evt.type === 'asyncValidating' || evt.type === 'asyncValidated'
          );
          expect(asyncEvents.map((evt) => evt.type)).toStrictEqual([
            'asyncValidating',
            'asyncValidated',
          ]);
        } finally {
          process.off('unhandledRejection', swallowNetworkDown);
        }
      });
    });

    it('only fires events for the non-skipped check when one of two checks has skipWhen=true', async () => {
      type MixedData = { name: string; email: string };
      const events: StateChangeEvent<MixedData>[] = [];
      const listener = vi.fn((event: StateChangeEvent<MixedData>) => {
        events.push(event);
      });

      const mixedSchema = z.object({
        name: z.formString({ required: true }).check(
          z.validateAsync(() => Promise.resolve(true), {
            error: 'nope',
            skipWhen: () => true,
          })
        ),
        email: z
          .formString({ required: true })
          .check(z.validateAsync(() => Promise.resolve(true), 'email failed')),
      });

      const Component = () => {
        const {
          formActions: { validateAsync },
          formHooks: { useListener },
        } = useFormState(mixedSchema, {
          initialData: { name: 'Mike', email: 'mike@x.com' },
        });
        useListener(listener);
        return { validateAsync };
      };
      const { result } = renderHook(() => Component());

      await act(async () => {
        await result.current.validateAsync();
      });

      const asyncEvents = events.filter(
        (evt) => evt.type === 'asyncValidating' || evt.type === 'asyncValidated'
      );
      expect(asyncEvents.map((evt) => evt.type)).toStrictEqual([
        'asyncValidating',
        'asyncValidated',
      ]);
      expect(asyncEvents[0]?.schemaPath).toBe('email');
      expect(asyncEvents[1]?.schemaPath).toBe('email');
    });

    it('coalesces overlapping passes into a single asyncValidating / asyncValidated pair', async () => {
      const events: AsyncEvent[] = [];
      const listener = vi.fn((event: AsyncEvent) => {
        events.push(event);
      });
      const asyncSchema = buildAsyncSchema(new Set(['Mike']), 20);

      const { result } = renderListenerHarness(asyncSchema, listener, {
        initialData: { name: 'Mike' },
      });

      act(() => {
        result.current.change('name', 'A');
      });
      act(() => {
        result.current.change('name', 'B');
      });
      act(() => {
        result.current.change('name', 'Mike');
      });

      await waitFor(() => {
        expect(result.current.formStatus.validating).toBe(false);
        expect(events.filter((evt) => evt.type === 'asyncValidated').length).toBeGreaterThanOrEqual(
          1
        );
      });

      const asyncEvents = events.filter(
        (evt) => evt.type === 'asyncValidating' || evt.type === 'asyncValidated'
      );
      expect(asyncEvents.map((evt) => evt.type)).toStrictEqual([
        'asyncValidating',
        'asyncValidated',
      ]);
    });

    it('suppresses asyncValidated for stale (superseded) passes', async () => {
      const events: AsyncEvent[] = [];
      const listener = vi.fn((event: AsyncEvent) => {
        events.push(event);
      });

      const delays = new Map<string, number>([
        ['Slow', 50],
        ['Fast', 5],
      ]);
      const allowed = new Set(['Fast']);
      const asyncSchema = z.object({
        name: z.formString({ required: true }).check(
          z.validateAsync(
            (name) =>
              new Promise<boolean>((resolve) => {
                setTimeout(
                  () => {
                    resolve(allowed.has(name));
                  },
                  delays.get(name) ?? 0
                );
              }),
            'Name is not allowed'
          )
        ),
      });

      const { result } = renderListenerHarness(asyncSchema, listener, {
        initialData: { name: 'Mike' },
      });

      act(() => {
        result.current.change('name', 'Slow');
      });
      act(() => {
        result.current.change('name', 'Fast');
      });

      await waitFor(() => {
        expect(result.current.formStatus.validating).toBe(false);
      });

      const asyncEvents = events.filter(
        (evt) => evt.type === 'asyncValidating' || evt.type === 'asyncValidated'
      );
      expect(asyncEvents.map((evt) => evt.type)).toStrictEqual([
        'asyncValidating',
        'asyncValidated',
      ]);
    });

    it('sets triggerField to undefined for programmatic validateAsync()', async () => {
      const events: AsyncEvent[] = [];
      const listener = vi.fn((event: AsyncEvent) => {
        events.push(event);
      });
      const asyncSchema = buildAsyncSchema(new Set(['Mike']));

      const { result } = renderListenerHarness(asyncSchema, listener, {
        initialData: { name: 'Mike' },
      });

      await act(async () => {
        await result.current.validateAsync();
      });

      const asyncEvents = events.filter(
        (evt) => evt.type === 'asyncValidating' || evt.type === 'asyncValidated'
      );
      expect(asyncEvents.map((evt) => evt.type)).toStrictEqual([
        'asyncValidating',
        'asyncValidated',
      ]);
      expect(asyncEvents[0]?.triggerField).toBeUndefined();
      expect(asyncEvents[1]?.triggerField).toBeUndefined();
    });

    it('fires asyncValidated after a rejected predicate (failure path)', async () => {
      process.on('unhandledRejection', swallowNetworkDown);

      try {
        type RejectingData = { name: string };
        const events: StateChangeEvent<RejectingData>[] = [];
        const listener = vi.fn((event: StateChangeEvent<RejectingData>) => {
          events.push(event);
        });

        const rejectingSchema = z.object({
          name: z.formString({ required: true }).check(
            z.validateAsync(
              () =>
                new Promise<boolean>((_resolve, reject) => {
                  setTimeout(() => {
                    reject(new Error('Network down'));
                  }, 0);
                }),
              'unused'
            )
          ),
        });

        const Component = () => {
          const {
            formStatus,
            formActions: { change },
            formHooks: { useListener },
          } = useFormState(rejectingSchema, { initialData: { name: 'Mike' } });
          useListener(listener);
          return { formStatus, change };
        };
        const { result } = renderHook(() => Component());

        act(() => {
          result.current.change('name', 'Anyone');
        });

        await waitFor(() => {
          expect(result.current.formStatus.validating).toBe(false);
        });

        const asyncEvents = events.filter(
          (evt) => evt.type === 'asyncValidating' || evt.type === 'asyncValidated'
        );
        expect(asyncEvents.map((evt) => evt.type)).toStrictEqual([
          'asyncValidating',
          'asyncValidated',
        ]);
      } finally {
        process.off('unhandledRejection', swallowNetworkDown);
      }
    });

    it.each([false, true])(
      'does not increase the render count when async listener events are emitted (validateOnMount=%s)',
      async (validateOnMount) => {
        const asyncSchema = buildAsyncSchema(new Set(['Mike']));

        const listener = vi.fn();

        let withListenerRenders = 0;

        const WithListener = () => {
          withListenerRenders++;

          const {
            formStatus,
            formActions: { change },
            formHooks: { useListener },
          } = useFormState(asyncSchema, {
            initialData: { name: 'Mike' },
            validateOnMount,
          });
          useListener(listener);

          return { formStatus, change };
        };

        const { result: withResult } = renderHook(() => WithListener());

        let withoutListenerRenders = 0;

        const WithoutListener = () => {
          withoutListenerRenders++;

          const {
            formStatus,
            formActions: { change },
          } = useFormState(asyncSchema, {
            initialData: { name: 'Mike' },
            validateOnMount,
          });

          return { formStatus, change };
        };

        const { result: withoutResult } = renderHook(() => WithoutListener());

        act(() => {
          withResult.current.change('name', 'John');
        });

        act(() => {
          withoutResult.current.change('name', 'John');
        });

        await waitFor(() => {
          expect(withResult.current.formStatus.validating).toBe(false);
          expect(withoutResult.current.formStatus.validating).toBe(false);
        });

        const eventCounts: Record<string, number> = {};

        for (const [event] of listener.mock.calls) {
          const type = (event as { type: string }).type;
          eventCounts[type] = (eventCounts[type] ?? 0) + 1;
        }

        expect(eventCounts['asyncValidating']).toBe(1);
        expect(eventCounts['asyncValidated']).toBe(1);
        expect(eventCounts['change']).toBe(1);

        expect(withListenerRenders).toBeLessThanOrEqual(withoutListenerRenders);
      }
    );

    it.each([false, true])(
      'does not fire a change event for replace actions (validateOnMount=%s)',
      async (validateOnMount) => {
        const asyncSchema = buildAsyncSchema(new Set(['Mike']));

        const listener = vi.fn();

        let withListenerRenders = 0;

        const WithListener = () => {
          withListenerRenders++;

          const {
            formStatus,
            formActions: { replace },
            formHooks: { useListener },
          } = useFormState(asyncSchema, { initialData: { name: 'Mike' }, validateOnMount });
          useListener(listener);

          return { formStatus, replace };
        };

        const { result: withResult } = renderHook(() => WithListener());

        let withoutListenerRenders = 0;

        const WithoutListener = () => {
          withoutListenerRenders++;

          const {
            formStatus,
            formActions: { replace },
          } = useFormState(asyncSchema, { initialData: { name: 'Mike' }, validateOnMount });

          return { formStatus, replace };
        };

        const { result: withoutResult } = renderHook(() => WithoutListener());

        act(() => {
          withResult.current.replace({ name: 'John' });
        });

        act(() => {
          withoutResult.current.replace({ name: 'John' });
        });

        await waitFor(() => {
          expect(withResult.current.formStatus.validating).toBe(false);
          expect(withoutResult.current.formStatus.validating).toBe(false);
        });

        const eventCounts: Record<string, number> = {};
        for (const [event] of listener.mock.calls) {
          const type = (event as { type: string }).type;
          eventCounts[type] = (eventCounts[type] ?? 0) + 1;
        }

        expect(eventCounts['asyncValidating']).toBe(1);
        expect(eventCounts['asyncValidated']).toBe(1);
        expect(eventCounts['change']).toBeUndefined();

        expect(withListenerRenders).toBeLessThanOrEqual(withoutListenerRenders);
      }
    );
  });
});
