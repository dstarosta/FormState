import { createRef } from 'react';
import { describe, expect, it, afterEach, vi } from 'vitest';
import { act, cleanup, createEvent, fireEvent, render, screen } from '@testing-library/react';

import { MaskedInput, type MaskedChangeEvent, type MaskedFocusEvent } from './masked-input';

const lastChange = (mock: ReturnType<typeof vi.fn>) =>
  mock.mock.calls.at(-1)?.[0] as MaskedChangeEvent;

const lastBlur = (mock: ReturnType<typeof vi.fn>) =>
  mock.mock.calls.at(-1)?.[0] as MaskedFocusEvent;

const getInput = () => screen.getByRole<HTMLInputElement>('textbox');

const setSelection = (input: HTMLInputElement, start: number, end: number) => {
  input.setSelectionRange(start, end);
};

const fireBeforeInput = (input: HTMLInputElement, inputType: string, data?: string) => {
  act(() => {
    input.dispatchEvent(
      new InputEvent('beforeinput', {
        inputType,
        data: data ?? null,
        bubbles: true,
        cancelable: true,
      })
    );
  });
};

const firePaste = (input: HTMLInputElement, text: string) => {
  fireEvent.paste(input, { clipboardData: { getData: () => text } });
};

describe('MaskedInput', () => {
  afterEach(() => {
    cleanup();
  });

  describe('rendering', () => {
    it('renders an input element', () => {
      render(<MaskedInput mask="999-9999" />);

      expect(getInput()).toBeInTheDocument();
    });

    it('renders an input with type="text" by default', () => {
      render(<MaskedInput mask="999-9999" />);

      expect(getInput().type).toBe('text');
    });

    it('renders with type="search" when specified', () => {
      render(<MaskedInput mask="999-9999" type="search" aria-label="search input" />);

      expect(screen.getByLabelText<HTMLInputElement>('search input').type).toBe('search');
    });

    it('renders empty when no value is provided', () => {
      render(<MaskedInput mask="999-9999" />);

      expect(getInput().value).toBe('');
    });

    it('exposes the empty mask as the HTML placeholder', () => {
      render(<MaskedInput mask="999-9999" />);

      expect(getInput().placeholder).toBe('___-____');
    });

    it('renders the formatted defaultValue', () => {
      render(<MaskedInput mask="999-9999" defaultValue="555-1234" />);

      expect(getInput().value).toBe('555-1234');
    });

    it('renders the formatted controlled value', () => {
      render(<MaskedInput mask="999-9999" value="555-1234" />);

      expect(getInput().value).toBe('555-1234');
    });

    it('fills unfilled trailing slots with placeholder chars when value is partial', () => {
      render(<MaskedInput mask="999-9999" value="555" />);

      expect(getInput().value).toBe('555-____');
    });

    it('treats a value that matches the empty mask as empty', () => {
      render(<MaskedInput mask="999-9999" value="___-____" />);

      expect(getInput().value).toBe('');
    });

    it('forwards additional props', () => {
      render(<MaskedInput mask="999-9999" id="phone" className="my-class" />);

      const input = getInput();

      expect(input.id).toBe('phone');
      expect(input.className).toBe('my-class');
    });

    it('sets the name attribute', () => {
      render(<MaskedInput mask="999-9999" name="phone" />);

      expect(getInput().name).toBe('phone');
    });
  });

  describe('inputMode', () => {
    it('auto-applies inputMode="numeric" for digit-only masks', () => {
      render(<MaskedInput mask="(999) 999-9999" />);

      expect(getInput().inputMode).toBe('numeric');
    });

    it('auto-applies inputMode="numeric" with literal separators and ?', () => {
      render(<MaskedInput mask="999?9999" />);

      expect(getInput().inputMode).toBe('numeric');
    });

    it('does not auto-apply inputMode when the mask has letter slots', () => {
      render(<MaskedInput mask="aaa-9999" />);

      expect(getInput().inputMode).toBe('');
    });

    it('does not auto-apply inputMode when the mask has alphanumeric slots', () => {
      render(<MaskedInput mask="***-9999" />);

      expect(getInput().inputMode).toBe('');
    });

    it('uses an explicit inputMode prop over the auto-detected value', () => {
      render(<MaskedInput mask="999-9999" inputMode="tel" />);

      expect(getInput().inputMode).toBe('tel');
    });

    it('respects an explicit inputMode prop on letter masks too', () => {
      render(<MaskedInput mask="aaa" inputMode="text" />);

      expect(getInput().inputMode).toBe('text');
    });
  });

  describe('placeholder', () => {
    it('uses _ for slots when no placeholder is provided', () => {
      render(<MaskedInput mask="aa-99" />);

      expect(getInput().placeholder).toBe('__-__');
    });

    it('uses placeholder chars for slot positions', () => {
      render(<MaskedInput mask="aa-99" placeholder="XX-00" />);

      expect(getInput().placeholder).toBe('XX-00');
    });

    it('always uses the mask literal at literal positions, ignoring placeholder content', () => {
      render(<MaskedInput mask="aa-99" placeholder="XXYZZ" />);

      expect(getInput().placeholder).toBe('XX-ZZ');
    });

    it('falls back to _ for slot positions beyond the placeholder length', () => {
      render(<MaskedInput mask="999-9999" placeholder="X" />);

      expect(getInput().placeholder).toBe('X__-____');
    });

    it('reflects the custom placeholder char at unfilled slots after typing', () => {
      render(<MaskedInput mask="999-9999" placeholder="000-0000" />);

      const input = getInput();

      setSelection(input, 0, 0);
      fireBeforeInput(input, 'insertText', '5');

      expect(input.value).toBe('500-0000');
    });
  });

  describe('placeholderChar', () => {
    it('uses _ when not specified', () => {
      render(<MaskedInput mask="999-9999" />);

      expect(getInput().placeholder).toBe('___-____');
    });

    it('uses spaces when set to " "', () => {
      render(<MaskedInput mask="999-9999" placeholderChar=" " />);

      expect(getInput().placeholder).toBe('   -    ');
    });

    it('shows placeholderChar at unfilled slots after typing', () => {
      render(<MaskedInput mask="999-9999" placeholderChar=" " />);

      const input = getInput();

      setSelection(input, 0, 0);
      fireBeforeInput(input, 'insertText', '5');

      expect(input.value).toBe('5  -    ');
    });

    it('only fills positions not covered by placeholder', () => {
      render(<MaskedInput mask="999-9999" placeholder="DDD" placeholderChar=" " />);

      expect(getInput().placeholder).toBe('DDD-    ');
    });

    it('still treats a value matching the empty mask (with spaces) as empty', () => {
      const onChange = vi.fn();

      render(
        <MaskedInput
          mask="999-9999"
          placeholderChar=" "
          defaultValue="555-1234"
          onChange={onChange}
        />
      );

      const input = getInput();

      setSelection(input, 8, 8);
      fireBeforeInput(input, 'deleteWordBackward');

      const event = lastChange(onChange);
      expect(event.target.value).toBe('');
      expect(input.value).toBe('');
    });
  });

  describe('tokens', () => {
    it('accepts digits in 9 slots', () => {
      render(<MaskedInput mask="999" />);

      const input = getInput();

      setSelection(input, 0, 0);
      fireBeforeInput(input, 'insertText', '5');

      expect(input.value).toBe('5__');
    });

    it('rejects letters in 9 slots', () => {
      render(<MaskedInput mask="999" />);

      const input = getInput();

      setSelection(input, 0, 0);
      fireBeforeInput(input, 'insertText', 'a');

      expect(input.value).toBe('');
    });

    it('accepts letters in a slots', () => {
      render(<MaskedInput mask="aaa" />);

      const input = getInput();

      setSelection(input, 0, 0);
      fireBeforeInput(input, 'insertText', 'A');

      expect(input.value).toBe('A__');
    });

    it('accepts both upper and lower case letters in a slots', () => {
      render(<MaskedInput mask="aaa" />);

      const input = getInput();

      setSelection(input, 0, 0);
      fireBeforeInput(input, 'insertText', 'a');
      setSelection(input, 1, 1);
      fireBeforeInput(input, 'insertText', 'B');

      expect(input.value).toBe('aB_');
    });

    it('rejects digits in a slots', () => {
      render(<MaskedInput mask="aaa" />);

      const input = getInput();

      setSelection(input, 0, 0);
      fireBeforeInput(input, 'insertText', '5');

      expect(input.value).toBe('');
    });

    it('accepts digits and letters in * slots', () => {
      render(<MaskedInput mask="***" />);

      const input = getInput();

      setSelection(input, 0, 0);
      fireBeforeInput(input, 'insertText', 'A');
      setSelection(input, 1, 1);
      fireBeforeInput(input, 'insertText', '5');

      expect(input.value).toBe('A5_');
    });

    it('rejects non-alphanumeric chars in * slots', () => {
      render(<MaskedInput mask="***" />);

      const input = getInput();

      setSelection(input, 0, 0);
      fireBeforeInput(input, 'insertText', '#');

      expect(input.value).toBe('');
    });

    it.each([
      ['(', ')'],
      ['-', '/'],
      ['.', ','],
      [':', ' '],
    ])('treats %s and %s as literals', (literalA, literalB) => {
      const mask = `9${literalA}9${literalB}9`;
      render(<MaskedInput mask={mask} />);

      expect(getInput().placeholder).toBe(`_${literalA}_${literalB}_`);
    });
  });

  describe('rejected input', () => {
    it.each(['a', 'Z', '@', '#', '!', '+', '-', '.', ' ', '\t'])('rejects %j in a 9 slot', (ch) => {
      const onChange = vi.fn();

      render(<MaskedInput mask="999" onChange={onChange} />);

      const input = getInput();

      setSelection(input, 0, 0);
      fireBeforeInput(input, 'insertText', ch);

      expect(input.value).toBe('');
      expect(onChange).not.toHaveBeenCalled();
    });

    it.each(['0', '5', '9', '@', '#', '!', ' ', '\t'])('rejects %j in an a slot', (ch) => {
      const onChange = vi.fn();

      render(<MaskedInput mask="aaa" onChange={onChange} />);

      const input = getInput();

      setSelection(input, 0, 0);
      fireBeforeInput(input, 'insertText', ch);

      expect(input.value).toBe('');
      expect(onChange).not.toHaveBeenCalled();
    });

    it.each(['@', '#', '!', '+', '-', '.', ' ', '\t'])('rejects %j in a * slot', (ch) => {
      const onChange = vi.fn();

      render(<MaskedInput mask="***" onChange={onChange} />);

      const input = getInput();

      setSelection(input, 0, 0);
      fireBeforeInput(input, 'insertText', ch);

      expect(input.value).toBe('');
      expect(onChange).not.toHaveBeenCalled();
    });

    it('does nothing on insertText with empty data', () => {
      const onChange = vi.fn();

      render(<MaskedInput mask="999" onChange={onChange} />);

      const input = getInput();

      setSelection(input, 0, 0);
      fireBeforeInput(input, 'insertText', '');

      expect(input.value).toBe('');
      expect(onChange).not.toHaveBeenCalled();
    });

    it('does not commit when every pasted character is invalid', () => {
      const onChange = vi.fn();

      render(<MaskedInput mask="999-9999" onChange={onChange} />);

      const input = getInput();

      setSelection(input, 0, 0);
      firePaste(input, 'abcdef');

      expect(input.value).toBe('');
      expect(onChange).not.toHaveBeenCalled();
    });

    it('does not commit when every typed composition character is invalid', () => {
      const onChange = vi.fn();

      render(<MaskedInput mask="999" onChange={onChange} />);

      const input = getInput();

      setSelection(input, 0, 0);
      fireBeforeInput(input, 'insertCompositionText', 'abc');

      expect(input.value).toBe('');
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('? (optional tail)', () => {
    it('drops the ? from the rendered mask', () => {
      render(<MaskedInput mask="999?9999" />);

      expect(getInput().placeholder).toBe('_______');
    });

    it('still accepts input in optional slots', () => {
      render(<MaskedInput mask="999?9999" />);

      const input = getInput();

      setSelection(input, 0, 0);
      fireBeforeInput(input, 'insertText', '1234567');

      expect(input.value).toBe('1234567');
    });

    it('flags complete on the change event once required slots are filled, even if optional slots are empty', () => {
      const onChange = vi.fn();

      render(<MaskedInput mask="999? x99" onChange={onChange} />);

      const input = getInput();

      setSelection(input, 0, 0);
      fireBeforeInput(input, 'insertText', '1');
      setSelection(input, 1, 1);
      fireBeforeInput(input, 'insertText', '2');
      setSelection(input, 2, 2);
      fireBeforeInput(input, 'insertText', '3');

      const event = lastChange(onChange);
      expect(event.complete).toBe(true);
      expect(event.target.value).toBe('123 x__');
    });

    it('keeps complete=true on edits to optional slots while required slots stay filled', () => {
      const onChange = vi.fn();

      render(<MaskedInput mask="999? x99" defaultValue="123 x__" onChange={onChange} />);

      const input = getInput();

      setSelection(input, 6, 6);
      fireBeforeInput(input, 'insertText', '4');
      setSelection(input, 7, 7);
      fireBeforeInput(input, 'insertText', '5');

      expect(onChange.mock.calls.every(([event]) => (event as MaskedChangeEvent).complete)).toBe(
        true
      );
    });

    it('aligns the placeholder prop with rendered slot positions, not raw mask positions', () => {
      render(<MaskedInput mask="99?99" placeholder="MMYY" />);

      expect(getInput().placeholder).toBe('MMYY');
    });

    it('treats two consecutive ? as a single optional marker', () => {
      render(<MaskedInput mask="9??9" />);

      expect(getInput().placeholder).toBe('__');
    });
  });

  describe('uncontrolled (defaultValue)', () => {
    it('initializes with defaultValue', () => {
      render(<MaskedInput mask="99/99/9999" defaultValue="01/02/2024" />);

      expect(getInput().value).toBe('01/02/2024');
    });

    it('updates when defaultValue prop changes', () => {
      const { rerender } = render(<MaskedInput mask="99/99/9999" defaultValue="01/02/2024" />);

      expect(getInput().value).toBe('01/02/2024');

      rerender(<MaskedInput mask="99/99/9999" defaultValue="03/04/2025" />);

      expect(getInput().value).toBe('03/04/2025');
    });

    it('reflects accumulated edits internally', () => {
      const onChange = vi.fn();

      render(<MaskedInput mask="999-9999" onChange={onChange} />);

      const input = getInput();

      setSelection(input, 0, 0);
      fireBeforeInput(input, 'insertText', '5');
      setSelection(input, 1, 1);
      fireBeforeInput(input, 'insertText', '5');
      setSelection(input, 2, 2);
      fireBeforeInput(input, 'insertText', '5');

      expect(input.value).toBe('555-____');
    });
  });

  describe('controlled (value)', () => {
    it('reflects the controlled value', () => {
      render(<MaskedInput mask="999-9999" value="555-1234" />);

      expect(getInput().value).toBe('555-1234');
    });

    it('does not update display without an external state change', () => {
      const onChange = vi.fn();

      render(<MaskedInput mask="999-9999" value="555-1234" onChange={onChange} />);

      const input = getInput();

      setSelection(input, 8, 8);
      fireBeforeInput(input, 'deleteContentBackward');

      expect(input.value).toBe('555-1234');
      expect(onChange).toHaveBeenCalledOnce();
    });

    it('updates the display when the parent re-passes a new value', () => {
      const { rerender } = render(<MaskedInput mask="999-9999" value="555-1234" />);

      expect(getInput().value).toBe('555-1234');

      rerender(<MaskedInput mask="999-9999" value="999-8888" />);

      expect(getInput().value).toBe('999-8888');
    });

    it('uses the controlled value (not internal state) as the base for edits', () => {
      const onChange = vi.fn();

      render(<MaskedInput mask="999-9999" value="555-1___" onChange={onChange} />);

      const input = getInput();

      setSelection(input, 5, 5);
      fireBeforeInput(input, 'insertText', '2');

      const event = onChange.mock.calls[0]?.[0] as React.ChangeEvent<HTMLInputElement>;
      expect(event.target.value).toBe('555-12__');
    });
  });

  describe('insert (beforeinput insertText)', () => {
    it('skips literals to find the next slot', () => {
      render(<MaskedInput mask="(999)" />);

      const input = getInput();

      setSelection(input, 0, 0);
      fireBeforeInput(input, 'insertText', '5');

      expect(input.value).toBe('(5__)');
    });

    it('replaces a selection across slots and literals', () => {
      render(<MaskedInput mask="999-9999" defaultValue="555-1234" />);

      const input = getInput();

      setSelection(input, 1, 6);
      fireBeforeInput(input, 'insertText', '0');

      expect(input.value).toBe('50_-__34');
    });

    it('inserts via insertCompositionText', () => {
      render(<MaskedInput mask="999" />);

      const input = getInput();

      setSelection(input, 0, 0);
      fireBeforeInput(input, 'insertCompositionText', '5');

      expect(input.value).toBe('5__');
    });

    it('inserts via insertReplacementText', () => {
      render(<MaskedInput mask="999" />);

      const input = getInput();

      setSelection(input, 0, 0);
      fireBeforeInput(input, 'insertReplacementText', '5');

      expect(input.value).toBe('5__');
    });

    it('inserts via insertFromDrop', () => {
      render(<MaskedInput mask="999" />);

      const input = getInput();

      setSelection(input, 0, 0);
      fireBeforeInput(input, 'insertFromDrop', '5');

      expect(input.value).toBe('5__');
    });

    it('inserts multiple chars from composition data, skipping invalid ones', () => {
      render(<MaskedInput mask="999-9999" />);

      const input = getInput();

      setSelection(input, 0, 0);
      fireBeforeInput(input, 'insertCompositionText', '5a5b5');

      expect(input.value).toBe('555-____');
    });

    it('stops inserting when no more slots are available', () => {
      render(<MaskedInput mask="999" />);

      const input = getInput();

      setSelection(input, 0, 0);
      fireBeforeInput(input, 'insertText', '12345');

      expect(input.value).toBe('123');
    });

    it('prevents the default beforeinput action', () => {
      render(<MaskedInput mask="999" />);

      const input = getInput();
      const event = new InputEvent('beforeinput', {
        inputType: 'insertText',
        data: '5',
        bubbles: true,
        cancelable: true,
      });

      act(() => {
        input.dispatchEvent(event);
      });

      expect(event.defaultPrevented).toBe(true);
    });
  });

  describe('deleteContentBackward', () => {
    it('clears the previous slot in place without shifting', () => {
      render(<MaskedInput mask="999-9999" defaultValue="555-1234" />);

      const input = getInput();

      setSelection(input, 5, 5);
      fireBeforeInput(input, 'deleteContentBackward');

      expect(input.value).toBe('555-_234');
    });

    it('jumps over literals to find the previous slot', () => {
      render(<MaskedInput mask="999-9999" defaultValue="555-1234" />);

      const input = getInput();

      setSelection(input, 4, 4);
      fireBeforeInput(input, 'deleteContentBackward');

      expect(input.value).toBe('55_-1234');
    });

    it('clears the selected range', () => {
      render(<MaskedInput mask="999-9999" defaultValue="555-1234" />);

      const input = getInput();

      setSelection(input, 1, 6);
      fireBeforeInput(input, 'deleteContentBackward');

      expect(input.value).toBe('5__-__34');
    });

    it('does nothing at the start with no selection', () => {
      const onChange = vi.fn();

      render(<MaskedInput mask="999" defaultValue="123" onChange={onChange} />);

      const input = getInput();

      setSelection(input, 0, 0);
      fireBeforeInput(input, 'deleteContentBackward');

      expect(onChange).not.toHaveBeenCalled();
      expect(input.value).toBe('123');
    });

    it('emits an empty value to onChange when the last slot is cleared', () => {
      const onChange = vi.fn();

      render(<MaskedInput mask="999" defaultValue="5__" onChange={onChange} />);

      const input = getInput();

      setSelection(input, 1, 1);
      fireBeforeInput(input, 'deleteContentBackward');

      const event = onChange.mock.calls[0]?.[0] as React.ChangeEvent<HTMLInputElement>;
      expect(event.target.value).toBe('');
      expect(input.value).toBe('');
    });
  });

  describe('deleteContentForward', () => {
    it('clears the next slot in place without shifting', () => {
      render(<MaskedInput mask="999-9999" defaultValue="555-1234" />);

      const input = getInput();

      setSelection(input, 4, 4);
      fireBeforeInput(input, 'deleteContentForward');

      expect(input.value).toBe('555-_234');
    });

    it('jumps over literals to find the next slot', () => {
      render(<MaskedInput mask="999-9999" defaultValue="555-1234" />);

      const input = getInput();

      setSelection(input, 3, 3);
      fireBeforeInput(input, 'deleteContentForward');

      expect(input.value).toBe('555-_234');
    });

    it('clears the selected range', () => {
      render(<MaskedInput mask="999-9999" defaultValue="555-1234" />);

      const input = getInput();

      setSelection(input, 1, 6);
      fireBeforeInput(input, 'deleteContentForward');

      expect(input.value).toBe('5__-__34');
    });

    it('does nothing at the end with no selection', () => {
      const onChange = vi.fn();

      render(<MaskedInput mask="999" defaultValue="123" onChange={onChange} />);

      const input = getInput();

      setSelection(input, 3, 3);
      fireBeforeInput(input, 'deleteContentForward');

      expect(onChange).not.toHaveBeenCalled();
      expect(input.value).toBe('123');
    });
  });

  describe.each(['deleteWordBackward', 'deleteSoftLineBackward', 'deleteHardLineBackward'])(
    '%s',
    (inputType) => {
      it('clears every slot from the start to the cursor when no selection', () => {
        render(<MaskedInput mask="999-9999" defaultValue="555-1234" />);

        const input = getInput();

        setSelection(input, 5, 5);
        fireBeforeInput(input, inputType);

        expect(input.value).toBe('___-_234');
      });

      it('clears the selection when one exists', () => {
        render(<MaskedInput mask="999-9999" defaultValue="555-1234" />);

        const input = getInput();

        setSelection(input, 1, 6);
        fireBeforeInput(input, inputType);

        expect(input.value).toBe('5__-__34');
      });
    }
  );

  describe.each(['deleteWordForward', 'deleteSoftLineForward', 'deleteHardLineForward'])(
    '%s',
    (inputType) => {
      it('clears every slot from the cursor to the end when no selection', () => {
        render(<MaskedInput mask="999-9999" defaultValue="555-1234" />);

        const input = getInput();

        setSelection(input, 5, 5);
        fireBeforeInput(input, inputType);

        expect(input.value).toBe('555-1___');
      });

      it('clears the selection when one exists', () => {
        render(<MaskedInput mask="999-9999" defaultValue="555-1234" />);

        const input = getInput();

        setSelection(input, 1, 6);
        fireBeforeInput(input, inputType);

        expect(input.value).toBe('5__-__34');
      });
    }
  );

  describe('paste', () => {
    it('inserts pasted text starting at the caret', () => {
      render(<MaskedInput mask="999-9999" />);

      const input = getInput();

      setSelection(input, 0, 0);
      firePaste(input, '5551234');

      expect(input.value).toBe('555-1234');
    });

    it('skips literals and rejected characters in pasted text', () => {
      render(<MaskedInput mask="999-9999" />);

      const input = getInput();

      setSelection(input, 0, 0);
      firePaste(input, '555-12abc34');

      expect(input.value).toBe('555-1234');
    });

    it('replaces the current selection with pasted text', () => {
      render(<MaskedInput mask="999-9999" defaultValue="555-1234" />);

      const input = getInput();

      setSelection(input, 0, 8);
      firePaste(input, '9998888');

      expect(input.value).toBe('999-8888');
    });

    it('does nothing when the pasted text is empty', () => {
      const onChange = vi.fn();

      render(<MaskedInput mask="999-9999" onChange={onChange} />);

      firePaste(getInput(), '');

      expect(onChange).not.toHaveBeenCalled();
    });

    it('prevents default to block native paste', () => {
      render(<MaskedInput mask="999-9999" />);

      const input = getInput();
      const event = createEvent.paste(input);

      Object.defineProperty(event, 'clipboardData', {
        value: { getData: () => '123' },
      });

      fireEvent(input, event);

      expect(event.defaultPrevented).toBe(true);
    });
  });

  describe('cut (beforeinput deleteByCut)', () => {
    it('clears the selected slots so the OS can copy the original to clipboard', () => {
      render(<MaskedInput mask="999-9999" defaultValue="555-1234" />);

      const input = getInput();

      setSelection(input, 4, 8);
      fireBeforeInput(input, 'deleteByCut');

      expect(input.value).toBe('555-____');
    });

    it('does nothing when there is no selection', () => {
      const onChange = vi.fn();

      render(<MaskedInput mask="999-9999" defaultValue="555-1234" onChange={onChange} />);

      const input = getInput();

      setSelection(input, 5, 5);
      fireBeforeInput(input, 'deleteByCut');

      expect(input.value).toBe('555-1234');
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('clipboard and history pass-through', () => {
    it('does not block historyUndo', () => {
      render(<MaskedInput mask="999" defaultValue="123" />);

      const input = getInput();
      const event = new InputEvent('beforeinput', {
        inputType: 'historyUndo',
        bubbles: true,
        cancelable: true,
      });

      act(() => {
        input.dispatchEvent(event);
      });

      expect(event.defaultPrevented).toBe(false);
    });

    it('does not block historyRedo', () => {
      render(<MaskedInput mask="999" defaultValue="123" />);

      const input = getInput();
      const event = new InputEvent('beforeinput', {
        inputType: 'historyRedo',
        bubbles: true,
        cancelable: true,
      });

      act(() => {
        input.dispatchEvent(event);
      });

      expect(event.defaultPrevented).toBe(false);
    });
  });

  describe('native clear (search clear button, select-all + delete)', () => {
    it('lets the browser clear when deleteContentBackward selects the full input', () => {
      render(<MaskedInput mask="999-9999" type="search" defaultValue="555-1234" />);

      const input = screen.getByRole<HTMLInputElement>('searchbox');

      setSelection(input, 0, 8);
      const event = new InputEvent('beforeinput', {
        inputType: 'deleteContentBackward',
        bubbles: true,
        cancelable: true,
      });

      act(() => {
        input.dispatchEvent(event);
      });

      expect(event.defaultPrevented).toBe(false);
    });

    it('still preventDefaults a non-full selection', () => {
      render(<MaskedInput mask="999-9999" defaultValue="555-1234" />);

      const input = getInput();

      setSelection(input, 1, 6);
      const event = new InputEvent('beforeinput', {
        inputType: 'deleteContentBackward',
        bubbles: true,
        cancelable: true,
      });

      act(() => {
        input.dispatchEvent(event);
      });

      expect(event.defaultPrevented).toBe(true);
    });

    it('clears all slots when the input value becomes empty', () => {
      const onChange = vi.fn();

      render(
        <MaskedInput mask="999-9999" type="search" defaultValue="555-1234" onChange={onChange} />
      );

      const input = screen.getByRole<HTMLInputElement>('searchbox');

      act(() => {
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });

      expect(input.value).toBe('');
      expect(lastChange(onChange).target.value).toBe('');
      expect(lastChange(onChange).unmaskedValue).toBe('');
    });

    it('does not fire when slots are already empty', () => {
      const onChange = vi.fn();

      render(<MaskedInput mask="999-9999" onChange={onChange} />);

      const input = getInput();

      act(() => {
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });

      expect(onChange).not.toHaveBeenCalled();
    });

    it('does not fire onChange when readOnly', () => {
      const onChange = vi.fn();

      render(
        <MaskedInput
          mask="999-9999"
          type="search"
          defaultValue="555-1234"
          readOnly
          onChange={onChange}
        />
      );

      const input = screen.getByRole<HTMLInputElement>('searchbox');

      act(() => {
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });

      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('readOnly', () => {
    it('renders the readOnly attribute', () => {
      render(<MaskedInput mask="999" readOnly />);

      expect(getInput().readOnly).toBe(true);
    });

    it('blocks insertion via beforeinput', () => {
      const onChange = vi.fn();

      render(<MaskedInput mask="999" defaultValue="123" readOnly onChange={onChange} />);

      const input = getInput();

      setSelection(input, 0, 0);
      fireBeforeInput(input, 'insertText', '9');

      expect(onChange).not.toHaveBeenCalled();
      expect(input.value).toBe('123');
    });

    it('blocks deletion via beforeinput', () => {
      const onChange = vi.fn();

      render(<MaskedInput mask="999" defaultValue="123" readOnly onChange={onChange} />);

      const input = getInput();

      setSelection(input, 3, 3);
      fireBeforeInput(input, 'deleteContentBackward');

      expect(onChange).not.toHaveBeenCalled();
      expect(input.value).toBe('123');
    });

    it('blocks paste', () => {
      const onChange = vi.fn();

      render(<MaskedInput mask="999" readOnly onChange={onChange} />);

      const input = getInput();
      firePaste(input, '999');

      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('disabled', () => {
    it('renders the disabled attribute', () => {
      render(<MaskedInput mask="999" disabled />);

      expect(getInput().disabled).toBe(true);
    });

    it('blocks insertion via beforeinput', () => {
      const onChange = vi.fn();

      render(<MaskedInput mask="999" defaultValue="123" disabled onChange={onChange} />);

      const input = getInput();

      setSelection(input, 0, 0);
      fireBeforeInput(input, 'insertText', '9');

      expect(onChange).not.toHaveBeenCalled();
      expect(input.value).toBe('123');
    });

    it('blocks paste', () => {
      const onChange = vi.fn();

      render(<MaskedInput mask="999" disabled onChange={onChange} />);

      firePaste(getInput(), '999');

      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('onChange callback', () => {
    it('calls onChange with the formatted value', () => {
      const onChange = vi.fn();

      render(<MaskedInput mask="999-9999" onChange={onChange} />);

      const input = getInput();

      setSelection(input, 0, 0);
      fireBeforeInput(input, 'insertText', '5');

      const event = onChange.mock.calls[0]?.[0] as React.ChangeEvent<HTMLInputElement>;
      expect(event.target.value).toBe('5__-____');
    });

    it('passes the name on the event target', () => {
      const onChange = vi.fn();

      render(<MaskedInput mask="999" name="code" onChange={onChange} />);

      const input = getInput();

      setSelection(input, 0, 0);
      fireBeforeInput(input, 'insertText', '5');

      const event = onChange.mock.calls[0]?.[0] as React.ChangeEvent<HTMLInputElement>;
      expect(event.target.name).toBe('code');
      expect(event.currentTarget.name).toBe('code');
    });

    it('uses type "change" on the synthetic event', () => {
      const onChange = vi.fn();

      render(<MaskedInput mask="999" onChange={onChange} />);

      const input = getInput();

      setSelection(input, 0, 0);
      fireBeforeInput(input, 'insertText', '5');

      const event = onChange.mock.calls[0]?.[0] as React.ChangeEvent<HTMLInputElement>;
      expect(event.type).toBe('change');
    });

    it('exposes callable helpers on the synthetic event', () => {
      const onChange = vi.fn();

      render(<MaskedInput mask="999" onChange={onChange} />);

      const input = getInput();

      setSelection(input, 0, 0);
      fireBeforeInput(input, 'insertText', '5');

      const event = onChange.mock.calls[0]?.[0] as React.ChangeEvent<HTMLInputElement>;

      expect(() => {
        event.preventDefault();
      }).not.toThrow();
      expect(() => {
        event.stopPropagation();
      }).not.toThrow();
      expect(() => {
        event.persist();
      }).not.toThrow();
      expect(event.isDefaultPrevented()).toBe(false);
      expect(event.isPropagationStopped()).toBe(false);
      expect(event.bubbles).toBe(true);
    });

    it('does not throw when onChange is omitted', () => {
      render(<MaskedInput mask="999" />);

      const input = getInput();

      setSelection(input, 0, 0);
      expect(() => {
        fireBeforeInput(input, 'insertText', '5');
      }).not.toThrow();
    });

    it('does not fire on a native change event', () => {
      const onChange = vi.fn();

      render(<MaskedInput mask="999" onChange={onChange} />);

      fireEvent.change(getInput(), { target: { value: 'injected' } });

      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('event.complete flag', () => {
    it('is true on the change event when every slot is filled', () => {
      const onChange = vi.fn();

      render(<MaskedInput mask="999" onChange={onChange} />);

      const input = getInput();

      setSelection(input, 0, 0);
      fireBeforeInput(input, 'insertText', '1');
      setSelection(input, 1, 1);
      fireBeforeInput(input, 'insertText', '2');
      setSelection(input, 2, 2);
      fireBeforeInput(input, 'insertText', '3');

      const event = lastChange(onChange);
      expect(event.complete).toBe(true);
      expect(event.target.value).toBe('123');
    });

    it('is false while only some slots are filled', () => {
      const onChange = vi.fn();

      render(<MaskedInput mask="999" onChange={onChange} />);

      const input = getInput();

      setSelection(input, 0, 0);
      fireBeforeInput(input, 'insertText', '1');
      setSelection(input, 1, 1);
      fireBeforeInput(input, 'insertText', '2');

      expect(onChange.mock.calls.every(([event]) => !(event as MaskedChangeEvent).complete)).toBe(
        true
      );
    });

    it('stays true on edits that keep the field complete', () => {
      const onChange = vi.fn();

      render(<MaskedInput mask="999" defaultValue="123" onChange={onChange} />);

      const input = getInput();

      setSelection(input, 1, 2);
      fireBeforeInput(input, 'insertText', '9');

      const event = lastChange(onChange);
      expect(event.complete).toBe(true);
    });

    it('is true again after re-completing from an incomplete state', () => {
      const onChange = vi.fn();

      render(<MaskedInput mask="999" defaultValue="123" onChange={onChange} />);

      const input = getInput();

      setSelection(input, 3, 3);
      fireBeforeInput(input, 'deleteContentBackward');
      setSelection(input, 2, 2);
      fireBeforeInput(input, 'insertText', '9');

      const event = lastChange(onChange);
      expect(event.complete).toBe(true);
      expect(event.target.value).toBe('129');
    });
  });

  describe('event.unmaskedValue', () => {
    it('contains only the typed characters, with literals stripped', () => {
      const onChange = vi.fn();

      render(<MaskedInput mask="(999) 999-9999" onChange={onChange} />);

      const input = getInput();

      setSelection(input, 0, 0);
      fireBeforeInput(input, 'insertText', '5551234567');

      const event = lastChange(onChange);
      expect(event.unmaskedValue).toBe('5551234567');
      expect(event.target.value).toBe('(555) 123-4567');
    });

    it('reflects partial input without unfilled slot placeholders', () => {
      const onChange = vi.fn();

      render(<MaskedInput mask="999-9999" onChange={onChange} />);

      const input = getInput();

      setSelection(input, 0, 0);
      fireBeforeInput(input, 'insertText', '555');

      const event = lastChange(onChange);
      expect(event.unmaskedValue).toBe('555');
      expect(event.target.value).toBe('555-____');
    });

    it('preserves the slot order even when the user fills non-contiguous slots', () => {
      const onChange = vi.fn();

      render(<MaskedInput mask="999-9999" defaultValue="555-1234" onChange={onChange} />);

      const input = getInput();

      setSelection(input, 5, 5);
      fireBeforeInput(input, 'deleteContentBackward');

      const event = lastChange(onChange);
      expect(event.unmaskedValue).toBe('555234');
      expect(event.target.value).toBe('555-_234');
    });

    it('is the empty string when no slots are filled', () => {
      const onChange = vi.fn();

      render(<MaskedInput mask="999" defaultValue="1__" onChange={onChange} />);

      const input = getInput();

      setSelection(input, 1, 1);
      fireBeforeInput(input, 'deleteContentBackward');

      const event = lastChange(onChange);
      expect(event.unmaskedValue).toBe('');
      expect(event.target.value).toBe('');
    });
  });

  describe('blur and focus passthrough', () => {
    it('calls onBlur', () => {
      const onBlur = vi.fn();

      render(<MaskedInput mask="999" onBlur={onBlur} />);

      fireEvent.blur(getInput());

      expect(onBlur).toHaveBeenCalledOnce();
    });

    it('calls onFocus', () => {
      const onFocus = vi.fn();

      render(<MaskedInput mask="999" onFocus={onFocus} />);

      fireEvent.focus(getInput());

      expect(onFocus).toHaveBeenCalledOnce();
    });

    it('calls onClick', () => {
      const onClick = vi.fn();

      render(<MaskedInput mask="999" onClick={onClick} />);

      fireEvent.click(getInput());

      expect(onClick).toHaveBeenCalledOnce();
    });

    it('does not throw when handlers are omitted', () => {
      render(<MaskedInput mask="999" />);

      const input = getInput();

      expect(() => fireEvent.blur(input)).not.toThrow();
      expect(() => fireEvent.focus(input)).not.toThrow();
      expect(() => fireEvent.click(input)).not.toThrow();
    });
  });

  describe('blur event extensions', () => {
    it('exposes complete=true when every required slot is filled', () => {
      const onBlur = vi.fn();

      render(<MaskedInput mask="999" defaultValue="123" onBlur={onBlur} />);

      fireEvent.blur(getInput());

      expect(lastBlur(onBlur).complete).toBe(true);
    });

    it('exposes complete=false when only some required slots are filled', () => {
      const onBlur = vi.fn();

      render(<MaskedInput mask="999" defaultValue="12_" onBlur={onBlur} />);

      fireEvent.blur(getInput());

      expect(lastBlur(onBlur).complete).toBe(false);
    });

    it('exposes complete=true when only required slots (not optional) are filled', () => {
      const onBlur = vi.fn();

      render(<MaskedInput mask="999? x99" defaultValue="123 x__" onBlur={onBlur} />);

      fireEvent.blur(getInput());

      expect(lastBlur(onBlur).complete).toBe(true);
    });

    it('exposes the unmasked value of just the typed characters', () => {
      const onBlur = vi.fn();

      render(<MaskedInput mask="(999) 999-9999" defaultValue="(555) 123-4567" onBlur={onBlur} />);

      fireEvent.blur(getInput());

      expect(lastBlur(onBlur).unmaskedValue).toBe('5551234567');
    });

    it('exposes an empty unmasked value when no slots are filled', () => {
      const onBlur = vi.fn();

      render(<MaskedInput mask="999-9999" onBlur={onBlur} />);

      fireEvent.blur(getInput());

      expect(lastBlur(onBlur).unmaskedValue).toBe('');
    });

    it('reflects the latest typed-in state, not the initial state', () => {
      const onBlur = vi.fn();

      render(<MaskedInput mask="999" onBlur={onBlur} />);

      const input = getInput();

      setSelection(input, 0, 0);
      fireBeforeInput(input, 'insertText', '1');
      setSelection(input, 1, 1);
      fireBeforeInput(input, 'insertText', '2');
      setSelection(input, 2, 2);
      fireBeforeInput(input, 'insertText', '3');

      fireEvent.blur(input);

      const event = lastBlur(onBlur);
      expect(event.complete).toBe(true);
      expect(event.unmaskedValue).toBe('123');
    });

    it('preserves SyntheticEvent prototype methods on the blur event', () => {
      const onBlur = vi.fn();

      render(<MaskedInput mask="999" onBlur={onBlur} />);

      fireEvent.blur(getInput());

      const event = lastBlur(onBlur);
      expect(typeof event.preventDefault).toBe('function');
      expect(typeof event.stopPropagation).toBe('function');
      expect(typeof event.persist).toBe('function');
      expect(typeof event.isDefaultPrevented).toBe('function');
      expect(typeof event.isPropagationStopped).toBe('function');
      expect(() => {
        event.preventDefault();
      }).not.toThrow();
    });
  });

  describe('caret snapping', () => {
    it('moves the caret to the next slot on click when on a literal', () => {
      render(<MaskedInput mask="(999) 999" defaultValue="(555) 123" />);

      const input = getInput();

      setSelection(input, 0, 0);
      fireEvent.click(input);

      expect(input.selectionStart).toBe(1);
    });

    it('leaves the caret in place on click when already on a slot', () => {
      render(<MaskedInput mask="(999) 999" defaultValue="(555) 123" />);

      const input = getInput();

      setSelection(input, 2, 2);
      fireEvent.click(input);

      expect(input.selectionStart).toBe(2);
    });

    it('does not snap the caret when there is a selection', () => {
      render(<MaskedInput mask="(999) 999" defaultValue="(555) 123" />);

      const input = getInput();

      setSelection(input, 0, 5);
      fireEvent.click(input);

      expect(input.selectionStart).toBe(0);
      expect(input.selectionEnd).toBe(5);
    });

    it('advances the caret when typing the same character over a filled slot', () => {
      render(<MaskedInput mask="999" defaultValue="555" />);

      const input = getInput();

      setSelection(input, 0, 0);
      fireBeforeInput(input, 'insertText', '5');

      expect(input.selectionStart).toBe(1);
      expect(input.selectionEnd).toBe(1);
    });

    it('selects all on focus when partially filled', () => {
      render(<MaskedInput mask="(999) 999" defaultValue="(555)" />);

      const input = getInput();

      setSelection(input, 9, 9);
      fireEvent.focus(input);

      expect(input.selectionStart).toBe(0);
      expect(input.selectionEnd).toBe(input.value.length);
    });

    it('selects all on focus when every slot is filled', () => {
      render(<MaskedInput mask="(999) 999" defaultValue="(555) 123" />);

      const input = getInput();

      setSelection(input, 0, 0);
      fireEvent.focus(input);

      expect(input.selectionStart).toBe(0);
      expect(input.selectionEnd).toBe(9);
    });

    it('lets click handle caret placement when focus follows a mousedown', () => {
      render(<MaskedInput mask="(999) 999" defaultValue="(555)" />);

      const input = getInput();

      fireEvent.mouseDown(input);
      setSelection(input, 2, 2);
      fireEvent.focus(input);
      fireEvent.click(input);

      // snapCaretToSlot keeps the caret at position 2 since it's already on a slot.
      expect(input.selectionStart).toBe(2);
    });
  });

  describe('mask change', () => {
    it('reformats internal slots when the mask changes', () => {
      const { rerender } = render(<MaskedInput mask="999-9999" defaultValue="555-1234" />);

      expect(getInput().value).toBe('555-1234');

      rerender(<MaskedInput mask="999/9999" defaultValue="555-1234" />);

      expect(getInput().value).toBe('555/1234');
    });

    it('reformats placeholder when placeholder prop changes', () => {
      const { rerender } = render(<MaskedInput mask="999" />);

      expect(getInput().placeholder).toBe('___');

      rerender(<MaskedInput mask="999" placeholder="000" />);

      expect(getInput().placeholder).toBe('000');
    });
  });

  describe('ref', () => {
    it('populates a ref object with the input element', () => {
      const ref = createRef<HTMLInputElement>();
      render(<MaskedInput mask="999-9999" ref={ref} />);

      expect(ref.current).toBe(getInput());
    });

    it('clears the ref object on unmount', () => {
      const ref = createRef<HTMLInputElement>();
      const { unmount } = render(<MaskedInput mask="999-9999" ref={ref} />);

      expect(ref.current).not.toBeNull();
      unmount();
      expect(ref.current).toBeNull();
    });

    it('invokes a function ref with the input element', () => {
      const ref = vi.fn();
      render(<MaskedInput mask="999-9999" ref={ref} />);

      expect(ref).toHaveBeenCalledWith(getInput());
    });

    it('invokes a function ref with null on unmount', () => {
      const ref = vi.fn();
      const { unmount } = render(<MaskedInput mask="999-9999" ref={ref} />);

      ref.mockClear();
      unmount();

      expect(ref).toHaveBeenCalledWith(null);
    });

    it('keeps internal behavior working when an external ref is provided', () => {
      const ref = createRef<HTMLInputElement>();
      const onChange = vi.fn();
      render(<MaskedInput mask="999-9999" ref={ref} onChange={onChange} />);

      const input = getInput();
      setSelection(input, 0, 0);
      fireBeforeInput(input, 'insertText', '5');

      expect(ref.current).toBe(input);
      expect(lastChange(onChange).unmaskedValue).toBe('5');
    });
  });
});
