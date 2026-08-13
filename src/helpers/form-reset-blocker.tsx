import { useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';

import type { FormResetBlockerProps } from '../types/form-types';
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect';

/**
 * A component to put inside a form element that has a function called from the `action` attribute
 * to avoid versions React 19.3+ from resetting the form after submitting the data.
 */
export function FormResetBlocker({ formRef }: FormResetBlockerProps) {
  const innerRef = useRef<HTMLDivElement>(null);

  const { pending } = useFormStatus();
  const pendingRef = useRef(pending);

  useIsomorphicLayoutEffect(() => {
    pendingRef.current = pending;
  });

  useEffect(() => {
    const form = formRef?.current ?? innerRef.current?.closest('form');

    if (!form) {
      return;
    }

    const blockReset = (event: Event) => {
      if (!pendingRef.current) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
    };

    form.addEventListener('reset', blockReset, { capture: true });

    return () => {
      form.removeEventListener('reset', blockReset, { capture: true });
    };
  }, [formRef]);

  if (formRef) {
    return null;
  }

  return <div ref={innerRef} hidden data-resethandler></div>;
}
