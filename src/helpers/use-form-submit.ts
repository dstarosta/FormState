import { startTransition, useCallback, type RefObject } from 'react';
import type * as z from 'zod/mini';

import type {
  AsyncCheckMetaMap,
  FormAction,
  FormMutableState,
  FormSubmitHandler,
  FormSubmitOptions,
  StateCallback,
  SubmitState,
} from '../types/form-types';
import { formatErrors } from './error-formatter';
import { runSubmitPhaseParse } from './schema-visitor';
import {
  cleanEmpty,
  createImmutableData,
  createImmutableErrors,
  mergeAsyncErrors,
} from './state-manager';

// The `handleSubmit` form handler: validates (including async checks), calls `onSubmit` and
// applies its result to the data that was sent.
export function useFormSubmit<T extends z.ZodMiniObject>({
  schema,
  formStateRef,
  dispatch,
  asyncMetaMap,
  errorMessageSeparator,
  fireAsyncListenerEvent,
  setIsSubmitting,
  inFlightSubmitRef,
  changeCallbackRefs,
  lastSubmittedFormData,
}: {
  schema: T;
  formStateRef: RefObject<FormMutableState<z.infer<T>>>;
  dispatch: (action: FormAction<z.infer<T>>) => void;
  asyncMetaMap: AsyncCheckMetaMap;
  errorMessageSeparator: string;
  fireAsyncListenerEvent: (
    type: 'asyncValidating' | 'asyncValidated',
    paths: readonly string[]
  ) => void;
  setIsSubmitting: (isSubmitting: boolean) => void;
  inFlightSubmitRef: RefObject<boolean>;
  changeCallbackRefs: RefObject<StateCallback<z.infer<T>>[]>;
  lastSubmittedFormData: RefObject<FormData | undefined>;
}) {
  type State = z.infer<T>;

  // The memoized "handleSubmit" function.
  const handleSubmit = useCallback(
    (onSubmit: FormSubmitHandler<T>, options?: FormSubmitOptions<T>) => {
      return async (submittedFormData: FormData) => {
        if (inFlightSubmitRef.current) {
          return;
        }

        inFlightSubmitRef.current = true;

        try {
          const currentState = formStateRef.current;
          const requestId = currentState.asyncRequestId;

          let activePaths: readonly string[] = [];
          let errors: Record<keyof State | '', string | undefined>;

          try {
            const parsed = await runSubmitPhaseParse(
              schema,
              currentState.data,
              asyncMetaMap,
              (collected) => {
                activePaths = collected;
                fireAsyncListenerEvent('asyncValidating', collected);
              }
            );
            activePaths = parsed.activePaths;
            errors = formatErrors<State>(parsed.result.error, errorMessageSeparator);
          } catch (error: unknown) {
            const message =
              error instanceof Error && error.message ? error.message : 'Async validation failed.';
            errors = { '': message } as Record<keyof State | '', string | undefined>;
          }

          // Close the submit-phase asyncValidating event even when a change superseded this run.
          fireAsyncListenerEvent('asyncValidated', activePaths);

          if (requestId !== formStateRef.current.asyncRequestId) {
            return;
          }

          const mergedAsyncErrors = mergeAsyncErrors(
            formStateRef.current.asyncErrors,
            errors,
            activePaths
          );

          const submittedErrors = {
            ...errors,
            ...mergedAsyncErrors,
            ...formStateRef.current.manualErrors,
          };
          const hasErrors = Object.keys(submittedErrors).length > 0;

          const submitState: SubmitState<State> = hasErrors
            ? {
                valid: false,
                errors: createImmutableErrors<T>(submittedErrors, errorMessageSeparator),
              }
            : {
                valid: true,
                data: cleanEmpty(schema, currentState.data) as State,
              };

          startTransition(() => {
            setIsSubmitting(true);
          });

          const submissionErrors = await onSubmit(submitState, submittedFormData);

          // Edits made while `onSubmit` was pending are kept (and stay dirty/validating); the
          // submit result is applied to the data that was actually sent.
          const superseded = formStateRef.current.data !== currentState.data;

          if (
            hasErrors ||
            (submissionErrors !== true && Object.keys(submissionErrors).length > 0)
          ) {
            if (typeof options?.onError === 'function') {
              changeCallbackRefs.current.push(options.onError);
            }

            const manualErrors: Record<string, string> = {};

            if (typeof submissionErrors === 'object') {
              for (const errorName in submissionErrors) {
                if (Object.hasOwn(submissionErrors, errorName)) {
                  const error = submissionErrors[errorName];

                  if (error) {
                    manualErrors[errorName] = error;
                  }
                }
              }
            }

            dispatch({
              type: 'submitValidate',
              asyncErrors: mergedAsyncErrors,
              manualErrors: manualErrors,
              freshErrors: errors,
              superseded,
            });
            return;
          }

          if (typeof options?.onSuccess === 'function') {
            changeCallbackRefs.current.push(() => {
              options.onSuccess?.({
                data: cleanEmpty(schema, currentState.data) as State,
                formData: submittedFormData,
              });
            });
          }

          lastSubmittedFormData.current = submittedFormData;

          dispatch({
            type: 'submit',
            data: currentState.data,
            submittedData: {
              data: createImmutableData(currentState.data),
              formData: submittedFormData,
            },
            asyncErrors: mergedAsyncErrors,
            freshErrors: errors,
            superseded,
            options: {
              resetDirty: options?.resetDirty !== false,
              resetTouched: options?.resetTouched !== false,
              updateInitialData: options?.updateInitialData !== false,
            },
          });
        } finally {
          // This ref is just a guard against multiple submits.
          // eslint-disable-next-line require-atomic-updates
          inFlightSubmitRef.current = false;
        }
      };
    },
    [
      schema,
      formStateRef,
      inFlightSubmitRef,
      changeCallbackRefs,
      lastSubmittedFormData,
      errorMessageSeparator,
      setIsSubmitting,
      dispatch,
      fireAsyncListenerEvent,
      asyncMetaMap,
    ]
  );

  return handleSubmit;
}
