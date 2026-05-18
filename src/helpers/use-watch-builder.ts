import { useCallback, useDebugValue, useSyncExternalStore } from 'react';

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

    const subscribe = useCallback(
      (listener: () => void) => store.subscribeToField(name, listener),
      [name]
    );

    const getSnapshot = useCallback(() => {
      const value = store.getValue(name) ?? '';

      return typeof compute === 'function' ? compute(value) : value;
    }, [name, compute]);

    const getServerSnapshot = useCallback(
      () => (typeof compute === 'function' ? compute('') : ''),
      [compute]
    );

    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  }

  return useWatch;
}
