import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type SyntheticEvent,
} from 'react';
import { deepEqual } from 'fast-equals';
import * as z from 'zod/v4';

import { dotPathGet, dotPathSet } from './helpers/dot-path';
import { createFormComponent } from './helpers/form-builder';

import type {
  FormAction,
  FormChangeOptions,
  FormClassOptions,
  FormPath,
  FieldRange,
  FormResetOptions,
  FormMutableState,
  FormOptions,
  FormReplaceOptions,
  FormState,
  FormStatePath,
  FormStateResponse,
  FormStatus,
  FormSubmitOptions,
  FormTouchOptions,
  FormValidateOptions,
  Immutable,
  StateCallback,
  DeepPartial,
  SubmitState,
} from './form-types';

import {
  collectDescriptions,
  collectMaxLengths,
  collectPatterns,
  collectRanges,
  getPath,
  getPathNotation,
} from './helpers/schema-visitor';
import { useDeepMemo } from './helpers/use-deep-memo';
import { useManualErrorState } from './helpers/use-manual-error-state';
import {
  cleanEmpty,
  createInitialState,
  createState,
  diffedState,
  updateState,
} from './helpers/state-manager';
import { formatErrors } from './helpers/error-formatter';
import { debounce } from './helpers/debouncer';

/**
 * Hook that manages form state.
 *
 * @typeParam T type of the form data.
 * @param schema - Zod schema to validate the form data.
 * @param formOptions - Form initialization options.
 * @returns An object containing form state, status, actions, form HTML element props and state related CSS classes.
 */
