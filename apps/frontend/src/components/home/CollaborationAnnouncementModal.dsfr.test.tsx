import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useHasFeature } from '@/hooks/useHasFeature';
import { CollaborationAnnouncementModal } from './CollaborationAnnouncementModal';

vi.mock('@/hooks/useHasFeature', () => ({
  useHasFeature: vi.fn(),
}));

const mockedUseHasFeature = vi.mocked(useHasFeature);
const disclose = vi.fn();
let originalDsfr: unknown;
let isModalRegistered: boolean;

beforeEach(() => {
  window.localStorage.clear();
  mockedUseHasFeature.mockReturnValue(true);
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

it('opens after DSFR registers a dynamically mounted modal', async () => {
  expect(() => render(<CollaborationAnnouncementModal focusReturnRef={{ current: null }} />)).not.toThrow();
  expect(screen.getByText('Collaborez plus facilement sur SIRENA')).toBeInTheDocument();

  isModalRegistered = true;

  await waitFor(() => expect(disclose).toHaveBeenCalledOnce());
});
