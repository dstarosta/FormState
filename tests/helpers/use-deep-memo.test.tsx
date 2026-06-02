import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDeepMemo } from '../../src/helpers/use-deep-memo';

describe('useDeepMemo', () => {
  it('runs the factory on first render and caches the result', () => {
    const factory = vi.fn(() => ({ produced: true }));
    const { result } = renderHook(({ deps }) => useDeepMemo(factory, deps), {
      initialProps: { deps: [1, 2, 3] as unknown[] },
    });

    expect(factory).toHaveBeenCalledTimes(1);
    expect(result.current).toEqual({ produced: true });
  });

  it('reuses the cached value when the deps array reference is identical (a === b)', () => {
    const factory = vi.fn(() => ({}));
    const stableDeps: unknown[] = [{ a: 1 }];

    const { result, rerender } = renderHook(({ deps }) => useDeepMemo(factory, deps), {
      initialProps: { deps: stableDeps },
    });

    const first = result.current;
    rerender({ deps: stableDeps });

    expect(factory).toHaveBeenCalledTimes(1);
    expect(result.current).toBe(first);
  });

  it('recomputes when the deps array length changes', () => {
    const factory = vi.fn(() => ({}));
    const { result, rerender } = renderHook(({ deps }) => useDeepMemo(factory, deps), {
      initialProps: { deps: [1, 2] as unknown[] },
    });

    const first = result.current;
    rerender({ deps: [1, 2, 3] });

    expect(factory).toHaveBeenCalledTimes(2);
    expect(result.current).not.toBe(first);
  });

  it('reuses the cached value when each dep is referentially equal (Object.is fast-path)', () => {
    const factory = vi.fn(() => ({}));
    const sharedObj = { nested: 1 };

    const { result, rerender } = renderHook(({ deps }) => useDeepMemo(factory, deps), {
      initialProps: { deps: [1, 'a', sharedObj] as unknown[] },
    });

    const first = result.current;
    rerender({ deps: [1, 'a', sharedObj] });

    expect(factory).toHaveBeenCalledTimes(1);
    expect(result.current).toBe(first);
  });

  it('treats NaN deps as equal via Object.is', () => {
    const factory = vi.fn(() => ({}));
    const { result, rerender } = renderHook(({ deps }) => useDeepMemo(factory, deps), {
      initialProps: { deps: [Number.NaN] as unknown[] },
    });

    const first = result.current;
    rerender({ deps: [Number.NaN] });

    expect(factory).toHaveBeenCalledTimes(1);
    expect(result.current).toBe(first);
  });

  it('reuses the cached value when deps are different references but deeply equal', () => {
    const factory = vi.fn(() => ({}));
    const { result, rerender } = renderHook(({ deps }) => useDeepMemo(factory, deps), {
      initialProps: { deps: [{ a: { b: [1, 2] } }] as unknown[] },
    });

    const first = result.current;
    rerender({ deps: [{ a: { b: [1, 2] } }] });

    expect(factory).toHaveBeenCalledTimes(1);
    expect(result.current).toBe(first);
  });

  it('recomputes when a dep differs both referentially and by deep equality', () => {
    const factory = vi.fn(() => ({}));
    const { result, rerender } = renderHook(({ deps }) => useDeepMemo(factory, deps), {
      initialProps: { deps: [{ a: 1 }] as unknown[] },
    });

    const first = result.current;
    rerender({ deps: [{ a: 2 }] });

    expect(factory).toHaveBeenCalledTimes(2);
    expect(result.current).not.toBe(first);
  });
});
