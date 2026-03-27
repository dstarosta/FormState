import { useEffect, useEffectEvent, useRef } from 'react';

import { IS_DEVELOPMENT } from './development-helper';
import type { ChangeListener } from '../types/form-types';

/**
 * Creates the "useListener" hook.
 *
 * @param listeners a set of form listeners.
 * @returns The "useListener" hook.
 */
export function createUseListener<T extends object>(listeners: Set<ChangeListener<T>>) {
  function useListener(listener?: ChangeListener<T>) {
    const listenerRef = useRef<ChangeListener<T> | undefined>(listener);

    useEffect(() => {
      if (IS_DEVELOPMENT && listener && listener !== listenerRef.current) {
        console.warn(
          '[useListener] The listener reference changed. ' +
            'This usually means an inline function is getting passed. ' +
            'Consider wrapping it with useCallback() or declaring it outside the component.'
        );
      }

      listenerRef.current = listener;
    }, [listener]);

    const eventListener = useEffectEvent<ChangeListener<T>>((...args) => {
      listenerRef.current?.(...args);
    });

    useEffect(() => {
      listeners.add(eventListener);

      return () => {
        listeners.delete(eventListener);
      };
    }, []);
  }

  return useListener;
}
