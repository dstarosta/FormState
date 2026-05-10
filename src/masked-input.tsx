import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { mergeRefs } from './helpers/ref-merge';
import { useIsomorphicLayoutEffect } from './helpers/use-isomorphic-layout-effect';

const TOKEN_PATTERNS: Record<string, RegExp> = {
  '9': /\d/,
  a: /[A-Za-z]/,
  '*': /[\dA-Za-z]/,
};

/**
 * `React.FocusEvent` augmented with a {@link MaskedFocusEvent.complete}
 * flag and an {@link MaskedFocusEvent.unmaskedValue} string carrying just
 * the user-entered characters.
 */
export interface MaskedFocusEvent extends React.FocusEvent<HTMLInputElement> {
  /**
   * `true` if every required mask slot in the mask is filled. otherwise `false`.
   * Optional slots can be unfilled.
   */
  complete: boolean;
  /**
   * The user-entered characters concatenated in order, with all literals
   * and unfilled slot placeholders stripped. For mask `"(999) 999-9999"`
   * and value `"(555) 123-____"`, this is `"555123"`.
   */
  unmaskedValue: string;
}

/**
 * `React.ChangeEvent` augmented with a {@link MaskedChangeEvent.complete}
 * flag and an {@link MaskedChangeEvent.unmaskedValue} string carrying just
 * the user-entered characters.
 */
export interface MaskedChangeEvent extends React.ChangeEvent<HTMLInputElement> {
  /**
   * `true` if every required slot in the mask is filled. otherwise `false`.
   * Optional slots can be unfilled.
   */
  complete: boolean;
  /**
   * The user-entered characters concatenated in order, with all literals
   * and unfilled slot placeholders stripped. For mask `"(999) 999-9999"`
   * and value `"(555) 123-____"`, this is `"555123"`.
   */
  unmaskedValue: string;
}

interface MaskedInputProps extends Omit<
  React.ComponentPropsWithRef<'input'>,
  'onBlur' | 'onChange' | 'type' | 'value' | 'defaultValue' | 'placeholder'
> {
  /**
   * Mask pattern. Tokens accept user input — `9` (digit), `a` (letter),
   * `*` (alphanumeric). `?` marks every following position as optional.
   * Any other character is a literal that is rendered as-is and skipped
   * over while typing (parentheses, dashes, slashes, dots, commas, colons,
   * spaces, ...).
   *
   * Examples: `(999) 999-9999`, `99/99/9999`, `aaa-9999`,
   * `(999) 999-9999? x99999`.
   */
  mask: string;
  /**
   * Native input type. Constrained to types compatible with the mask —
   * `text` (default) or `search` (adds the browser clear button). Other
   * types like `number`/`email`/`date` would either strip mask literals or
   * apply conflicting validation.
   */
  type?: 'text' | 'search';
  /**
   * Fill character used at unfilled slot positions when `placeholder` is
   * not supplied (or is shorter than the rendered mask). Defaults to `'_'`.
   * Use `' '` to keep the mask invisible until the user types into it
   * while still reserving the layout.
   */
  placeholderChar?: '_' | ' ';
  /**
   * Per-position fill characters shown at unfilled slots. Aligns with the
   * rendered mask (`?` markers stripped). Literal positions are ignored —
   * the mask's literal always wins. Slot positions not covered by the
   * placeholder fall back to `placeholderChar`.
   */
  placeholder?: string;
  /**
   * Controlled value — the formatted mask string with placeholder characters
   * at unfilled slots. The empty mask (e.g. `"___-____"`) and `""` are
   * equivalent and both indicate an untouched field.
   */
  value?: string;
  /**
   * Initial value for uncontrolled usage. Same format as {@link value}.
   */
  defaultValue?: string;
  /**
   * Fires when the control loses focus. The event's `target.value` is
   * the formatted mask (or `""` when no slot is filled).
   * `event.unmaskedValue` is the raw user-entered characters in order.
   * `event.complete` is `true` if all the required mask slots are
   * filled.
   */
  onBlur?: (event: MaskedFocusEvent) => void;
  /**
   * Fires on every edit. The event's `target.value` is the formatted mask
   * (or `""` when no slot is filled). `event.unmaskedValue` is the raw
   * user-entered characters in order. `event.complete` is `true` if all
   * the required mask slots are filled.
   */
  onChange?: (event: MaskedChangeEvent) => void;
}

interface MaskPosition {
  isSlot: boolean;
  pattern: RegExp | null;
  literal: string | null;
  placeholderChar: string;
  optional: boolean;
}

interface MaskInfo {
  positions: MaskPosition[];
  length: number;
  empty: string;
}

