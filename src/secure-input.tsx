import { useCallback, useEffect, useRef, useState } from 'react';

import { setFormData } from './helpers/form-builder';
import { useIsomorphicLayoutEffect } from './helpers/use-isomorphic-layout-effect';

interface SecureInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'onChange' | 'type' | 'value' | 'defaultValue'
> {
  /**
   * Visual rendering of the input. `'text'` shows the bullet mask in the
   * DOM; `'password'` lets the browser apply its own password-style mask
   * on top. Defaults to `'text'`.
   */
  type?: 'text' | 'password';
  /**
   * Controlled value — the real plaintext. Never appears in the DOM; it is
   * mirrored visually as bullets of equal length.
   */
  value?: string;
  /**
   * Initial plaintext value for uncontrolled usage.
   */
  defaultValue?: string;
  /**
   * Fires on every edit with a synthetic event whose `target.value` is the
   * masked bullet string. Use {@link onSecureChange} to receive the real
   * plaintext.
   */
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  /**
   * Fires on every edit with the real plaintext value. Wire this to your
   * form state — the DOM never sees the plaintext, so neither does the
   * standard `onChange`.
   */
  onSecureChange?: (value: string) => void;
  /**
   * Fires on blur with the real plaintext value. Useful for `touch`-on-blur
   * form-state patterns where you want to mark the field touched alongside
   * the latest value.
   */
  onSecureBlur?: (value: string) => void;
}

const MASK_CHAR = '•';

const spliceValue = (value: string, start: number, end: number, insert = '') =>
  value.slice(0, start) + insert + value.slice(end);

/**
 * Secure input component that simulates a password input but does not
 * store its value inside DOM for additional security.
 *
 * `onSecureChange` and `onSecureBlur` props can be used to control the form
 * state along with `value` and `defaultValue` input props.
 *
 * @param props - see: {@link React.InputHTMLAttributes | InputHTMLAttributes}
 *
 * Additional props:
 *   - `onSecureChange?: (value) => void`
 *   - `onSecureBlur?: (value) =>  void`
 *
 * @returns The component instance.
 */
