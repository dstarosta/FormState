import { createRef } from 'react';
import { describe, expect, it, afterEach, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { FormResetBlocker } from '../../src/helpers/form-reset-blocker';

const mockUseFormStatus = vi.hoisted(() => vi.fn(() => ({ pending: false })));

vi.mock('react-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-dom')>();
  return { ...actual, useFormStatus: mockUseFormStatus };
});

describe('FormResetBlocker', () => {
  afterEach(() => {
    cleanup();
    mockUseFormStatus.mockReturnValue({ pending: false });
  });

  describe('reset blocking via innerRef (no formRef prop)', () => {
    it('does not block reset events when not pending', () => {
      mockUseFormStatus.mockReturnValue({ pending: false });

      render(
        <form data-testid="form">
          <input name="name" />
          <FormResetBlocker />
        </form>
      );

      screen.getByRole<HTMLInputElement>('textbox').value = 'Tom';
      screen.getByTestId<HTMLFormElement>('form').reset();

      expect(screen.getByRole('textbox')).toHaveValue('');
    });

    it('blocks reset events when pending', () => {
      mockUseFormStatus.mockReturnValue({ pending: true });

      render(
        <form data-testid="form">
          <input name="name" />
          <FormResetBlocker />
        </form>
      );

      screen.getByRole<HTMLInputElement>('textbox').value = 'Tom';
      screen.getByTestId<HTMLFormElement>('form').reset();

      expect(screen.getByRole('textbox')).toHaveValue('Tom');
    });
  });

  describe('reset blocking via formRef prop', () => {
    it('does not block reset events when not pending', () => {
      mockUseFormStatus.mockReturnValue({ pending: false });

      const ref = createRef<HTMLFormElement>();

      render(
        <form data-testid="form" ref={ref}>
          <input name="name" />
          <FormResetBlocker formRef={ref} />
        </form>
      );

      screen.getByRole<HTMLInputElement>('textbox').value = 'Tom';
      screen.getByTestId<HTMLFormElement>('form').reset();

      expect(screen.getByRole('textbox')).toHaveValue('');
    });

    it('blocks reset events when pending', () => {
      mockUseFormStatus.mockReturnValue({ pending: true });

      const ref = createRef<HTMLFormElement>();

      render(
        <form data-testid="form" ref={ref}>
          <input name="name" />
          <FormResetBlocker formRef={ref} />
        </form>
      );

      screen.getByRole<HTMLInputElement>('textbox').value = 'Tom';
      screen.getByTestId<HTMLFormElement>('form').reset();

      expect(screen.getByRole('textbox')).toHaveValue('Tom');
    });
  });

  describe('listener lifecycle', () => {
    it('removes the event listener on unmount', () => {
      mockUseFormStatus.mockReturnValue({ pending: true });

      const { unmount } = render(
        <form data-testid="form">
          <input name="name" />
          <FormResetBlocker />
        </form>
      );

      const form = screen.getByTestId<HTMLFormElement>('form');
      const input = screen.getByRole('textbox');

      screen.getByRole<HTMLInputElement>('textbox').value = 'Tom';
      unmount();

      // After unmount the listener is removed — reset should proceed.
      form.reset();

      expect(input).toHaveValue('');
    });

    it('allows reset after pending transitions from true to false', () => {
      mockUseFormStatus.mockReturnValue({ pending: true });

      const { rerender } = render(
        <form data-testid="form">
          <input name="name" />
          <FormResetBlocker />
        </form>
      );

      screen.getByRole<HTMLInputElement>('textbox').value = 'Tom';
      screen.getByTestId<HTMLFormElement>('form').reset();

      expect(screen.getByRole('textbox')).toHaveValue('Tom');

      mockUseFormStatus.mockReturnValue({ pending: false });

      act(() => {
        rerender(
          <form data-testid="form">
            <input name="name" />
            <FormResetBlocker />
          </form>
        );
      });

      screen.getByTestId<HTMLFormElement>('form').reset();

      expect(screen.getByRole('textbox')).toHaveValue('');
    });

    it('does not throw when rendered outside a form element', () => {
      expect(() => render(<FormResetBlocker />)).not.toThrow();
    });

    it('does not throw when formRef is not attached to a form element', () => {
      const ref = createRef<HTMLFormElement>();

      expect(() =>
        render(
          <div>
            <FormResetBlocker formRef={ref} />
          </div>
        )
      ).not.toThrow();
    });
  });
});
