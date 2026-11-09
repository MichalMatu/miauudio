// @vitest-environment jsdom

import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  construct: vi.fn(),
  unload: vi.fn(),
  volume: vi.fn(),
}));

vi.mock('howler', () => ({
  Howl: mocks.construct,
}));
vi.mock('./use-ssr', () => ({
  useSSR: () => ({ isBrowser: true }),
}));

import { useSoundEffect } from './use-sound-effect';

function Probe({ volume }: { volume: number }) {
  useSoundEffect('/sounds/alarm.mp3', volume);
  return null;
}

beforeEach(() => {
  mocks.construct.mockReset();
  mocks.unload.mockReset();
  mocks.volume.mockReset();
  mocks.construct.mockImplementation(() => ({
    unload: mocks.unload,
    volume: mocks.volume,
  }));
});

afterEach(() => cleanup());

describe('web effect audio resources', () => {
  it('releases the Howl instance on unmount', () => {
    const view = render(<Probe volume={0.4} />);
    expect(mocks.construct).toHaveBeenCalledTimes(1);
    view.unmount();
    expect(mocks.unload).toHaveBeenCalledTimes(1);
  });

  it('does not send invalid or out-of-range levels to Howler', () => {
    const view = render(<Probe volume={3} />);
    expect(mocks.volume).toHaveBeenCalledWith(1);

    view.rerender(<Probe volume={Number.NaN} />);
    expect(mocks.volume).toHaveBeenCalledTimes(1);
    view.rerender(<Probe volume={-4} />);
    expect(mocks.volume).toHaveBeenLastCalledWith(0);
  });
});
