// @vitest-environment jsdom

import { StrictMode } from 'react';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useLocalStorage } from './use-local-storage';

function Probe({ storageKey }: { storageKey: string }) {
  const [enabled, setEnabled] = useLocalStorage(storageKey, false);
  return (
    <button type="button" onClick={() => setEnabled(previous => !previous)}>
      {String(enabled)}
    </button>
  );
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('local storage hydration', () => {
  it('does not temporarily overwrite persisted state in strict mode', async () => {
    localStorage.setItem('show-more', 'true');
    const setItem = vi.spyOn(Storage.prototype, 'setItem');

    render(
      <StrictMode>
        <Probe storageKey="show-more" />
      </StrictMode>,
    );
    await waitFor(() => expect(screen.getByRole('button').textContent).toBe('true'));
    expect(setItem).not.toHaveBeenCalledWith('show-more', 'false');
    expect(localStorage.getItem('show-more')).toBe('true');
  });

  it('keeps the previous key value out of a newly mounted key', async () => {
    localStorage.setItem('old-key', 'true');
    localStorage.setItem('new-key', 'false');
    const setItem = vi.spyOn(Storage.prototype, 'setItem');

    const view = render(<Probe storageKey="old-key" />);
    await waitFor(() => expect(screen.getByRole('button').textContent).toBe('true'));

    view.rerender(<Probe storageKey="new-key" />);
    await waitFor(() => expect(screen.getByRole('button').textContent).toBe('false'));
    expect(setItem).not.toHaveBeenCalledWith('new-key', 'true');
  });

  it('continues working in memory when storage operations throw', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage unavailable');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage unavailable');
    });

    render(<Probe storageKey="restricted-key" />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('button').textContent).toBe('true');
  });
});
