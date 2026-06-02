import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { createFormStore } from '../../src/helpers/form-store';
import { createUseWatch } from '../../src/helpers/use-watch-builder';

describe('createUseWatch server snapshot', () => {
  const store = createFormStore();
  const useWatch = createUseWatch(store);

  function WatchDisplay({ compute }: Readonly<{ compute?: (value: string) => string }>) {
    const value = useWatch('name', compute);
    return <span>{value}</span>;
  }

  it('returns empty string when no compute is provided', () => {
    const html = renderToString(<WatchDisplay />);

    expect(html).toMatch(/<span[^>]*><\/span>/);
  });

  it('applies compute to empty string', () => {
    const html = renderToString(<WatchDisplay compute={(v) => v + '!'} />);

    expect(html).toMatch(/<span[^>]*>!<\/span>/);
  });
});
