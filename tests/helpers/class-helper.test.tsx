import { describe, expect, it } from 'vitest';
import { classNames } from '../../src/helpers/class-helper';

describe('class helper', () => {
  it('returns empty string when called with no arguments', () => {
    expect(classNames()).toBe('');
  });

  it('returns the string as-is for a single string argument', () => {
    expect(classNames('foo')).toBe('foo');
  });

  it('joins multiple string arguments with a space', () => {
    expect(classNames('foo', 'bar', 'baz')).toBe('foo bar baz');
  });

  it('filters out falsy values', () => {
    expect(classNames('foo', false, null, undefined, '', 'bar')).toBe('foo bar');
  });

  it('includes object keys whose values are truthy', () => {
    expect(classNames({ foo: true, bar: false, baz: true })).toBe('foo baz');
  });

  it('filters object keys with null or undefined values', () => {
    expect(classNames({ foo: true, bar: null, baz: undefined })).toBe('foo');
  });

  it('flattens nested arrays recursively', () => {
    expect(classNames(['foo', ['bar', ['baz', 'qux']]])).toBe('foo bar baz qux');
  });

  it('mixes strings, objects, arrays, and falsy values', () => {
    expect(
      classNames('foo', { bar: true, baz: false }, ['qux', null, { quux: true }], undefined)
    ).toBe('foo bar qux quux');
  });

  it('returns empty string when all arguments are falsy', () => {
    expect(classNames(false, null, undefined, '', [], {})).toBe('');
  });

  it('skips empty objects and arrays without adding extra whitespace', () => {
    expect(classNames('foo', {}, [], 'bar')).toBe('foo bar');
  });
});
