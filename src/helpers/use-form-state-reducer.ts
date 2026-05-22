import { useActionState, useCallback, useRef } from 'react';
import * as z from 'zod/mini';

import type { FormAction, FormMutableState } from '../types/form-types';
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect';
import { formatErrors, normalizeManualError } from './error-formatter';
import { dotPathGet, dotPathSet } from './dot-path';
import { deepEqual } from 'fast-equals';
import { createState, diffedState, difference, safeSyncParse } from './state-manager';

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
          // Sync portion of the schema couldn't be evaluated because an async
          // refinement is present. Keep prior errors visible until safeParseAsync
          // (scheduled by useFormState) dispatches `asyncErrors`.
          return { parsedData: data, errors: prevState.errors, asyncPending: true };
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
              asyncErrors: {} as Record<keyof State | '', string | undefined>,
              asyncTrigger,
            }
          : {
              asyncRequestId: prevState.asyncRequestId,
              asyncValidating: false,
              asyncErrors: prevState.asyncErrors,
              asyncTrigger: prevState.asyncTrigger,
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

          let errors: Record<keyof State | '', string | undefined>;
          let asyncPending = false;
          if (validateOnMount || Object.keys(prevState.errors).length > 0) {
            const parsed = parseAndCache(mergedData);
            errors = parsed.errors;
            asyncPending = parsed.asyncPending;
          } else {
            errors = { ...prevState.errors };
          }

          return {
            ...prevState,
            data: mergedData,
            initialData: stateRef.current.data,
            initialErrors: stateRef.current.errors,
            errors: { ...errors, ...prevManualErrors },
            ...reduceAsyncState(asyncPending),
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
          let errors: Record<keyof State | '', string | undefined>;
          let asyncPending = false;

          if (shouldValidate) {
            const cached = parseAndCache(mergedData);
            changedData = cached.parsedData;
            errors = cached.errors;
            asyncPending = fromDebounce ? false : cached.asyncPending;
          } else {
            changedData = mergedData;
            errors = prevState.errors;
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

          return diffedState(
            {
              ...prevState,
              data: changedData,
              errors: { ...errors, ...prevManualErrors },
              changed: true,
              validated: shouldValidate,
              dirty,
              touched,
              ...reduceAsyncState(asyncPending, pathNotation),
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

          const dataErrors = asyncPending
            ? ({} as Record<keyof State | '', string | undefined>)
            : formatErrors<State>(
                (result as { error?: Parameters<typeof formatErrors<State>>[0] }).error,
                errorMessageSeparator
              );

          const errors =
            shouldValidate || Object.keys(prevState.errors).length > 0
              ? dataErrors
              : { ...prevState.errors };

          return {
            ...prevState,
            initialData: replacedData,
            data: replacedData,
            initialErrors: dataErrors,
            errors: { ...errors, ...prevManualErrors },
            replaced: true,
            validated: prevState.validated || shouldValidate,
            ...reduceAsyncState(asyncPending),
          } satisfies FormMutableState<State>;
        }
        // field touch event
        case 'touch': {
          const {
            name,
            options: { validate },
          } = action;

          const shouldValidate = validate && (validateBeforeSubmit || prevState.validated);

          let errors: Record<keyof State | '', string | undefined>;
          let asyncPending = false;
          if (shouldValidate) {
            const cached = parseAndCache(prevState.data);
            errors = cached.errors;
            asyncPending = cached.asyncPending;
          } else {
            errors = { ...prevState.errors };
          }

          const pathNotation = Array.isArray(name) ? name.join('.') : name;
          const touched = { ...prevState.touched, [pathNotation]: true };

          return diffedState(
            {
              ...prevState,
              errors: { ...errors, ...prevManualErrors },
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

          const { result, asyncPending } = safeSyncParse(schema, mergedData);

          const errors = asyncPending
            ? { ...prevState.errors }
            : formatErrors<State>(
                (result as { error?: Parameters<typeof formatErrors<State>>[0] }).error,
                errorMessageSeparator
              );

          const manualErrors = Object.fromEntries(
            Object.entries(prevManualErrors).filter(
              ([key]) => !(names.includes(key) || prefixes.some((prefix) => key.startsWith(prefix)))
            )
          );

          return diffedState(
            {
              ...prevState,
              data: mergedData,
              errors: { ...errors, ...manualErrors },
              changed: true,
              dirty,
              touched,
              manualErrors,
              ...reduceAsyncState(asyncPending),
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
          const { errors, asyncPending } = parseAndCache(prevState.data);
          const mergedErrors = { ...errors, ...prevManualErrors };

          const touched = { ...prevState.touched };

          for (const key of Object.keys(mergedErrors)) {
            const topSegment = key.split('.', 1)[0];

            if (!topSegment || !(topSegment in prevState.data)) {
              continue;
            }

            touched[key as keyof State] = true;
          }

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
          const mergedErrors = { ...action.errors, ...prevManualErrors };

          const touched = { ...prevState.touched };

          for (const key of Object.keys(mergedErrors)) {
            const topSegment = key.split('.', 1)[0];

            if (!topSegment || !(topSegment in prevState.data)) {
              continue;
            }

            touched[key as keyof State] = true;
          }

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
        // set manual error event
        case 'setManualError': {
          const {
            name,
            error,
            options: { validate },
          } = action;

          const shouldValidate = validate && (validateBeforeSubmit || prevState.validated);

          const pathNotation = Array.isArray(name) ? name.join('.') : String(name).trim();

          let baseErrors: Record<keyof State | '', string | undefined>;

          if (shouldValidate) {
            const cached = parseAndCache(prevState.data);
            baseErrors = cached.errors;
          } else {
            baseErrors = { ...prevState.errors };
          }

          const errors = difference(baseErrors, prevManualErrors);

          const manualErrors = { ...prevManualErrors };
          const normalizedError = normalizeManualError(error);

          if (normalizedError === null) {
            delete manualErrors[pathNotation];
          } else {
            manualErrors[pathNotation] = normalizedError;
          }

          return {
            ...prevState,
            errors: { ...errors, ...manualErrors },
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

          let baseErrors: Record<keyof State | '', string | undefined>;

          if (shouldValidate) {
            const cached = parseAndCache(prevState.data);
            baseErrors = cached.errors;
          } else {
            baseErrors = { ...prevState.errors };
          }

          const errors = difference(baseErrors, prevManualErrors);

          const manualErrors = hasPredicate
            ? Object.fromEntries(
                Object.entries(prevManualErrors).filter(([key]) => !predicate(key))
              )
            : {};

          return {
            ...prevState,
            errors: hasPredicate ? { ...errors, ...manualErrors } : errors,
            validated: prevState.validated || shouldValidate,
            manualErrors,
          } satisfies FormMutableState<State>;
        }
        // async validation result event
        case 'asyncErrors': {
          // Discard stale results from a superseded async parse.
          if (action.requestId !== prevState.asyncRequestId) {
            return prevState;
          }

          const merged = { ...action.errors, ...prevManualErrors };

          return diffedState(
            {
              ...prevState,
              errors: merged,
              asyncErrors: action.errors,
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
