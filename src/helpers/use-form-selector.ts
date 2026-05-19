import { useCallback, useMemo, useRef } from 'react';
import { deepEqual } from 'fast-equals';

import type { Selector } from '../types/form-types';

/**
 * A hook that creates a memoized selector over the form state data or derived data.
 * It is similar to the `createSelector` method in the "Reselect" library.
 *
 * @param inputSelectors - One or more selectors that extract values from the source state.
 * @param resultFn - The result function that computes the final value from the extracted inputs.
 * @returns Memoized selector function.
 */
export function useSelector<S, R>(
  inputSelectors: Selector<S, unknown> | Selector<S, unknown>[],
  resultFn: (...args: unknown[]) => R
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