export function useFormState<T extends z.ZodObject>(schema: T, formOptions?: FormOptions<T>) {
  type State = z.infer<T>;

  // The initial hook parameters.
  const {
    initialState,
    initialTouched,
    validateOnInit = false,
    debounceCacheCapacity = 50,
  } = formOptions ?? {};

  // The manual errors that are not a part of the schema.
  const manualErrorsState = useManualErrorState();

  // Memoized strongly typed form state accessor methods.

  const getFieldError = useCallback(
    (errors: Record<keyof State, string | undefined>, path: FormStatePath<State>) =>
      errors[path.join('.') as keyof State],
    []
  );

  const wasFieldTouched = useCallback(
    (touched: Record<keyof State, boolean>, path: FormStatePath<State>) =>
      Boolean(touched[path.join('.') as keyof State]),
    []
  );

  const getFieldMaxLength = useCallback(
    (maxLengths: Record<keyof State, number | undefined>, path: FormStatePath<State>) =>
      maxLengths[getPathNotation(path) as keyof State],
    []
  );

  const getFieldRange = useCallback(
    (
      ranges: Record<keyof State, { min: FieldRange; max: FieldRange; format: string }>,
      path: FormStatePath<State>
    ) => ranges[getPathNotation(path) as keyof State],
    []
  );

  const getFieldPattern = useCallback(
    (patterns: Record<keyof State, string | undefined>, path: FormStatePath<State>) =>
      patterns[getPathNotation(path) as keyof State] ?? '',
    []
  );

  const getFieldDescription = useCallback(
    (descriptions: Record<keyof State, string | undefined>, path: FormStatePath<State>) =>
      descriptions[getPathNotation(path) as keyof State] ?? '',
    []
  );

  const defaultData = useMemo(() => createState(schema), [schema]);

  const initialData = useDeepMemo(
    () => createInitialState(schema, initialState),
    [schema, initialState]
  );

  // The processed initial state with default property values and optional errors during the
  // initial validation.
  const state = useMemo<FormMutableState<State>>(() => {
    const mergedData = initialState ? initialData : defaultData;
    const safeData = schema.safeParse(mergedData);

    const initialErrors = formatErrors<State>(safeData.error);
    const errors = validateOnInit ? initialErrors : ({} as Record<keyof State, string>);

    const dirty: Record<keyof State, boolean> = {} as Record<keyof State, boolean>;

    const touched: Record<keyof State, boolean> = {} as Record<keyof State, boolean>;

    for (const field in mergedData) {
      if (Object.prototype.hasOwnProperty.call(mergedData, field)) {
        dirty[field] = false;
        touched[field] = false;
      }
    }

    if (Array.isArray(initialTouched)) {
      for (const pathNotation of initialTouched) {
        const path =
          typeof pathNotation === 'function'
            ? getPath(mergedData, pathNotation).join('.')
            : String(pathNotation);

        touched[path as keyof State] = true;
      }
    }

    const maxLengths = collectMaxLengths(schema) as Record<keyof State, number>;
    const ranges = collectRanges(schema) as Record<
      keyof State,
      { min: FieldRange; max: FieldRange; format: string }
    >;
    const patterns = collectPatterns(schema) as Record<keyof State, string | undefined>;
    const descriptions = collectDescriptions(schema) as Record<keyof State, string | undefined>;

    const data = safeData.data ?? mergedData;

    return {
      validated: validateOnInit,
      submitted: false,
      initialData: data,
      data,
      initialErrors,
      errors,
      dirty,
      touched,
      maxLengths,
      ranges,
      patterns,
      descriptions,
    } satisfies FormMutableState<State>;
  }, [schema, defaultData, initialData, initialState, initialTouched, validateOnInit]);

  // Tracks whether component is mounted.
  const isMountedRef = useRef(true);

  // The queue of "change" callback refs.
  const changeCallbackRefs = useRef<StateCallback<State>[]>([]);

  const debounceCache = useRef<
    Map<StateCallback<State>, StateCallback<State> & { cancel: () => void }>
  >(new Map());

  // The main form state reducer.
  const [formState, dispatch] = useActionState<FormMutableState<State>, FormAction<State>>(
    useCallback(
      (prevState, action) => {
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

            let errors: Record<keyof State, string | undefined>;
            if (validate || Object.keys(prevState.errors).length > 0) {
              const safeData = schema.safeParse(replacedData);
              errors = formatErrors<State>(safeData.error);
            } else {
              errors = { ...prevState.errors };
            }

            return {
              ...prevState,
              data: replacedData,
              initialErrors: errors,
              errors: { ...errors, ...prevManualErrors },
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
              touched: action.options.resetTouched
                ? { ...state.touched }
                : { ...prevState.touched },
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
              validated: prevState.submitted || validateOnInit,
              submitted: action.options.resetSubmitted ? state.submitted : prevState.submitted,
              dirty: { ...state.dirty },
              touched: action.options.resetTouched
                ? { ...state.touched }
                : { ...prevState.touched },
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
            const { name, error } = action;

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
        }
      },
      [schema, state, manualErrorsState, validateOnInit]
    ),
    state // the latest initial state
  );

  // The memoized "formStatus" object.
  const formStatus = useMemo<FormStatus>(
    () =>
      ({
        dirty: Object.values(formState.dirty).some(Boolean),
        touched: Object.values(formState.touched).some(Boolean),
        valid: formState.validated ? Object.keys(formState.errors).length === 0 : null,
        validSchema: formState.validated
          ? Object.entries(formState.errors).filter((error) =>
              Object.entries(manualErrorsState.get()).every((entry) => !deepEqual(entry, error))
            ).length === 0
          : null,
        submitted: formState.submitted,
      }) as const,
    [
      formState.dirty,
      formState.touched,
      formState.errors,
      formState.validated,
      formState.submitted,
      manualErrorsState,
    ]
  );

  const generateCallbackState = useCallback(
    () => ({
      data: Object.freeze({
        ...formState.data,
        toObject: () => cleanEmpty(schema, formState.data) as State,
      }) as FormState<State>['data'],
      errors: Object.freeze({
        ...formState.errors,
        get: (expression: (data: State) => unknown) =>
          getFieldError(formState.errors, getPath(formState.data, expression)),
        getManual: (key: string) => formState.errors[key as keyof State],
      }) as FormState<State>['errors'],
      touched: Object.freeze({
        ...formState.touched,
        get: (expression: (data: State) => unknown) =>
          wasFieldTouched(formState.touched, getPath(formState.data, expression)),
      }) as FormState<State>['touched'],
      dirty: Object.freeze({
        ...formState.dirty,
        get: (key: `#${string}`) => Boolean(formState.dirty[key as keyof State]),
      }) as FormState<State>['dirty'],
      maxLengths: Object.freeze({
        ...formState.maxLengths,
        get: (expression: (data: State) => unknown) =>
          getFieldMaxLength(formState.maxLengths, getPath(formState.data, expression)),
      }) as FormState<State>['maxLengths'],
      ranges: Object.freeze({
        ...formState.ranges,
        get: (expression: (data: State) => unknown) =>
          getFieldRange(formState.ranges, getPath(formState.data, expression)),
      }) as FormState<State>['ranges'],
      patterns: Object.freeze({
        ...formState.patterns,
        get: (expression: (data: State) => unknown) =>
          getFieldPattern(formState.patterns, getPath(formState.data, expression)),
      }) as FormState<State>['patterns'],
      descriptions: Object.freeze({
        ...formState.descriptions,
        get: (expression: (data: State) => unknown) =>
          getFieldDescription(formState.descriptions, getPath(formState.data, expression)),
      }) as FormState<State>['descriptions'],
    }),
    [
      schema,
      formState,
      getFieldDescription,
      getFieldError,
      getFieldMaxLength,
      getFieldPattern,
      getFieldRange,
      wasFieldTouched,
    ]
  );

  // Dispatches inital state changes.
  useEffect(() => {
    if (!formState.submitted && !deepEqual(formState.initialData, state.data)) {
      dispatch({ type: 'changeInitialState' });
    }
  }, [state.data, formState.submitted, formState.initialData, dispatch]);

  // Calls the change callbacks on the form status change.
  useEffect(() => {
    if (changeCallbackRefs.current.length > 0) {
      const callbacks = changeCallbackRefs.current;
      changeCallbackRefs.current = [];

      for (const callback of callbacks) {
        callback(generateCallbackState(), formStatus);
      }
    }
  }, [formState, formStatus, generateCallbackState]);

  // Cleanup on unmount.
  useEffect(() => {
    isMountedRef.current = true;

    const currentCache = debounceCache.current;

    return () => {
      isMountedRef.current = false;

      // Cancel all debounced callbacks.
      if (currentCache.size > 0) {
        for (const debounced of currentCache.values()) {
          debounced.cancel();
        }
        currentCache.clear();
      }
    };
  }, []);

  // Generates CSS form classes based on the form state.
  const formClasses = useCallback(
    (nameOrPath: FormPath<T>, additionalClasses?: string | null, options?: FormClassOptions) => {
      let classes = '';

      const pathNotation =
        typeof nameOrPath === 'function'
          ? getPath(formState.data, nameOrPath).join('.')
          : nameOrPath;

      const classPrefix = options?.classPrefix?.trim() || 'form-state';

      if (formState.touched[pathNotation as keyof State]) {
        classes += `${classPrefix}__touched `;
      }

      if (!options?.isLoading && formState.errors[pathNotation as keyof State]) {
        classes += `${classPrefix}__error `;
      }

      if (!additionalClasses?.length) {
        return classes.trim();
      }

      return (classes.trim() + ' ' + additionalClasses).trim();
    },
    [formState]
  );

  // The memoized "change" function.
  const change = useCallback(
    (nameOrPath: FormPath<T>, value: unknown, options?: FormChangeOptions<T>) => {
      const path =
        typeof nameOrPath === 'function' ? getPath(formState.data, nameOrPath) : nameOrPath;
      const pathNotation = Array.isArray(path) ? path.join('.') : String(path);

      const unchanged = dotPathGet(formState.data, pathNotation) === value;

      if (unchanged) {
        if (options?.touch) {
          const touched = formState.touched[pathNotation];

          if (!touched) {
            dispatch({
              type: 'touch',
              name: path,
              options: {
                validate: false,
              },
            });
          }
        }

        return;
      }

      const callback = options?.callback;
      const interval = options?.callbackInterval ?? 0;

      if (typeof callback === 'function') {
        if ((interval <= 0 || debounceCacheCapacity <= 0) && !debounceCache.current.has(callback)) {
          // Only add callback if it's not already being debounced.
          changeCallbackRefs.current.push(callback);
        } else if (interval > 0) {
          // Use or create a debounced callback.
          let debouncedCallback = debounceCache.current.get(callback);

          if (debouncedCallback) {
            // The Map object holds key-value pairs and remembers the original insertion order
            // of the keys - JavaScript's Map specification document.
            // Put the callback at the end of the set.
            debounceCache.current.delete(callback);
            debounceCache.current.set(callback, debouncedCallback);
          } else {
            // Cache eviction logic.
            if (debounceCache.current.size >= debounceCacheCapacity) {
              const firstKey = debounceCache.current.keys().next().value!;
              const oldDebounced = debounceCache.current.get(firstKey);
              oldDebounced?.cancel();
              debounceCache.current.delete(firstKey);
            }

            debouncedCallback = debounce(
              (currentState: FormState<State>, currentStatus: FormStatus) => {
                // Only execute the callback if the component is still mounted.
                if (isMountedRef.current) {
                  callback(currentState, currentStatus);
                }
              },
              interval
            );

            debounceCache.current.set(callback, debouncedCallback);
          }

          changeCallbackRefs.current.push(debouncedCallback);
        }
      }

      dispatch({
        type: 'change',
        name: path,
        value,
        options: {
          touch: Boolean(options?.touch),
          validate: options?.validate ?? true,
        },
      });
    },
    [debounceCacheCapacity, formState.data, formState.touched, dispatch]
  );

  // The memoized "replace" function.
  const replace = useCallback(
    (data: DeepPartial<State>, options?: FormReplaceOptions) => {
      dispatch({
        type: 'replace',
        data,
        options: {
          validate: Boolean(options?.validate),
        },
      });
    },
    [dispatch]
  );

  // The memoized "touch" function.
  const touch = useCallback(
    (nameOrPath?: FormPath<T>, options?: FormTouchOptions) => {
      let path =
        typeof nameOrPath === 'function' ? getPath(formState.data, nameOrPath) : nameOrPath;

      if (!path) {
        const names = Object.keys(formState.data) as (keyof State)[];

        if (names.length === 0) {
          return;
        }

        path = names[0]!;
      }

      dispatch({
        type: 'touch',
        name: path,
        options: {
          validate: Boolean(options?.validate),
        },
      });
    },
    [formState.data, dispatch]
  );

  // The memoized "reset" function.
  const reset = useCallback(
    (_event?: SyntheticEvent<HTMLFormElement> | null, options?: FormResetOptions<T>) => {
      if (Array.isArray(options?.names) && options.names.length > 0) {
        dispatch({
          type: 'resetFields',
          names: options.names,
          options: {
            retainData: Boolean(options?.retainData),
            resetTouched: Boolean(options?.resetTouched),
            resetSubmitted: Boolean(options?.resetSubmitted),
          },
        });
      } else {
        dispatch({
          type: 'reset',
          options: {
            retainData: Boolean(options?.retainData),
            resetTouched: Boolean(options?.resetTouched !== false),
            resetSubmitted: Boolean(options?.resetSubmitted),
          },
        });
      }
    },
    [dispatch]
  );

  // The memoized "validate" function.
  const validate = useCallback(
    (options?: FormValidateOptions<T>) => {
      if (options?.submit) {
        dispatch({
          type: 'submit',
          options: {
            resetDirty: Boolean(options.resetDirty !== false),
            resetTouched: Boolean(options.resetTouched !== false),
          },
        });
      } else {
        dispatch({ type: 'validate' });
      }

      const callback = options?.callback;

      if (typeof callback === 'function') {
        changeCallbackRefs.current.push(() => {
          changeCallbackRefs.current.push(callback);
        });
      }

      return true;
    },
    [dispatch]
  );

  // The memoized "handleSubmit" function.
  const handleSubmit = useCallback(
    (
      onSubmit: (state: SubmitState<State>) => Promise<boolean | void> | boolean | void,
      options?: FormSubmitOptions
    ) => {
      return async () => {
        const submittedErrors =
          formStatus.valid === null
            ? { ...formState.initialErrors, ...manualErrorsState.get() }
            : formState.errors;

        const hasErrors = Object.keys(submittedErrors).length > 0;

        const submitState: SubmitState<State> = hasErrors
          ? {
              valid: false,
              errors: Object.freeze({
                ...submittedErrors,
                get: (expression: (data: State) => unknown) =>
                  getFieldError(submittedErrors, getPath(formState.data, expression)),
                getManual: (key: string) => submittedErrors[key as keyof State],
              }) as FormState<State>['errors'],
            }
          : {
              valid: true,
              data: cleanEmpty(schema, formState.data) as State,
            };

        const shouldSubmit = await onSubmit(submitState);

        if (hasErrors || shouldSubmit === false) {
          dispatch({ type: 'validate' });
          return;
        }

        dispatch({
          type: 'submit',
          options: {
            resetDirty: Boolean(options?.resetDirty !== false),
            resetTouched: Boolean(options?.resetTouched !== false),
          },
        });
      };
    },
    [
      schema,
      formState.data,
      formState.errors,
      formState.initialErrors,
      formStatus.valid,
      manualErrorsState,
      getFieldError,
    ]
  );

  // The memoized "setDirty" function.
  const setDirty = useCallback(
    (key: string, dirty?: boolean) => {
      if (!key?.trim()?.startsWith('#')) {
        throw new TypeError('A missing or invalid key was provided.');
      }

      dispatch({
        type: 'setDirty',
        name: key,
        dirty: dirty !== false,
      });
    },
    [dispatch]
  );

  // The memoized "setError" function.
  const setError = useCallback(
    (nameOrPath: string | ((data: State) => unknown), error?: string | null) => {
      dispatch({
        type: 'setManualError',
        name: typeof nameOrPath === 'function' ? getPath(formState.data, nameOrPath) : nameOrPath,
        error: error ?? null,
      });
    },
    [formState.data, dispatch]
  );

  // The memoized "clearManualErrors" function.
  const clearManualErrors = useCallback(() => {
    dispatch({ type: 'clearManualErrors' });
  }, [dispatch]);

  const initialFormState = useMemo(
    () => ({
      data: Object.freeze(formState.initialData) as Immutable<State>,
      errors: Object.freeze(formState.initialErrors) as Immutable<
        Record<keyof State, string | undefined>
      >,
    }),
    [formState.initialData, formState.initialErrors]
  );

  const formData = useMemo(
    () =>
      Object.freeze({
        ...formState.data,
        toObject: () => cleanEmpty(schema, formState.data) as State,
      }) as FormState<State>['data'],
    [schema, formState.data]
  );

  // The memoized "errors" object of the form state.
  const formErrors = useMemo(
    () =>
      Object.freeze({
        ...formState.errors,
        get: (expression: (data: State) => unknown) =>
          getFieldError(formState.errors, getPath(formState.data, expression)),
        getManual: (key: string) => formState.errors[key as keyof State],
      }) as FormState<State>['errors'],
    [formState.data, formState.errors, getFieldError]
  );

  // The memoized "dirty" object of the form state.
  const dirty = useMemo(
    () =>
      Object.freeze({
        ...formState.dirty,
        get: (key: `#${string}`) => Boolean(formState.dirty[key as keyof State]),
      }) as FormState<State>['dirty'],
    [formState.dirty]
  );

  // The memoized "touched" object of the form state.
  const touched = useMemo(
    () =>
      Object.freeze({
        ...formState.touched,
        get: (expression: (data: State) => unknown) =>
          wasFieldTouched(formState.touched, getPath(formState.data, expression)),
      }) as FormState<State>['touched'],
    [formState.touched, formState.data, wasFieldTouched]
  );

  // The memoized "maxLengths" object of the form state.
  const maxLengths = useMemo(
    () =>
      Object.freeze({
        ...formState.maxLengths,
        get: (expression: (data: State) => unknown) =>
          getFieldMaxLength(formState.maxLengths, getPath(formState.data, expression)),
      }) as FormState<State>['maxLengths'],
    [formState.maxLengths, formState.data, getFieldMaxLength]
  );

  // The memoized "ranges" object of the form state.
  const ranges = useMemo(
    () =>
      Object.freeze({
        ...formState.ranges,
        get: (expression: (data: State) => unknown) =>
          getFieldRange(formState.ranges, getPath(formState.data, expression)),
      }) as FormState<State>['ranges'],
    [formState.data, formState.ranges, getFieldRange]
  );

  // The memoized "patterns" object of the form state.
  const patterns = useMemo(
    () =>
      Object.freeze({
        ...formState.patterns,
        get: (expression: (data: State) => unknown) =>
          getFieldPattern(formState.patterns, getPath(formState.data, expression)),
      }) as FormState<State>['patterns'],
    [formState.data, formState.patterns, getFieldPattern]
  );

  // The memoized "descriptions" object of the form state.
  const descriptions = useMemo(
    () =>
      Object.freeze({
        ...formState.descriptions,
        get: (expression: (data: State) => unknown) =>
          getFieldDescription(formState.descriptions, getPath(formState.data, expression)),
      }) as FormState<State>['descriptions'],
    [formState.data, formState.descriptions, getFieldDescription]
  );

  // The memoized Form component.
  const createComponent = useMemo(() => createFormComponent<T>(reset), [reset]);

  // The memoized "response" object that combines the state, form status, CSS classes, HTML element props and actions.
  const response = useMemo<FormStateResponse<T>>(
    () => ({
      initialState: initialFormState,
      formState: {
        data: formData,
        errors: formErrors,
        dirty,
        touched,
        maxLengths,
        ranges,
        patterns,
        descriptions,
      },
      formStatus,
      formClasses,
      formActions: {
        change,
        replace,
        touch,
        reset,
        validate,
        handleSubmit,
        setDirty,
        setError,
        clearManualErrors,
      },
      Form: createComponent,
    }),
    [
      initialFormState,
      formData,
      formErrors,
      dirty,
      touched,
      maxLengths,
      ranges,
      patterns,
      descriptions,
      formStatus,
      formClasses,
      change,
      replace,
      touch,
      reset,
      validate,
      handleSubmit,
      setDirty,
      setError,
      clearManualErrors,
      createComponent,
    ]
  );

  return response;
}
