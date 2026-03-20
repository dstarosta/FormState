/**
 * Form state error containing Zod errors.
 *
 * @typeParam T - The form schema type.
 */
export class FormStateError<T extends object> extends Error {
  readonly errors: Record<keyof T | '', string | undefined>;

  /**
   * Initializes a new instance of the `FormStateError` class.
   *
   * @param message - The Zod error message in a pretty format.
   * @param errors - The object containing form error messages.
   */
  constructor(message: string, errors = {} as Record<keyof T | '', string | undefined>) {
    super(message);
    this.name = 'FormStateError';
    this.errors = errors;

    Object.setPrototypeOf(this, new.target.prototype);
  }
}
