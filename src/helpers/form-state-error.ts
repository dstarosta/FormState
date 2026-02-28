/**
 * Form state error containing Zod errors.
 *
 * @typeParam T - The form schema type.
 */
export class FormStateError<T extends object> extends Error {
  readonly errors: Partial<Record<keyof T, string>>;

  /**
   * Initializes a new instance of the `FormStateError` class.
   *
   * @param message - The Zod error message in a pretty format.
   * @param errors - The object containing form error messages.
   */
  constructor(message: string, errors: Partial<Record<keyof T, string>> = {}) {
    super(message);
    this.name = this.constructor.name;
    this.errors = errors;

    Object.setPrototypeOf(this, new.target.prototype);
  }
}
