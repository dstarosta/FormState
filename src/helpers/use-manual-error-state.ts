import { useMemo, useRef } from 'react';

import type { Immutable } from '../form-types';

const EMPTY_STORE: Record<string, string> = Object.freeze({});

export const useManualErrorState = () => {
  const ref = useRef<Record<string, string>>(EMPTY_STORE);

  const response = useMemo(
    () => ({
      get: () => ref.current as Immutable<Record<string, string>>,
      set: (value: Readonly<Record<string, string>> = EMPTY_STORE) => {
        ref.current = value;
      },
    }),
    []
  );

  return response;
};
