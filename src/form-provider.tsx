import {
  createContext,
  use,
  type ComponentType,
  type Context,
  type PropsWithChildren,
} from 'react';
import * as z from 'zod/mini';

import type { FormProviderInitOptions, FormStateResponse } from './types/form-types';

import { useFormState } from './use-form-state';

// Allows a separate context per schema that are garbage collected when the schema goes out of scope.
const schemaToContext = new WeakMap<
  z.ZodMiniObject,
  Context<FormStateResponse<z.ZodMiniObject> | null>
>();

/**
 * Context provider to manage form state.
 *
 * @typeParam T - type of the form data.
 * @param props - Provider props.
 * @returns A form state provider.
 */
export function FormStateProvider<T extends z.ZodMiniObject>(
  props: Readonly<PropsWithChildren<FormProviderInitOptions<T>>>
) {
  const { schema, children, ...formOptions } = props;
  const form = useFormState(schema, formOptions);

  let context = schemaToContext.get(schema);

  if (!context) {
    context = createContext<FormStateResponse<T> | null>(null);
    schemaToContext.set(schema, context);
  }

  return <context.Provider value={form}>{children}</context.Provider>;
}

/**
 * Hook that manages form state inside React components that are, or have a parent component,
 * wrapped with the formConnect HOC.
 *
 * @example
 * const { formState, formStatus, formActions } = useFormStateContext(schema)
 *
 * @typeParam T - type of the form data.
 * @param schema - Zod schema to validate the form data.
 * @returns An object containing form state, status, actions, form HTML element props and state related CSS classes.
 */
export function useFormStateContext<T extends z.ZodMiniObject>(schema: T) {
  const context = schemaToContext.get(schema);

  if (context) {
    // The `use` hook can be used conditionally.
    const value = use(context as Context<FormStateResponse<T> | null>);

    if (value) {
      return value;
    }
  }

  throw new Error(
    'useFormStateContext must be used within a FormStateProvider with the provided schema.'
  );
}

/**
 * HOC that wraps a React component with the form state context provider and initializes the state
 * based on the provided schema.
 *
 * @example
 * function EditForm() {
 *   const { formState, formActions, Form } = useFormStateContext(schema);
 *
 *   return (
 *     <Form>
 *       <input
 *          type="text"
 *          name="name"
 *          defaultValue={formState.data.name}
 *          onChange={(event) => formActions.change('name', event.target.value, { touch: true })} />
 *     </Form>
 *   );
 * }
 *
 * export default formConnect({ schema: formSchema, watch: true })(EditForm);
 *
 * @param options - Form initialization options.
 * @param options.schema - Zod schema to validate the form data.
 * @param options.initialData - An optional object with schema properties to set the initial data of the form.
 *                              This object can be used for asynchronous form initialization, otherwise, specify
 *                              the default data in the schema.
 * @param options.initialTouched - An optional array of root level field names or state path expressions that
 *                               will be marked as touched when the form is initialized.
 * @param options.resetTouchedOnFormReset - Reset the "touch" field status after the form has been reset
 *                                          (default: `true`).
 * @param options.validateBeforeSubmit - Validate the schema before submission on "change", "touch", "replace" or
 *                                       "setError"/"clearManualErrors" form actions (default: `true`);
 * @param options.validateOnMount - Validate the schema after the form mounts with the initial values (default: `false`).
 * @param options.validateOnChange - Validate the form, by default, after a `change` action. (default: `true`).
 * @param options.validateOnTouch - Validate the form, by default, after a `touch` action (default: `true`).
 * @param options.debounceCacheCapacity - Sets the capacity of the debounce callback cache used by the "change"
 *                                        function. (default: 50). A non-positive value means no debouncing of
 *                                        change callbacks is allowed.
 * @param options.watch - Sets a value indicating whether the `useWatch` hook should be enabled (default: `false`).
 * @param options.inferredNameFormat - Sets the default format for the `inferName` function (default: "bracket").
 * @param options.errorMessageSeparator - Sets the default error message separator when multiple errors occur for the
 *                                        same state property (default: "|").
 * @param options.cssOptions - Form-level defaults for `formClasses`.
 *
 * @returns A curried function to wrap the component.
 */
export function formConnect<T extends z.ZodMiniObject>(options: FormProviderInitOptions<T>) {
  /**
   * Wrap the provided React component.
   *
   * @typeParam P - component props type.
   * @returns The wrapped component.
   */
  function wrapComponent<P>(Component: ComponentType<P>) {
    const ComponentWithFormState = (innerProps: Readonly<P>) => (
      <FormStateProvider {...options}>
        <Component {...innerProps} />
      </FormStateProvider>
    );

    ComponentWithFormState.displayName = `formConnected(${
      Component.displayName || Component.name
    })`;

    return ComponentWithFormState;
  }

  return wrapComponent;
}
