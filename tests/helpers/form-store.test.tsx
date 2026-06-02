import { describe, expect, it, vi } from 'vitest';
import { createFormStore } from '../../src/helpers/form-store';

describe('form store', () => {
  it('setValue with unchanged value does not notify subscribers', async () => {
    const store = createFormStore();
    const listener = vi.fn();

    store.subscribeToField('x', listener);
    store.setValue('x', 'hello');
    await Promise.resolve();

    expect(listener).toHaveBeenCalledTimes(1);

    store.setValue('x', 'hello');
    await Promise.resolve();

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('still notifies later listeners and listeners on other fields when one throws', async () => {
    const store = createFormStore();
    const throwing = vi.fn(() => {
      throw new Error('boom');
    });
    const afterSameField = vi.fn();
    const otherField = vi.fn();

    store.subscribeToField('x', throwing);
    store.subscribeToField('x', afterSameField);
    store.subscribeToField('y', otherField);

    // Swallow the rethrow emitted from the microtask so vitest does not
    // flag it as an unhandled error.
    const originalOnError = [...process.listeners('uncaughtException')];
    process.removeAllListeners('uncaughtException');
    process.on('uncaughtException', () => {
      // intentionally empty
    });

    try {
      store.setValue('x', 'a');
      store.setValue('y', 'b');

      await new Promise<void>((resolve) => {
        queueMicrotask(() => {
          resolve();
        });
      });
    } finally {
      process.removeAllListeners('uncaughtException');
      for (const listener of originalOnError) {
        process.on('uncaughtException', listener);
      }
    }

    expect(throwing).toHaveBeenCalledTimes(1);
    expect(afterSameField).toHaveBeenCalledTimes(1);
    expect(otherField).toHaveBeenCalledTimes(1);
  });

  it('safely handles repeated unsubscribe calls and resubscribe after unsubscribe', () => {
    const store = createFormStore();
    const listener = vi.fn();

    const unsubscribe = store.subscribeToField('x', listener);

    unsubscribe();
    // Second call should be a no-op even though the empty Set was dropped.
    unsubscribe();

    // Resubscribing creates a fresh Set and resumes notifications.
    const second = store.subscribeToField('x', listener);
    second();

    expect(listener).not.toHaveBeenCalled();
  });
});
