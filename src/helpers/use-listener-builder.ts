import { useDebugValue, useEffect, useEffectEvent } from 'react';

import type { StateChangeListener } from '../types/form-types';

/**
 * Creates the "useListener" hook.
 *
 * @param listeners a set of form listeners.
 * @param onListenerAdded optional callback fired immediately after a listener is added.
 * @returns The "useListener" hook.
 */
export function createUseListener<T extends object>(
  listeners: Set<StateChangeListener<T>>,
  onListenerAdded?: (listener: StateChangeListener<T>) => void
) {
  function useListener(listener?: StateChangeListener<T>) {
    useDebugValue('FormStateListener');

    const eventListener = useEffectEvent<StateChangeListener<T>>((...args) => {
      listener?.(...args);
    });

    const hasListener = listener !== undefined;

    useEffect(() => {
      if (!hasListener) {
        return;
      }

      listeners.add(eventListener);
      onListenerAdded?.(eventListener);

      return () => {
        listeners.delete(eventListener);
      };
    }, [hasListener]);
  }

  return useListener;
}
