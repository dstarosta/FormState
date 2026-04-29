import { useMemo, useRef } from 'react';
import type { Selector, SelectorResults } from '../types/form-types';

/**
 * A hook that creates a memoized selector over the form state data or derived data.
 * It is similar to the `createSelector` method in the "Reselect" library.
 *
 * @param inputSelectors - One or more selectors that extract values from the source state.
 * @param resultFn - The result function that computes the final value from the extracted inputs.
 * @returns Memoized selector function.
 */
export function useSelector<S, I extends Selector<S, unknown>[], R>(
  inputSelectors: [...I],
  resultFn: (...inputs: { [K in keyof SelectorResults<S, I>]: SelectorResults<S, I>[K] }) => R
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

  return useMemo(() => {
    return (state: S) => {
      const inputs: unknown[] = inputSelectors.map((sel) => sel(state));

      const shouldRecalculate =
        !cache.current.initialized ||
        inputs.some((input, i) => input !== cache.current.lastInputs[i]);

      if (shouldRecalculate) {
        const currentResult = resultFn(...(inputs as unknown as SelectorResults<S, I>));

        cache.current.lastResult = currentResult;
        cache.current.lastInputs = inputs;
        cache.current.initialized = true;
      }

      return cache.current.lastResult as R;
    };
  }, [inputSelectors, resultFn]);
}
