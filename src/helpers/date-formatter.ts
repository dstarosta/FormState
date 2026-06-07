import type { DateParseResult, FormDateFormat } from '../types/form-types';

// Constants

const INVALID_DATE = new Date('Invalid Date');

const YYYY = String.raw`\d{4}`;
const MM = '(0[1-9]|1[0-2])';
const DD = String.raw`(0[1-9]|[12]\d|3[01])`;

const DATE_PATTERNS = new Map<FormDateFormat, RegExp>([
  ['dd.MM.yyyy', /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/],
  ['dd/MM/yyyy', /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/],
  ['MM/dd/yyyy', /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/],
  ['dd-MM-yyyy', /^(\d{1,2})-(\d{1,2})-(\d{4})$/],
  ['MM-dd-yyyy', /^(\d{1,2})-(\d{1,2})-(\d{4})$/],
  ['yyyy-MM-dd', /^(\d{4})-(\d{1,2})-(\d{1,2})$/],
]);

const JSON_SCHEMA_DATE_PATTERNS = new Map<FormDateFormat, string>([
  ['dd.MM.yyyy', String.raw`^${DD}\.${MM}\.${YYYY}$`],
  ['dd/MM/yyyy', `^${DD}/${MM}/${YYYY}$`],
  ['MM/dd/yyyy', `^${MM}/${DD}/${YYYY}$`],
  ['dd-MM-yyyy', `^${DD}-${MM}-${YYYY}$`],
  ['MM-dd-yyyy', `^${MM}-${DD}-${YYYY}$`],
  ['yyyy-MM-dd', `^${YYYY}-${MM}-${DD}$`],
]);

// Private functions

const getParserExpression = (format: FormDateFormat) => {
  const parserExp = DATE_PATTERNS.get(format);

  if (!parserExp) {
    throw new TypeError('Invalid date format provided.');
  }

  return parserExp;
};

// Internal functions

export const getDatePattern = (format: FormDateFormat): string => {
  const pattern = JSON_SCHEMA_DATE_PATTERNS.get(format);

  if (!pattern) {
    throw new TypeError('Invalid date format provided.');
  }

  return pattern;
};

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
  return date instanceof Date && !Number.isNaN(date.getTime());
};

export const parseDate = (
  input: string | undefined,
  format: FormDateFormat,
  asUTC: boolean = false
) => {
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

  const numYear = Number.parseInt(year ?? '', 10);
  const numMonth = Number.parseInt(month ?? '', 10) - 1;
  const numDay = Number.parseInt(day ?? '', 10);

  let date: Date;
  let dateYear: number;
  let dateMonth: number;
  let dateDay: number;

  if (asUTC) {
    date = new Date(Date.UTC(numYear, numMonth, numDay));
    dateYear = date.getUTCFullYear();
    dateMonth = date.getUTCMonth();
    dateDay = date.getUTCDate();
  } else {
    date = new Date(numYear, numMonth, numDay);
    dateYear = date.getFullYear();
    dateMonth = date.getMonth();
    dateDay = date.getDate();
  }

  if (!isValidDate(date) || dateYear !== numYear || dateMonth !== numMonth || dateDay !== numDay) {
    return INVALID_DATE;
  }

  return date;
};

// Public functions

/**
 * Formats a date as a `string` in the provided date format.
 *
 * @param date - The date object.
 * @param format - The date format.
 * @throws A `TypeError` instance if the date object is not a valid `Date` instance.
 * @returns The formatted date string.
 */
export function formatDate(date: Date, format: FormDateFormat = 'yyyy-MM-dd') {
  if (!isValidDate(date)) {
    throw new TypeError('Invalid date provided.');
  }

  if (!DATE_PATTERNS.has(format)) {
    throw new TypeError('Invalid date format provided.');
  }

  const year = date.getFullYear().toString();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');

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
export function safeParseDate(input: string | undefined, format: FormDateFormat = 'yyyy-MM-dd') {
  const date = parseDate(input, format);

  if (!isValidDate(date)) {
    return {
      success: false,
      date: null,
    } satisfies DateParseResult;
  }

  return {
    success: true,
    date,
  } satisfies DateParseResult;
}
