import { type SyntheticEvent } from 'react';
import * as z from 'zod/v4';

import type { FormResetOptions } from '../form-types';

/**
 * 'form' HTML element props that disable native behavior such as browser
 * form validation and submitting forms with a single input when pressing the
 * Enter key.
 *
 * They provide consistent behavior to forms submitted using the "action" prop.
 */
const formProps: React.ComponentPropsWithoutRef<'form'> = {
  noValidate: true,
  onKeyDown: (event: React.KeyboardEvent) => {
    if (
      event.key === 'Enter' &&
      event.target instanceof HTMLInputElement &&
      !event.target.onkeydown
    ) {
      const element = event.target;
      const isHidden =
        !element?.offsetParent ||
        element.getAttribute('aria-hidden') === 'true' ||
        globalThis?.getComputedStyle(element).display === 'none' ||
        globalThis?.getComputedStyle(element).visibility === 'hidden';
      if (!isHidden) {
        event.preventDefault();
      }
    }
  },
};

/**
 * Creates a Form.
 *
 * @typeParam T type of the form data.
 * @param reset - The form reset method from the hook.
 */
export const createFormComponent = <T extends z.ZodObject>(
  reset: (event?: SyntheticEvent<HTMLFormElement> | null, options?: FormResetOptions<T>) => void
) => {
  /**
   * The Form component with pre-wired reset logic.
   */
  function Form(props: React.ComponentPropsWithRef<'form'>) {
    return <form onReset={reset} {...formProps} {...props} />;
  }

  return Form;
};
