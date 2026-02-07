import type { DateParseResult, FormDateFormat } from '../form-types';

// Constants

const INVALID_DATE = new Date('Invalid Date');

const DATE_PATTERNS = new Map<FormDateFormat, RegExp>([
  ['dd.MM.yyyy', /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/],
  ['dd/MM/yyyy', /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/],
  ['MM/dd/yyyy', /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/],
  ['dd-MM-yyyy', /^(\d{1,2})-(\d{1,2})-(\d{4})$/],
  ['MM-dd-yyyy', /^(\d{1,2})-(\d{1,2})-(\d{4})$/],
  ['yyyy-MM-dd', /^(\d{4})-(\d{1,2})-(\d{1,2})$/],
]);

// Private methods

const getParserExpression = (format: FormDateFormat) => {
  const parserExp = DATE_PATTERNS.get(format);

  if (!parserExp) {
    throw new TypeError('Invalid date format provided.');
  }

  return parserExp;
};

// Internal methods

export const toUTC = (date: Date | undefined) => {
  if (!date || !isValidDate(date)) {
    return;
  }

  return new Date(
    Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      date.getHours(),
      date.getMinutes(),
      date.getSeconds(),
      date.getMilliseconds()
    )
  );
};

export const isValidDate = (date: unknown) => {
  return date instanceof Date && date !== INVALID_DATE && !Number.isNaN(date.getTime());
};

export const parseDate = (input: string | undefined, format: FormDateFormat) => {
  if (!input) {
    return INVALID_DATE;
  }

  const match = getParserExpression(format).exec(input);

  if (!match) {
    return INVALID_DATE;
  }

  let year: string | undefined;
  let month: string | undefined;
  let day: string | undefined;

  if (format.startsWith('dd')) {
    [, day, month, year] = match;
  } else if (format.startsWith('MM')) {
    [, month, day, year] = match;
  } else {
    [, year, month, day] = match;
  }

  const numYear = Number.parseInt(String(year), 10);
  const numMonth = Number.parseInt(String(month), 10) - 1;
  const numDay = Number.parseInt(String(day), 10);

  const date = new Date(Date.UTC(numYear, numMonth, numDay));

  if (
    !isValidDate(date) ||
    date.getUTCFullYear() !== numYear ||
    date.getUTCMonth() !== numMonth ||
    date.getUTCDate() !== numDay
  ) {
    return INVALID_DATE;
  }

  return date;
};

// Public methods

/**
 * Formats a date as a `string` in the provided date format.
 *
 * @param date - The date object.
 * @param format - The date format.
 * @throws A `TypeError` instance if the date object is not a valid `Date` instance.
 * @returns The formatted date string.
 */
export function formatDate(date: Date, format: FormDateFormat = 'yyyy-MM-dd') {
  if (!date || !isValidDate(date)) {
    throw new TypeError('Invalid date provided.');
  }

  getParserExpression(format); // validates the format

  const year = date.getUTCFullYear().toString();
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = date.getUTCDate().toString().padStart(2, '0');

  switch (format) {
    case 'dd/MM/yyyy': {
      return `${day}/${month}/${year}`;
    }
    case 'MM/dd/yyyy': {
      return `${month}/${day}/${year}`;
    }
    case 'dd.MM.yyyy': {
      return `${day}.${month}.${year}`;
    }
    case 'dd-MM-yyyy': {
      return `${day}-${month}-${year}`;
    }
    case 'MM-dd-yyyy': {
      return `${month}-${day}-${year}`;
    }
    default: {
      return `${year}-${month}-${day}`;
    }
  }
}

/**
 * Parses the provided string input containing a date in the provided format.
 *
 * @param input - The string input.
 * @param format - The date format string (default: 'yyyy-MM-dd').
 * @returns An object containing the success flag and the date object, if the
 * operation was successful.
 */
export function safeParseDate(
  input: string | undefined,
  format: FormDateFormat = 'yyyy-MM-dd'
): DateParseResult {
  const date = parseDate(input, format);

  if (!isValidDate(date)) {
    return {
      success: false,
      date: null,
    };
  }

  return {
    success: true,
    date,
  };
}
