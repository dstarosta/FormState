import { describe, expect, it, afterEach, vi } from 'vitest';
import { act, cleanup, createEvent, fireEvent, render, screen } from '@testing-library/react';

import { SecureInput } from './secure-input';

const mask = (n: number) => '•'.repeat(n);

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

describe('SecureInput', () => {
  afterEach(() => {
    cleanup();
  });

  describe('rendering', () => {
    it('renders an input element', () => {
      render(<SecureInput />);

      expect(getInput()).toBeInTheDocument();
    });

    it('renders with type="text" by default', () => {
      render(<SecureInput />);

      expect(getInput().type).toBe('text');
    });

    it('renders with type="password" when specified', () => {
      render(<SecureInput type="password" aria-label="password" />);

      expect(screen.getByLabelText<HTMLInputElement>('password').type).toBe('password');
    });

    it('has autoComplete="off"', () => {
      render(<SecureInput />);

      expect(getInput().autocomplete).toBe('off');
    });

    it('has spellCheck disabled', () => {
      render(<SecureInput />);

      expect(getInput().getAttribute('spellcheck')).toBe('false');
    });

    it('has password-manager ignore attributes', () => {
      render(<SecureInput />);

      const input = getInput();

      expect(input.dataset['1pIgnore']).toBe('true');
      expect(input.dataset['lpignore']).toBe('true');
    });

    it('forwards additional props', () => {
      render(<SecureInput id="secure" className="my-class" placeholder="Enter value" />);

      const input = getInput();

      expect(input.id).toBe('secure');
      expect(input.className).toBe('my-class');
      expect(input.placeholder).toBe('Enter value');
    });

    it('sets the name attribute', () => {
      render(<SecureInput name="password" />);

      expect(getInput().name).toBe('password');
    });

    it('shows empty value when no defaultValue is provided', () => {
      render(<SecureInput />);

      expect(getInput().value).toBe('');
    });

    it('shows masked value for defaultValue', () => {
      render(<SecureInput defaultValue="hello" />);

      expect(getInput().value).toBe(mask(5));
    });

    it('shows masked value for controlled value', () => {
      render(<SecureInput value="secret" />);

      expect(getInput().value).toBe(mask(6));
    });

    it('does not expose the real value in the DOM', () => {
      render(<SecureInput defaultValue="mysecret" />);

      expect(getInput().value).not.toContain('mysecret');
    });
  });

  describe('uncontrolled (defaultValue)', () => {
    it('initializes internal state with defaultValue', () => {
      render(<SecureInput defaultValue="abc" />);

      expect(getInput().value).toBe(mask(3));
    });

    it('resets internal state when defaultValue prop changes', () => {
      const { rerender } = render(<SecureInput defaultValue="abc" />);

      expect(getInput().value).toBe(mask(3));

      rerender(<SecureInput defaultValue="hello" />);

      expect(getInput().value).toBe(mask(5));
    });

    it('updates the masked display after typing', () => {
      render(<SecureInput defaultValue="abc" />);

      const input = getInput();

      setSelection(input, 3, 3);
      fireEvent.keyDown(input, { key: 'x' });

      expect(input.value).toBe(mask(4));
    });

    it('reflects accumulated changes', () => {
      const onSecureChange = vi.fn();

      render(<SecureInput defaultValue="ab" onSecureChange={onSecureChange} />);

      const input = getInput();

      setSelection(input, 2, 2);
      fireEvent.keyDown(input, { key: 'c' });

      expect(onSecureChange).toHaveBeenLastCalledWith('abc');

      setSelection(input, 3, 3);
      fireEvent.keyDown(input, { key: 'd' });

      expect(onSecureChange).toHaveBeenLastCalledWith('abcd');
    });
  });

  describe('controlled (value)', () => {
    it('reflects the controlled value', () => {
      render(<SecureInput value="hello" />);

      expect(getInput().value).toBe(mask(5));
    });

    it('does not update the display when controlled and no external state change', () => {
      const onChange = vi.fn();

      render(<SecureInput value="hello" onChange={onChange} />);

      const input = getInput();

      setSelection(input, 5, 5);
      fireEvent.keyDown(input, { key: 'x' });

      expect(input.value).toBe(mask(5));
      expect(onChange).toHaveBeenCalledOnce();
    });

    it('uses the controlled value (not internal state) as the base for edits', () => {
      const onSecureChange = vi.fn();

      render(<SecureInput value="hi" onSecureChange={onSecureChange} />);

      const input = getInput();

      setSelection(input, 2, 2);
      fireEvent.keyDown(input, { key: '!' });

      expect(onSecureChange).toHaveBeenCalledWith('hi!');
    });
  });

  describe('keyboard input (handleKeyDown)', () => {
    it('appends a character at the end', () => {
      const onSecureChange = vi.fn();

      render(<SecureInput defaultValue="abc" onSecureChange={onSecureChange} />);

      const input = getInput();

      setSelection(input, 3, 3);
      fireEvent.keyDown(input, { key: 'd' });

      expect(onSecureChange).toHaveBeenCalledWith('abcd');
    });

    it('inserts a character at the cursor position', () => {
      const onSecureChange = vi.fn();

      render(<SecureInput defaultValue="abc" onSecureChange={onSecureChange} />);

      const input = getInput();

      setSelection(input, 1, 1);
      fireEvent.keyDown(input, { key: 'X' });

      expect(onSecureChange).toHaveBeenCalledWith('aXbc');
    });

    it('replaces a selection with the typed character', () => {
      const onSecureChange = vi.fn();

      render(<SecureInput defaultValue="abcde" onSecureChange={onSecureChange} />);

      const input = getInput();

      setSelection(input, 1, 4);
      fireEvent.keyDown(input, { key: 'Z' });

      expect(onSecureChange).toHaveBeenCalledWith('aZe');
    });

    it('does not insert when Alt key is held', () => {
      const onSecureChange = vi.fn();

      render(<SecureInput defaultValue="abc" onSecureChange={onSecureChange} />);

      const input = getInput();

      setSelection(input, 3, 3);
      fireEvent.keyDown(input, { key: 'a', altKey: true });

      expect(onSecureChange).not.toHaveBeenCalled();
    });

    it('does not insert when Ctrl key is held', () => {
      const onSecureChange = vi.fn();

      render(<SecureInput defaultValue="abc" onSecureChange={onSecureChange} />);

      const input = getInput();

      setSelection(input, 3, 3);
      fireEvent.keyDown(input, { key: 'a', ctrlKey: true });

      expect(onSecureChange).not.toHaveBeenCalled();
    });

    it('does not insert when Meta key is held', () => {
      const onSecureChange = vi.fn();

      render(<SecureInput defaultValue="abc" onSecureChange={onSecureChange} />);

      const input = getInput();

      setSelection(input, 3, 3);
      fireEvent.keyDown(input, { key: 'a', metaKey: true });

      expect(onSecureChange).not.toHaveBeenCalled();
    });

    it('ignores multi-character keys (e.g. ArrowLeft, Enter, Escape)', () => {
      const onSecureChange = vi.fn();

      render(<SecureInput defaultValue="abc" onSecureChange={onSecureChange} />);

      const input = getInput();

      fireEvent.keyDown(input, { key: 'ArrowLeft' });
      fireEvent.keyDown(input, { key: 'Enter' });
      fireEvent.keyDown(input, { key: 'Escape' });
      fireEvent.keyDown(input, { key: 'Tab' });

      expect(onSecureChange).not.toHaveBeenCalled();
    });

    it('prevents default on Ctrl+Z', () => {
      render(<SecureInput defaultValue="abc" />);

      const event = createEvent.keyDown(getInput(), { key: 'z', ctrlKey: true });

      fireEvent(getInput(), event);

      expect(event.defaultPrevented).toBe(true);
    });

    it('prevents default on Ctrl+Y', () => {
      render(<SecureInput defaultValue="abc" />);

      const event = createEvent.keyDown(getInput(), { key: 'y', ctrlKey: true });

      fireEvent(getInput(), event);

      expect(event.defaultPrevented).toBe(true);
    });

    it('prevents default on Meta+Z', () => {
      render(<SecureInput defaultValue="abc" />);

      const event = createEvent.keyDown(getInput(), { key: 'z', metaKey: true });

      fireEvent(getInput(), event);

      expect(event.defaultPrevented).toBe(true);
    });

    it('prevents default on Meta+Y', () => {
      render(<SecureInput defaultValue="abc" />);

      const event = createEvent.keyDown(getInput(), { key: 'y', metaKey: true });

      fireEvent(getInput(), event);

      expect(event.defaultPrevented).toBe(true);
    });

    describe('Backspace key', () => {
      it('deletes the character before the cursor', () => {
        const onSecureChange = vi.fn();

        render(<SecureInput defaultValue="abc" onSecureChange={onSecureChange} />);

        const input = getInput();

        setSelection(input, 2, 2);
        fireEvent.keyDown(input, { key: 'Backspace' });

        expect(onSecureChange).toHaveBeenCalledWith('ac');
      });

      it('deletes the last character when cursor is at end', () => {
        const onSecureChange = vi.fn();

        render(<SecureInput defaultValue="abc" onSecureChange={onSecureChange} />);

        const input = getInput();

        setSelection(input, 3, 3);
        fireEvent.keyDown(input, { key: 'Backspace' });

        expect(onSecureChange).toHaveBeenCalledWith('ab');
      });

      it('deletes the selection on Backspace', () => {
        const onSecureChange = vi.fn();

        render(<SecureInput defaultValue="abcde" onSecureChange={onSecureChange} />);

        const input = getInput();

        setSelection(input, 1, 4);
        fireEvent.keyDown(input, { key: 'Backspace' });

        expect(onSecureChange).toHaveBeenCalledWith('ae');
      });

      it('does nothing when cursor is at the start with no selection', () => {
        const onSecureChange = vi.fn();

        render(<SecureInput defaultValue="abc" onSecureChange={onSecureChange} />);

        const input = getInput();

        setSelection(input, 0, 0);
        fireEvent.keyDown(input, { key: 'Backspace' });

        expect(onSecureChange).not.toHaveBeenCalled();
      });

      it('prevents default', () => {
        render(<SecureInput defaultValue="abc" />);

        const event = createEvent.keyDown(getInput(), { key: 'Backspace' });

        fireEvent(getInput(), event);

        expect(event.defaultPrevented).toBe(true);
      });
    });

    describe('Delete key', () => {
      it('deletes the character after the cursor', () => {
        const onSecureChange = vi.fn();

        render(<SecureInput defaultValue="abc" onSecureChange={onSecureChange} />);

        const input = getInput();

        setSelection(input, 0, 0);
        fireEvent.keyDown(input, { key: 'Delete' });

        expect(onSecureChange).toHaveBeenCalledWith('bc');
      });

      it('deletes the character at cursor position (middle)', () => {
        const onSecureChange = vi.fn();

        render(<SecureInput defaultValue="abc" onSecureChange={onSecureChange} />);

        const input = getInput();

        setSelection(input, 1, 1);
        fireEvent.keyDown(input, { key: 'Delete' });

        expect(onSecureChange).toHaveBeenCalledWith('ac');
      });

      it('deletes the selection on Delete', () => {
        const onSecureChange = vi.fn();

        render(<SecureInput defaultValue="abcde" onSecureChange={onSecureChange} />);

        const input = getInput();

        setSelection(input, 1, 4);
        fireEvent.keyDown(input, { key: 'Delete' });

        expect(onSecureChange).toHaveBeenCalledWith('ae');
      });

      it('does nothing when cursor is at the end with no selection', () => {
        const onSecureChange = vi.fn();

        render(<SecureInput defaultValue="abc" onSecureChange={onSecureChange} />);

        const input = getInput();

        setSelection(input, 3, 3);
        fireEvent.keyDown(input, { key: 'Delete' });

        expect(onSecureChange).not.toHaveBeenCalled();
      });

      it('prevents default', () => {
        render(<SecureInput defaultValue="abc" />);

        const event = createEvent.keyDown(getInput(), { key: 'Delete' });

        fireEvent(getInput(), event);

        expect(event.defaultPrevented).toBe(true);
      });
    });

    describe('IME composition (isComposing)', () => {
      it('does not insert a character while composing', () => {
        const onSecureChange = vi.fn();

        render(<SecureInput defaultValue="abc" onSecureChange={onSecureChange} />);

        const input = getInput();

        setSelection(input, 3, 3);
        fireEvent.keyDown(input, { key: 'n', isComposing: true });

        expect(onSecureChange).not.toHaveBeenCalled();
        expect(input.value).toBe(mask(3));
      });

      it('does not delete on Backspace while composing', () => {
        const onSecureChange = vi.fn();

        render(<SecureInput defaultValue="abc" onSecureChange={onSecureChange} />);

        const input = getInput();

        setSelection(input, 3, 3);
        fireEvent.keyDown(input, { key: 'Backspace', isComposing: true });

        expect(onSecureChange).not.toHaveBeenCalled();
        expect(input.value).toBe(mask(3));
      });

      it('does not delete on Delete while composing', () => {
        const onSecureChange = vi.fn();

        render(<SecureInput defaultValue="abc" onSecureChange={onSecureChange} />);

        const input = getInput();

        setSelection(input, 0, 0);
        fireEvent.keyDown(input, { key: 'Delete', isComposing: true });

        expect(onSecureChange).not.toHaveBeenCalled();
        expect(input.value).toBe(mask(3));
      });

      it('still inserts when isComposing is false', () => {
        const onSecureChange = vi.fn();

        render(<SecureInput defaultValue="abc" onSecureChange={onSecureChange} />);

        const input = getInput();

        setSelection(input, 3, 3);
        fireEvent.keyDown(input, { key: 'n', isComposing: false });

        expect(onSecureChange).toHaveBeenCalledWith('abcn');
      });
    });
  });

  describe('readOnly', () => {
    it('does not modify the value on key press', () => {
      const onSecureChange = vi.fn();

      render(<SecureInput defaultValue="abc" readOnly onSecureChange={onSecureChange} />);

      const input = getInput();

      setSelection(input, 3, 3);
      fireEvent.keyDown(input, { key: 'x' });

      expect(onSecureChange).not.toHaveBeenCalled();
      expect(input.value).toBe(mask(3));
    });

    it('does not delete on Backspace', () => {
      const onSecureChange = vi.fn();

      render(<SecureInput defaultValue="abc" readOnly onSecureChange={onSecureChange} />);

      const input = getInput();

      setSelection(input, 3, 3);
      fireEvent.keyDown(input, { key: 'Backspace' });

      expect(onSecureChange).not.toHaveBeenCalled();
      expect(input.value).toBe(mask(3));
    });

    it('does not delete on Delete', () => {
      const onSecureChange = vi.fn();

      render(<SecureInput defaultValue="abc" readOnly onSecureChange={onSecureChange} />);

      const input = getInput();

      setSelection(input, 0, 0);
      fireEvent.keyDown(input, { key: 'Delete' });

      expect(onSecureChange).not.toHaveBeenCalled();
      expect(input.value).toBe(mask(3));
    });

    it('does not paste', () => {
      const onSecureChange = vi.fn();

      render(<SecureInput defaultValue="abc" readOnly onSecureChange={onSecureChange} />);

      const input = getInput();

      setSelection(input, 3, 3);
      fireEvent.paste(input, { clipboardData: { getData: () => 'xyz' } });

      expect(onSecureChange).not.toHaveBeenCalled();
      expect(input.value).toBe(mask(3));
    });

    it('renders with the readOnly attribute', () => {
      render(<SecureInput defaultValue="abc" readOnly />);

      expect(getInput().readOnly).toBe(true);
    });
  });

  describe('disabled', () => {
    it('does not modify the value on key press', () => {
      const onSecureChange = vi.fn();

      render(<SecureInput defaultValue="abc" disabled onSecureChange={onSecureChange} />);

      const input = getInput();

      setSelection(input, 3, 3);
      fireEvent.keyDown(input, { key: 'x' });

      expect(onSecureChange).not.toHaveBeenCalled();
      expect(input.value).toBe(mask(3));
    });

    it('does not paste', () => {
      const onSecureChange = vi.fn();

      render(<SecureInput defaultValue="abc" disabled onSecureChange={onSecureChange} />);

      const input = getInput();

      setSelection(input, 3, 3);
      fireEvent.paste(input, { clipboardData: { getData: () => 'xyz' } });

      expect(onSecureChange).not.toHaveBeenCalled();
      expect(input.value).toBe(mask(3));
    });

    it('renders with the disabled attribute', () => {
      render(<SecureInput defaultValue="abc" disabled />);

      expect(getInput().disabled).toBe(true);
    });
  });

  describe('beforeinput events', () => {
    describe('insertText', () => {
      it('inserts text at the cursor position', () => {
        const onSecureChange = vi.fn();

        render(<SecureInput defaultValue="abc" onSecureChange={onSecureChange} />);

        const input = getInput();

        setSelection(input, 3, 3);
        fireBeforeInput(input, 'insertText', 'd');

        expect(onSecureChange).toHaveBeenCalledWith('abcd');
      });

      it('replaces the selection with the inserted text', () => {
        const onSecureChange = vi.fn();

        render(<SecureInput defaultValue="abcde" onSecureChange={onSecureChange} />);

        const input = getInput();

        setSelection(input, 1, 4);
        fireBeforeInput(input, 'insertText', 'Z');

        expect(onSecureChange).toHaveBeenCalledWith('aZe');
      });
    });

    describe('insertCompositionText', () => {
      it('inserts composed text at the cursor position', () => {
        const onSecureChange = vi.fn();

        render(<SecureInput defaultValue="abc" onSecureChange={onSecureChange} />);

        const input = getInput();

        setSelection(input, 3, 3);
        fireBeforeInput(input, 'insertCompositionText', 'X');

        expect(onSecureChange).toHaveBeenCalledWith('abcX');
      });

      it('replaces the selection with composed text', () => {
        const onSecureChange = vi.fn();

        render(<SecureInput defaultValue="abcde" onSecureChange={onSecureChange} />);

        const input = getInput();

        setSelection(input, 0, 5);
        fireBeforeInput(input, 'insertCompositionText', 'replaced');

        expect(onSecureChange).toHaveBeenCalledWith('replaced');
      });
    });

    describe('insertFromDrop', () => {
      it('inserts dropped text at the cursor position', () => {
        const onSecureChange = vi.fn();

        render(<SecureInput defaultValue="abc" onSecureChange={onSecureChange} />);

        const input = getInput();

        setSelection(input, 1, 3);
        fireBeforeInput(input, 'insertFromDrop', 'XY');

        expect(onSecureChange).toHaveBeenCalledWith('aXY');
      });
    });

    describe('deleteContentBackward', () => {
      it('deletes the previous character when there is no selection', () => {
        const onSecureChange = vi.fn();

        render(<SecureInput defaultValue="abc" onSecureChange={onSecureChange} />);

        const input = getInput();

        setSelection(input, 2, 2);
        fireBeforeInput(input, 'deleteContentBackward');

        expect(onSecureChange).toHaveBeenCalledWith('ac');
      });

      it('deletes the selection', () => {
        const onSecureChange = vi.fn();

        render(<SecureInput defaultValue="abcde" onSecureChange={onSecureChange} />);

        const input = getInput();

        setSelection(input, 1, 4);
        fireBeforeInput(input, 'deleteContentBackward');

        expect(onSecureChange).toHaveBeenCalledWith('ae');
      });

      it('does nothing at the start with no selection', () => {
        const onSecureChange = vi.fn();

        render(<SecureInput defaultValue="abc" onSecureChange={onSecureChange} />);

        const input = getInput();

        setSelection(input, 0, 0);
        fireBeforeInput(input, 'deleteContentBackward');

        expect(onSecureChange).not.toHaveBeenCalled();
      });
    });

    describe('deleteContentForward', () => {
      it('deletes the next character when there is no selection', () => {
        const onSecureChange = vi.fn();

        render(<SecureInput defaultValue="abc" onSecureChange={onSecureChange} />);

        const input = getInput();

        setSelection(input, 1, 1);
        fireBeforeInput(input, 'deleteContentForward');

        expect(onSecureChange).toHaveBeenCalledWith('ac');
      });

      it('deletes the selection', () => {
        const onSecureChange = vi.fn();

        render(<SecureInput defaultValue="abcde" onSecureChange={onSecureChange} />);

        const input = getInput();

        setSelection(input, 1, 4);
        fireBeforeInput(input, 'deleteContentForward');

        expect(onSecureChange).toHaveBeenCalledWith('ae');
      });

      it('does nothing at the end with no selection', () => {
        const onSecureChange = vi.fn();

        render(<SecureInput defaultValue="abc" onSecureChange={onSecureChange} />);

        const input = getInput();

        setSelection(input, 3, 3);
        fireBeforeInput(input, 'deleteContentForward');

        expect(onSecureChange).not.toHaveBeenCalled();
      });
    });

    describe.each(['deleteWordBackward', 'deleteSoftLineBackward', 'deleteHardLineBackward'])(
      '%s',
      (inputType) => {
        it('deletes from cursor to beginning when there is no selection', () => {
          const onSecureChange = vi.fn();

          render(<SecureInput defaultValue="abcde" onSecureChange={onSecureChange} />);

          const input = getInput();

          setSelection(input, 3, 3);
          fireBeforeInput(input, inputType);

          expect(onSecureChange).toHaveBeenCalledWith('de');
        });

        it('deletes the selection when selection exists', () => {
          const onSecureChange = vi.fn();

          render(<SecureInput defaultValue="abcde" onSecureChange={onSecureChange} />);

          const input = getInput();

          setSelection(input, 1, 4);
          fireBeforeInput(input, inputType);

          expect(onSecureChange).toHaveBeenCalledWith('ae');
        });
      }
    );

    describe.each(['deleteWordForward', 'deleteSoftLineForward', 'deleteHardLineForward'])(
      '%s',
      (inputType) => {
        it('deletes from cursor to end when there is no selection', () => {
          const onSecureChange = vi.fn();

          render(<SecureInput defaultValue="abcde" onSecureChange={onSecureChange} />);

          const input = getInput();

          setSelection(input, 2, 2);
          fireBeforeInput(input, inputType);

          expect(onSecureChange).toHaveBeenCalledWith('ab');
        });

        it('deletes the selection when selection exists', () => {
          const onSecureChange = vi.fn();

          render(<SecureInput defaultValue="abcde" onSecureChange={onSecureChange} />);

          const input = getInput();

          setSelection(input, 1, 4);
          fireBeforeInput(input, inputType);

          expect(onSecureChange).toHaveBeenCalledWith('ae');
        });
      }
    );
  });

  describe('paste', () => {
    it('pastes text at the cursor position', () => {
      const onSecureChange = vi.fn();

      render(<SecureInput defaultValue="abc" onSecureChange={onSecureChange} />);

      const input = getInput();

      setSelection(input, 3, 3);
      fireEvent.paste(input, { clipboardData: { getData: () => 'xyz' } });

      expect(onSecureChange).toHaveBeenCalledWith('abcxyz');
    });

    it('inserts text in the middle of the value', () => {
      const onSecureChange = vi.fn();

      render(<SecureInput defaultValue="abc" onSecureChange={onSecureChange} />);

      const input = getInput();

      setSelection(input, 1, 1);
      fireEvent.paste(input, { clipboardData: { getData: () => '12' } });

      expect(onSecureChange).toHaveBeenCalledWith('a12bc');
    });

    it('replaces selection on paste', () => {
      const onSecureChange = vi.fn();

      render(<SecureInput defaultValue="abcde" onSecureChange={onSecureChange} />);

      const input = getInput();

      setSelection(input, 1, 4);
      fireEvent.paste(input, { clipboardData: { getData: () => 'XY' } });

      expect(onSecureChange).toHaveBeenCalledWith('aXYe');
    });

    it('does nothing with empty text', () => {
      const onSecureChange = vi.fn();

      render(<SecureInput defaultValue="abc" onSecureChange={onSecureChange} />);

      const input = getInput();

      fireEvent.paste(input, { clipboardData: { getData: () => '' } });

      expect(onSecureChange).not.toHaveBeenCalled();
    });

    it('prevents default to block native paste behavior', () => {
      render(<SecureInput defaultValue="abc" />);

      const input = getInput();
      const event = createEvent.paste(input);

      Object.defineProperty(event, 'clipboardData', {
        value: { getData: () => 'text' },
      });

      fireEvent(input, event);

      expect(event.defaultPrevented).toBe(true);
    });
  });

  describe('copy and cut', () => {
    it('prevents the copy event to protect the real value', () => {
      render(<SecureInput defaultValue="secret" />);

      const event = createEvent.copy(getInput());

      fireEvent(getInput(), event);

      expect(event.defaultPrevented).toBe(true);
    });

    it('prevents the cut event to protect the real value', () => {
      render(<SecureInput defaultValue="secret" />);

      const event = createEvent.cut(getInput());

      fireEvent(getInput(), event);

      expect(event.defaultPrevented).toBe(true);
    });
  });

  describe('drag and drop', () => {
    it('prevents dragstart', () => {
      render(<SecureInput defaultValue="secret" />);

      const event = createEvent.dragStart(getInput());

      fireEvent(getInput(), event);

      expect(event.defaultPrevented).toBe(true);
    });

    it('prevents drop', () => {
      render(<SecureInput defaultValue="secret" />);

      const event = createEvent.drop(getInput());

      fireEvent(getInput(), event);

      expect(event.defaultPrevented).toBe(true);
    });
  });

  describe('blur', () => {
    it('calls onBlur event', () => {
      const onBlur = vi.fn();

      render(<SecureInput defaultValue="abc" onBlur={onBlur} />);

      fireEvent.blur(getInput());

      expect(onBlur).toHaveBeenCalledOnce();
    });

    it('calls onSecureBlur with the real value', () => {
      const onSecureBlur = vi.fn();

      render(<SecureInput defaultValue="mypassword" onSecureBlur={onSecureBlur} />);

      fireEvent.blur(getInput());

      expect(onSecureBlur).toHaveBeenCalledWith('mypassword');
    });

    it('calls onSecureBlur with the updated real value after typing', () => {
      const onSecureBlur = vi.fn();

      render(<SecureInput defaultValue="abc" onSecureBlur={onSecureBlur} />);

      const input = getInput();

      setSelection(input, 3, 3);

      fireEvent.keyDown(input, { key: 'd' });
      fireEvent.blur(input);

      expect(onSecureBlur).toHaveBeenCalledWith('abcd');
    });

    it('calls both onBlur and onSecureBlur on blur', () => {
      const onBlur = vi.fn();
      const onSecureBlur = vi.fn();

      render(<SecureInput defaultValue="abc" onBlur={onBlur} onSecureBlur={onSecureBlur} />);

      fireEvent.blur(getInput());

      expect(onBlur).toHaveBeenCalledOnce();
      expect(onSecureBlur).toHaveBeenCalledOnce();
    });

    it('does not throw when onBlur is not provided', () => {
      const onSecureBlur = vi.fn();

      render(<SecureInput defaultValue="abc" onSecureBlur={onSecureBlur} />);

      expect(() => fireEvent.blur(getInput())).not.toThrow();
    });

    it('does not throw when onSecureBlur is not provided', () => {
      const onBlur = vi.fn();

      render(<SecureInput defaultValue="abc" onBlur={onBlur} />);

      expect(() => fireEvent.blur(getInput())).not.toThrow();
    });
  });

  describe('onChange and onSecureChange callbacks', () => {
    it('does not call onChange when a native change event fires directly on the input', () => {
      const onChange = vi.fn();

      render(<SecureInput defaultValue="abc" onChange={onChange} />);

      fireEvent.change(getInput(), { target: { value: 'injected' } });

      expect(onChange).not.toHaveBeenCalled();
    });

    it('calls onChange with a synthetic event containing the masked value', () => {
      const onChange = vi.fn();

      render(<SecureInput defaultValue="abc" onChange={onChange} />);

      const input = getInput();

      setSelection(input, 3, 3);
      fireEvent.keyDown(input, { key: 'd' });

      expect(onChange).toHaveBeenCalledOnce();

      const event = onChange.mock.calls[0]?.[0] as React.ChangeEvent<HTMLInputElement>;

      expect(event.target.value).toBe(mask(4));
    });

    it('calls onChange with the name property on the event target', () => {
      const onChange = vi.fn();

      render(<SecureInput defaultValue="abc" name="password" onChange={onChange} />);

      const input = getInput();

      setSelection(input, 3, 3);

      fireEvent.keyDown(input, { key: 'd' });

      const event = onChange.mock.calls[0]?.[0] as React.ChangeEvent<HTMLInputElement>;

      expect(event.target.name).toBe('password');
      expect(event.currentTarget.name).toBe('password');
    });

    it('calls onSecureChange with the real (unmasked) value', () => {
      const onSecureChange = vi.fn();

      render(<SecureInput defaultValue="abc" onSecureChange={onSecureChange} />);

      const input = getInput();

      setSelection(input, 3, 3);
      fireEvent.keyDown(input, { key: 'd' });

      expect(onSecureChange).toHaveBeenCalledWith('abcd');
    });

    it('onChange event has type "change"', () => {
      const onChange = vi.fn();

      render(<SecureInput defaultValue="abc" onChange={onChange} />);

      const input = getInput();

      setSelection(input, 3, 3);
      fireEvent.keyDown(input, { key: 'd' });

      const event = onChange.mock.calls[0]?.[0] as React.ChangeEvent<HTMLInputElement>;
      expect(event.type).toBe('change');
    });

    it('onChange synthetic event helper methods are callable without error', () => {
      const onChange = vi.fn();

      render(<SecureInput defaultValue="abc" onChange={onChange} />);

      const input = getInput();

      setSelection(input, 3, 3);
      fireEvent.keyDown(input, { key: 'd' });

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

    it('does not throw when onChange is not provided', () => {
      render(<SecureInput defaultValue="abc" />);

      const input = getInput();

      setSelection(input, 3, 3);

      expect(() => fireEvent.keyDown(input, { key: 'd' })).not.toThrow();
    });

    it('does not throw when onSecureChange is not provided', () => {
      render(<SecureInput defaultValue="abc" />);

      const input = getInput();

      setSelection(input, 3, 3);

      expect(() => fireEvent.keyDown(input, { key: 'd' })).not.toThrow();
    });
  });
});
