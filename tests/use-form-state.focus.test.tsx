import { useRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { useFormState, type FormClassOptions, type SubmitState } from '../src';
import { schema, type Schema, type InitialSchema } from './fixtures';
import { toLiteral } from '../src/helpers/value-converter';

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

describe('focus', () => {
  it('focuses the given element', () => {
    const TestForm = () => {
      const nameRef = useRef<HTMLInputElement>(null);

      const { Form, formActions } = useFormState(schema);

      return (
        <Form>
          <input ref={nameRef} aria-label="name" defaultValue="" />
          <button
            type="button"
            onClick={() => {
              formActions.focus(nameRef.current, { focusVisible: true });
            }}
          >
            Focus
          </button>
          <button
            type="button"
            onClick={() => {
              formActions.blur();
            }}
          >
            Blur
          </button>
        </Form>
      );
    };

    render(<TestForm />);

    fireEvent.click(screen.getByText('Focus'));

    expect(screen.getByRole('textbox', { name: 'name' })).toHaveFocus();

    fireEvent.click(screen.getByText('Blur'));

    expect(screen.getByRole('textbox', { name: 'name' })).not.toHaveFocus();
  });

  it('focuses the given element by name', () => {
    const TestForm = () => {
      const { Form, formActions } = useFormState(schema);

      return (
        <Form>
          <input name="nameInput" aria-label="name" defaultValue="" />
          <button
            type="button"
            onClick={() => {
              formActions.focus('nameInput');
            }}
          >
            Focus
          </button>
        </Form>
      );
    };

    render(<TestForm />);

    fireEvent.click(screen.getByText('Focus'));

    expect(screen.getByRole('textbox', { name: 'name' })).toHaveFocus();
  });

  it('focuses the given element by inferred name', () => {
    const TestForm = () => {
      const { Form, formActions } = useFormState(schema);

      return (
        <Form>
          <input name={formActions.inferName('name')} aria-label="name" defaultValue="" />
          <button
            type="button"
            onClick={() => {
              formActions.focus(formActions.inferName('name'));
            }}
          >
            Focus
          </button>
        </Form>
      );
    };

    render(<TestForm />);

    fireEvent.click(screen.getByText('Focus'));

    expect(screen.getByRole('textbox', { name: 'name' })).toHaveFocus();
  });

  it('selects text when selectText is true', () => {
    const TestForm = () => {
      const nameRef = useRef<HTMLInputElement>(null);

      const { Form, formActions } = useFormState(schema);

      return (
        <Form>
          <input ref={nameRef} aria-label="name" defaultValue="John" />
          <button
            type="button"
            onClick={() => {
              formActions.focus(nameRef.current, {
                focusVisible: false,
                preventScroll: true,
                selectText: true,
              });
            }}
          >
            Focus
          </button>
        </Form>
      );
    };

    render(<TestForm />);

    fireEvent.click(screen.getByText('Focus'));

    const input = screen.getByRole<HTMLInputElement>('textbox', { name: 'name' });

    expect(input).toHaveFocus();
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(input.value.length);
  });

  it('does nothing when element is null', () => {
    const TestForm = () => {
      const { Form, formActions } = useFormState(schema);

      return (
        <Form>
          <input aria-label="name" defaultValue="" />
          <button
            type="button"
            onClick={() => {
              formActions.focus(null);
            }}
          >
            Focus
          </button>
        </Form>
      );
    };

    render(<TestForm />);

    fireEvent.click(screen.getByText('Focus'));

    expect(screen.getByRole('textbox', { name: 'name' })).not.toHaveFocus();
  });

  it('focuses when errorKey matches an active error', () => {
    const TestForm = () => {
      const nameRef = useRef<HTMLInputElement>(null);

      const { Form, formActions } = useFormState(schema, {
        validateOnMount: true,
      });

      return (
        <Form>
          <input ref={nameRef} aria-label="name" defaultValue="" />
          <button
            type="button"
            onClick={() => {
              formActions.focus(nameRef.current, { errorKey: 'name' });
            }}
          >
            Focus
          </button>
        </Form>
      );
    };

    render(<TestForm />);

    fireEvent.click(screen.getByText('Focus'));

    expect(screen.getByRole('textbox', { name: 'name' })).toHaveFocus();
  });

  it('focuses when errorKey is a path expression with an active error', () => {
    const TestForm = () => {
      const nameRef = useRef<HTMLInputElement>(null);

      const { Form, formActions } = useFormState(schema, {
        validateOnMount: true,
      });

      return (
        <Form>
          <input ref={nameRef} aria-label="name" defaultValue="" />
          <button
            type="button"
            onClick={() => {
              formActions.focus(nameRef.current, { errorKey: (path) => path.name });
            }}
          >
            Focus
          </button>
        </Form>
      );
    };

    render(<TestForm />);

    fireEvent.click(screen.getByText('Focus'));

    expect(screen.getByRole('textbox', { name: 'name' })).toHaveFocus();
  });

  it('does nothing when errorKey has no active error', () => {
    const TestForm = () => {
      const nameRef = useRef<HTMLInputElement>(null);
      const { Form, formActions } = useFormState(schema, {
        validateOnMount: true,
      });
      return (
        <Form>
          <input ref={nameRef} aria-label="name" defaultValue="" />
          <button
            type="button"
            onClick={() => {
              formActions.focus(nameRef.current, { errorKey: 'isActive' });
            }}
          >
            Focus
          </button>
        </Form>
      );
    };

    render(<TestForm />);

    fireEvent.click(screen.getByText('Focus'));

    expect(screen.getByRole('textbox', { name: 'name' })).not.toHaveFocus();
  });

  it('focuses the errored field after a failed submit', async () => {
    const TestForm = () => {
      const {
        Form,
        formState: { data },
        formActions: { change, focus },
        formHandlers: { handleSubmit },
      } = useFormState(schema);

      const onSubmit = (state: SubmitState<Schema>) => {
        if (state.valid) {
          return true;
        }

        // eslint-disable-next-line testing-library/no-node-access
        focus(document.querySelector<HTMLElement>('[name="name"]'), { errorKey: 'name' });
        return {};
      };

      return (
        <Form action={handleSubmit(onSubmit)}>
          <input
            name="category"
            aria-label="category"
            value={data.category}
            onChange={(event) => {
              change(
                'category',
                toLiteral<typeof data.category>(event.target.value, ['', 'legacy', 'unconfirmed'])
              );
            }}
          />
          <input
            name="name"
            aria-label="name"
            value={data.name}
            onChange={(event) => {
              change('name', event.target.value);
            }}
          />
          <button type="submit">Submit</button>
        </Form>
      );
    };

    render(<TestForm />);

    fireEvent.change(screen.getByRole('textbox', { name: 'name' }), {
      target: { value: '!' },
    });

    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: 'name' })).toHaveFocus();
    });
  });

  describe('focusOnFirstError', () => {
    it('focuses the first input with the error class', async () => {
      const TestForm = () => {
        const { Form, formActions, formClasses } = useFormState(schema, {
          validateOnMount: true,
        });

        return (
          <Form>
            <input aria-label="name" className={formClasses('name')} defaultValue="" />
            <button
              type="button"
              onClick={() => {
                formActions.focusOnFirstError();
              }}
            >
              Focus First Error
            </button>
          </Form>
        );
      };

      render(<TestForm />);

      fireEvent.click(screen.getByText('Focus First Error'));

      await waitFor(() => {
        expect(screen.getByRole('textbox', { name: 'name' })).toHaveFocus();
      });
    });

    it('focuses the first errored input when multiple exist', async () => {
      const TestForm = () => {
        const { Form, formActions, formClasses } = useFormState(schema, {
          validateOnMount: true,
        });

        return (
          <Form>
            <input aria-label="name" className={formClasses('name')} defaultValue="" />
            <input
              aria-label="age"
              className={formClasses((path) => path.info.age)}
              defaultValue=""
            />
            <button
              type="button"
              onClick={() => {
                formActions.focusOnFirstError();
              }}
            >
              Focus First Error
            </button>
          </Form>
        );
      };

      render(<TestForm />);

      fireEvent.click(screen.getByText('Focus First Error'));

      await waitFor(() => {
        expect(screen.getByRole('textbox', { name: 'name' })).toHaveFocus();
      });

      expect(screen.getByRole('textbox', { name: 'age' })).not.toHaveFocus();
    });

    it('focuses a textarea with the error class', async () => {
      const TestForm = () => {
        const { Form, formActions, formClasses } = useFormState(schema, {
          validateOnMount: true,
        });

        return (
          <Form>
            <textarea aria-label="name" className={formClasses('name')} defaultValue="" />
            <button
              type="button"
              onClick={() => {
                formActions.focusOnFirstError();
              }}
            >
              Focus First Error
            </button>
          </Form>
        );
      };

      render(<TestForm />);

      fireEvent.click(screen.getByText('Focus First Error'));

      await waitFor(() => {
        expect(screen.getByRole('textbox', { name: 'name' })).toHaveFocus();
      });
    });

    it('does nothing when no errored inputs exist', async () => {
      const TestForm = () => {
        const { Form, formActions } = useFormState(schema);

        return (
          <Form>
            <input aria-label="name" defaultValue="" />
            <button
              type="button"
              onClick={() => {
                formActions.focusOnFirstError();
              }}
            >
              Focus First Error
            </button>
          </Form>
        );
      };

      render(<TestForm />);

      fireEvent.click(screen.getByText('Focus First Error'));

      await waitFor(() => {
        expect(screen.getByRole('textbox', { name: 'name' })).not.toHaveFocus();
      });
    });

    it('uses a custom CSS prefix', async () => {
      const TestForm = () => {
        const { Form, formActions, formClasses } = useFormState(schema, {
          validateOnMount: true,
          cssOptions: { prefix: 'my-form' },
        });

        return (
          <Form>
            <input aria-label="name" className={formClasses('name')} defaultValue="" />
            <button
              type="button"
              onClick={() => {
                formActions.focusOnFirstError({ selectText: true });
              }}
            >
              Focus First Error
            </button>
          </Form>
        );
      };

      render(<TestForm />);

      fireEvent.click(screen.getByText('Focus First Error'));

      const input = screen.getByRole<HTMLInputElement>('textbox', { name: 'name' });

      await waitFor(() => {
        expect(input).toHaveFocus();
      });

      expect(input.selectionStart).toBe(0);
      expect(input.selectionEnd).toBe(input.value.length);
    });

    it('skips prefix-based classes for a single call when options.prefix is null', () => {
      const TestForm = () => {
        const { Form, formClasses } = useFormState(schema, {
          validateOnMount: true,
        });

        return (
          <Form>
            <input aria-label="prefixed" className={formClasses('name')} defaultValue="" />
            <input
              aria-label="prefixless"
              className={formClasses('name', {
                prefix: null,
                classNames: ({ isError }) => ['always', isError && 'has-error'],
              })}
              defaultValue=""
            />
          </Form>
        );
      };

      render(<TestForm />);

      const prefixed = screen
        .getByRole<HTMLInputElement>('textbox', { name: 'prefixed' })
        .className.split(' ')
        .filter(Boolean);
      const prefixless = screen
        .getByRole<HTMLInputElement>('textbox', { name: 'prefixless' })
        .className.split(' ')
        .filter(Boolean);

      expect(prefixed).toContain('form-state__error');
      expect(prefixed).toContain('form-state__required');

      expect(prefixless).toContain('always');
      expect(prefixless).toContain('has-error');
      expect(prefixless).not.toContain('form-state__error');
      expect(prefixless).not.toContain('form-state__required');
    });

    it('skips prefix-based classes when cssOptions.prefix is null', () => {
      const TestForm = () => {
        const { Form, formClasses } = useFormState(schema, {
          validateOnMount: true,
          cssOptions: { prefix: null },
        });

        return (
          <Form>
            <input
              aria-label="name"
              className={formClasses('name', {
                classNames: ({ isError }) => ['always', isError && 'has-error'],
              })}
              defaultValue=""
            />
          </Form>
        );
      };

      render(<TestForm />);

      const input = screen.getByRole<HTMLInputElement>('textbox', { name: 'name' });
      const classes = input.className.split(' ').filter(Boolean);

      expect(classes).toContain('always');
      expect(classes).toContain('has-error');
      expect(classes).not.toContain('form-state__error');
      expect(classes).not.toContain('form-state__required');
      expect(classes.every((c) => !c.startsWith('null'))).toBe(true);
    });

    it('focuses first errored field by name attribute when cssOptions.prefix is null', async () => {
      const TestForm = () => {
        const { Form, formActions } = useFormState(schema, {
          validateOnMount: true,
          cssOptions: { prefix: null },
        });

        return (
          <Form>
            <input aria-label="name" name="name" defaultValue="" />
            <button
              type="button"
              onClick={() => {
                formActions.focusOnFirstError();
              }}
            >
              Focus First Error
            </button>
          </Form>
        );
      };

      render(<TestForm />);

      fireEvent.click(screen.getByText('Focus First Error'));

      await waitFor(() => {
        expect(screen.getByRole('textbox', { name: 'name' })).toHaveFocus();
      });
    });

    it('scopes querying to the form captured from a prior interaction', async () => {
      const TestForms = () => {
        const formA = useFormState(schema, { validateOnMount: true });
        const formB = useFormState(schema, { validateOnMount: true });

        return (
          <>
            <formA.Form>
              <input
                aria-label="A-name"
                name="name"
                className={formA.formClasses('name')}
                defaultValue=""
              />
            </formA.Form>
            <formB.Form>
              <input
                aria-label="B-name"
                name="name"
                className={formB.formClasses('name')}
                defaultValue=""
              />
              <button
                type="button"
                onClick={() => {
                  formB.formActions.focus('name');
                  formB.formActions.focusOnFirstError();
                }}
              >
                Focus B Error
              </button>
            </formB.Form>
          </>
        );
      };

      render(<TestForms />);

      fireEvent.click(screen.getByText('Focus B Error'));

      await waitFor(() => {
        expect(screen.getByLabelText('B-name')).toHaveFocus();
      });

      expect(screen.getByLabelText('A-name')).not.toHaveFocus();
    });

    it('validating plain form focus capture on error', async () => {
      const TestForms = () => {
        const form = useFormState(schema, { validateOnMount: true });

        return (
          <>
            <form>
              <input
                aria-label="form-name"
                name="name"
                className={form.formClasses('name')}
                defaultValue=""
              />
              <button
                type="button"
                onClick={() => {
                  form.formActions.focus('name');
                  form.formActions.focusOnFirstError();
                }}
              >
                Focus Error
              </button>
            </form>
          </>
        );
      };

      render(<TestForms />);

      fireEvent.click(screen.getByText('Focus Error'));

      await waitFor(() => {
        expect(screen.getByLabelText('form-name')).toHaveFocus();
      });
    });

    it('per-call classNames replaces cssOptions classNames default', () => {
      const initialData: InitialSchema = {
        name: 'John',
        info: { age: 30 },
        tags: [],
      };
      const { result } = renderHook(() =>
        useFormState(schema, {
          initialData,
          cssOptions: { classNames: 'level-default' },
        })
      );

      const withDefault = result.current.formClasses('name').split(' ').filter(Boolean);
      expect(withDefault).toContain('level-default');

      const withOverride = result.current
        .formClasses('name', { classNames: 'per-call-value' })
        .split(' ')
        .filter(Boolean);

      expect(withOverride).toContain('per-call-value');
      expect(withOverride).not.toContain('level-default');
    });

    it('per-call classNames callback replaces cssOptions classNames callback', () => {
      const invalidData: InitialSchema = {
        name: '',
        info: { age: 30 },
        tags: [],
      };
      const { result } = renderHook(() =>
        useFormState(schema, {
          initialData: invalidData,
          validateOnMount: true,
          cssOptions: {
            classNames: ({ isError }) => ['level-default', isError && 'level-error'],
          },
        })
      );

      const withDefault = result.current.formClasses('name').split(' ').filter(Boolean);
      expect(withDefault).toContain('level-default');
      expect(withDefault).toContain('level-error');

      const withOverride = result.current
        .formClasses('name', {
          classNames: ({ isError }) => isError && 'per-call-error',
        })
        .split(' ')
        .filter(Boolean);

      expect(withOverride).toContain('per-call-error');
      expect(withOverride).not.toContain('level-default');
      expect(withOverride).not.toContain('level-error');
    });

    it('applies cssOptions classNames defaults across all formClasses calls', () => {
      const TestForm = () => {
        const { Form, formClasses } = useFormState(schema, {
          validateOnMount: true,
          cssOptions: {
            classNames: ({ isError }) => ({
              'always-default': true,
              'default-error': isError,
            }),
          },
        });

        return (
          <Form>
            <input aria-label="name" className={formClasses('name')} defaultValue="" />
            <input
              aria-label="age"
              className={formClasses((path) => path.info.age)}
              defaultValue=""
            />
          </Form>
        );
      };

      render(<TestForm />);

      for (const label of ['name', 'age']) {
        const classes = screen
          .getByRole<HTMLInputElement>('textbox', { name: label })
          .className.split(' ')
          .filter(Boolean);

        expect(classes).toContain('always-default');
        expect(classes).toContain('default-error');
        expect(classes).toContain('form-state__error');
      }
    });

    it('resolves prefix across the form-level × per-call matrix', () => {
      const cases: Array<{
        label: string;
        formLevel: string | null | undefined;
        perCall: string | null | undefined;
        expectedPrefix: string | null;
      }> = [
        { label: 'a', formLevel: undefined, perCall: undefined, expectedPrefix: 'form-state' },
        { label: 'b', formLevel: 'foo', perCall: undefined, expectedPrefix: 'foo' },
        { label: 'c', formLevel: null, perCall: undefined, expectedPrefix: null },
        { label: 'd', formLevel: undefined, perCall: 'bar', expectedPrefix: 'bar' },
        { label: 'e', formLevel: 'foo', perCall: 'bar', expectedPrefix: 'bar' },
        { label: 'f', formLevel: null, perCall: 'bar', expectedPrefix: 'bar' },
        { label: 'g', formLevel: undefined, perCall: null, expectedPrefix: null },
        { label: 'h', formLevel: 'foo', perCall: null, expectedPrefix: null },
        { label: 'i', formLevel: null, perCall: null, expectedPrefix: null },
      ];

      for (const { label, formLevel, perCall, expectedPrefix } of cases) {
        const cssOptions: FormClassOptions | undefined =
          formLevel === undefined ? undefined : { prefix: formLevel };
        const perCallOpts: FormClassOptions | undefined =
          perCall === undefined ? undefined : { prefix: perCall };

        const { result, unmount } = renderHook(() => {
          return useFormState(schema, { validateOnMount: true, cssOptions });
        });

        const classes = perCallOpts
          ? result.current.formClasses('name', perCallOpts)
          : result.current.formClasses('name');
        const tokens = classes.split(' ').filter(Boolean);

        if (expectedPrefix === null) {
          expect(
            tokens.filter((t) => t.includes('__')),
            `case ${label}: no prefix classes`
          ).toEqual([]);
        } else {
          expect(tokens, `case ${label}: expected prefix "${expectedPrefix}"`).toContain(
            `${expectedPrefix}__required`
          );
          expect(
            tokens.some((t) => t.includes('__') && !t.startsWith(`${expectedPrefix}__`)),
            `case ${label}: only "${expectedPrefix}__*" prefix classes expected`
          ).toBe(false);
        }

        unmount();
      }
    });

    it('per-call classNames fully replaces the form-level default', () => {
      const TestForm = () => {
        const { Form, formClasses } = useFormState(schema, {
          validateOnMount: true,
          cssOptions: {
            classNames: ({ isError }) => ({
              'default-always': true,
              'default-error': isError,
            }),
          },
        });

        return (
          <Form>
            <input
              aria-label="overridden"
              className={formClasses('name', {
                classNames: ({ isError }) => isError && 'per-call-error',
              })}
              defaultValue=""
            />
            <input
              aria-label="kept"
              className={formClasses((path) => path.info.age)}
              defaultValue=""
            />
          </Form>
        );
      };

      render(<TestForm />);

      const overridden = screen
        .getByRole<HTMLInputElement>('textbox', { name: 'overridden' })
        .className.split(' ')
        .filter(Boolean);

      // The per-call callback fully replaces the form-level callback.
      expect(overridden).toContain('per-call-error');
      expect(overridden).not.toContain('default-always');
      expect(overridden).not.toContain('default-error');

      const kept = screen
        .getByRole<HTMLInputElement>('textbox', { name: 'kept' })
        .className.split(' ')
        .filter(Boolean);
      expect(kept).toContain('default-always');
      expect(kept).toContain('default-error');
    });
  });
});
