import { useMemo } from 'react';
import type * as z from 'zod/mini';

import type { FormInitOptions, FormMode, FormMutableState } from '../types/form-types';
import { formatErrors } from './error-formatter';
import {
  coerceFormData,
  collectDescriptions,
  collectLengths,
  collectPatterns,
  collectRanges,
  collectRequired,
  getPath,
} from './schema-visitor';
import { createState, safeSyncParse } from './state-manager';
import { useDeepMemo } from './use-deep-memo';

// The processed initial state with default property values and optional errors during the initial
// validation. Rebuilt only when the schema or the content of the initial options changes.
export function useInitialFormState<T extends z.ZodMiniObject>(
  schema: T,
  {
    initialData,
    initialTouched,
    initialMode,
    validateOnMount,
    errorMessageSeparator,
  }: {
    initialData: FormInitOptions<T>['initialData'];
    initialTouched: FormInitOptions<T>['initialTouched'];
    initialMode: FormMode;
    validateOnMount: boolean;
    errorMessageSeparator: string;
  }
): FormMutableState<z.infer<T>> {
  type State = z.infer<T>;

  const defaultData = useMemo(() => createState(schema), [schema]);

  // Inline `initialData`/`initialTouched` values are compared by content so that only real changes
  // rebuild the initial state (and reactively update the non-dirty values).
  const memoizedInitialData = useDeepMemo(() => initialData, [initialData]);

  const initialTouchedPaths = Array.isArray(initialTouched)
    ? initialTouched.map((pathNotation) =>
        typeof pathNotation === 'function'
          ? getPath(defaultData, pathNotation).join('.')
          : String(pathNotation)
      )
    : undefined;

  const memoizedInitialTouchedPaths = useDeepMemo(() => initialTouchedPaths, [initialTouchedPaths]);

  const initializedData = useMemo(
    () => createState(schema, memoizedInitialData),
    [schema, memoizedInitialData]
  );

  // Schema-only metadata does not depend on the initial data.
  const schemaMetadata = useMemo(
    () => ({
      required: collectRequired(schema),
      ranges: { ...collectRanges(schema), ...collectLengths(schema) },
      patterns: collectPatterns(schema),
      descriptions: collectDescriptions(schema),
    }),
    [schema]
  );

  // The processed initial state with default property values and optional errors during the
  // initial validation.
  const state = useMemo<FormMutableState<State>>(() => {
    const mergedData = memoizedInitialData ? initializedData : defaultData;
    const { result: safeResult, asyncPending: initialAsyncPending } = safeSyncParse(
      schema,
      mergedData
    );

    const initialErrors = initialAsyncPending
      ? ({} as Record<keyof State | '', string | undefined>)
      : formatErrors<State>(
          (safeResult as { error?: Parameters<typeof formatErrors<State>>[0] }).error,
          errorMessageSeparator
        );
    const errors = validateOnMount
      ? initialErrors
      : ({} as Record<keyof State | '', string | undefined>);

    const dirty = {} as Record<keyof State, boolean>;
    const touched = {} as Record<keyof State, boolean>;

    for (const field in mergedData) {
      if (Object.prototype.hasOwnProperty.call(mergedData, field)) {
        dirty[field] = false;
        touched[field] = false;
      }
    }

    for (const path of memoizedInitialTouchedPaths ?? []) {
      touched[path as keyof State] = true;
    }

    const data =
      (safeResult as { data?: State } | null)?.data ?? coerceFormData(schema, mergedData);

    return {
      ...schemaMetadata,
      initialData: data,
      submittedData: null,
      mode: initialMode,
      changed: false,
      replaced: false,
      validated: validateOnMount,
      submitCount: 0,
      data,
      initialErrors,
      errors,
      dirty,
      touched,
      manualErrors: {},
      asyncErrors: {} as Record<keyof State | '', string | undefined>,
      asyncRequestId: initialAsyncPending ? 1 : 0,
      asyncValidating: initialAsyncPending && validateOnMount,
      asyncTrigger: undefined,
    } satisfies FormMutableState<State>;
  }, [
    schema,
    schemaMetadata,
    defaultData,
    memoizedInitialData,
    initializedData,
    memoizedInitialTouchedPaths,
    initialMode,
    validateOnMount,
    errorMessageSeparator,
  ]);

  return state;
}