export function SecureInput({
  type = 'text',
  defaultValue = '',
  value,
  onChange,
  onSecureChange,
  onSecureBlur,
  onBlur,
  name,
  readOnly,
  disabled,
  ...props
}: Readonly<SecureInputProps>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const caretRef = useRef<number | null>(null);

  const [internalValue, setInternalValue] = useState(defaultValue);
  const [prevDefault, setPrevDefault] = useState(defaultValue);

  const isControlled = value !== undefined;

  if (!isControlled && prevDefault !== defaultValue) {
    setPrevDefault(defaultValue);
    setInternalValue(defaultValue);
  }

  useIsomorphicLayoutEffect(() => {
    if (!isControlled) {
      caretRef.current = null;
    }
  }, [defaultValue, isControlled]);

  const realValue = isControlled ? value : internalValue;
  const maskedValue = MASK_CHAR.repeat(realValue.length);

  useEffect(() => {
    if (inputRef.current) {
      setFormData(inputRef.current, realValue);
    }
  }, [realValue]);

  const realValueRef = useRef(realValue);
  const callbacksRef = useRef({ onChange, onSecureChange, onSecureBlur, onBlur });

  useIsomorphicLayoutEffect(() => {
    realValueRef.current = realValue;
    callbacksRef.current = { onChange, onSecureChange, onSecureBlur, onBlur };
  });

  useIsomorphicLayoutEffect(() => {
    if (caretRef.current !== null && inputRef.current) {
      inputRef.current.setSelectionRange(caretRef.current, caretRef.current);
      caretRef.current = null;
    }
  });

  const select = (): [number, number] => {
    const element = inputRef.current;
    return element ? [element.selectionStart ?? 0, element.selectionEnd ?? 0] : [0, 0];
  };

  const commit = useCallback(
    (nextReal: string, caret: number) => {
      if (!isControlled) {
        setInternalValue(nextReal);
      }

      caretRef.current = caret;

      const nextMasked = MASK_CHAR.repeat(nextReal.length);

      callbacksRef.current.onChange?.({
        target: { value: nextMasked, name } as EventTarget & HTMLInputElement,
        currentTarget: { value: nextMasked, name } as EventTarget & HTMLInputElement,
        nativeEvent: new Event('change'),
        type: 'change',
        bubbles: true,
        preventDefault: () => {},
        stopPropagation: () => {},
        persist: () => {},
        isDefaultPrevented: () => false,
        isPropagationStopped: () => false,
      } as React.ChangeEvent<HTMLInputElement>);
      callbacksRef.current.onSecureChange?.(nextReal);
    },
    [isControlled, name]
  );

  useEffect(() => {
    const element = inputRef.current as HTMLInputElement;

    const handler = (event: InputEvent) => {
      event.preventDefault();

      const existingValue = realValueRef.current;
      const start = element.selectionStart ?? 0;
      const end = element.selectionEnd ?? 0;
      const data = event.data ?? '';

      switch (event.inputType) {
        case 'insertText':
        case 'insertCompositionText':
        case 'insertFromDrop': {
          commit(
            existingValue.slice(0, start) + data + existingValue.slice(end),
            start + data.length
          );
          break;
        }
        case 'deleteContentBackward': {
          if (start !== end) {
            commit(existingValue.slice(0, start) + existingValue.slice(end), start);
          } else if (start > 0) {
            commit(existingValue.slice(0, start - 1) + existingValue.slice(start), start - 1);
          }
          break;
        }
        case 'deleteContentForward': {
          if (start !== end) {
            commit(existingValue.slice(0, start) + existingValue.slice(end), start);
          } else if (start < existingValue.length) {
            commit(existingValue.slice(0, start) + existingValue.slice(start + 1), start);
          }
          break;
        }
        case 'deleteWordBackward':
        case 'deleteSoftLineBackward':
        case 'deleteHardLineBackward': {
          if (start === end) {
            commit(existingValue.slice(end), 0);
          } else {
            commit(existingValue.slice(0, start) + existingValue.slice(end), start);
          }
          break;
        }
        case 'deleteWordForward':
        case 'deleteSoftLineForward':
        case 'deleteHardLineForward': {
          if (start === end) {
            commit(existingValue.slice(0, start), start);
          } else {
            commit(existingValue.slice(0, start) + existingValue.slice(end), start);
          }
          break;
        }
      }
    };

    element.addEventListener('beforeinput', handler);

    return () => {
      element.removeEventListener('beforeinput', handler);
    };
  }, [commit]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (readOnly || disabled) {
      return;
    }

    if (event.nativeEvent.isComposing) {
      return;
    }

    const [start, end] = select();

    const hasSelection = start !== end;

    if (event.ctrlKey || event.metaKey) {
      // No undo/redo
      if (event.key === 'y' || event.key === 'z') {
        event.preventDefault();
      }

      return;
    }

    if (event.key === 'Backspace') {
      event.preventDefault();

      if (hasSelection) {
        commit(spliceValue(realValue, start, end), start);
      } else if (start > 0) {
        commit(spliceValue(realValue, start - 1, start), start - 1);
      }

      return;
    }

    if (event.key === 'Delete') {
      event.preventDefault();

      if (hasSelection) {
        commit(spliceValue(realValue, start, end), start);
      } else if (start < realValue.length) {
        commit(spliceValue(realValue, start, start + 1), start);
      }

      return;
    }

    if (event.key.length === 1 && !event.altKey) {
      event.preventDefault();
      commit(spliceValue(realValue, start, end, event.key), start + 1);
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();

    if (readOnly || disabled) {
      return;
    }

    const text = event.clipboardData.getData('text/plain');

    if (!text) {
      return;
    }

    const [start, end] = select();
    commit(spliceValue(realValue, start, end, text), start + text.length);
  };

  const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    onBlur?.(event);
    onSecureBlur?.(realValue);
  };

  const handleCopyOrCut = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
  };

  const handleDrag = (event: React.DragEvent<HTMLInputElement>) => {
    event.preventDefault();
  };

  return (
    <input
      {...props}
      ref={inputRef}
      name={name}
      type={type}
      readOnly={readOnly}
      disabled={disabled}
      autoComplete="off"
      spellCheck={false}
      data-1p-ignore="true"
      data-lpignore="true"
      value={maskedValue}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      onCopy={handleCopyOrCut}
      onCut={handleCopyOrCut}
      onBlur={handleBlur}
      onChange={() => {}}
      onDrop={handleDrag}
      onDragStart={handleDrag}
    />
  );
}
