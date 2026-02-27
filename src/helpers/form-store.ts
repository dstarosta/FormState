import type { FormStore } from '../types/form-types';

export function createFormStore() {
  const values: Record<string, string> = {};
  const fieldListeners = new Map<string, Set<() => void>>();

  const store: FormStore = {
    getValue: (name: string) => values[name],
    setValue: (name: string, value: string) => {
      // This condition should not happen on an input change event but we are being safe.
      /* v8 ignore if -- @preserve */
      if (values[name] === value) {
        return;
      }

      values[name] = value;

      const nameListeners = fieldListeners.get(name);

      if (nameListeners) {
        for (const cb of nameListeners) {
          cb();
        }
      }
    },
    subscribeToField: (name: string, listener: () => void) => {
      if (!fieldListeners.has(name)) {
        fieldListeners.set(name, new Set());
      }

      fieldListeners.get(name)!.add(listener);

      return () => fieldListeners.get(name)?.delete(listener);
    },
  };

  return store;
}
