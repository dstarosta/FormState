import { describe, expect, it } from 'vitest';
import { formatDate, safeParseDate } from '../../src';

describe('date formatter', () => {
  it('should format dates correctly', () => {
    const date = new Date(2020, 11, 31);

    expect(formatDate(date)).toBe('2020-12-31');
    expect(formatDate(date, 'yyyy-MM-dd')).toBe('2020-12-31');
    expect(formatDate(date, 'dd-MM-yyyy')).toBe('31-12-2020');
    expect(formatDate(date, 'MM-dd-yyyy')).toBe('12-31-2020');
    expect(formatDate(date, 'MM/dd/yyyy')).toBe('12/31/2020');
    expect(formatDate(date, 'dd/MM/yyyy')).toBe('31/12/2020');
    expect(formatDate(date, 'dd.MM.yyyy')).toBe('31.12.2020');
  });

  it('should throw formatting invalid dates', () => {
    expect(() => formatDate('' as unknown as Date)).toThrow(TypeError);
    expect(() => formatDate(undefined as unknown as Date)).toThrow(TypeError);
    expect(() => formatDate(new Date(Number.NaN))).toThrow(TypeError);
    expect(() => formatDate(new Date(2021, 0, 1), 'MM-MM-MM' as unknown as 'MM/dd/yyyy')).toThrow(
      TypeError
    );
  });

  it('should parse dates correctly', () => {
    let parsedDate = safeParseDate('2020-12-31');

    expect(parsedDate.success).toBe(true);
    expect(parsedDate.date).toEqual(new Date(2020, 11, 31));

    parsedDate = safeParseDate('2020-12-31', 'yyyy-MM-dd');

    expect(parsedDate.success).toBe(true);
    expect(parsedDate.date).toEqual(new Date(2020, 11, 31));

    parsedDate = safeParseDate('12/31/2020', 'MM/dd/yyyy');

    expect(parsedDate.success).toBe(true);
    expect(parsedDate.date).toEqual(new Date(2020, 11, 31));

    parsedDate = safeParseDate('31/12/2020', 'dd/MM/yyyy');

    expect(parsedDate.success).toBe(true);
    expect(parsedDate.date).toEqual(new Date(2020, 11, 31));

    parsedDate = safeParseDate('12-31-2020', 'MM-dd-yyyy');

    expect(parsedDate.success).toBe(true);
    expect(parsedDate.date).toEqual(new Date(2020, 11, 31));

    parsedDate = safeParseDate('31-12-2020', 'dd-MM-yyyy');

    expect(parsedDate.success).toBe(true);
    expect(parsedDate.date).toEqual(new Date(2020, 11, 31));

    parsedDate = safeParseDate('31.12.2020', 'dd.MM.yyyy');

    expect(parsedDate.success).toBe(true);
    expect(parsedDate.date).toEqual(new Date(2020, 11, 31));
  });
});

it('should not parse invalid dates', () => {
  let parsedDate = safeParseDate(undefined);

  expect(parsedDate.success).toBe(false);
  expect(parsedDate.date).toBeNull();

  parsedDate = safeParseDate('');

  expect(parsedDate.success).toBe(false);
  expect(parsedDate.date).toBeNull();

  parsedDate = safeParseDate('abcd1234', 'MM/dd/yyyy');

  expect(parsedDate.success).toBe(false);
  expect(parsedDate.date).toBeNull();

  parsedDate = safeParseDate('2020-99-99', 'yyyy-MM-dd');

  expect(parsedDate.success).toBe(false);
  expect(parsedDate.date).toBeNull();

  parsedDate = safeParseDate('31-12-2020', 'yyyy-MM-dd');

  expect(parsedDate.success).toBe(false);
  expect(parsedDate.date).toBeNull();

  parsedDate = safeParseDate('31-12-2020', 'MM-dd-yyyy');

  expect(parsedDate.success).toBe(false);
  expect(parsedDate.date).toBeNull();

  expect(() => safeParseDate('12-12-12', 'MM-MM-MM' as unknown as 'MM/dd/yyyy')).toThrow(TypeError);
});
