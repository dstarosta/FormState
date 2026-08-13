import { describe, expect, it } from 'vitest';
import { isValidDate } from '../../src/helpers/date-formatter';
import {
  toInt,
  toFloat,
  toDate,
  toBoolean,
  toLiteral,
  toString,
  asBoolean,
  asNumber,
  asDateString,
} from '../../src/helpers/value-converter';

describe('value-converter', () => {
  describe('toInt', () => {
    it('returns empty string for empty input', () => {
      expect(toInt('')).toBe('');
    });

    it('parses valid integer strings', () => {
      expect(toInt('42')).toBe(42);
      expect(toInt('007')).toBe(7);
      expect(toInt('-19')).toBe(-19);
      expect(toInt('0')).toBe(0);
    });

    it('returns empty string when value is not a valid integer', () => {
      expect(toInt('12.34')).toBe('');
      expect(toInt('abc')).toBe('');
      expect(toInt('12px')).toBe('');
      expect(toInt('Infinity')).toBe('');
      expect(toInt('NaN')).toBe('');
      expect(toInt('1e3')).toBe('');
      expect(toInt('0x6')).toBe('');
      expect(toInt('100_000')).toBe('');
    });
  });

  describe('toFloat', () => {
    it('returns empty string for empty input', () => {
      expect(toFloat('')).toBe('');
    });

    it('parses valid number strings (int or float)', () => {
      expect(toFloat('42')).toBe(42);
      expect(toFloat('4.25')).toBeCloseTo(4.25);
      expect(toFloat('-0.001')).toBeCloseTo(-0.001);
      expect(toFloat('0')).toBe(0);
    });

    it('returns empty string for invalid float inputs', () => {
      expect(toFloat('abc')).toBe('');
      expect(toFloat('12.34.56')).toBe('');
      expect(toFloat('4,25')).toBe(''); // comma is not valid in JS parseFloat
      expect(toFloat('Infinity')).toBe('');
    });
  });

  describe('toDate', () => {
    it('returns empty string for invalid or empty date strings', () => {
      expect(toDate('')).toBe('');

      expect(toDate('invalid-date')).toBe('');
      expect(toDate('2025-13-01')).toBe(''); // invalid month
      expect(toDate('32/01/2025', { dateFormat: 'dd/MM/yyyy' })).toBe('');
    });

    it('returns valid Date object when parsing succeeds (default format)', () => {
      const result = toDate('2025-02-26') as Date;

      expect(result).toBeInstanceOf(Date);
      expect(isValidDate(result)).toBe(true);
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(1); // February = 1
      expect(result.getDate()).toBe(26);
    });

    it('returns valid Date object when parsing succeeds (UTC)', () => {
      const result = toDate('2025-02-26', { asUTC: true }) as Date;

      expect(result).toBeInstanceOf(Date);
      expect(isValidDate(result)).toBe(true);
      expect(result.getUTCFullYear()).toBe(2025);
      expect(result.getUTCMonth()).toBe(1);
      expect(result.getUTCDate()).toBe(26);
    });

    it('respects custom date format when provided', () => {
      const result = toDate('26/02/2025', { dateFormat: 'dd/MM/yyyy' }) as Date;

      expect(result).toBeInstanceOf(Date);
      expect(isValidDate(result)).toBe(true);
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(1);
      expect(result.getDate()).toBe(26);
    });
  });

  describe('toBoolean', () => {
    describe('non-strict mode (default)', () => {
      it.each([
        ['true', true],
        ['TRUE', true],
        ['checked', true],
        ['on', true],
        ['yes', true],
        ['Yes', true],
        ['false', false],
        ['FALSE', false],
        ['unchecked', false],
        ['off', false],
        ['no', false],
        ['No', false],
      ])('"%s" → %s', (input, expected) => {
        expect(toBoolean(input)).toBe(expected);
      });

      it('returns empty string for unknown / falsy values', () => {
        expect(toBoolean('')).toBe('');
        expect(toBoolean('maybe')).toBe('');
        expect(toBoolean('1')).toBe('');
        expect(toBoolean('0')).toBe('');
        expect(toBoolean('y')).toBe('');
      });
    });

    describe('strict mode', () => {
      it('only accepts exact "true"/"false" (case insensitive)', () => {
        expect(toBoolean('true', { strict: true })).toBe(true);
        expect(toBoolean('TRUE', { strict: true })).toBe(true);
        expect(toBoolean('false', { strict: true })).toBe(false);
        expect(toBoolean('FALSE', { strict: true })).toBe(false);
      });

      it('rejects aliases and invalid values in strict mode', () => {
        expect(toBoolean('yes', { strict: true })).toBe('');
        expect(toBoolean('on', { strict: true })).toBe('');
        expect(toBoolean('1', { strict: true })).toBe('');
        expect(toBoolean('', { strict: true })).toBe('');
        expect(toBoolean('checked', { strict: true })).toBe('');
        expect(toBoolean('maybe', { strict: true })).toBe('');
      });
    });
  });

  describe('toLiteral', () => {
    const colors = ['red', 'green', 'blue'] as const;

    it('returns the value when it matches one of the allowed literals', () => {
      expect(toLiteral('green', colors)).toBe('green');
      expect(toLiteral('red', colors)).toBe('red');
    });

    it('returns empty string when value is not in allowed list', () => {
      expect(toLiteral('yellow', colors)).toBe('');
      expect(toLiteral('', colors)).toBe('');
      expect(toLiteral('RED', colors)).toBe(''); // case sensitive
    });

    it('handles empty allowed values array', () => {
      expect(toLiteral('anything', [])).toBe('');
    });
  });

  describe('toString', () => {
    it('returns empty string for null / undefined', () => {
      expect(toString(null)).toBe('');
      expect(toString(undefined)).toBe('');
    });

    it('converts boolean values', () => {
      expect(toString(true)).toBe('true');
      expect(toString(false)).toBe('false');
    });

    it('converts numbers (including zero)', () => {
      expect(toString(42)).toBe('42');
      expect(toString(-4.25)).toBe('-4.25');
      expect(toString(0)).toBe('0');
    });

    it('returns empty string for NaN', () => {
      expect(toString(NaN)).toBe('');
    });

    it('passes through strings unchanged', () => {
      expect(toString('hello')).toBe('hello');
      expect(toString('false')).toBe('false');
      expect(toString('')).toBe('');
    });

    it('treats empty string as "false" only when option is enabled', () => {
      expect(toString('', { emptyStringAsFalse: true })).toBe('false');
      expect(toString('', { emptyStringAsFalse: false })).toBe('');
      expect(toString('')).toBe(''); // default = false
    });

    it('formats valid Date objects (default format)', () => {
      const date = new Date(2025, 1, 26);
      const result = toString(date);

      expect(result).toMatch(/2025-02-26/);
    });

    it('uses custom date format when provided', () => {
      const date = new Date(2025, 1, 26);
      const result = toString(date, { dateFormat: 'dd/MM/yyyy' });

      expect(result).toMatch(/26\/02\/2025/);
    });

    it('returns empty string for invalid Date objects', () => {
      const invalid = new Date('invalid');

      expect(toString(invalid)).toBe('');
    });
  });

  describe('asBoolean', () => {
    it('converts a valid boolean value', () => {
      expect(asBoolean(true)).toBe(true);
      expect(asBoolean(false)).toBe(false);
      expect(asBoolean(true, false)).toBe(true);
      expect(asBoolean(false, true)).toBe(false);
    });

    it('converts an empty string to the default value', () => {
      expect(asBoolean('')).toBe(false);
      expect(asBoolean('', false)).toBe(false);
      expect(asBoolean('', true)).toBe(true);
    });
  });

  describe('asNumber', () => {
    it('converts a valid number value', () => {
      expect(asNumber(0)).toBe(0);
      expect(asNumber(0, 1)).toBe(0);
      expect(asNumber(Infinity)).toBe(Infinity);
      expect(asNumber(Infinity, 1)).toBe(Infinity);
      expect(asNumber(-1.2451)).toBeCloseTo(-1.2451);
      expect(asNumber(-1.2451, 1)).toBeCloseTo(-1.2451);
    });

    it('converts an empty string to the default value', () => {
      expect(asNumber('')).toBe(0);
      expect(asNumber('', 1)).toBe(1);
      expect(asNumber('', -1.2451)).toBeCloseTo(-1.2451);
    });
  });

  describe('asDateString', () => {
    it('converts a valid Date value', () => {
      expect(asDateString(new Date(2022, 1, 28), 'yyyy-MM-dd')).toBe('2022-02-28');
      expect(asDateString(new Date(2022, 1, 28))).toBe('2022-02-28');
      // eslint-disable-next-line sonarjs/no-undefined-argument
      expect(asDateString(new Date(2022, 1, 28), undefined)).toBe('2022-02-28');
      expect(asDateString(new Date(2022, 21, 28), 'MM/dd/yyyy')).toBe('10/28/2023');
      expect(asDateString(new Date('invalid value'))).toBe('Invalid Date');

      expect(() => {
        asDateString(new Date(2022, 21, 28), 'MMddyyyy');
      }).throws(TypeError);
    });

    it('passes a string value through', () => {
      expect(asDateString('2022-02-28')).toBe('2022-02-28');
      expect(asDateString('Invalid Date')).toBe('Invalid Date');
    });
  });
});