type Slots = (string | null)[];

const buildMaskInfo = (
  mask: string,
  placeholderChar: string,
  placeholder: string | undefined
): MaskInfo => {
  const positions: MaskPosition[] = [];
  let optional = false;

  for (const ch of mask) {
    if (ch === '?') {
      optional = true;
      continue;
    }

    const tokenPattern = TOKEN_PATTERNS[ch];

    positions.push(
      tokenPattern
        ? {
            isSlot: true,
            pattern: tokenPattern,
            literal: null,
            placeholderChar: placeholder?.charAt(positions.length) || placeholderChar,
            optional,
          }
        : { isSlot: false, pattern: null, literal: ch, placeholderChar: ch, optional }
    );
  }

  const empty = positions
    .map((pos) => (pos.isSlot ? pos.placeholderChar : (pos.literal ?? '')))
    .join('');

  return { positions, length: positions.length, empty };
};

const formatSlots = (slots: Slots, info: MaskInfo) =>
  info.positions
    .map((pos, i) => (pos.isSlot ? (slots[i] ?? pos.placeholderChar) : (pos.literal ?? '')))
    .join('');

const slotsAreComplete = (slots: Slots, info: MaskInfo) =>
  info.positions.every((pos, i) => !pos.isSlot || pos.optional || slots[i] !== null);

const slotsEqual = (a: Slots, b: Slots) => a.length === b.length && a.every((ch, i) => ch === b[i]);

const parseFormatted = (formatted: string, info: MaskInfo) => {
  const slots: Slots = info.positions.map(() => null);
  if (!formatted) {
    return slots;
  }

  let pos = 0;
  for (let i = 0; i < info.length && pos < formatted.length; i++) {
    const position = info.positions[i];
    // Unreachable guard needed for type safety
    /* v8 ignore if -- @preserve */
    if (!position) {
      break;
    }
    if (position.isSlot) {
      const ch = formatted.charAt(pos);
      if (ch !== position.placeholderChar && position.pattern?.test(ch)) {
        slots[i] = ch;
      }
      pos++;
    } else if (formatted.charAt(pos) === position.literal) {
      pos++;
    }
  }
  return slots;
};

const nextSlotIndex = (info: MaskInfo, from: number) =>
  info.positions.findIndex((pos, i) => i >= from && pos.isSlot);

const prevSlotIndex = (info: MaskInfo, from: number) => {
  for (let i = Math.min(info.length - 1, from); i >= 0; i--) {
    if (info.positions[i]?.isSlot) {
      return i;
    }
  }
  return -1;
};

const insertChars = (
  slots: Slots,
  info: MaskInfo,
  start: number,
  end: number,
  data: string
): { slots: Slots; caret: number } => {
  const next = [...slots];
  for (let i = start; i < end && i < info.length; i++) {
    if (info.positions[i]?.isSlot) {
      next[i] = null;
    }
  }

  let caret = start;
  for (const ch of data) {
    const slotIdx = nextSlotIndex(info, caret);
    if (slotIdx === -1) {
      break;
    }
    if (info.positions[slotIdx]?.pattern?.test(ch)) {
      next[slotIdx] = ch;
      caret = slotIdx + 1;
    }
  }
  return { slots: next, caret };
};

const clearRange = (slots: Slots, info: MaskInfo, start: number, end: number) => {
  const next = [...slots];
  for (let i = start; i < end && i < info.length; i++) {
    if (info.positions[i]?.isSlot) {
      next[i] = null;
    }
  }
  return next;
};

const remapSlots = (prev: Slots, info: MaskInfo) => {
  const userChars = prev.filter((ch): ch is string => ch !== null);
  const next: Slots = info.positions.map(() => null);
  let charIdx = 0;
  for (let i = 0; i < info.length; i++) {
    const pos = info.positions[i];
    if (!pos?.isSlot) {
      continue;
    }
    while (charIdx < userChars.length) {
      const ch = userChars[charIdx++];
      if (ch !== undefined && pos.pattern?.test(ch)) {
        next[i] = ch;
        break;
      }
    }
  }
  return next;
};

