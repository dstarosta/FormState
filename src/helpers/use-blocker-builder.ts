import { useCallback, useDebugValue, useEffect, useRef, useState } from 'react';

import type { BlockerResponse, FormState, FormStatus } from '../types/form-types';

export function createUseBlocker<T extends object>(
  getState: () => FormState<T>,
  getStatus: () => FormStatus
) {
  function useBlocker(
    shouldBlock: (state: FormState<T>, status: FormStatus) => boolean,
    options?: {
      enableBeforeUnload: boolean;
    }
  ): BlockerResponse {
    useDebugValue('FormStateBlocker');

    const [blockerState, setBlockerState] = useState<'unblocked' | 'blocked'>('unblocked');
    const pendingRef = useRef<(() => void) | null>(null);

    const shouldBlockRef = useRef(shouldBlock);
    shouldBlockRef.current = shouldBlock;

    const block = useCallback(() => shouldBlockRef.current(getState(), getStatus()), []);

    useEffect(() => {
      if (options?.enableBeforeUnload === false) {
        return;
      }

      const handleBeforeUnload = (event: BeforeUnloadEvent) => {
        if (block()) {
          event.preventDefault();
        }
      };

      addEventListener('beforeunload', handleBeforeUnload);

      return () => {
        removeEventListener('beforeunload', handleBeforeUnload);
      };
    }, [block, options?.enableBeforeUnload]);

    const guard = useCallback(
      (navigate: () => void) => {
        if (block()) {
          pendingRef.current = navigate;
          setBlockerState('blocked');
        } else {
          navigate();
        }
      },
      [block]
    );

    const proceed = useCallback(() => {
      const navigate = pendingRef.current;
      pendingRef.current = null;
      setBlockerState('unblocked');
      navigate?.();
    }, []);

    const reset = useCallback(() => {
      pendingRef.current = null;
      setBlockerState('unblocked');
    }, []);

    return { blockerState, guard, proceed, reset };
  }

  return useBlocker;
}
