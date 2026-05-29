import { useCallback, useMemo, useRef } from 'react';

import { deepEqual } from './deep-equal';

import type { Selector } from '../types/form-types';

export function useSelector<S, R>(
  inputSelectors: Selector<S, unknown> | Selector<S, unknown>[],
  resultFn: (...inputs: unknown[]) => R = (firstInput) => firstInput as R
): Selector<S, R> {
  const cache = useRef<{
    lastInputs: unknown[];
    lastResult: R | undefined;
    initialized: boolean;
  }>({
    lastInputs: [],
    lastResult: undefined,
    initialized: false,
  });

  const selectors = useMemo(
    () => (Array.isArray(inputSelectors) ? inputSelectors : [inputSelectors]),
    [inputSelectors]
  );

  return useCallback(
    (state: S) => {
      const len = selectors.length;
      const lastInputs = cache.current.lastInputs;
      const inputs: unknown[] = Array.from({ length: len });

      let shouldRecalculate = !cache.current.initialized || len !== lastInputs.length;

      for (let i = 0; i < len; i++) {
        const value = (selectors[i] as Selector<S, unknown>)(state);
        inputs[i] = value;
        if (!shouldRecalculate && !deepEqual(value, lastInputs[i])) {
          shouldRecalculate = true;
        }
      }

      if (shouldRecalculate) {
        cache.current.lastResult = resultFn(...inputs);
        cache.current.lastInputs = inputs;
        cache.current.initialized = true;
      }

      return cache.current.lastResult as R;
    },
    [selectors, resultFn]
  );
}