/**
 * Masked input component. Restricts user input to a fixed pattern of slots
 * and literal characters and always renders the full mask in place.
 *
 * The `mask` prop defines the structure with token characters:
 *   - `9` matches a single digit
 *   - `a` matches a single letter
 *   - `*` matches a single alphanumeric character
 *   - `?` marks every following position as optional — they accept input
 *     but are not required for `event.complete` to be `true`
 *
 * Anything else in the mask (parentheses, dashes, slashes, dots, commas,
 * colons, spaces, ...) is treated as a literal and rendered as-is.
 *
 * The `placeholder` prop defines what is shown at unfilled slot positions.
 * If provided it must align with the rendered mask (i.e. with `?` markers
 * stripped). Literal positions in the placeholder are ignored — the mask's
 * literal character is always shown. Slot positions not covered by the
 * placeholder fall back to `placeholderChar`.
 *
 * `placeholderChar` sets the fill character used at unfilled slot positions
 * when `placeholder` is not supplied (or is shorter than the rendered mask).
 * Allowed values are `'_'` (default) and `' '` — useful when the mask should
 * stay invisible until the user types into it.
 *
 * `value`, `defaultValue`, `onBlur` and `onChange` all use the formatted
 * string with placeholder characters at unfilled slots, matching what is
 * rendered in the DOM. The `onBlur` and `onChange` event has an extra
 * `complete` boolean that is `true` when all the required mask slots are
 * filled.
 *
 * @param props - see: {@link React.InputHTMLAttributes | InputHTMLAttributes}
 *
 * Additional props:
 *   - `mask: string`
 *   - `placeholderChar?: '_' | ' '`
 *   - `placeholder?: string`
 *   - `onBlur?: (event: MaskedFocusEvent) => void`
 *   - `onChange?: (event: MaskedChangeEvent) => void`
 *
 * @returns The component instance.
 */
