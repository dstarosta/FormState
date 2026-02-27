import { createContext, use, type ComponentType, type Context, type PropsWithChildren } from 'react';
import * as z from 'zod';

import type { DeepPartial, FormOptions, FormPath, FormStateResponse } from './types/form-types';

import { useFormState } from './use-form-state';

// Allows a separate context per schema that are garbage collected when the schema goes out of scope.
const schemaToContext = new WeakMap<z.ZodObject, Context<FormStateResponse<z.ZodObject> | null>>();

type FormStateProviderProps<T extends z.ZodObject> = {
  schema: T;
  initialState?: DeepPartial<z.output<T>>;
  initialTouched?: FormPath<T>[];
  validateOnInit?: boolean;
  watch?: boolean;
};

/**
 * Context provider to manage form state.
 *
 * @typeParam T type of the form data.
 * @param options.schema - Zod schema to validate the form data.
 * @param options.initialState - An optional object with schema properties to set the initial state of the form.
 *                               This object should be used for asynchronous form initialization, otherwise, specify
 *                               the initial state in the schema.
 * @param options.validateOnInit - Validate the schema with the initial values (default: false).
 * @param options.children - Optional child components.
 * @param options.watch - Sets a value indicating whether the `useWatch` hook should be enabled (default: false).
 * @returns The form state provider.
 */
export function FormStateProvider<T extends z.ZodObject>({
  schema,
  initialState,
  initialTouched,
  validateOnInit,
  watch,
  children,
}: Readonly<PropsWithChildren<FormStateProviderProps<T>>>) {
  const formOptions = {
    initialState,
    initialTouched,
    validateOnInit,
    watch
  } as FormOptions<T>;

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
 * @typeParam T type of the form data.
 * @param schema - Zod schema to validate the form data.
 * @returns An object containing form state, status, actions, form HTML element props and state related CSS classes.
 */
export function useFormStateContext<T extends z.ZodObject>(schema: T) {
  if (!schema) {
    throw new TypeError('No valid schema was provided.');
  }

  const context = schemaToContext.get(schema);

  if (context) {
    // The `use` hook can be used conditionally.
    const usableContext = use(context as Context<FormStateResponse<T>>);

    if (usableContext) {
      return usableContext;
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
 * @param options.schema - Zod schema to validate the form data.
 * @param options.initialState - An optional object with schema properties to set the initial state of the form.
 *                               This object should be used for asynchronous form initialization, otherwise, specify
 *                               the initial state in the schema.
 * @param options.validateOnInit - Validate the schema with the initial values (default: false).
 * @param options.watch - Sets a value indicating whether the `useWatch` hook should be enabled (default: false).
 *
 * @returns A curried function to wrap the component.
 */
export function formConnect<T extends z.ZodObject>(
  props: FormStateProviderProps<T>
) {
  /**
   * Wrap the provided React component.
   *
   * @typeparam P component props type.
   * @returns The wrapped component.
   */
  function wrapComponent<P>(Component: ComponentType<P>) {
    const ComponentWithFormState = (innerProps: Readonly<P>) => (
      <FormStateProvider {...props}>
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
