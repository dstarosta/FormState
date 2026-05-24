import { useActionState, useCallback, useRef } from 'react';
import * as z from 'zod/mini';

import type { FormAction, FormMutableState } from '../types/form-types';
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect';
import { formatErrors, normalizeManualError } from './error-formatter';
import { dotPathGet, dotPathSet } from './dot-path';
import { deepEqual } from './deep-equal';
import { coerceFormData, collectActiveAsyncCheckPaths } from './schema-visitor';
import {
  composeErrors,
  createState,
  diffedState,
  difference,
  mergeAsyncErrors,
  pruneAsyncErrors,
  safeSyncParse,
  touchErroredFields,
} from './state-manager';

export function useFormStateReducer<T extends z.ZodMiniObject>(
  schema: T,
  state: FormMutableState<z.infer<T>>,
  validateBeforeSubmit: boolean,
  validateOnMount: boolean,
  errorMessageSeparator: string
) {
  type State = z.infer<T>;

  const stateRef = useRef<FormMutableState<State>>(state);

  useIsomorphicLayoutEffect(() => {
    stateRef.current = state;
  }, [state]);

  const validationCacheRef = useRef<{
    schema: z.ZodMiniType;
    data: State;
    parsedData: State;
    errors: Record<keyof State | '', string | undefined>;
  } | null>(null);

  const reducer = useCallback(
    (prevState: FormMutableState<State>, action: FormAction<State>) => {
      const prevManualErrors = prevState.manualErrors;

      const parseAndCache = (data: State) => {
        const cached = validationCacheRef.current;

        if (
          cached &&
          cached.schema === schema &&
          (cached.data === data || cached.parsedData === data)
        ) {
          return {
            parsedData: cached.parsedData,
            errors: cached.errors,
            asyncPending: false,
          };
        }

        const { result, asyncPending } = safeSyncParse(schema, data);

        if (asyncPending) {
          const coercedData = coerceFormData(schema, data);
          const activePaths = collectActiveAsyncCheckPaths(schema, coercedData);

          // Async schemas can't be sync-parsed here. The pipeline callers
          // (submit/submitValidate/asyncValidate/asyncErrors) use
          // `composeWithFreshErrors` and never reach this branch. For other
          // callers, the right fallback depends on whether the data shape
          // changed:
          //   - Data unchanged (touch / setManualError / clearManualErrors /
          //     validate) → prior parse-slice on state is still valid for
          //     this data; reuse it (sans manual overlay).
          //   - Data changed (change / replace / resetFields /
          //     changeInitialData) → prior errors are about a different data
          //     shape; return `{}` and let the in-flight async burst populate
          //     fresh errors on completion.
          const dataUnchanged = data === prevState.data;
          const fallbackErrors = dataUnchanged
            ? difference(prevState.errors, prevManualErrors)
            : ({} as Record<keyof State | '', string | undefined>);

          return {
            parsedData: coercedData,
            errors: fallbackErrors,
            asyncPending: activePaths.length > 0,
          };
        }

        const safeData = result as {
          data?: State;
          error?: Parameters<typeof formatErrors<State>>[0];
        };
        const errors = formatErrors<State>(safeData.error, errorMessageSeparator);
        const parsedData = safeData.data ?? data;

        validationCacheRef.current = { schema, data, parsedData, errors };

        return { parsedData, errors, asyncPending: false };
      };

      const reduceAsyncState = (asyncPending: boolean, asyncTrigger?: string) =>
        asyncPending
          ? {
              asyncRequestId: prevState.asyncRequestId + 1,
              asyncValidating: true,
              asyncErrors: prevState.asyncErrors,
              asyncTrigger,
            }
          : {
              asyncRequestId: prevState.asyncRequestId,
              asyncValidating: false,
              asyncErrors: prevState.asyncErrors,
              asyncTrigger: prevState.asyncTrigger,
            };

      const composeForData = (
        data: State,
        asyncErrors: Record<keyof State | '', string | undefined>,
        manualErrors: Record<string, string>
      ) => composeErrors(parseAndCache(data).errors, asyncErrors, manualErrors);

      /**
       * Pipeline variant: seeds the parse cache with the externally-computed
       * `freshErrors` (the four async dispatch sites already ran a full parse)
       * so the parse-slice in `composeErrors` reads back as the fresh value.
       * Required for async schemas, which can't be sync-parsed inline.
       */
      const composeWithFreshErrors = (
        data: State,
        asyncErrors: Record<keyof State | '', string | undefined>,
        manualErrors: Record<string, string>,
        freshErrors: Record<keyof State | '', string | undefined>
      ) => {
        validationCacheRef.current = { schema, data, parsedData: data, errors: freshErrors };
        return composeErrors(freshErrors, asyncErrors, manualErrors);
      };

      switch (action.type) {
        // initial data change event
        case 'changeInitialData': {
          // only override non-dirty current state values with new initial state values
          const mergedData: State = {
            ...prevState.data,
            ...Object.fromEntries(
              Object.entries(stateRef.current.data).filter(([key]) => !prevState.dirty[key])
            ),
          };

          let changedData: State;
          let asyncPending = false;

          if (validateOnMount || Object.keys(prevState.errors).length > 0) {
            const parsed = parseAndCache(mergedData);
            changedData = parsed.parsedData;
            asyncPending = parsed.asyncPending;
          } else {
            changedData = coerceFormData(schema, mergedData);
          }

          // Drop stale async-slice entries for fields whose value just changed
          // (the non-dirty ones picked up from the new initial data).
          const asyncErrors = asyncPending
            ? pruneAsyncErrors(prevState.asyncErrors, (key) => !prevState.dirty[key as keyof State])
            : prevState.asyncErrors;

          return {
            ...prevState,
            data: changedData,
            initialData: stateRef.current.data,
            initialErrors: stateRef.current.errors,
            errors: composeForData(changedData, asyncErrors, prevManualErrors),
            ...reduceAsyncState(asyncPending),
            asyncErrors,
          } satisfies FormMutableState<State>;
        }
        // state change event
        case 'change': {
          const {
            name,
            value,
            fromDebounce,
            options: { validate, touch },
          } = action;

          const shouldValidate = validate && (validateBeforeSubmit || prevState.validated);

          const pathNotation = Array.isArray(name) ? name.join('.') : String(name);
          const field = Array.isArray(name) ? name[0] : name;

          const mergedData = dotPathSet(prevState.data, pathNotation, value) as State;

          let changedData: State;
          let asyncPending = false;

          if (shouldValidate) {
            const cached = parseAndCache(mergedData);
            changedData = cached.parsedData;
            asyncPending = fromDebounce ? false : cached.asyncPending;
          } else {
            changedData = coerceFormData(schema, mergedData);
          }

          const initialValue = dotPathGet(prevState.initialData, pathNotation) as State;

          let isFieldDirty: boolean;

          if (Array.isArray(value)) {
            isFieldDirty = !deepEqual(value, initialValue);
          } else if (
            typeof prevState.initialData[field] === 'object' ||
            typeof changedData[field] === 'object'
          ) {
            isFieldDirty = !deepEqual(prevState.initialData[field], changedData[field]);
          } else {
            isFieldDirty = value !== initialValue;
          }

          const dirty =
            prevState.dirty[field] === isFieldDirty
              ? prevState.dirty
              : { ...prevState.dirty, [field]: isFieldDirty };

          const touched =
            touch && prevState.touched[pathNotation] !== true
              ? { ...prevState.touched, [pathNotation]: true }
              : prevState.touched;

          // When the data shape changes and an async burst is pending, the
          // prior async-slice entry for the changed path is stale until the
          // burst settles — drop it so the user doesn't see a stale error
          // during the interim.
          const asyncErrors = asyncPending
            ? pruneAsyncErrors(
                prevState.asyncErrors,
                (key) => key === pathNotation || key.startsWith(`${pathNotation}.`)
              )
            : prevState.asyncErrors;

          const errors = shouldValidate
            ? composeForData(changedData, asyncErrors, prevManualErrors)
            : prevState.errors;

          return diffedState(
            {
              ...prevState,
              data: changedData,
              errors,
              changed: true,
              validated: shouldValidate,
              dirty,
              touched,
              ...reduceAsyncState(asyncPending, pathNotation),
              asyncErrors,
            },
            prevState
          );
        }
        // data replace event
        case 'replace': {
          const {
            data,
            options: { validate },
          } = action;

          const shouldValidate = validate && (validateBeforeSubmit || prevState.validated);

          const replacedData = createState(schema, data);

          const { result, asyncPending } = safeSyncParse(schema, replacedData);

          const coercedData = asyncPending
            ? coerceFormData(schema, replacedData)
            : ((result as { data?: State }).data ?? replacedData);

          const initialErrors = asyncPending
            ? ({} as Record<keyof State | '', string | undefined>)
            : formatErrors<State>(
                (result as { error?: Parameters<typeof formatErrors<State>>[0] }).error,
                errorMessageSeparator
              );

          // Replace clears the persisted async slice — the data shape is new, prior
          // async results no longer apply.
          const asyncErrors = {} as Record<keyof State | '', string | undefined>;

          const errors =
            shouldValidate || Object.keys(prevState.errors).length > 0
              ? composeForData(coercedData, asyncErrors, prevManualErrors)
              : prevState.errors;

          return {
            ...prevState,
            initialData: coercedData,
            data: coercedData,
            initialErrors,
            errors,
            replaced: true,
            validated: prevState.validated || shouldValidate,
            ...reduceAsyncState(asyncPending),
            asyncErrors,
          } satisfies FormMutableState<State>;
        }
        // field touch event
        case 'touch': {
          const {
            name,
            options: { validate },
          } = action;

          const shouldValidate = validate && (validateBeforeSubmit || prevState.validated);

          let asyncPending = false;

          if (shouldValidate) {
            asyncPending = parseAndCache(prevState.data).asyncPending;
          }

          const pathNotation = Array.isArray(name) ? name.join('.') : name;
          const touched = { ...prevState.touched, [pathNotation]: true };

          const errors = shouldValidate
            ? composeForData(prevState.data, prevState.asyncErrors, prevManualErrors)
            : prevState.errors;

          return diffedState(
            {
              ...prevState,
              errors,
              validated: prevState.validated || shouldValidate,
              touched,
              ...reduceAsyncState(asyncPending),
            },
            prevState
          );
        }
        // set dirty event
        case 'setDirty': {
          const { name, dirty } = action;

          return diffedState(
            {
              ...prevState,
              dirty: { ...prevState.dirty, [name]: dirty },
            },
            prevState
          );
        }
        // form submit event
        case 'submit': {
          const {
            submittedData,
            asyncErrors,
            freshErrors,
            options: { resetDirty, resetTouched, updateInitialData },
          } = action;

          return {
            ...prevState,
            initialData: updateInitialData ? prevState.data : prevState.initialData,
            dirty: resetDirty ? { ...stateRef.current.dirty } : { ...prevState.dirty },
            touched: resetTouched ? { ...stateRef.current.touched } : { ...prevState.touched },
            validated: true,
            submitCount: prevState.submitCount + 1,
            submittedData,
            errors: composeWithFreshErrors(
              prevState.data,
              asyncErrors,
              prevManualErrors,
              freshErrors
            ),
            asyncErrors,
            asyncRequestId: prevState.asyncRequestId + 1,
          } satisfies FormMutableState<State>;
        }
        // field reset event
        case 'resetFields': {
          const {
            names,
            options: { retainData, resetTouched },
          } = action;

          const mergedData = { ...prevState.data };
          const dirty = { ...prevState.dirty };
          const touched = { ...prevState.touched };

          for (const name of names) {
            if (!retainData) {
              mergedData[name] = prevState.initialData[name];
            }

            dirty[name] = false;

            if (resetTouched) {
              touched[name] = false;
            }
          }

          const prefixes = names.map((name) => `${String(name)}.`);

          if (resetTouched) {
            for (const key of Object.keys(touched)) {
              if (prefixes.some((prefix) => key.startsWith(prefix))) {
                delete touched[key];
              }
            }
          }

          const { parsedData: coercedData, asyncPending } = parseAndCache(mergedData);

          const manualErrors = Object.fromEntries(
            Object.entries(prevManualErrors).filter(
              ([key]) => !(names.includes(key) || prefixes.some((prefix) => key.startsWith(prefix)))
            )
          );

          // Drop stale async-slice entries for the reset paths so the user
          // doesn't see a stale error during the in-flight burst.
          const asyncErrors = asyncPending
            ? pruneAsyncErrors(
                prevState.asyncErrors,
                (key) => names.includes(key) || prefixes.some((prefix) => key.startsWith(prefix))
              )
            : prevState.asyncErrors;

          return diffedState(
            {
              ...prevState,
              data: coercedData,
              errors: composeForData(coercedData, asyncErrors, manualErrors),
              changed: true,
              dirty,
              touched,
              manualErrors,
              ...reduceAsyncState(asyncPending),
              asyncErrors,
            },
            prevState
          );
        }
        // form reset event
        case 'reset': {
          const {
            options: { retainData, resetTouched },
          } = action;

          const errors =
            validateOnMount && prevState.submitCount === 0
              ? prevState.initialErrors
              : ({} as typeof prevState.initialErrors);

          return {
            initialData: prevState.initialData,
            initialErrors: prevState.initialErrors,
            submittedData: prevState.submittedData,
            data: retainData ? prevState.data : prevState.initialData,
            mode: prevState.mode,
            changed: true,
            replaced: prevState.replaced,
            validated: prevState.submitCount > 0 || validateOnMount,
            submitCount: prevState.submitCount,
            dirty: { ...stateRef.current.dirty },
            touched: resetTouched ? { ...stateRef.current.touched } : { ...prevState.touched },
            required: { ...stateRef.current.required },
            ranges: { ...stateRef.current.ranges },
            patterns: { ...stateRef.current.patterns },
            descriptions: { ...stateRef.current.descriptions },
            errors,
            manualErrors: {},
            asyncErrors: {} as Record<keyof State | '', string | undefined>,
            asyncRequestId: prevState.asyncRequestId + 1,
            asyncValidating: false,
            asyncTrigger: undefined,
          } satisfies FormMutableState<State>;
        }
        // form validate event
        case 'validate': {
          const { asyncPending } = parseAndCache(prevState.data);
          const mergedErrors = composeForData(
            prevState.data,
            prevState.asyncErrors,
            prevManualErrors
          );

          const touched = touchErroredFields(prevState.touched, mergedErrors, prevState.data);

          return {
            ...prevState,
            validated: true,
            errors: mergedErrors,
            touched,
            ...reduceAsyncState(asyncPending),
          } satisfies FormMutableState<State>;
        }
        // form async validate event
        case 'asyncValidate': {
          const mergedErrors = composeWithFreshErrors(
            prevState.data,
            action.errors,
            prevManualErrors,
            action.freshErrors
          );

          const touched = touchErroredFields(prevState.touched, mergedErrors, prevState.data);

          return diffedState(
            {
              ...prevState,
              validated: true,
              errors: mergedErrors,
              asyncErrors: action.errors,
              asyncValidating: false,
              asyncRequestId: prevState.asyncRequestId + 1,
              asyncTrigger: undefined,
              touched,
            },
            prevState
          );
        }
        // submit-time validate event — merges sync + async + manual errors in one pass.
        case 'submitValidate': {
          // handleSubmit filters out falsy values before building `action.manualErrors`,
          // so every entry normalizes to a non-null string.
          const mergedManualErrors = { ...prevManualErrors };

          for (const key in action.manualErrors) {
            /* v8 ignore next 3 -- @preserve defensive against prototype pollution */
            if (!Object.prototype.hasOwnProperty.call(action.manualErrors, key)) {
              continue;
            }

            const normalized = normalizeManualError(action.manualErrors[key]);

            /* v8 ignore next 3 -- @preserve handleSubmit filters falsies before dispatch */
            if (normalized === null) {
              continue;
            }

            mergedManualErrors[key] = normalized;
          }

          const mergedErrors = composeWithFreshErrors(
            prevState.data,
            action.asyncErrors,
            mergedManualErrors,
            action.freshErrors
          );

          const touched = touchErroredFields(prevState.touched, mergedErrors, prevState.data);

          return diffedState(
            {
              ...prevState,
              validated: true,
              errors: mergedErrors,
              asyncErrors: action.asyncErrors,
              asyncValidating: false,
              asyncRequestId: prevState.asyncRequestId + 1,
              asyncTrigger: undefined,
              manualErrors: mergedManualErrors,
              touched,
            },
            prevState
          );
        }
        // set manual error event
        case 'setManualError': {
          const {
            name,
            error,
            options: { validate },
          } = action;

          const shouldValidate = validate && (validateBeforeSubmit || prevState.validated);
          const pathNotation = Array.isArray(name) ? name.join('.') : String(name).trim();

          const manualErrors = { ...prevManualErrors };
          const normalizedError = normalizeManualError(error);

          if (normalizedError === null) {
            delete manualErrors[pathNotation];
          } else {
            manualErrors[pathNotation] = normalizedError;
          }

          return {
            ...prevState,
            errors: shouldValidate
              ? composeForData(prevState.data, prevState.asyncErrors, manualErrors)
              : { ...difference(prevState.errors, prevManualErrors), ...manualErrors },
            validated: prevState.validated || shouldValidate,
            manualErrors,
          } satisfies FormMutableState<State>;
        }
        // clear manual errors event
        case 'clearManualErrors': {
          const {
            options: { predicate, validate },
          } = action;

          const shouldValidate = validate && (validateBeforeSubmit || prevState.validated);
          const hasPredicate = typeof predicate === 'function';

          const manualErrors = hasPredicate
            ? Object.fromEntries(
                Object.entries(prevManualErrors).filter(([key]) => !predicate(key))
              )
            : {};

          return {
            ...prevState,
            errors: shouldValidate
              ? composeForData(prevState.data, prevState.asyncErrors, manualErrors)
              : { ...difference(prevState.errors, prevManualErrors), ...manualErrors },
            validated: prevState.validated || shouldValidate,
            manualErrors,
          } satisfies FormMutableState<State>;
        }
        // async validation result event
        case 'asyncErrors': {
          if (action.requestId !== prevState.asyncRequestId) {
            return prevState;
          }

          const mergedAsyncErrors = mergeAsyncErrors(
            prevState.asyncErrors,
            action.errors,
            action.activePaths
          );

          // `action.errors` is the full parse (sync + async). Seeding it as the
          // parse-slice and overlaying `mergedAsyncErrors` preserves non-active
          // async entries from prior bursts that aren't in the current parse.
          const merged = composeWithFreshErrors(
            prevState.data,
            mergedAsyncErrors,
            prevManualErrors,
            action.errors
          );

          return diffedState(
            {
              ...prevState,
              errors: merged,
              asyncErrors: mergedAsyncErrors,
              asyncValidating: false,
              asyncTrigger: undefined,
            },
            prevState
          );
        }
        // set the form mode
        case 'setMode': {
          return {
            ...prevState,
            mode: action.mode,
          } satisfies FormMutableState<State>;
        }
        // v8 ignore next
        default: {
          action satisfies never;

          throw new Error(`Unexpected form action: ${JSON.stringify(action, null, 2)}`);
        }
      }
    },
    [schema, errorMessageSeparator, validateBeforeSubmit, validateOnMount]
  );

  return useActionState<FormMutableState<State>, FormAction<State>>(reducer, state);
}
