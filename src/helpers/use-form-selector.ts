import { useCallback, useRef } from 'react';
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

  return useCallback(
    (state: S) => {
      const selectors = Array.isArray(inputSelectors) ? inputSelectors : [inputSelectors];
      const inputs: unknown[] = selectors.map((sel) => sel(state));

      const shouldRecalculate =
        !cache.current.initialized ||
        inputs.some((input, i) => !deepEqual(input, cache.current.lastInputs[i]));

      if (shouldRecalculate) {
        const currentResult = resultFn(...inputs);

        cache.current.lastResult = currentResult;
        cache.current.lastInputs = inputs;
        cache.current.initialized = true;
      }

      return cache.current.lastResult as R;
    },
    [inputSelectors, resultFn]
  );
}
