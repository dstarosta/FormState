import { describe, expect, it } from 'vitest';
import { formatDate, safeParseDate } from '../../src';
import { getDatePattern } from '../../src/helpers/date-formatter';

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
    expect(() => formatDate(new Date(NaN))).toThrow(TypeError);
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

  it('should return a strict JSON Schema pattern for each date format', () => {
    const cases = [
      ['yyyy-MM-dd', '2020-12-31', '12/31/2020'],
      ['MM/dd/yyyy', '12/31/2020', '2020-12-31'],
      ['dd/MM/yyyy', '31/12/2020', '12/31/2020'],
      ['MM-dd-yyyy', '12-31-2020', '31-12-2020'],
      ['dd-MM-yyyy', '31-12-2020', '12-31-2020'],
      ['dd.MM.yyyy', '31.12.2020', '31/12/2020'],
    ] as const;

    for (const [format, valid, invalid] of cases) {
      const pattern = new RegExp(getDatePattern(format));

      expect(pattern.test(valid)).toBe(true);
      expect(pattern.test(invalid)).toBe(false);
    }

    const iso = new RegExp(getDatePattern('yyyy-MM-dd'));

    expect(iso.test('2020-13-01')).toBe(false); // invalid month
    expect(iso.test('2020-12-32')).toBe(false); // invalid day
    expect(iso.test('2020-1-1')).toBe(false); // not zero-padded
  });

  it('should throw for an unknown date format pattern', () => {
    expect(() => getDatePattern('MM~dd~yyyy' as unknown as 'MM/dd/yyyy')).toThrow(TypeError);
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
