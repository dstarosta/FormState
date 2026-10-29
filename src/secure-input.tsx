import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';

import { setFormData } from './helpers/element-values';
import { mergeRefs } from './helpers/ref-merge';
import { createSyntheticChangeEvent } from './helpers/synthetic-event';
import { useIsomorphicLayoutEffect } from './helpers/use-isomorphic-layout-effect';

/**
 * Secure input props.
 */
type SecureInputProps = Omit<
  React.ComponentPropsWithRef<'input'>,
  | 'onChange'
  | 'type'
  | 'value'
  | 'defaultValue'
  // Always set by the component so that the plaintext cannot leak (autofill, spellcheck,
  // clipboard, drag and drop, or a consumer's key handler).
  | 'autoComplete'
  | 'spellCheck'
  | 'onKeyDown'
  | 'onPaste'
  | 'onCopy'
  | 'onCut'
  | 'onDrop'
  | 'onDragStart'
> & {
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
};

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
  ref,
  ...props
}: Readonly<SecureInputProps>) {
  const inputRef = useRef<HTMLInputElement>(null);

  const setInputRef = useMemo(() => mergeRefs(inputRef, ref), [ref]);
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
  const callbacksRef = useRef({ onChange, onSecureChange });

  useIsomorphicLayoutEffect(() => {
    realValueRef.current = realValue;
    callbacksRef.current = { onChange, onSecureChange };
  });

  useIsomorphicLayoutEffect(() => {
    if (caretRef.current === null || !inputRef.current) {
      return;
    }

    inputRef.current.setSelectionRange(caretRef.current, caretRef.current);
    caretRef.current = null;
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

      callbacksRef.current.onChange?.(createSyntheticChangeEvent(nextMasked, name));
      callbacksRef.current.onSecureChange?.(nextReal);
    },
    [isControlled, name]
  );

  // Lets the DOM listeners below commit through the latest `commit` without re-subscribing.
  const commitLatest = useEffectEvent((nextReal: string, caret: number) => {
    commit(nextReal, caret);
  });

  useEffect(() => {
    const element = inputRef.current;

    // Unreachable guard needed for type safety
    /* v8 ignore if -- @preserve */
    if (!element) {
      return;
    }

    // IME composition updates cannot be cancelled and carry the whole composition so far, so they
    // are ignored and the final text is committed once on compositionend.
    let composition: { start: number; end: number } | null = null;

    const handleCompositionStart = () => {
      composition = { start: element.selectionStart ?? 0, end: element.selectionEnd ?? 0 };
    };

    const handleCompositionEnd = (event: CompositionEvent) => {
      const range = composition;
      composition = null;

      // Unreachable guard
      /* v8 ignore if -- @preserve */
      if (!range) {
        return;
      }

      const existingValue = realValueRef.current;

      // The browser wrote the composed plaintext into the DOM; mask it again right away.
      element.value = MASK_CHAR.repeat(existingValue.length);

      if (event.data) {
        commitLatest(
          spliceValue(existingValue, range.start, range.end, event.data),
          range.start + event.data.length
        );
      }
    };

    const handler = (event: InputEvent) => {
      if (composition && event.inputType === 'insertCompositionText') {
        return;
      }

      event.preventDefault();

      const existingValue = realValueRef.current;
      const start = element.selectionStart ?? 0;
      const end = element.selectionEnd ?? 0;
      const data = event.data ?? '';

      switch (event.inputType) {
        case 'insertText':
        case 'insertCompositionText':
        case 'insertFromDrop': {
          commitLatest(spliceValue(existingValue, start, end, data), start + data.length);
          break;
        }
        case 'deleteContentBackward': {
          if (start !== end) {
            commitLatest(spliceValue(existingValue, start, end), start);
          } else if (start > 0) {
            commitLatest(spliceValue(existingValue, start - 1, start), start - 1);
          }
          break;
        }
        case 'deleteContentForward': {
          if (start !== end) {
            commitLatest(spliceValue(existingValue, start, end), start);
          } else if (start < existingValue.length) {
            commitLatest(spliceValue(existingValue, start, start + 1), start);
          }
          break;
        }
        case 'deleteWordBackward':
        case 'deleteSoftLineBackward':
        case 'deleteHardLineBackward': {
          if (start === end) {
            commitLatest(existingValue.slice(end), 0);
          } else {
            commitLatest(spliceValue(existingValue, start, end), start);
          }
          break;
        }
        case 'deleteWordForward':
        case 'deleteSoftLineForward':
        case 'deleteHardLineForward': {
          commitLatest(
            start === end ? existingValue.slice(0, start) : spliceValue(existingValue, start, end),
            start
          );
          break;
        }
      }
    };

    element.addEventListener('beforeinput', handler);
    element.addEventListener('compositionstart', handleCompositionStart);
    element.addEventListener('compositionend', handleCompositionEnd);

    return () => {
      element.removeEventListener('beforeinput', handler);
      element.removeEventListener('compositionstart', handleCompositionStart);
      element.removeEventListener('compositionend', handleCompositionEnd);
    };
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (readOnly || disabled) {
      return;
    }

    if (event.nativeEvent.isComposing) {
      return;
    }

    const [start, end] = select();

    // Ctrl/Meta combos are reserved for shortcuts. The `!event.altKey` carve-out lets
    // Windows AltGr combos (ctrlKey + altKey) fall through to character insertion.
    if ((event.ctrlKey || event.metaKey) && !event.altKey) {
      // No undo/redo
      const key = event.key.toLowerCase();

      if (key === 'y' || key === 'z') {
        event.preventDefault();
      }

      return;
    }

    const existingValue = realValueRef.current;
    const hasSelection = start !== end;

    if (event.key === 'Backspace') {
      event.preventDefault();

      if (hasSelection) {
        commit(spliceValue(existingValue, start, end), start);
      } else if (start > 0) {
        commit(spliceValue(existingValue, start - 1, start), start - 1);
      }

      return;
    }

    if (event.key === 'Delete') {
      event.preventDefault();

      if (hasSelection) {
        commit(spliceValue(existingValue, start, end), start);
      } else if (start < existingValue.length) {
        commit(spliceValue(existingValue, start, start + 1), start);
      }

      return;
    }

    if (event.key.length !== 1) {
      return;
    }

    // Distinguish Mac Option-modified characters (event.code differs from event.key)
    // from Windows Alt-mnemonics (event.code base matches event.key).
    const codeChar = event.code.replace(/^(Key|Digit)/, '').toLowerCase();
    const isAltMnemonic = event.altKey && codeChar === event.key.toLowerCase();

    if (isAltMnemonic) {
      return;
    }

    event.preventDefault();
    commit(spliceValue(existingValue, start, end, event.key), start + 1);
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

    try {
      event.clipboardData.setData('text/plain', '');
    } catch {
      /* empty */
    }
  };

  const handleDrag = (event: React.DragEvent<HTMLInputElement>) => {
    event.preventDefault();
  };

  return (
    <input
      {...props}
      ref={setInputRef}
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