export function MaskedInput({
  mask,
  type = 'text',
  placeholderChar = '_',
  placeholder,
  inputMode,
  value,
  defaultValue,
  onBlur,
  onChange,
  onFocus,
  onClick,
  name,
  readOnly,
  disabled,
  ref,
  ...props
}: Readonly<MaskedInputProps>) {
  const inputRef = useRef<HTMLInputElement>(null);

  const setInputRef = useMemo(() => mergeRefs(inputRef, ref), [ref]);
  const caretRef = useRef<number | null>(null);

  const info = useMemo(
    () => buildMaskInfo(mask, placeholderChar, placeholder),
    [mask, placeholderChar, placeholder]
  );

  const resolvedInputMode = inputMode ?? (/[*a]/.test(mask) ? undefined : 'numeric');

  const isControlled = value !== undefined;

  const [internalSlots, setInternalSlots] = useState<Slots>(() =>
    parseFormatted(defaultValue ?? '', info)
  );
  const [prevDefault, setPrevDefault] = useState(defaultValue);
  const [prevInfo, setPrevInfo] = useState(info);

  if (!isControlled && prevDefault !== defaultValue) {
    setPrevDefault(defaultValue);
    setInternalSlots(parseFormatted(defaultValue ?? '', info));
  }

  if (prevInfo !== info) {
    setPrevInfo(info);
    if (!isControlled) {
      setInternalSlots((prev) => remapSlots(prev, info));
    }
  }

  const slots = isControlled ? parseFormatted(value, info) : internalSlots;
  const formatted = formatSlots(slots, info);
  const displayed = formatted === info.empty ? '' : formatted;

  const callbacksRef = useRef({ onChange, onBlur });
  const slotsRef = useRef(slots);

  useIsomorphicLayoutEffect(() => {
    callbacksRef.current = { onChange, onBlur };
  });

  useIsomorphicLayoutEffect(() => {
    if (caretRef.current !== null && inputRef.current) {
      const pos = caretRef.current;
      inputRef.current.setSelectionRange(pos, pos);
      caretRef.current = null;
    }
  });

  useIsomorphicLayoutEffect(() => {
    slotsRef.current = slots;
  });

  const select = (): [number, number] => {
    const element = inputRef.current;
    return element ? [element.selectionStart ?? 0, element.selectionEnd ?? 0] : [0, 0];
  };

  const commit = useCallback(
    (nextSlots: Slots, caret: number) => {
      if (slotsEqual(nextSlots, slotsRef.current)) {
        return;
      }

      if (!isControlled) {
        setInternalSlots(nextSlots);
      }

      caretRef.current = caret;

      const nextFormatted = formatSlots(nextSlots, info);
      const nextValue = nextFormatted === info.empty ? '' : nextFormatted;
      const unmaskedValue = nextSlots.filter((ch): ch is string => ch !== null).join('');
      const complete = slotsAreComplete(nextSlots, info);

      const event = {
        type: 'change',
        target: { value: nextValue, name } as EventTarget & HTMLInputElement,
        currentTarget: { value: nextValue, name } as EventTarget & HTMLInputElement,
        nativeEvent: new Event('change'),
        complete,
        unmaskedValue,
        bubbles: true,
        preventDefault: () => {},
        stopPropagation: () => {},
        persist: () => {},
        isDefaultPrevented: () => false,
        isPropagationStopped: () => false,
      } as MaskedChangeEvent;

      callbacksRef.current.onChange?.(event);
    },
    [isControlled, info, name]
  );

  useEffect(() => {
    const element = inputRef.current;

    // Unreachable guard needed for type safety
    /* v8 ignore if -- @preserve */
    if (!element) {
      return;
    }

    const handler = (event: InputEvent) => {
      if (readOnly || disabled) {
        event.preventDefault();
        return;
      }

      const current = slotsRef.current;
      const start = element.selectionStart ?? 0;
      const end = element.selectionEnd ?? 0;
      const data = event.data ?? '';

      switch (event.inputType) {
        case 'insertText':
        case 'insertCompositionText':
        case 'insertReplacementText':
        case 'insertFromPaste':
        case 'insertFromDrop': {
          event.preventDefault();
          const result = insertChars(current, info, start, end, data);
          commit(result.slots, result.caret);
          break;
        }
        case 'deleteContentBackward':
        case 'deleteContentForward':
        case 'deleteByCut': {
          // Chrome's search clear button and "select all + delete/cut" should
          // let the browser handle the input. The useEffect listener takes
          // care of the state sync.
          if (start === 0 && end === info.length) {
            return;
          }
          event.preventDefault();
          if (event.inputType === 'deleteContentBackward') {
            if (start === end) {
              const idx = prevSlotIndex(info, start - 1);
              if (idx !== -1) {
                commit(clearRange(current, info, idx, idx + 1), idx);
              }
            } else {
              commit(clearRange(current, info, start, end), start);
            }
          } else if (event.inputType === 'deleteContentForward') {
            if (start === end) {
              const idx = nextSlotIndex(info, start);
              if (idx !== -1) {
                commit(clearRange(current, info, idx, idx + 1), start);
              }
            } else {
              commit(clearRange(current, info, start, end), start);
            }
          } else if (start !== end) {
            commit(clearRange(current, info, start, end), start);
          }
          break;
        }
        case 'deleteWordBackward':
        case 'deleteSoftLineBackward':
        case 'deleteHardLineBackward': {
          event.preventDefault();
          const from = start === end ? 0 : start;
          commit(clearRange(current, info, from, end), from);
          break;
        }
        case 'deleteWordForward':
        case 'deleteSoftLineForward':
        case 'deleteHardLineForward': {
          event.preventDefault();
          const to = start === end ? info.length : end;
          commit(clearRange(current, info, start, to), start);
          break;
        }
      }
    };

    const inputHandler = () => {
      if (readOnly || disabled || element.value !== '') {
        return;
      }
      if (slotsRef.current.every((slot) => slot === null)) {
        return;
      }
      const cleared: Slots = info.positions.map(() => null);
      commit(cleared, 0);
    };

    element.addEventListener('beforeinput', handler);
    element.addEventListener('input', inputHandler);

    return () => {
      element.removeEventListener('beforeinput', handler);
      element.removeEventListener('input', inputHandler);
    };
  }, [commit, info, readOnly, disabled]);

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
    const result = insertChars(slotsRef.current, info, start, end, text);
    commit(result.slots, result.caret);
  };

  const snapCaretToSlot = () => {
    const element = inputRef.current;
    if (!element) {
      return;
    }
    const start = element.selectionStart ?? 0;
    const end = element.selectionEnd ?? 0;
    if (start !== end) {
      return;
    }
    if (start < info.length && info.positions[start]?.isSlot) {
      return;
    }
    const next = nextSlotIndex(info, start);
    const target = next === -1 ? info.length : next;
    if (target !== start) {
      element.setSelectionRange(target, target);
    }
  };

  const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    const blurEvent = Object.assign(event, {
      complete: slotsAreComplete(slotsRef.current, info),
      unmaskedValue: slotsRef.current.filter((ch): ch is string => ch !== null).join(''),
    });

    onBlur?.(blurEvent);
  };

  const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    onFocus?.(event);
    requestAnimationFrame(snapCaretToSlot);
  };

  const handleClick = (event: React.MouseEvent<HTMLInputElement>) => {
    onClick?.(event);
    snapCaretToSlot();
  };

  return (
    <input
      {...props}
      ref={setInputRef}
      name={name}
      type={type}
      inputMode={resolvedInputMode}
      readOnly={readOnly}
      disabled={disabled}
      placeholder={info.empty}
      value={displayed}
      onChange={() => {}}
      onPaste={handlePaste}
      onBlur={handleBlur}
      onFocus={handleFocus}
      onClick={handleClick}
    />
  );
}
