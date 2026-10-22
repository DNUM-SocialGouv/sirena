import { CGU_VERSION } from '@sirena/common/constants';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useUserStore } from '@/stores/userStore';
import { CguAcceptanceGate } from './CguAcceptanceGate';

vi.mock('./CguAcceptance', () => ({ CguAcceptance: () => <div>Acceptation des CGU</div> }));

const renderGate = (isEnabled: boolean | undefined) =>
  render(
    <CguAcceptanceGate isEnabled={isEnabled}>
      <p>Liste des requêtes</p>
    </CguAcceptanceGate>,
  );

describe('CguAcceptanceGate', () => {
  beforeEach(() => {
    useUserStore.setState({ cguAcceptedVersion: null });
  });

  it('gives access to the application once the CGU in force are accepted', () => {
    useUserStore.setState({ cguAcceptedVersion: CGU_VERSION });

    renderGate(true);

    expect(screen.getByText('Liste des requêtes')).toBeInTheDocument();
    expect(screen.queryByText('Acceptation des CGU')).not.toBeInTheDocument();
  });

  it('does not wait for the feature flags when the CGU in force are accepted', () => {
    useUserStore.setState({ cguAcceptedVersion: CGU_VERSION });

    renderGate(undefined);

    expect(screen.getByText('Liste des requêtes')).toBeInTheDocument();
  });

  it('asks for the acceptance instead of the application when the CGU were never accepted', () => {
    renderGate(true);

    expect(screen.getByText('Acceptation des CGU')).toBeInTheDocument();
    expect(screen.queryByText('Liste des requêtes')).not.toBeInTheDocument();
  });

  it('asks again for the acceptance when only a previous version was accepted', () => {
    useUserStore.setState({ cguAcceptedVersion: 'previous-version' });

    renderGate(true);

    expect(screen.getByText('Acceptation des CGU')).toBeInTheDocument();
    expect(screen.queryByText('Liste des requêtes')).not.toBeInTheDocument();
  });

  it('renders nothing while the feature flags load', () => {
    const { container } = renderGate(undefined);

    expect(container).toBeEmptyDOMElement();
  });

  it('gives access to the application while the CGU acceptance is not enabled', () => {
    renderGate(false);

    expect(screen.getByText('Liste des requêtes')).toBeInTheDocument();
    expect(screen.queryByText('Acceptation des CGU')).not.toBeInTheDocument();
  });
});
