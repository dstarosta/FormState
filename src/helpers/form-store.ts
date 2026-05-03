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

    for (const name of fieldsToNotify) {
      const listeners = fieldListeners.get(name);

      if (listeners) {
        for (const callback of listeners) {
          callback();
        }
      }
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
      if (!fieldListeners.has(name)) {
        fieldListeners.set(name, new Set());
      }

      fieldListeners.get(name)?.add(listener);

      return () => fieldListeners.get(name)?.delete(listener);
    },
  };

  return store;
}
