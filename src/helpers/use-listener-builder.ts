import { useDebugValue, useEffect, useEffectEvent } from 'react';

import type { StateChangeListener } from '../types/form-types';

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
