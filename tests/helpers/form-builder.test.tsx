import { describe, expect, it } from 'vitest';
import { formDataDecode, formDataEncode } from '../../src';

const entries = (formData: FormData) => [...formData.entries()];

describe('form builder', () => {
  it('should convert FormData into URL parameters', () => {
    const formData = new FormData();
    formData.append('param1', 'Some value');
    formData.append('param2', 'value1');
    formData.append('param2', 'value2');
    formData.append('param3', '');
    formData.append('param4', new File([], 'some<file>.txt'));

    const urlParams = formDataEncode(formData).toString();

    expect(urlParams).toBe(
      'param1=Some+value&param2=value1&param2=value2&param3=&param4=some%3Cfile%3E.txt'
    );
    expect(decodeURIComponent(urlParams)).toBe(
      'param1=Some+value&param2=value1&param2=value2&param3=&param4=some<file>.txt'
    );
  });

  it('should convert FormData into URL parameters except for params 3 and 4', () => {
    const formData = new FormData();
    formData.append('param1', 'Some value');
    formData.append('param2', 'value1');
    formData.append('param2', 'value2');
    formData.append('param3', '');
    formData.append('param4', new File([], 'some<file>.txt'));

    const urlParams = formDataEncode(formData, ['param4', 'param3']).toString();

    expect(urlParams).toBe('param1=Some+value&param2=value1&param2=value2');
  });

  describe('notation', () => {
    it('converts bracket string keys to dot notation', () => {
      const formData = new FormData();
      formData.append('name', 'Alice');
      formData.append('info["age"]', '30');

      expect(formDataEncode(formData, [], 'dot').toString()).toBe('name=Alice&info.age=30');
    });

    it('converts bracket numeric indices to dot notation', () => {
      const formData = new FormData();
      formData.append('tags[0]', 'a');
      formData.append('tags[1]', 'b');

      expect(formDataEncode(formData, [], 'dot').toString()).toBe('tags.0=a&tags.1=b');
    });

    it('converts deeply nested bracket keys to dot notation', () => {
      const formData = new FormData();
      formData.append('a["b"]["c"]', 'val');

      expect(formDataEncode(formData, [], 'dot').toString()).toBe('a.b.c=val');
    });

    it('converts mixed bracket keys (string and numeric) to dot notation', () => {
      const formData = new FormData();
      formData.append('items[0]["name"]', 'Alice');
      formData.append('items[1]["name"]', 'Bob');

      expect(formDataEncode(formData, [], 'dot').toString()).toBe(
        'items.0.name=Alice&items.1.name=Bob'
      );
    });

    it('converts dot string keys to bracket notation', () => {
      const formData = new FormData();
      formData.append('name', 'Alice');
      formData.append('info.age', '30');

      const urlParams = formDataEncode(formData, [], 'bracket').toString();

      expect(urlParams).toBe('name=Alice&info%5B%22age%22%5D=30');
      expect(decodeURIComponent(urlParams)).toBe('name=Alice&info["age"]=30');
    });

    it('converts dot numeric indices to bracket notation', () => {
      const formData = new FormData();
      formData.append('tags.0', 'a');
      formData.append('tags.1', 'b');

      const urlParams = formDataEncode(formData, [], 'bracket').toString();

      expect(urlParams).toBe('tags%5B0%5D=a&tags%5B1%5D=b');
      expect(decodeURIComponent(urlParams)).toBe('tags[0]=a&tags[1]=b');
    });

    it('converts deeply nested dot keys to bracket notation', () => {
      const formData = new FormData();
      formData.append('a.b.c', 'val');

      const urlParams = formDataEncode(formData, [], 'bracket').toString();

      expect(urlParams).toBe('a%5B%22b%22%5D%5B%22c%22%5D=val');
      expect(decodeURIComponent(urlParams)).toBe('a["b"]["c"]=val');
    });

    it('converts mixed dot keys (string and numeric) to bracket notation', () => {
      const formData = new FormData();
      formData.append('items.0.name', 'Alice');
      formData.append('items.1.name', 'Bob');

      const urlParams = formDataEncode(formData, [], 'bracket').toString();

      expect(urlParams).toBe('items%5B0%5D%5B%22name%22%5D=Alice&items%5B1%5D%5B%22name%22%5D=Bob');
      expect(decodeURIComponent(urlParams)).toBe('items[0]["name"]=Alice&items[1]["name"]=Bob');
    });

    it('leaves bracket keys unchanged under bracket notation', () => {
      const formData = new FormData();
      formData.append('name', 'Alice');
      formData.append('info["age"]', '30');
      formData.append('items[0]["name"]', 'Bob');

      const urlParams = formDataEncode(formData, [], 'bracket').toString();

      expect(decodeURIComponent(urlParams)).toBe('name=Alice&info["age"]=30&items[0]["name"]=Bob');
    });

    it('leaves dot keys unchanged under dot notation', () => {
      const formData = new FormData();
      formData.append('name', 'Alice');
      formData.append('info.age', '30');
      formData.append('items.0.name', 'Bob');

      expect(formDataEncode(formData, [], 'dot').toString()).toBe(
        'name=Alice&info.age=30&items.0.name=Bob'
      );
    });

    it('leaves flat keys unchanged under either notation', () => {
      const formData = new FormData();
      formData.append('name', 'Alice');
      formData.append('email', 'alice@example.com');

      expect(formDataEncode(formData, [], 'dot').toString()).toBe(
        formDataEncode(formData, [], 'bracket').toString()
      );
    });

    it('applies notation and omitNames together', () => {
      const formData = new FormData();
      formData.append('name', 'Alice');
      formData.append('info["age"]', '30');
      formData.append('_csrf', 'token');

      expect(formDataEncode(formData, ['_csrf'], 'dot').toString()).toBe('name=Alice&info.age=30');
    });

    it('applies notation to file entry names', () => {
      const formData = new FormData();
      formData.append('attachments[0]', new File([], 'report.pdf'));

      expect(formDataEncode(formData, [], 'dot').toString()).toBe('attachments.0=report.pdf');
    });

    it('does not alter keys when notation is omitted', () => {
      const formData = new FormData();
      formData.append('info["age"]', '30');
      formData.append('info.name', 'Alice');

      const urlParams = formDataEncode(formData).toString();

      expect(urlParams).toBe('info%5B%22age%22%5D=30&info.name=Alice');
      expect(decodeURIComponent(urlParams)).toBe('info["age"]=30&info.name=Alice');
    });

    describe('useFormState inferredNameFormat defaults', () => {
      it('bracket keys (inferredNameFormat default) round-trip through dot notation', () => {
        // Simulates FormData produced when inferredNameFormat is 'bracket' (the useFormState default)
        const formData = new FormData();
        formData.append('name', 'Alice');
        formData.append('info["age"]', '30');
        formData.append('tags[0]', 'typescript');
        formData.append('tags[1]', 'react');

        expect(formDataEncode(formData, [], 'dot').toString()).toBe(
          'name=Alice&info.age=30&tags.0=typescript&tags.1=react'
        );
      });

      it('dot keys (inferredNameFormat: dot) round-trip through bracket notation', () => {
        // Simulates FormData produced when inferredNameFormat is 'dot'
        const formData = new FormData();
        formData.append('name', 'Alice');
        formData.append('info.age', '30');
        formData.append('tags.0', 'typescript');
        formData.append('tags.1', 'react');

        const urlParams = formDataEncode(formData, [], 'bracket').toString();

        expect(urlParams).toBe(
          'name=Alice&info%5B%22age%22%5D=30&tags%5B0%5D=typescript&tags%5B1%5D=react'
        );
        expect(decodeURIComponent(urlParams)).toBe(
          'name=Alice&info["age"]=30&tags[0]=typescript&tags[1]=react'
        );
      });

      it('dot keys (inferredNameFormat: dot) are unchanged without notation', () => {
        // When inferredNameFormat is 'dot', omitting notation preserves dot keys as-is
        const formData = new FormData();
        formData.append('name', 'Alice');
        formData.append('info.age', '30');

        expect(formDataEncode(formData).toString()).toBe('name=Alice&info.age=30');
      });
    });
  });

  describe('formDataDecode', () => {
    it('decodes a query string into FormData', () => {
      const formData = formDataDecode('param1=Some+value&param2=value1&param3=');

      expect(entries(formData)).toEqual([
        ['param1', 'Some value'],
        ['param2', 'value1'],
        ['param3', ''],
      ]);
    });

    it('decodes a leading-question-mark query string', () => {
      const formData = formDataDecode('?name=Alice&age=30');

      expect(entries(formData)).toEqual([
        ['name', 'Alice'],
        ['age', '30'],
      ]);
    });

    it('decodes a URLSearchParams instance', () => {
      const formData = formDataDecode(new URLSearchParams('name=Alice&age=30'));

      expect(entries(formData)).toEqual([
        ['name', 'Alice'],
        ['age', '30'],
      ]);
    });

    it('decodes an array of name/value pairs', () => {
      const formData = formDataDecode([
        ['name', 'Alice'],
        ['age', '30'],
      ]);

      expect(entries(formData)).toEqual([
        ['name', 'Alice'],
        ['age', '30'],
      ]);
    });

    it('decodes a record of name/value pairs', () => {
      const formData = formDataDecode({ name: 'Alice', age: '30' });

      expect(entries(formData)).toEqual([
        ['name', 'Alice'],
        ['age', '30'],
      ]);
    });

    it('preserves repeated keys as multiple entries', () => {
      const formData = formDataDecode('param2=value1&param2=value2');

      expect(formData.getAll('param2')).toEqual(['value1', 'value2']);
    });

    it('decodes percent-encoded characters', () => {
      const formData = formDataDecode('file=some%3Cfile%3E.txt');

      expect(formData.get('file')).toBe('some<file>.txt');
    });

    it('returns an empty FormData for undefined input', () => {
      const formData = formDataDecode(undefined);

      expect(formData).toBeInstanceOf(FormData);
      expect(entries(formData)).toEqual([]);
    });

    it('returns an empty FormData for an empty string', () => {
      expect(entries(formDataDecode(''))).toEqual([]);
    });

    it('round-trips with formDataEncode', () => {
      const original = new FormData();
      original.append('param1', 'Some value');
      original.append('param2', 'value1');
      original.append('param2', 'value2');
      original.append('param3', '');

      const decoded = formDataDecode(formDataEncode(original));

      expect(entries(decoded)).toEqual(entries(original));
    });
  });
});
