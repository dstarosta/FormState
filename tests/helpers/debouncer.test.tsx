import { describe, expect, it, vi } from 'vitest';
import { debounce, debounceAsync } from '../../src/helpers/debouncer';

describe('debouncer', () => {
  it('cancel with no pending invocation does nothing', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced.cancel();

    expect(fn).not.toHaveBeenCalled();
  });

  it('debounceAsync: rapid calls collapse to a single predicate invocation', async () => {
    vi.useFakeTimers();
    try {
      const predicate = vi.fn((value: string) => Promise.resolve(value === 'final'));
      const debounced = debounceAsync(predicate, 100, true);

      const p1 = debounced('a');
      const p2 = debounced('b');
      const p3 = debounced('final');

      await vi.advanceTimersByTimeAsync(100);

      await expect(p1).resolves.toBe(true); // resolved to fallback (last known) when cancelled
      await expect(p2).resolves.toBe(true);
      await expect(p3).resolves.toBe(true); // real predicate result
      expect(predicate).toHaveBeenCalledTimes(1);
      expect(predicate).toHaveBeenCalledWith('final');
    } finally {
      vi.useRealTimers();
    }
  });

  it('debounceAsync: cancelled call resolves to last known result, not fallback', async () => {
    vi.useFakeTimers();
    try {
      const predicate = vi.fn((value: string) => Promise.resolve(value === 'good'));
      const debounced = debounceAsync(predicate, 100, true);

      // First call settles with a real result of `false`.
      const p1 = debounced('bad');
      await vi.advanceTimersByTimeAsync(100);
      await expect(p1).resolves.toBe(false);

      // Now start a second call and cancel it with a third call.
      const p2 = debounced('still-bad');
      const p3 = debounced('good');

      // p2 should resolve to the last known result (false), not the initial fallback (true).
      await expect(p2).resolves.toBe(false);

      await vi.advanceTimersByTimeAsync(100);
      await expect(p3).resolves.toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('debounceAsync: predicate rejection resolves to fallback', async () => {
    vi.useFakeTimers();
    try {
      const predicate = vi.fn((value: string) => Promise.reject(new Error(`boom: ${value}`)));
      const debounced = debounceAsync(predicate, 100, true);

      const p = debounced('x');
      await vi.advanceTimersByTimeAsync(100);

      await expect(p).resolves.toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('debounceAsync: explicit cancel resolves pending promise to last known result', async () => {
    vi.useFakeTimers();
    try {
      const predicate = vi.fn((value: string) => Promise.resolve(value === 'ok'));
      const debounced = debounceAsync(predicate, 100, true);

      const p = debounced('x');
      debounced.cancel();

      await expect(p).resolves.toBe(true); // fallback (no result yet)
      expect(predicate).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('debounceAsync: cancel with no pending invocation does nothing', () => {
    const debounced = debounceAsync(() => Promise.resolve(true), 100, true);

    expect(() => {
      debounced.cancel();
    }).not.toThrow();
  });
});
