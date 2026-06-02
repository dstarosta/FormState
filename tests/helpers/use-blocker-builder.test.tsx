import { describe, expect, it, vi, afterEach } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import type { FormState, FormStatus } from '../../src/types/form-types';
import { createUseBlocker } from '../../src/helpers/use-blocker-builder';

describe('createUseBlocker', () => {
  type Shape = { name: string };

  afterEach(() => {
    cleanup();
  });

  // Minimal getters; the blocker only forwards these into `shouldBlock`.
  const makeBlocker = (status: Partial<FormStatus> = {}) => {
    const formState = { data: { name: '' } } as unknown as FormState<Shape>;
    const formStatus = { dirty: false, ...status } as FormStatus;
    return createUseBlocker<Shape>(
      () => formState,
      () => formStatus
    );
  };

  it('guard runs the navigation immediately when shouldBlock returns false', () => {
    const useBlocker = makeBlocker();
    const navigate = vi.fn();

    const { result } = renderHook(() => useBlocker(() => false));

    act(() => {
      result.current.guard(navigate);
    });

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(result.current.blockerState).toBe('unblocked');
  });

  it('guard holds the navigation when shouldBlock returns true', () => {
    const useBlocker = makeBlocker();
    const navigate = vi.fn();

    const { result } = renderHook(() => useBlocker(() => true));

    act(() => {
      result.current.guard(navigate);
    });

    expect(navigate).not.toHaveBeenCalled();
    expect(result.current.blockerState).toBe('blocked');
  });

  it('proceed runs the held navigation and returns to unblocked', () => {
    const useBlocker = makeBlocker();
    const navigate = vi.fn();

    const { result } = renderHook(() => useBlocker(() => true));

    act(() => {
      result.current.guard(navigate);
    });
    act(() => {
      result.current.proceed();
    });

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(result.current.blockerState).toBe('unblocked');
  });

  it('reset discards the held navigation and returns to unblocked', () => {
    const useBlocker = makeBlocker();
    const navigate = vi.fn();

    const { result } = renderHook(() => useBlocker(() => true));

    act(() => {
      result.current.guard(navigate);
    });
    act(() => {
      result.current.reset();
    });

    expect(navigate).not.toHaveBeenCalled();
    expect(result.current.blockerState).toBe('unblocked');
  });

  it('shouldBlock receives the current formState and formStatus', () => {
    const useBlocker = makeBlocker({ dirty: true });
    const shouldBlock = vi.fn((_state: FormState<Shape>, status: FormStatus) => status.dirty);

    const { result } = renderHook(() => useBlocker(shouldBlock));

    act(() => {
      result.current.guard(vi.fn());
    });

    const [state, status] = shouldBlock.mock.calls[0] ?? [];
    expect(state?.data).toEqual({ name: '' });
    expect(status?.dirty).toBe(true);
    expect(result.current.blockerState).toBe('blocked');
  });

  it('prevents the beforeunload event when shouldBlock returns true', () => {
    const useBlocker = makeBlocker();

    renderHook(() => useBlocker(() => true));

    const event = new Event('beforeunload', { cancelable: true });
    const prevented = !globalThis.dispatchEvent(event);

    expect(prevented).toBe(true);
  });

  it('explicitly prevents the beforeunload event when shouldBlock returns true', () => {
    const useBlocker = makeBlocker();

    renderHook(() => useBlocker(() => true, { enableBeforeUnload: true }));

    const event = new Event('beforeunload', { cancelable: true });
    const prevented = !globalThis.dispatchEvent(event);

    expect(prevented).toBe(true);
  });

  it('does not prevent the beforeunload event when shouldBlock returns true', () => {
    const useBlocker = makeBlocker();

    renderHook(() => useBlocker(() => true, { enableBeforeUnload: false }));

    const event = new Event('beforeunload', { cancelable: true });
    const prevented = !globalThis.dispatchEvent(event);

    expect(prevented).toBe(false);
  });

  it('does not prevent the beforeunload event when shouldBlock returns false', () => {
    const useBlocker = makeBlocker();

    renderHook(() => useBlocker(() => false));

    const event = new Event('beforeunload', { cancelable: true });
    const prevented = !globalThis.dispatchEvent(event);

    expect(prevented).toBe(false);
  });

  it('removes the beforeunload listener on unmount', () => {
    const useBlocker = makeBlocker();

    const { unmount } = renderHook(() => useBlocker(() => true));
    unmount();

    const event = new Event('beforeunload', { cancelable: true });
    const prevented = !globalThis.dispatchEvent(event);

    expect(prevented).toBe(false);
  });
});
