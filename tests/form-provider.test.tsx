import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';

import { FormStateProvider, useFormStateContext, formConnect, z } from '../src';

const schema = z.object({
  id: z.formNumber({ required: true }).with(z.describe('ID')),
  info: z.object({
    name: z
      .formString(z.maxLength(50, 'Name must be 50 characters or less'))
      .with(z.describe("Person's Name")),
    age: z
      .formNumber(z.gte(1, 'Age must be > 0'), z.lte(125, 'Age must be < 125'))
      .with(z.describe("Person's Age")),
  }),
});

type Schema = z.infer<typeof schema>;

const initialData: Schema = {
  id: 1,
  info: {
    name: 'John',
    age: 0,
  },
};

const FormComponent = () => {
  const { Form } = useFormStateContext(schema);

  return (
    <Form>
      <fieldset>
        <Name />
        <Age />
      </fieldset>
      <button type="reset">Reset</button>
    </Form>
  );
};

const Name = () => {
  const form = useFormStateContext(schema);

  const {
    formState: { data, ranges, descriptions, errors },
    formActions: { touch, change },
    formClasses,
  } = form;

  return (
    <div>
      <label htmlFor="name" className={formClasses((path) => path.info.name)}>
        {descriptions.get((path) => path.info.name)}
      </label>
      <input
        type="text"
        id="name"
        name="name"
        value={data.info.name}
        maxLength={ranges.get((path) => path.info.name)?.max}
        onBlur={() => {
          touch((path) => path.info.name);
        }}
        onChange={(evt) => {
          change((path) => path.info.name, evt.target.value);
        }}
      />
      {Boolean(errors.get((path) => path.info.name)) && (
        <p data-testid="name-error" className={formClasses((path) => path.info.name)}>
          {errors.get((path) => path.info.name)}
        </p>
      )}
    </div>
  );
};

const Age = () => {
  const form = useFormStateContext(schema);

  const {
    formState: { data, ranges, descriptions, errors },
    formActions: { touch, change },
    formClasses,
  } = form;

  return (
    <div>
      <label htmlFor="age" className={formClasses((path) => path.info.age)}>
        {descriptions.get((path) => path.info.age)}
      </label>
      <input
        type="number"
        id="age"
        name="age"
        value={data.info.age}
        min={ranges.get((path) => path.info.age)?.min}
        max={ranges.get((path) => path.info.age)?.max}
        onBlur={() => {
          touch((path) => path.info.age);
        }}
        onChange={(evt) => {
          change((path) => path.info.age, Number(evt.target.value));
        }}
      />
      {Boolean(errors.get((path) => path.info.age)) && (
        <p data-testid="age-error" className={formClasses((path) => path.info.age)}>
          {errors.get((path) => path.info.age)}
        </p>
      )}
    </div>
  );
};

const ConnectedForm = formConnect({ schema, initialData, validateOnMount: true })(FormComponent);

it('renders connected form', () => {
  render(<ConnectedForm />);

  const nameLabel = screen.queryByText("Person's Name") as HTMLLabelElement;
  const ageLabel = screen.queryByText("Person's Age") as HTMLLabelElement;
  const nameInput = screen.queryByLabelText("Person's Name") as HTMLInputElement;
  const ageInput = screen.queryByLabelText("Person's Age") as HTMLInputElement;
  const nameError = screen.queryByTestId('name-error') as HTMLParagraphElement;
  const ageError = screen.queryByTestId('age-error') as HTMLParagraphElement;

  expect(nameLabel).toBeInTheDocument();
  expect(nameLabel.htmlFor).toBe('name');
  expect(nameLabel.classList).not.toContain('form-state__error');
  expect(nameLabel.classList).not.toContain('form-state__touched');

  expect(nameInput).toBeInTheDocument();
  expect(nameInput.value).toBe('John');
  expect(nameInput.maxLength).toBe(50);

  expect(nameError).not.toBeInTheDocument();

  expect(ageLabel).toBeInTheDocument();
  expect(ageLabel.htmlFor).toBe('age');
  expect(ageLabel.classList).toContain('form-state__error');
  expect(ageLabel.classList).not.toContain('form-state__touched');

  expect(ageInput).toBeInTheDocument();
  expect(ageInput.value).toBe('0');
  expect(ageInput.min).toBe('1');
  expect(ageInput.max).toBe('125');

  expect(ageError).toBeInTheDocument();
  expect(ageError.textContent).toBe('Age must be > 0');

  fireEvent.change(ageInput, { target: { value: '30' } });
  fireEvent.blur(ageInput);

  expect(ageError).not.toBeInTheDocument();

  expect(ageLabel.classList).not.toContain('form-state__error');
  expect(ageLabel.classList).toContain('form-state__touched');

  expect(ageInput.value).toBe('30');

  const resetButton = screen.getByRole('button', { name: 'Reset' });

  fireEvent.click(resetButton);

  // we need a reference to the new element
  const ageErrorAfterReset = screen.queryByTestId('age-error') as HTMLParagraphElement;

  expect(ageErrorAfterReset).toBeInTheDocument();
  expect(ageErrorAfterReset.textContent).toBe('Age must be > 0');

  expect(ageLabel.classList).toContain('form-state__error');
  expect(ageLabel.classList).toContain('form-state__touched');

  expect(ageInput.value).toBe('0');
});

