import React, { useEffect, useMemo, useRef, type Ref } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  submitForm,
  useFormState,
  convert,
  SecureInput,
  type FormMode,
  type FormPath,
  type StateChangeEvent,
  type StateChangeListener,
  type SubmitState,
  type SubmitSuccessState,
} from '../src';
import { schema, type Schema, type InitialSchema } from './fixtures';

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

describe('form element tests', () => {
  const submitFn = vi.fn();
  const errorFn = vi.fn();

  afterEach(() => {
    submitFn.mockReset();
    errorFn.mockReset();
  });

  const WatchedComponent = ({
    inferName,
    useWatch,
  }: {
    inferName: (nameOrPath: FormPath<typeof schema>, format?: 'bracket' | 'dot') => string;
    useWatch: (name: string, compute?: (value: string) => string) => string;
  }) => {
    const nameValue = useWatch(inferName((path) => path.name, 'dot'));
    const ageValue = useWatch(
      inferName((path) => path.info.age),
      (value) => (value === '0' ? '' : value)
    );
    const categoryValue = useWatch(inferName((path) => path.category));
    const activeValue = useWatch(inferName('isActive'));
    const archivedValue = useWatch('archivedSelector');
    const tag0Value = useWatch(inferName((path) => path.tags[0]));

    expect(() => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      useWatch(' ');
    }).toThrow(TypeError);

    return (
      <>
        <p data-testid="watched-name">{nameValue}</p>
        <p data-testid="watched-age">{ageValue}</p>
        <p data-testid="watched-category">{categoryValue}</p>
        <p data-testid="watched-active">{activeValue}</p>
        <p data-testid="watched-archived">{archivedValue}</p>
        {tag0Value && <p data-testid="watched-tag-0">{tag0Value}</p>}
      </>
    );
  };

  const FormComponent = ({
    initialValue,
    initialMode,
    manualError,
    forwardRef,
    listener,
    watch,
  }: {
    initialValue?: string;
    initialMode?: FormMode;
    manualError?: string;
    forwardRef?: Ref<HTMLFormElement>;
    listener?: StateChangeListener<Schema>;
    watch?: boolean;
  }) => {
    const formRef = useRef<HTMLFormElement>(null);

    const {
      formState: { data },
      formStatus,
      formActions: { change, inferName, touch, setError, getSubmittedData },
      formHandlers: { handleSubmit },
      formHooks: { useListener, useWatch },
      formClasses,
      Form,
    } = useFormState(schema, {
      initialData: {
        name: initialValue ?? '',
        info: {
          age: 30,
        },
        password: 'abcd1234',
      },
      initialMode,
      watch: watch === true,
    });

    useListener(listener);

    useEffect(() => {
      if (manualError) {
        setError('someProp', manualError);
      }
    }, [manualError, setError]);

    const onSubmit = async (submitState: SubmitState<Schema>) => {
      if (!submitState.valid) {
        if (
          formStatus.valid ||
          submitState.errors.getAll().length === 0 ||
          (!submitState.errors.get((path) => path.name) &&
            !submitState.errors.getManual('someProp'))
        ) {
          throw new Error('Mismatched form status');
        }

        return {}; // the state already has errors
      }

      if (!formStatus.valid) {
        throw new Error('Mismatched form status');
      }

      if (submitState.data.name === 'Ivan') {
        return { name: 'The name Ivan is not allowed', customError: 'true' };
      }

      await Promise.resolve(submitState.data);

      return true;
    };

    return (
      <Form
        ref={forwardRef ?? formRef}
        action={handleSubmit(onSubmit, { onSuccess: submitFn, onError: errorFn })}
        aria-label="main-form"
      >
        {formStatus.submitting && <p>Submitting...</p>}
        {Boolean(getSubmittedData()?.data) && <p>Form Submitted</p>}
        <p
          title="name"
          className={formClasses('name', { prefix: 'form-text', classNames: 'block' })}
        >
          {data.name}
        </p>
        {watch !== false && <WatchedComponent inferName={inferName} useWatch={useWatch} />}
        <fieldset disabled={formStatus.disabled}>
          <label htmlFor="name">Name</label>
          <input
            type="hidden"
            name="id"
            defaultValue={data.name}
            onChange={(event) => {
              change('name', event.target.value);
            }}
          />
          <input
            type="text"
            id="name"
            name={inferName((path) => path.name, 'dot')}
            className={formClasses((path) => path.name)}
            readOnly={formStatus.readOnly}
            value={data.name}
            onBlur={() => {
              touch('name');
            }}
            onChange={(event) => {
              change('name', event.target.value);
            }}
          />
          <label htmlFor="age">Age</label>
          <textarea
            id="age"
            name={inferName((path) => path.info.age)}
            readOnly={formStatus.readOnly}
            defaultValue={data.info.age}
            onBlur={(event) => {
              change((path) => path.info.age, convert.toInt(event.target.value), {
                touch: true,
              });
            }}
          />
          <label htmlFor="category">Category</label>
          {formStatus.readOnly ? (
            <input
              type="readonly"
              id="category"
              name={inferName((path) => path.category)}
              readOnly
              value={data.category}
            />
          ) : (
            <select
              id="category"
              name={inferName((path) => path.category)}
              value={data.category}
              onChange={(event) => {
                change(
                  (path) => path.category,
                  convert.toLiteral<typeof data.category>(event.target.value, [
                    '',
                    'legacy',
                    'unconfirmed',
                  ]),
                  {
                    touch: true,
                  }
                );
              }}
            >
              <option value="">None</option>
              <option value="legacy">Legacy</option>
              <option value="unconfirmed">Unconfirmed</option>
            </select>
          )}
          <label htmlFor="active">Active</label>
          <input
            type="checkbox"
            id="active"
            name={inferName((path) => path.isActive)}
            readOnly={formStatus.readOnly}
            checked={Boolean(data.isActive)}
            onChange={(event) => {
              change('isActive', event.target.checked, { touch: true });
            }}
          />
          <label htmlFor="secure">Secure Input</label>
          <SecureInput
            type="text"
            name="secure"
            value={data.password}
            onSecureChange={(val) => {
              change('password', val);
            }}
          />
          <span role="group">
            <label className="inline-block cursor-pointer">
              <input
                type="radio"
                className="cursor-pointer mr-1.5"
                id="archivedYes"
                name="archivedSelector"
                data-testid="archivedYes"
                readOnly={formStatus.readOnly}
                value={convert.toString(data.isArchived, { emptyStringAsFalse: true })}
                checked={Boolean(data.isArchived)}
                onChange={() => {
                  change('isArchived', true, { touch: true });
                }}
              />
              Yes
            </label>
            <label className="inline-block cursor-pointer ml-3">
              <input
                type="radio"
                className="cursor-pointer mr-1.5"
                id="archivedNo"
                name="archivedSelector"
                data-testid="archivedNo"
                readOnly={formStatus.readOnly}
                value={convert.toString(data.isArchived, { emptyStringAsFalse: true })}
                checked={!data.isArchived}
                onChange={() => {
                  change('isArchived', false, { touch: true });
                }}
              />
              No
            </label>
          </span>
          {!formStatus.disabled && !formStatus.readOnly && (
            <>
              <button name="submitter" value="submit">
                Submit
              </button>
              <button
                name="submitter"
                value="submitManual"
                onClick={(event) => {
                  event.preventDefault();
                  submitForm(formRef.current, screen.getByText('Submit', { selector: 'button' }));
                }}
              >
                Submit Manually
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  formRef.current?.submit();
                }}
              >
                Submit Fail
              </button>
              <button type="reset">Reset</button>
            </>
          )}
        </fieldset>
      </Form>
    );
  };

  const SimpleFormComponent = ({ submitWithEnter }: { submitWithEnter?: boolean | undefined }) => {
    const {
      formState: { data, errors },
      formStatus: { submitted },
      formActions: { change, validate },
      Form,
    } = useFormState(schema, {
      initialData: {
        name: 'John',
        info: {
          age: 30,
        },
      },
    });

    const handleSubmit = (event: React.SubmitEvent<HTMLFormElement>) => {
      event.preventDefault();

      validate({ submit: true });
    };

    return (
      <Form onSubmit={handleSubmit} submitWithEnter={submitWithEnter === true}>
        <p>Name: {data.name}</p>
        <input
          type="input"
          data-testid="nameInput"
          value={data.name}
          onChange={(event) => {
            change('name', event.target.value);
          }}
        />
        {errors.name && <p data-testid="nameError">Error: {errors.name}</p>}
        {submitted && <p>Submitted</p>}
        <button>Submit Form</button>
      </Form>
    );
  };

  it.each([true, false])('should render form with properties', (watch) => {
    render(<FormComponent watch={watch} />);

    const form = screen.getByRole('form');
    const input = screen.getByLabelText('Name');
    const name = screen.getByTitle('name');
    const submittedInfo = screen.queryByText('Form Submitted');

    fireEvent.change(input, { target: { value: 'John' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(form.hasAttribute('novalidate')).toBe(true);
    expect(name).toContainHTML('John');
    expect(submittedInfo).not.toBeInTheDocument();
  });

  it.each([true, false])('should add required, error and touched CSS classes', (watch) => {
    render(<FormComponent initialValue="John" watch={watch} />);

    const input = screen.getByLabelText('Name');
    const name = screen.getByTitle('name');

    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);

    expect(input.classList).toContain('form-state__required');
    expect(input.classList).toContain('form-state__error');
    expect(input.classList).toContain('form-state__touched');
    expect(name.classList).toContain('form-text__required');
    expect(name.classList).toContain('form-text__error');
    expect(name.classList).toContain('form-text__touched');
  });

  it.each([true, false])('should submit form programatically', async (watch) => {
    render(<FormComponent watch={watch} />);

    const input = screen.getByLabelText('Name');
    const name = screen.getByTitle('name');
    const submitButton = screen.getByText('Submit Manually');

    fireEvent.change(input, { target: { value: 'John' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    fireEvent.click(submitButton);

    const submittingInfo = await screen.findByText('Submitting...');
    expect(submittingInfo).toBeInTheDocument();

    await waitFor(() => {
      expect(submittingInfo).not.toBeInTheDocument();
    });

    expect(submitFn).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: 'John' }) as object,
        formData: expect.any(FormData) as FormData,
      })
    );
    expect(errorFn).not.toHaveBeenCalled();

    expect(name).toContainHTML('John');

    const submittedInfo = screen.getByText('Form Submitted');
    expect(submittedInfo).toBeInTheDocument();
  });

  it.each([true, false])('should submit form with "handleSubmit"', async (watch) => {
    render(<FormComponent watch={watch} />);

    const input = screen.getByLabelText('Name');
    const name = screen.getByTitle('name');
    const submitButton = screen.getByText('Submit');

    fireEvent.change(input, { target: { value: 'John' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    fireEvent.click(submitButton);

    const submittingInfo = await screen.findByText('Submitting...');
    expect(submittingInfo).toBeInTheDocument();

    await waitFor(() => {
      expect(submittingInfo).not.toBeInTheDocument();
    });

    expect(submitFn).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: 'John' }) as object,
        formData: expect.any(FormData) as FormData,
      })
    );
    expect(errorFn).not.toHaveBeenCalled();

    expect(name).toContainHTML('John');

    const submittedInfo = screen.getByText('Form Submitted');
    expect(submittedInfo).toBeInTheDocument();

    const submittedState = submitFn.mock.calls[0]?.[0] as SubmitSuccessState<Schema>;

    expect(submittedState).toBeDefined();
    expect(submittedState.formData.has('id')).toBe(true);
    expect(submittedState.formData.get('submitter')).toBe('submit');
  });

  it('should submit form with "handleSubmit" once despite multiple clicks', async () => {
    render(<FormComponent watch />);

    const input = screen.getByLabelText('Name');
    const name = screen.getByTitle('name');
    const submitButton = screen.getByText('Submit');

    fireEvent.change(input, { target: { value: 'John' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    fireEvent.click(submitButton);
    fireEvent.click(submitButton);
    fireEvent.click(submitButton);

    const submittingInfo = await screen.findByText('Submitting...');
    expect(submittingInfo).toBeInTheDocument();

    await waitFor(() => {
      expect(submittingInfo).not.toBeInTheDocument();
    });

    expect(submitFn).toHaveBeenCalledOnce();
    expect(errorFn).not.toHaveBeenCalled();

    expect(name).toContainHTML('John');
  });

  it('getSubmittedData should reflect the submitted state when used as a useMemo dependency', async () => {
    function SubmitTestForm() {
      const {
        formActions: { getSubmittedData },
        formHandlers: { handleSubmit },
        Form,
      } = useFormState(schema, {
        initialData: { name: 'John', info: { age: 30 } } satisfies InitialSchema,
      });

      const submittedName = useMemo(
        () => getSubmittedData()?.data.name ?? null,
        [getSubmittedData]
      );

      return (
        <Form action={handleSubmit((state) => Promise.resolve(state.valid ? true : {}))}>
          <p data-testid="submitted-name">{submittedName ?? 'not submitted'}</p>
          <button>Submit</button>
        </Form>
      );
    }

    render(<SubmitTestForm />);
    expect(screen.getByTestId('submitted-name')).toHaveTextContent('not submitted');

    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(screen.getByTestId('submitted-name')).toHaveTextContent('John');
    });
  });

  it.each([true, false])('should fail to submit form using "submit"', async (watch) => {
    const domConsoleSpy = vi
      .spyOn(
        (
          globalThis as typeof globalThis & {
            _virtualConsole: {
              emit: ReturnType<typeof vi.fn>;
            };
          }
        )._virtualConsole,
        'emit'
      )
      .mockImplementation(() => {});

    render(<FormComponent watch={watch} />);

    const input = screen.getByLabelText('Name');
    const submitButton = screen.getByText('Submit Fail');

    fireEvent.change(input, { target: { value: 'John' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.queryByText('Form Submitted')).not.toBeInTheDocument();
    });

    expect(domConsoleSpy).toHaveBeenCalledTimes(1);

    domConsoleSpy.mockReset();
  });

  it.each([true, false])('should fail to submit form with name "Ivan"', async (watch) => {
    render(<FormComponent watch={watch} />);

    const input = screen.getByLabelText('Name');
    const submitButton = screen.getByText('Submit');

    fireEvent.change(input, { target: { value: 'Ivan' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(errorFn).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.objectContaining({
            name: 'The name Ivan is not allowed',
            customError: 'true',
          }) as object,
        }),
        expect.objectContaining({ valid: false, submitted: false })
      );
    });

    expect(submitFn).not.toHaveBeenCalled();
    expect(screen.queryByText('Form Submitted')).not.toBeInTheDocument();
  });

  it.each([true, false])(
    'should not submit form with "handleSubmit" with errors',
    async (watch) => {
      render(<FormComponent initialValue="John" watch={watch} />);

      const input = screen.getByLabelText('Name');
      const submitButton = screen.getByText('Submit');

      fireEvent.change(input, { target: { value: '' } });
      fireEvent.blur(input);

      expect(input.classList).toContain('form-state__error');
      expect(input.classList).toContain('form-state__touched');

      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(errorFn).toHaveBeenCalledWith(
          expect.objectContaining({
            errors: expect.objectContaining({ name: 'Name is required' }) as object,
          }),
          expect.objectContaining({ valid: false, submitted: false })
        );
      });

      expect(submitFn).not.toHaveBeenCalled();
      expect(screen.queryByText('Form Submitted')).not.toBeInTheDocument();
    }
  );

  it.each([true, false])(
    'should not submit form with "handleSubmit" with errors without validation',
    async (watch) => {
      render(<FormComponent watch={watch} />);

      const submitButton = screen.getByText('Submit');

      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(errorFn).toHaveBeenCalledWith(
          expect.objectContaining({
            errors: expect.objectContaining({ name: 'Name is required' }) as object,
          }),
          expect.objectContaining({ valid: false, submitted: false })
        );
      });

      expect(submitFn).not.toHaveBeenCalled();
      expect(screen.queryByText('Form Submitted')).not.toBeInTheDocument();
    }
  );

  it.each([true, false])(
    'should not submit form with "handleSubmit" with initial errors',
    async (watch) => {
      render(<FormComponent watch={watch} />);

      const input = screen.getByLabelText('Name');
      const submitButton = screen.getByText('Submit');

      fireEvent.change(input, { target: { value: '' } });
      fireEvent.blur(input);

      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(errorFn).toHaveBeenCalledWith(
          expect.objectContaining({
            errors: expect.objectContaining({ name: 'Name is required' }) as object,
          }),
          expect.objectContaining({ valid: false, submitted: false })
        );
      });

      expect(submitFn).not.toHaveBeenCalled();
      expect(screen.queryByText('Form Submitted')).not.toBeInTheDocument();
    }
  );

  it.each([true, false])(
    'should not submit form with "handleSubmit" with initial errors without validations',
    async (watch) => {
      render(<FormComponent watch={watch} />);

      const submitButton = screen.getByText('Submit');

      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(errorFn).toHaveBeenCalledWith(
          expect.objectContaining({
            errors: expect.objectContaining({ name: 'Name is required' }) as object,
          }),
          expect.objectContaining({ valid: false, submitted: false })
        );
      });

      expect(submitFn).not.toHaveBeenCalled();
      expect(screen.queryByText('Form Submitted')).not.toBeInTheDocument();
    }
  );

  it.each([true, false])(
    'should not submit form with "handleSubmit" with manual errors',
    async (watch) => {
      render(<FormComponent manualError="A manual error" watch={watch} />);

      const input = screen.getByLabelText('Name');
      const submitButton = screen.getByText('Submit');

      fireEvent.change(input, { target: { value: 'John' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(errorFn).toHaveBeenCalledWith(
          expect.objectContaining({
            errors: expect.objectContaining({ someProp: 'A manual error' }) as object,
          }),
          expect.objectContaining({ valid: false, submitted: false })
        );
      });

      expect(submitFn).not.toHaveBeenCalled();
      expect(screen.queryByText('Form Submitted')).not.toBeInTheDocument();
    }
  );

  it.each([true, false])(
    'should not submit form with "handleSubmit" with manual errors without validations',
    async (watch) => {
      render(<FormComponent initialValue="John" manualError="A manual error" watch={watch} />);

      const submitButton = screen.getByText('Submit');

      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(errorFn).toHaveBeenCalledWith(
          expect.objectContaining({
            errors: expect.objectContaining({ someProp: 'A manual error' }) as object,
          }),
          expect.objectContaining({ valid: false, submitted: false })
        );
      });

      expect(submitFn).not.toHaveBeenCalled();
      expect(screen.queryByText('Form Submitted')).not.toBeInTheDocument();
    }
  );

  it.each([true, false])('should reset form with properties', (watch) => {
    render(<FormComponent watch={watch} />);

    const input = screen.getByLabelText('Name');
    const name = screen.getByTitle('name');
    const resetButton = screen.getByText('Reset');

    fireEvent.change(input, { target: { value: 'John' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(name).toContainHTML('John');

    fireEvent.click(resetButton);

    expect(name).toContainHTML('');
  });

  it('should call the onbeforeunload event', () => {
    const handleUnload = vi.fn();
    addEventListener('beforeunload', handleUnload);

    render(<FormComponent watch={true} />);

    const input = screen.getByLabelText('Name');

    fireEvent.change(input, { target: { value: 'John' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    dispatchEvent(new Event('beforeunload'));

    removeEventListener('beforeunload', handleUnload);

    expect(handleUnload).toHaveBeenCalled();
  });

  it('should listen to form changes', async () => {
    const actionMock = vi.fn<StateChangeListener<Schema>>(
      ({ type, data, formData, errors, submitCount, valid }) => {
        expect(type).toBeOneOf(['change', 'submit']);
        expect(submitCount).toBeOneOf([0, 1]);

        if (data.name === '') {
          expect(errors['name']).toBe('Name is required');
          expect(errors.getAll()).toStrictEqual(['Name is required']);
          expect(valid).toBe(false);
        } else {
          expect(errors.get((path) => path.name)).toBeUndefined();
          expect(errors.getManual('name')).toBeUndefined();
          expect(valid).toBe(true);
        }

        if (type === 'submit') {
          expect(formData).toBeInstanceOf(FormData);

          if (formData) {
            expect(formData.get('name')).toBe(data.name);
            expect(formData.get('info["age"]')).toBe(data.info.age.toString());
            expect(formData.get('category')).toBe(data.category);
            expect(formData.get('archivedSelector')).toBe(convert.toString(data.isArchived));
            expect(formData.get('isActive')).toBe('on');
            expect(formData.get('submitter')).toBe('submit');
            expect(formData.get('secure')).toBe('abcd1234');
          }
        } else {
          expect(formData).toBeUndefined();
        }
      }
    );

    const listener: StateChangeListener<Schema> = (...args) => {
      actionMock(...args);
    };

    render(<FormComponent initialValue="Tom" watch={false} listener={listener} />);

    const nameInput = screen.getByLabelText('Name');
    const categorySelect = screen.getByLabelText('Category');
    const activeCheckbox = screen.getByLabelText('Active');
    const archivedYesRadio = screen.getByTestId('archivedYes');
    const submitButton = screen.getByText('Submit');
    const resetButton = screen.getByText('Reset');

    fireEvent.change(nameInput, { target: { value: 'John' } });

    await waitFor(() => {
      expect(actionMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'change',
          data: expect.objectContaining({ name: 'John' }) as StateChangeEvent<Schema>['data'],
          submitCount: 0,
        })
      );
    });

    fireEvent.change(categorySelect, { target: { value: 'legacy' } });

    await waitFor(() => {
      expect(actionMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'change',
          data: expect.objectContaining({
            name: 'John',
            category: 'legacy',
          }) as StateChangeEvent<Schema>['data'],
          submitCount: 0,
        })
      );
    });

    fireEvent.click(activeCheckbox);

    await waitFor(() => {
      expect(actionMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'change',
          data: expect.objectContaining({
            name: 'John',
            category: 'legacy',
            isActive: false,
          }) as StateChangeEvent<Schema>['data'],
          submitCount: 0,
        })
      );
    });

    fireEvent.click(activeCheckbox);

    await waitFor(() => {
      expect(actionMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'change',
          data: expect.objectContaining({
            name: 'John',
            category: 'legacy',
            isActive: true,
          }) as StateChangeEvent<Schema>['data'],
          submitCount: 0,
        })
      );
    });

    fireEvent.click(archivedYesRadio);

    await waitFor(() => {
      expect(actionMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'change',
          data: expect.objectContaining({
            name: 'John',
            category: 'legacy',
            isActive: true,
            isArchived: true,
          }) as StateChangeEvent<Schema>['data'],
          submitCount: 0,
        })
      );
    });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(actionMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'submit',
          data: expect.objectContaining({
            name: 'John',
            category: 'legacy',
            isActive: true,
            isArchived: true,
          }) as StateChangeEvent<Schema>['data'],
          submitCount: 1,
        })
      );
    });

    fireEvent.change(categorySelect, { target: { value: 'unconfirmed' } });

    await waitFor(() => {
      expect(actionMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'change',
          data: expect.objectContaining({
            name: 'John',
            category: 'unconfirmed',
            isActive: true,
            isArchived: true,
          }) as StateChangeEvent<Schema>['data'],
          submitCount: 1,
        })
      );
    });

    fireEvent.click(resetButton);

    await waitFor(() => {
      expect(actionMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'change',
          data: expect.objectContaining({
            name: 'John',
            category: 'legacy',
            isActive: true,
            isArchived: true,
          }) as StateChangeEvent<Schema>['data'],
          submitCount: 1,
        })
      );
    });

    fireEvent.change(nameInput, { target: { value: '' } });

    await waitFor(() => {
      expect(actionMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'change',
          data: expect.objectContaining({
            name: '',
            category: 'legacy',
            isActive: true,
            isArchived: true,
          }) as StateChangeEvent<Schema>['data'],
          errors: expect.objectContaining({
            name: 'Name is required',
          }) as StateChangeEvent<Schema>['errors'],
          submitCount: 1,
        })
      );
    });

    expect(actionMock).toHaveBeenCalledTimes(9);

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(actionMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'change',
          data: expect.objectContaining({
            name: '',
            category: 'legacy',
            isActive: true,
            isArchived: true,
          }) as StateChangeEvent<Schema>['data'],
          errors: expect.objectContaining({
            name: 'Name is required',
          }) as StateChangeEvent<Schema>['errors'],
          submitCount: 1,
        })
      );
    });
  });

  it('should invoke the latest listener across rerenders with inline functions', async () => {
    const actionMock = vi.fn<(marker: string, event: StateChangeEvent<Schema>) => void>();

    const { rerender } = render(
      <FormComponent
        initialValue="Tom"
        watch={false}
        listener={(event) => {
          actionMock('first', event);
        }}
      />
    );

    const nameInput = screen.getByLabelText('Name');

    fireEvent.change(nameInput, { target: { value: 'John' } });

    await waitFor(() => {
      expect(actionMock).toHaveBeenCalledWith(
        'first',
        expect.objectContaining({
          type: 'change',
          data: expect.objectContaining({ name: 'John' }) as StateChangeEvent<Schema>['data'],
        })
      );
    });

    rerender(
      <FormComponent
        initialValue="Tom"
        watch={false}
        listener={(event) => {
          actionMock('second', event);
        }}
      />
    );

    fireEvent.change(nameInput, { target: { value: 'Jane' } });

    await waitFor(() => {
      expect(actionMock).toHaveBeenCalledWith(
        'second',
        expect.objectContaining({
          type: 'change',
          data: expect.objectContaining({ name: 'Jane' }) as StateChangeEvent<Schema>['data'],
        })
      );
    });

    expect(actionMock).not.toHaveBeenCalledWith(
      'first',
      expect.objectContaining({
        data: expect.objectContaining({ name: 'Jane' }) as StateChangeEvent<Schema>['data'],
      })
    );
  });

  it('should watch the changes', async () => {
    const user = userEvent.setup({ delay: null });

    render(<FormComponent initialValue="Tom" watch />);

    const nameInput = screen.getByLabelText('Name');
    const ageInput = screen.getByLabelText('Age');
    const categorySelect = screen.getByLabelText('Category');
    const activeCheckbox = screen.getByLabelText('Active');
    const archivedYesRadio = screen.getByTestId('archivedYes');
    const archivedNoRadio = screen.getByTestId('archivedNo');
    const resetButton = screen.getByText('Reset');

    const watchedName = screen.getByTestId('watched-name');
    const watchedAge = screen.getByTestId('watched-age');
    const watchedCategory = screen.getByTestId('watched-category');
    const watchedActive = screen.getByTestId('watched-active');
    const watchedArchived = screen.getByTestId('watched-archived');

    expect(nameInput).toHaveValue('Tom');
    expect(watchedName).toHaveTextContent('Tom');

    expect(ageInput).toHaveValue('30');
    expect(watchedAge).toHaveTextContent('30');

    expect(categorySelect).toHaveValue('');
    expect(watchedCategory).toHaveTextContent('');

    expect(activeCheckbox).toBeChecked();
    expect(watchedActive).toHaveTextContent('on');

    expect(archivedYesRadio).not.toBeChecked();
    expect(archivedNoRadio).toBeChecked();
    expect(watchedArchived).toHaveTextContent('false');

    await user.clear(nameInput);
    await user.keyboard('John{Tab}');

    await user.clear(ageInput);
    await user.keyboard('25{Tab}');

    await user.selectOptions(categorySelect, 'legacy');

    await user.click(activeCheckbox);
    await user.click(archivedYesRadio);

    expect(nameInput).toHaveValue('John');
    expect(watchedName).toHaveTextContent('John');

    expect(ageInput).toHaveValue('25');
    expect(watchedAge).toHaveTextContent('25');

    expect(categorySelect).toHaveValue('legacy');
    expect(watchedCategory).toHaveTextContent('legacy');

    expect(activeCheckbox).not.toBeChecked();
    expect(watchedActive).toHaveTextContent('');

    expect(archivedYesRadio).toBeChecked();
    expect(archivedNoRadio).not.toBeChecked();
    expect(watchedArchived).toHaveTextContent('true');

    await user.click(resetButton);

    expect(nameInput).toHaveValue('Tom');
    expect(watchedName).toHaveTextContent('Tom');

    expect(ageInput).toHaveValue('30');
    expect(watchedAge).toHaveTextContent('30');

    expect(categorySelect).toHaveValue('');
    expect(watchedCategory).toHaveTextContent('');

    expect(activeCheckbox).toBeChecked();
    expect(watchedActive).toHaveTextContent('on');

    expect(archivedYesRadio).not.toBeChecked();
    expect(archivedNoRadio).toBeChecked();
    expect(watchedArchived).toHaveTextContent('false');
  });

  it('should watch the changes with a custom ref', async () => {
    const user = userEvent.setup();

    render(<FormComponent forwardRef={() => {}} watch />);

    const input = screen.getByLabelText('Name');
    const watchedName = screen.getByTestId('watched-name');

    await user.click(input);
    await user.keyboard('John{Enter}');

    expect(input).toHaveValue('John');
    expect(watchedName).toHaveTextContent('John');
  });

  it('throws when watch is not enabled and useWatch is defined', () => {
    expect(() => render(<FormComponent forwardRef={() => {}} />)).toThrow(/"watch" property/);
  });

  it('should render form is the editable mode', () => {
    render(<FormComponent watch={false} />);

    const nameInput = screen.getByLabelText('Name');
    const categorySelect = screen.getByLabelText('Category');

    expect(nameInput).toBeEnabled();
    expect(nameInput).not.toHaveAttribute('readonly');

    expect(categorySelect).toBeEnabled();
    expect(categorySelect).not.toHaveAttribute('readonly');
    expect(categorySelect.nodeName.toLowerCase()).toBe('select');
  });

  it('should render form is the editable mode when the mode is set', () => {
    render(<FormComponent initialMode="editable" watch={false} />);

    const nameInput = screen.getByLabelText('Name');
    const categorySelect = screen.getByLabelText('Category');

    expect(nameInput).toBeEnabled();
    expect(nameInput).not.toHaveAttribute('readonly');

    expect(categorySelect).toBeEnabled();
    expect(categorySelect).not.toHaveAttribute('readonly');
    expect(categorySelect.nodeName.toLowerCase()).toBe('select');
  });

  it('should mark inputs readonly and hide selects/buttons when the form is readOnly', () => {
    render(<FormComponent initialMode="readOnly" watch={false} />);

    const nameInput = screen.getByLabelText('Name');
    const ageInput = screen.getByLabelText('Age');
    const categorySelect = screen.getByLabelText('Category');
    const activeCheckbox = screen.getByLabelText('Active');
    const archivedYesRadio = screen.getByTestId('archivedYes');
    const archivedNoRadio = screen.getByTestId('archivedNo');
    const resetButton = screen.queryByText('Reset');

    expect(nameInput).toHaveAttribute('readonly');
    expect(ageInput).toHaveAttribute('readonly');
    expect(categorySelect).toHaveAttribute('readonly');
    expect(categorySelect.nodeName.toLowerCase()).toBe('input');
    expect(activeCheckbox).toHaveAttribute('readonly');
    expect(archivedYesRadio).toHaveAttribute('readonly');
    expect(archivedNoRadio).toHaveAttribute('readonly');
    expect(resetButton).not.toBeInTheDocument();

    expect(nameInput.classList).toContain('form-state__readonly');
  });

  it('should disable inputs and hide buttons when the form is disabled', () => {
    render(<FormComponent initialMode="disabled" watch={false} />);

    const nameInput = screen.getByLabelText('Name');
    const ageInput = screen.getByLabelText('Age');
    const categorySelect = screen.getByLabelText('Category');
    const activeCheckbox = screen.getByLabelText('Active');
    const archivedYesRadio = screen.getByTestId('archivedYes');
    const archivedNoRadio = screen.getByTestId('archivedNo');
    const resetButton = screen.queryByText('Reset');

    expect(nameInput).toBeDisabled();
    expect(ageInput).toBeDisabled();
    expect(categorySelect).toBeDisabled();
    expect(categorySelect.nodeName.toLowerCase()).toBe('select');
    expect(activeCheckbox).toBeDisabled();
    expect(archivedYesRadio).toBeDisabled();
    expect(archivedNoRadio).toBeDisabled();
    expect(resetButton).not.toBeInTheDocument();

    expect(nameInput.classList).toContain('form-state__disabled');
  });

  it('submits a simple form using onSubmit method', () => {
    render(<SimpleFormComponent />);

    const submitButton = screen.getByText('Submit Form');
    fireEvent.click(submitButton);

    const nameError = screen.queryByTestId('nameError');
    const submittedElement = screen.getByText('Submitted');

    expect(nameError).not.toBeInTheDocument();
    expect(submittedElement).toBeInTheDocument();
  });

  it('does not submit a simple form by pressing Enter', async () => {
    const user = userEvent.setup();

    render(<SimpleFormComponent />);

    const input = screen.getByTestId('nameInput');

    await user.click(input);
    await user.keyboard('{Enter}');

    const submittedElement = screen.queryByText('Submitted');

    expect(submittedElement).not.toBeInTheDocument();
  });

  it('submits a simple form with the "submitWithEnter" prop by pressing Enter', async () => {
    const user = userEvent.setup();

    render(<SimpleFormComponent submitWithEnter />);

    const input = screen.getByTestId('nameInput');

    await user.click(input);
    await user.keyboard('{Enter}');

    const nameError = screen.queryByTestId('nameError');
    const submittedElement = screen.getByText('Submitted');

    expect(nameError).not.toBeInTheDocument();
    expect(submittedElement).toBeInTheDocument();
  });

  it('submits a simple form after changing the name', () => {
    render(<SimpleFormComponent />);

    const input = screen.getByTestId('nameInput');
    fireEvent.change(input, { target: { value: 'Todd' } });

    const nameElement = screen.getByText('Name: Todd');

    const submitButton = screen.getByText('Submit Form');
    fireEvent.click(submitButton);

    const nameError = screen.queryByTestId('nameError');
    const submittedElement = screen.getByText('Submitted');

    expect(nameElement).toBeInTheDocument();
    expect(nameError).not.toBeInTheDocument();
    expect(submittedElement).toBeInTheDocument();
  });

  it('fails to submit a simple form after clearing the name', () => {
    render(<SimpleFormComponent />);

    const input = screen.getByTestId('nameInput');
    fireEvent.change(input, { target: { value: '' } });

    const submitButton = screen.getByText('Submit Form');
    fireEvent.click(submitButton);

    const nameError = screen.getByTestId('nameError');
    const submittedElement = screen.queryByText('Submitted');

    expect(nameError).toBeInTheDocument();
    expect(submittedElement).not.toBeInTheDocument();
  });

  it('fails to find the submit button in an unmounted form', () => {
    const { unmount } = render(<SimpleFormComponent />);

    unmount();

    const submitButton = screen.queryByText('Submit Form');

    expect(submitButton).not.toBeInTheDocument();
  });
});
