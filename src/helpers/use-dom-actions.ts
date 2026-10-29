import { useCallback, type RefObject } from 'react';
import type * as z from 'zod/mini';

import type { ElementFocusOptions, FormClassOptions, FormMutableState } from '../types/form-types';
import { getPath } from './schema-visitor';

// The `blur`, `focus` and `focusOnFirstError` form actions.
export function useDomActions<T extends z.ZodMiniObject>(
  formElementRef: RefObject<HTMLFormElement | null>,
  formStateRef: RefObject<FormMutableState<z.infer<T>>>,
  cssPrefix: FormClassOptions['prefix']
) {
  type State = z.infer<T>;

  // Resolves an element within the captured form scope, falling back to the first
  // form in the document if no form has been captured yet.
  const queryWithinForm = useCallback(
    (selector: string) => {
      const form = formElementRef.current;
      return form?.isConnected
        ? form.querySelector<HTMLElement>(selector)
        : document.querySelector<HTMLElement>(`form ${selector}`);
    },
    [formElementRef]
  );

  // Blurs the actively focused element.
  const blur = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, []);

  // Sets focus on an element
  const focus = useCallback(
    (elementOrName: HTMLElement | string | null, options?: ElementFocusOptions<T>) => {
      const element =
        typeof elementOrName === 'string'
          ? queryWithinForm(`[name="${elementOrName.trim()}"]`)
          : elementOrName;

      if (!element) {
        return;
      }

      if (options?.errorKey) {
        const key =
          typeof options.errorKey === 'function'
            ? getPath(formStateRef.current.data, options.errorKey).join('.')
            : String(options.errorKey);

        if (!formStateRef.current.errors[key as keyof State]) {
          return;
        }
      }

      element.focus({
        focusVisible: options?.focusVisible !== false,
        preventScroll: options?.preventScroll === true,
      });

      if (options?.selectText && element instanceof HTMLInputElement) {
        element.select();
      }
    },
    [formStateRef, queryWithinForm]
  );

  // Focuses the first input or textarea in the form with the error CSS class.
  const focusOnFirstError = useCallback(
    (options?: Omit<ElementFocusOptions<T>, 'errorKey'>) => {
      const prefix = cssPrefix === null ? null : cssPrefix?.trim() || 'form-state';

      const doFocus = () => {
        let element: HTMLElement | null = null;

        if (prefix) {
          const errorClass = `${prefix}__error`;
          element = queryWithinForm(`input.${errorClass}, textarea.${errorClass}`);
        } else {
          const errors = formStateRef.current.errors;

          for (const key in errors) {
            if (key && errors[key as keyof State]) {
              const candidate = queryWithinForm(`input[name="${key}"], textarea[name="${key}"]`);

              if (candidate) {
                element = candidate;
                break;
              }
            }
          }
        }

        if (!element) {
          return;
        }

        element.focus({
          focusVisible: options?.focusVisible !== false,
          preventScroll: options?.preventScroll === true,
        });

        if (options?.selectText && element instanceof HTMLInputElement) {
          element.select();
        }
      };

      requestAnimationFrame(() => {
        doFocus();
      });
    },
    [cssPrefix, formStateRef, queryWithinForm]
  );

  return { blur, focus, focusOnFirstError };
}
