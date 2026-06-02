import { z, type DeepPartial } from '../src';

export const swallowNetworkDown = (reason: unknown) => {
  if (reason instanceof Error && reason.message === 'Network down') {
    return;
  }
  throw reason;
};

export const buildAsyncSchema = (allowed: Set<string>, delay = 0) => {
  const lookup = (name: string) =>
    new Promise<boolean>((resolve) => {
      setTimeout(() => {
        resolve(allowed.has(name));
      }, delay);
    });

  return z.object({
    name: z
      .formString({ required: true, error: 'Name is required' })
      .check(z.validateAsync(lookup, 'Name is not allowed')),
  });
};

export const makeComboSchema = (spies?: {
  asyncSpy?: (value: string) => void;
  submitOnlySpy?: (data: { name: string; email: string }) => void;
}) =>
  z
    .object({
      name: z.formString({ required: true }, z.maxLength(3, 'Name too long')),
      email: z.formString({ required: true }).check(
        z.validateAsync((value: string) => {
          spies?.asyncSpy?.(value);
          return Promise.resolve(value === 'ok@x');
        }, 'Email async error')
      ),
    })
    .check(
      z.validateAsync(
        (data: { name: string; email: string }) => {
          spies?.submitOnlySpy?.(data);
          return Promise.resolve(data.name !== 'no');
        },
        {
          path: ['name'],
          error: 'submitOnly name error',
          submitOnly: true,
        }
      )
    );

export const schema = z
  .strictObject({
    name: z
      .formString(
        {
          required: true,
          error: 'Name is required',
        },
        z.regex(/^[\d'A-Za-z-]*$/, 'Name contains invalid characters'),
        z.maxLength(25, 'Name is too long')
      )
      .with(z.describe('Name')),
    info: z
      .object({
        uuid: z.symbol(),
        age: z
          .formNumber(
            {
              required: true,
              error: 'Age is required',
            },
            z.gte(1, 'Age must be > 0')
          )
          .with(z.describe('Age')),
        email: z
          .formString({ error: 'Invalid email', allowEmpty: false })
          .with(z.describe('Email')),
        birthDate: z
          .formDate(
            { dateFormat: 'MM-dd-yyyy' },
            z.gte(new Date(2020, 0, 1), 'Invalid date range'),
            z.lte(new Date(2039, 11, 31), 'Invalid date range')
          )
          .with(z.describe('Birth date')),
      })
      .with(z.describe('Info')),
    tags: z
      .formArray(
        z
          .formString(
            { required: true },
            z.maxLength(255, 'Tag is too long'),
            z.regex(/^[\w\\-]*$/, 'Tag contains invalid characters')
          )
          .with(z.describe('Tag')),
        { minLength: 0, maxLength: 5 }
      )
      .with(z.describe('Tags')),
    category: z.formValues(['legacy', 'unconfirmed']).with(z.describe('Category')),
    isActive: z
      .default(z.formBoolean({ required: true, error: 'Is active is required' }), true)
      .with(z.describe('Is record active?')),
    isArchived: z.formBoolean({ required: true }).with(z.describe('Is record archived?')),
    version: z
      // eslint-disable-next-line unicorn/prefer-top-level-await -- Zod's .catch(), not a Promise
      .catch(z.formNumber(z.gte(0, 'Negative version'), z.lte(9999999, 'Version is too high')), 0)
      .with(z.describe('Record version')),
    registeredOn: z.formDate({ dateFormat: 'MM/dd/yyyy' }).with(z.describe('Registered on')),
    updateDates: z
      .formArray(
        z
          .formDate({ required: true }, z.lte(new Date(2099, 11, 31), 'Date is too early'))
          .with(z.describe('Update date'))
      )
      .with(z.describe('Update dates')),
    previousVersions: z
      .formArray(
        z.formNumber({ required: true }, z.lte(9999)).with(z.describe('Previous version')),
        {
          required: false,
        }
      )
      .with(z.describe('Previous versions')),
    specialNumber: z
      .default(
        z.formNumber(z.gt(3.1, 'Number is too short'), z.lt(3.15, 'Number is too long')),
        Math.PI
      )
      .with(z.describe('Special number')),
    password: z.formString({ required: false }),
  })
  .with(z.describe('Test schema'));

export type Schema = z.infer<typeof schema>;
export type InitialSchema = DeepPartial<Schema>;
