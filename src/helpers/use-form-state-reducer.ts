import { useActionState, useCallback } from 'react';
import * as z from 'zod';

import type { FormAction, FormMutableState, ManualErrorState } from '../types/form-types';
import { formatErrors } from './error-formatter';
import { dotPathGet, dotPathSet } from './dot-path';
import { deepEqual } from 'fast-equals';
import { createInitialState, diffedState, updateState } from './state-manager';

export function useFormStateReducer<T extends z.ZodObject>(
  schema: T,
  state: FormMutableState<z.infer<T>>,
  manualErrorsState: ManualErrorState,
  validateOnInit: boolean
) {
  type State = z.infer<T>;

  const reducer = useCallback(
    (prevState: FormMutableState<State>, action: FormAction<State>) => {
      const prevManualErrors = manualErrorsState.get();

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

          let errors: Record<keyof State, string | undefined>;
          if (validateOnInit || Object.keys(prevState.errors).length > 0) {
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

          const pathNotation = Array.isArray(name) ? name.join('.') : String(name);
          const field = Array.isArray(name) ? name[0] : name;

          const mergedData = dotPathSet<State>(prevState.data, pathNotation, value);
          const safeData = schema.safeParse(mergedData);
          const finalData = safeData.success ? safeData.data : mergedData;

          const errors = validate ? formatErrors<State>(safeData.error) : { ...prevState.errors };

          const initialValue = dotPathGet<State>(prevState.initialData, pathNotation);

          let isFieldDirty: boolean;

          if (Array.isArray(value)) {
            isFieldDirty = !deepEqual(value, initialValue);
          } else if (
            typeof prevState.initialData[field] === 'object' ||
            typeof finalData[field] === 'object'
          ) {
            isFieldDirty = !deepEqual(prevState.initialData[field], finalData[field]);
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
              data: finalData,
              errors: { ...errors, ...prevManualErrors },
              validated: prevState.validated || validate,
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

          const replacedData = createInitialState(schema, data);

          const safeData = schema.safeParse(replacedData);
          const dataErrors = formatErrors<State>(safeData.error);

          const errors =
            validate || Object.keys(prevState.errors).length > 0
              ? dataErrors
              : { ...prevState.errors };

          return {
            ...prevState,
            initialData: replacedData,
            data: replacedData,
            initialErrors: dataErrors,
            errors: { ...errors, ...prevManualErrors },
            replaced: true,
            validated: prevState.validated || validate,
          } satisfies FormMutableState<State>;
        }
        // field touch event
        case 'touch': {
          let errors: Record<keyof State, string | undefined>;
          if (action.options.validate) {
            const safeData = schema.safeParse(prevState.data);
            errors = formatErrors<State>(safeData.error);
          } else {
            errors = { ...prevState.errors };
          }

          const pathNotation = Array.isArray(action.name) ? action.name.join('.') : action.name;
          const touched = { ...prevState.touched, [pathNotation]: true };

          return diffedState(
            {
              ...prevState,
              validated: prevState.validated || action.options.validate,
              touched,
              errors,
            },
            prevState
          );
        }
        // set dirty event
        case 'setDirty': {
          return diffedState(
            {
              ...prevState,
              dirty: { ...prevState.dirty, [action.name]: action.dirty },
            },
            prevState
          );
        }
        // form submit event
        case 'submit': {
          return {
            ...prevState,
            initialData: action.options.resetDirty ? prevState.data : prevState.initialData,
            dirty: action.options.resetDirty ? { ...state.dirty } : { ...prevState.dirty },
            touched: action.options.resetTouched ? { ...state.touched } : { ...prevState.touched },
            validated: true,
            submitted: true,
          } satisfies FormMutableState<State>;
        }
        // field reset event
        case 'resetFields': {
          const {
            names,
            options: { retainData, resetSubmitted, resetTouched },
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
              submitted: resetSubmitted ? state.submitted : prevState.submitted,
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
          let errors: Record<keyof State, string>;

          if (validateOnInit && !prevState.submitted) {
            const safeData = schema.safeParse(prevState.initialData);
            errors = formatErrors<State>(safeData.error);
          } else {
            errors = {} as Record<keyof State, string>;
          }

          manualErrorsState.set();

          return {
            initialData: prevState.initialData,
            initialErrors: prevState.initialErrors,
            data: action.options.retainData ? prevState.data : prevState.initialData,
            replaced: prevState.replaced,
            validated: prevState.submitted || validateOnInit,
            submitted: action.options.resetSubmitted ? state.submitted : prevState.submitted,
            dirty: { ...state.dirty },
            touched: action.options.resetTouched ? { ...state.touched } : { ...prevState.touched },
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
          const safeData = schema.safeParse(prevState.data);
          const errors = formatErrors<State>(safeData.error);

          return {
            ...prevState,
            validated: true,
            errors: { ...errors, ...prevManualErrors },
          } satisfies FormMutableState<State>;
        }
        // set manual error event
        case 'setManualError': {
          const { name, error, options } = action;

          const pathNotation = Array.isArray(name) ? name.join('.') : String(name).trim();

          const safeData = schema.safeParse(prevState.data);
          const errors = formatErrors<State>(safeData.error);

          const manualErrors = updateState(prevManualErrors, (draft) => {
            if (error === null) {
              delete draft[pathNotation];
            } else {
              draft[pathNotation] = error?.trim() || 'Error';
            }

            manualErrorsState.set(draft);
          });

          return {
            ...prevState,
            errors: { ...errors, ...manualErrors },
            validated: prevState.validated || options.validate,
          } satisfies FormMutableState<State>;
        }
        // clear manual errors event
        case 'clearManualErrors': {
          const safeData = schema.safeParse(prevState.data);
          const errors = formatErrors<State>(safeData.error);

          manualErrorsState.set();

          return {
            ...prevState,
            errors,
          } satisfies FormMutableState<State>;
        }
        // set the form mode
        case 'setMode': {
          return {
            ...prevState,
            readOnly: action.readOnly,
            disabled: action.disabled,
          } satisfies FormMutableState<State>;
        }
      }
    },
    [schema, state, manualErrorsState, validateOnInit]
  );

  return useActionState<FormMutableState<State>, FormAction<State>>(reducer, state);
}
