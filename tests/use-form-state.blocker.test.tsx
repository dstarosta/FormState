import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useFormState, type FormState } from '../src';
import { schema, type Schema, type InitialSchema } from './fixtures';

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

describe('formHooks.useBlocker', () => {
  const initialData: InitialSchema = { name: 'John', info: { age: 30 } };

  function useFormWithBlocker(
    shouldBlock: (state: FormState<Schema>, status: { dirty: boolean }) => boolean
  ) {
    const form = useFormState(schema, { initialData });
    const blocker = form.formHooks.useBlocker(shouldBlock);

    return { form, blocker };
  }

  it('exposes useBlocker on formHooks', () => {
    const { result } = renderHook(() => useFormState(schema, { initialData }));

    expect(typeof result.current.formHooks.useBlocker).toBe('function');
  });

  it('shouldBlock observes the live dirty status after a change', () => {
    const shouldBlock = vi.fn(
      (_state: FormState<Schema>, status: { dirty: boolean }) => status.dirty
    );

    const { result } = renderHook(() => useFormWithBlocker(shouldBlock));

    const navigateBefore = vi.fn();

    act(() => {
      result.current.blocker.guard(navigateBefore);
    });

    expect(navigateBefore).toHaveBeenCalledTimes(1);
    expect(result.current.blocker.blockerState).toBe('unblocked');

    act(() => {
      result.current.form.formActions.change('name', 'Changed');
    });

    const navigateAfter = vi.fn();
    act(() => {
      result.current.blocker.guard(navigateAfter);
    });

    expect(navigateAfter).not.toHaveBeenCalled();
    expect(result.current.blocker.blockerState).toBe('blocked');

    const [state, status] = shouldBlock.mock.calls.at(-1) ?? [];

    expect(state?.data.name).toBe('Changed');
    expect(status?.dirty).toBe(true);

    act(() => {
      result.current.blocker.proceed();
    });

    expect(navigateAfter).toHaveBeenCalledTimes(1);
    expect(result.current.blocker.blockerState).toBe('unblocked');
  });
});
