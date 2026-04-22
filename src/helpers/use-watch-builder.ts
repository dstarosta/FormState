import { useDebugValue, useSyncExternalStore } from 'react';

import type { FormStore } from '../types/form-types';

/**
 * Creates the "useWatch" hook.
 *
 * @param store the form store.
 * @returns The "useWatch" hook.
 */
export function createUseWatch(store: FormStore | null) {
  function useWatch(name: string, compute?: (value: string) => string) {
    useDebugValue(`Watch(${name})`);

    if (!name.trim()) {
      throw new TypeError('The "name" value cannot be empty.');
    }

    if (!store) {
      throw new Error('The "watch" property has not been set to "true" in the options.');
    }

    return useSyncExternalStore(
      (listener) => store.subscribeToField(name, listener),
      () => {
        const value = store.getValue(name) ?? '';

        if (typeof compute === 'function') {
          return compute(value);
        }

        return value;
      },
      () => (typeof compute === 'function' ? compute('') : '')
    );
  }

  return useWatch;
}
