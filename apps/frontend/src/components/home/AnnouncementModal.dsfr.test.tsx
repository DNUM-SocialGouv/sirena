import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AnnouncementModal } from './AnnouncementModal';

const disclose = vi.fn();
let originalDsfr: unknown;
let isModalRegistered: boolean;

beforeEach(() => {
  window.localStorage.clear();
  originalDsfr = Reflect.get(window, 'dsfr');
  isModalRegistered = false;
  disclose.mockClear();
  Reflect.set(
    window,
    'dsfr',
    vi.fn(() => (isModalRegistered ? { modal: { disclose } } : null)),
  );
});

afterEach(() => {
  cleanup();
  Reflect.set(window, 'dsfr', originalDsfr);
  vi.clearAllMocks();
});

it('opens after DSFR registers a dynamically mounted announcement', async () => {
  expect(() =>
    render(
      <AnnouncementModal campaign="example-v1" title="Une annonce" focusReturnRef={{ current: null }}>
        Le contenu
      </AnnouncementModal>,
    ),
  ).not.toThrow();
  expect(screen.getByText('Une annonce')).toBeInTheDocument();

  isModalRegistered = true;

  await waitFor(() => expect(disclose).toHaveBeenCalledOnce());
});
