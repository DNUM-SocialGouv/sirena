import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAppUpdateStore } from '@/stores/appUpdateStore';
import { AppUpdateNotice } from './AppUpdateNotice';

describe('AppUpdateNotice', () => {
  afterEach(() => {
    useAppUpdateStore.setState({ isUpdateAvailable: false });
    vi.restoreAllMocks();
  });

  it('renders nothing while no update is available', () => {
    const { container } = render(<AppUpdateNotice />);
    expect(container).toBeEmptyDOMElement();
  });

  it('prompts to refresh and reloads only when the user clicks', async () => {
    const reload = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload },
    });

    useAppUpdateStore.setState({ isUpdateAvailable: true });
    render(<AppUpdateNotice />);

    expect(screen.getByText(/nouvelle version de l'application/i)).toBeInTheDocument();
    expect(reload).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: /rafraîchir/i }));

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('can be dismissed without reloading', async () => {
    useAppUpdateStore.setState({ isUpdateAvailable: true });
    render(<AppUpdateNotice />);

    await userEvent.click(screen.getByRole('button', { name: /masquer/i }));

    expect(useAppUpdateStore.getState().isUpdateAvailable).toBe(false);
  });
});