it('throws an error when the component is not connected', () => {
  expect(() => render(<FormComponent />)).toThrow(Error);
});

it('throws an error when useFormStateContext was not registered with the provided schema', () => {
  const otherSchema = z.object({ name: z.formString() });

  expect(() => useFormStateContext(otherSchema)).toThrow(Error);
});

it('throws an error when useFormStateContext has invalid arguments', () => {
  expect(() => useFormStateContext(null as unknown as typeof schema)).toThrow(Error);
});

describe('useFormStateContext with a selector', () => {
  afterEach(() => {
    cleanup();
  });

  const selectorSchema = z.object({
    name: z.formString(),
    email: z.group(z.formString(), 'contact'),
    phone: z.group(z.formString(), 'contact'),
    city: z.formString(),
  });

  const selectorData = { name: 'Ann', email: 'ann@example.com', phone: '555', city: 'Oslo' };

  const Editor = () => {
    const {
      formActions: { change },
    } = useFormStateContext(selectorSchema);

    return (
      <>
        <button
          type="button"
          onClick={() => {
            change('name', 'Bea');
          }}
        >
          Change name
        </button>
        <button
          type="button"
          onClick={() => {
            change('city', 'Rome');
          }}
        >
          Change city
        </button>
        <button
          type="button"
          onClick={() => {
            change('email', 'bea@example.com');
          }}
        >
          Change email
        </button>
      </>
    );
  };

  it('re-renders only when the selected value changes', () => {
    const renders = vi.fn();

    const City = () => {
      const city = useFormStateContext(selectorSchema, (form) => form.formState.data.city);
      renders();
      return <p>City: {city}</p>;
    };

    render(
      <FormStateProvider schema={selectorSchema} initialData={selectorData}>
        <Editor />
        <City />
      </FormStateProvider>
    );

    expect(renders).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('Change name'));
    expect(renders).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('Change city'));
    expect(screen.getByText('City: Rome')).toBeInTheDocument();
    expect(renders).toHaveBeenCalledTimes(2);
  });

  it('never re-renders a component that only selects actions', () => {
    const renders = vi.fn();

    const Actions = () => {
      const { change } = useFormStateContext(selectorSchema, (form) => form.formActions);
      renders();
      return (
        <button
          type="button"
          onClick={() => {
            change('name', 'Cid');
          }}
        >
          Rename
        </button>
      );
    };

    const NameView = () => {
      const { formState } = useFormStateContext(selectorSchema);
      return <p>Name: {formState.data.name}</p>;
    };

    render(
      <FormStateProvider schema={selectorSchema} initialData={selectorData}>
        <Actions />
        <NameView />
      </FormStateProvider>
    );

    fireEvent.click(screen.getByText('Rename'));

    expect(screen.getByText('Name: Cid')).toBeInTheDocument();
    expect(renders).toHaveBeenCalledTimes(1);
  });

  it('selects a group data slice by name', () => {
    const renders = vi.fn();

    const Contact = () => {
      const contact = useFormStateContext(selectorSchema, 'contact');
      renders();
      return (
        <p>
          Contact: {contact.email} / {contact.phone}
        </p>
      );
    };

    render(
      <FormStateProvider schema={selectorSchema} initialData={selectorData}>
        <Editor />
        <Contact />
      </FormStateProvider>
    );

    expect(screen.getByText('Contact: ann@example.com / 555')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Change city'));
    expect(renders).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('Change email'));
    expect(screen.getByText('Contact: bea@example.com / 555')).toBeInTheDocument();
    expect(renders).toHaveBeenCalledTimes(2);
  });

  it('throws outside a provider', () => {
    expect(() => {
      renderHook(() => useFormStateContext(selectorSchema, (form) => form.formActions));
    }).toThrow(/FormStateProvider/);
  });
});
