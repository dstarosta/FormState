import type { FormStore } from '../types/form-types';

export function createFormStore() {
  const values: Record<string, string> = {};
  const fieldListeners = new Map<string, Set<() => void>>();
  const pendingUpdates = new Set<string>();

  let isFlushing = false;

  const flush = () => {
    const fieldsToNotify = [...pendingUpdates];

    pendingUpdates.clear();
    isFlushing = false;

    let firstError: unknown;

    for (const name of fieldsToNotify) {
      const listeners = fieldListeners.get(name);

      if (listeners) {
        for (const callback of listeners) {
          try {
            callback();
          } catch (error) {
            firstError ??= error;
          }
        }
      }
    }

    if (firstError) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw firstError;
    }
  };

  const store: FormStore = {
    getValue: (name: string) => values[name],
    setValue: (name: string, value: string) => {
      if (values[name] === value) {
        return;
      }

      values[name] = value;

      pendingUpdates.add(name);

      if (!isFlushing) {
        isFlushing = true;
        queueMicrotask(flush);
      }
    },

    subscribeToField: (name: string, listener: () => void) => {
      let listeners = fieldListeners.get(name);

      if (!listeners) {
        listeners = new Set();
        fieldListeners.set(name, listeners);
      }

      listeners.add(listener);

      return () => {
        const current = fieldListeners.get(name);

        if (current) {
          current.delete(listener);

          if (current.size === 0) {
            fieldListeners.delete(name);
          }
        }
      };
    },
  };

  return store;
}
