import { useActionState, useCallback, useRef } from 'react';
import * as z from 'zod/mini';

import type { FormAction, FormMutableState, ManualErrorState } from '../types/form-types';
import { formatErrors } from './error-formatter';
import { dotPathGet, dotPathSet } from './dot-path';
import { deepEqual } from 'fast-equals';
import { createInitialState, diffedState, difference, updateState } from './state-manager';

export function useFormStateReducer<T extends z.ZodMiniObject>(
  schema: T,
  state: FormMutableState<z.infer<T>>,
  manualErrorsState: ManualErrorState,
  validateBeforeSubmit: boolean,
  validateOnMount: boolean
) {
  type State = z.infer<T>;

  const validationCacheRef = useRef<{
    schema: z.ZodMiniType;
    data: State;
    parsedData: State;
    errors: Record<keyof State | '', string | undefined>;
  } | null>(null);

  const reducer = useCallback(
    (prevState: FormMutableState<State>, action: FormAction<State>) => {
      const prevManualErrors = manualErrorsState.get();

      const parseAndCache = (data: State) => {
        const cached = validationCacheRef.current;

        if (
          cached &&
          cached.schema === schema &&
          (cached.data === data || cached.parsedData === data)
        ) {
          return { parsedData: cached.parsedData, errors: cached.errors };
        }

        const safeData = schema.safeParse(data);
        const errors = formatErrors<State>(safeData.error);
        const parsedData = safeData.data ?? data;

        validationCacheRef.current = { schema, data, parsedData, errors };

        return { parsedData, errors };
      };

      switch (action.type) {
        // initial state change event
        case 'changeInitialState': {
          // only override non-dirty current state values with new initial state values
          const mergedData: State = {
            ...prevState.data,
            ...Object.fromEntries(
              Object.entries(state.data).filter(([key]) => !prevState.dirty[key])
            ),
          };

          let errors: Record<keyof State | '', string | undefined>;
          if (validateOnMount || Object.keys(prevState.errors).length > 0) {
            const safeData = schema.safeParse(mergedData);
            errors = formatErrors<State>(safeData.error);
          } else {
            errors = { ...prevState.errors };
          }

          return {
            ...prevState,
            data: mergedData,
            initialData: state.data,
            initialErrors: state.errors,
            errors: { ...errors, ...prevManualErrors },
          } satisfies FormMutableState<State>;
        }
        // state change event
        case 'change': {
          const {
            name,
            value,
            options: { validate, touch },
          } = action;

          const shouldValidate = validate && (validateBeforeSubmit || prevState.validated);

          const pathNotation = Array.isArray(name) ? name.join('.') : String(name);
          const field = Array.isArray(name) ? name[0] : name;

          const mergedData = dotPathSet<State>(prevState.data, pathNotation, value);

          let changedData: State;
          let errors: Record<keyof State | '', string | undefined>;

          if (shouldValidate) {
            const cached = parseAndCache(mergedData);
            changedData = cached.parsedData;
            errors = cached.errors;
          } else {
            changedData = mergedData;
            errors = prevState.errors;
          }

          const initialValue = dotPathGet<State>(prevState.initialData, pathNotation);

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

          const dirty = { ...prevState.dirty, [field]: isFieldDirty };

          const touched = touch
            ? { ...prevState.touched, [pathNotation]: true }
            : { ...prevState.touched };

          return diffedState(
            {
              ...prevState,
              data: changedData,
              errors: { ...errors, ...prevManualErrors },
              validated: shouldValidate,
              dirty,
              touched,
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

          const replacedData = createInitialState(schema, data);

          const safeData = schema.safeParse(replacedData);
          const dataErrors = formatErrors<State>(safeData.error);

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
          } satisfies FormMutableState<State>;
        }
        // field touch event
        case 'touch': {
          const {
            name,
            options: { validate },
          } = action;

          const shouldValidate = validate && (validateBeforeSubmit || prevState.validated);

          const errors = shouldValidate
            ? parseAndCache(prevState.data).errors
            : { ...prevState.errors };

          const pathNotation = Array.isArray(name) ? name.join('.') : name;
          const touched = { ...prevState.touched, [pathNotation]: true };

          return diffedState(
            {
              ...prevState,
              errors: { ...errors, ...prevManualErrors },
              validated: prevState.validated || shouldValidate,
              touched,
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
            options: { resetDirty, resetTouched },
          } = action;

          return {
            ...prevState,
            initialData: resetDirty ? prevState.data : prevState.initialData,
            dirty: resetDirty ? { ...state.dirty } : { ...prevState.dirty },
            touched: resetTouched ? { ...state.touched } : { ...prevState.touched },
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
          let touched = { ...prevState.touched };

          for (const name of names) {
            if (!retainData) {
              mergedData[name] = prevState.initialData[name];
            }

            dirty[name] = false;

            if (resetTouched) {
              touched = { ...touched, [name]: false };

              const prefix = `${String(name)}.`;

              for (const key of Object.keys(touched)) {
                if (key.startsWith(prefix)) {
                  delete touched[key];
                }
              }
            }
          }

          const safeData = schema.safeParse(mergedData);
          const errors = formatErrors<State>(safeData.error);

          const manualErrors = updateState(prevManualErrors, (draft) => {
            for (const key in draft) {
              if (
                Object.prototype.hasOwnProperty.call(draft, key) &&
                (names.includes(key) || names.some((name) => key.startsWith(String(name) + '.')))
              ) {
                delete draft[key];
              }
            }

            manualErrorsState.set(draft);
          });

          return diffedState(
            {
              ...prevState,
              data: mergedData,
              errors: { ...errors, ...manualErrors },
              dirty,
              touched,
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

          manualErrorsState.set();

          return {
            initialData: prevState.initialData,
            initialErrors: prevState.initialErrors,
            submittedData: prevState.submittedData,
            data: retainData ? prevState.data : prevState.initialData,
            replaced: prevState.replaced,
            validated: prevState.submitCount > 0 || validateOnMount,
            submitCount: prevState.submitCount,
            dirty: { ...state.dirty },
            touched: resetTouched ? { ...state.touched } : { ...prevState.touched },
            readOnly: prevState.readOnly,
            disabled: prevState.disabled,
            maxLengths: { ...state.maxLengths },
            ranges: { ...state.ranges },
            patterns: { ...state.patterns },
            descriptions: { ...state.descriptions },
            errors,
          } satisfies FormMutableState<State>;
        }
        // form validate event
        case 'validate': {
          const errors = parseAndCache(prevState.data).errors;

          return {
            ...prevState,
            validated: true,
            errors: { ...errors, ...prevManualErrors },
          } satisfies FormMutableState<State>;
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

          const errors = difference(
            shouldValidate ? parseAndCache(prevState.data).errors : { ...prevState.errors },
            prevManualErrors
          );

          const manualErrors = updateState(prevManualErrors, (draft) => {
            if (error === null) {
              delete draft[pathNotation];
            } else {
              draft[pathNotation] = error?.trim() || 'Error';
            }

            manualErrorsState.set(draft);
          });

          const currentErrors = { ...errors, ...manualErrors };

          if (deepEqual(prevState.errors, currentErrors)) {
            return prevState;
          }

          return {
            ...prevState,
            errors: currentErrors,
            validated: prevState.validated || shouldValidate,
          } satisfies FormMutableState<State>;
        }
        // clear manual errors event
        case 'clearManualErrors': {
          const {
            options: { predicate, validate },
          } = action;

          const shouldValidate = validate && (validateBeforeSubmit || prevState.validated);

          if (Object.keys(manualErrorsState.get()).length === 0) {
            return prevState;
          }

          const hasPredicate = typeof predicate === 'function';

          const errors = difference(
            shouldValidate ? parseAndCache(prevState.data).errors : { ...prevState.errors },
            prevManualErrors
          );

          if (hasPredicate) {
            manualErrorsState.remove(predicate);
          } else {
            manualErrorsState.set();
          }

          return {
            ...prevState,
            errors: hasPredicate ? { ...errors, ...manualErrorsState.get() } : errors,
            validated: prevState.validated || shouldValidate,
          } satisfies FormMutableState<State>;
        }
        // set the form mode
        case 'setMode': {
          const { readOnly, disabled } = action;

          return {
            ...prevState,
            readOnly,
            disabled,
          } satisfies FormMutableState<State>;
        }
      }
    },
    [schema, state, manualErrorsState, validateBeforeSubmit, validateOnMount]
  );

  return useActionState<FormMutableState<State>, FormAction<State>>(reducer, state);
}
