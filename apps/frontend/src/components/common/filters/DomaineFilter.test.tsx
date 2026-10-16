import { DOMAINES_FONCTIONNELS, domainesFonctionnelsLabels, FILTRE_NON_RENSEIGNE } from '@sirena/common/constants';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DomaineFilter } from './DomaineFilter';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const openMenu = async () => {
  await userEvent.click(screen.getByRole('button', { name: /Domaine fonctionnel/ }));
};

const nonRenseigneCheckbox = () => screen.getByRole('checkbox', { name: /^Non renseigné/ });

const countsForAll = (count: number) =>
  Object.fromEntries([...Object.values(DOMAINES_FONCTIONNELS), FILTRE_NON_RENSEIGNE].map((id) => [id, count]));

describe('DomaineFilter — valeur « Non renseigné »', () => {
  // CA1
  it('propose « Non renseigné » en tête de la liste des valeurs', async () => {
    render(<DomaineFilter selectedIds={[]} onChange={vi.fn()} />);

    await openMenu();
    const [firstCheckbox] = screen.getAllByRole('checkbox');

    expect(firstCheckbox).toHaveAttribute('value', FILTRE_NON_RENSEIGNE);
    expect(nonRenseigneCheckbox()).toBeInTheDocument();
  });

  // CA1 — l'option n'est proposée que s'il existe des données concernées
  it("masque « Non renseigné » quand aucune donnée n'a le champ vide", async () => {
    render(
      <DomaineFilter selectedIds={[]} counts={{ ...countsForAll(3), [FILTRE_NON_RENSEIGNE]: 0 }} onChange={vi.fn()} />,
    );

    await openMenu();

    expect(screen.queryByRole('checkbox', { name: /^Non renseigné/ })).not.toBeInTheDocument();
  });

  it("propose « Non renseigné » dès qu'au moins une donnée a le champ vide", async () => {
    render(
      <DomaineFilter selectedIds={[]} counts={{ ...countsForAll(3), [FILTRE_NON_RENSEIGNE]: 7 }} onChange={vi.fn()} />,
    );

    await openMenu();

    expect(screen.getByRole('checkbox', { name: 'Non renseigné (7)' })).toBeInTheDocument();
  });

  it('propose « Non renseigné » tant que les effectifs ne sont pas connus', async () => {
    render(<DomaineFilter selectedIds={[]} counts={null} onChange={vi.fn()} />);

    await openMenu();

    expect(nonRenseigneCheckbox()).toBeInTheDocument();
  });

  it('remonte la sentinelle comme une valeur cochée ordinaire', async () => {
    const onChange = vi.fn();
    render(<DomaineFilter selectedIds={[]} onChange={onChange} />);

    await openMenu();
    await userEvent.click(nonRenseigneCheckbox());

    expect(onChange).toHaveBeenCalledWith([FILTRE_NON_RENSEIGNE]);
  });

  // CA3
  it('laisse sélectionner « Non renseigné » seule', async () => {
    render(<DomaineFilter selectedIds={[FILTRE_NON_RENSEIGNE]} onChange={vi.fn()} />);

    await openMenu();

    expect(nonRenseigneCheckbox()).toBeChecked();
    expect(screen.getByRole('checkbox', { name: domainesFonctionnelsLabels.SOCIAL })).not.toBeChecked();
  });

  // CA2
  it('coche toutes les valeurs, sentinelle incluse, sans en perdre aucune', async () => {
    const allSelected = [...Object.values(DOMAINES_FONCTIONNELS), FILTRE_NON_RENSEIGNE];
    render(<DomaineFilter selectedIds={allSelected} onChange={vi.fn()} />);

    await openMenu();

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(allSelected.length);
    for (const checkbox of checkboxes) expect(checkbox).toBeChecked();
  });

  it('retire la sentinelle de la sélection quand on la décoche', async () => {
    const onChange = vi.fn();
    render(<DomaineFilter selectedIds={[FILTRE_NON_RENSEIGNE, 'SOCIAL']} onChange={onChange} />);

    await openMenu();
    await userEvent.click(nonRenseigneCheckbox());

    expect(onChange).toHaveBeenCalledWith(['SOCIAL']);
  });

  // CA4
  it("ne coche rien quand aucune valeur n'est sélectionnée", async () => {
    render(<DomaineFilter selectedIds={[]} onChange={vi.fn()} />);

    await openMenu();

    for (const checkbox of screen.getAllByRole('checkbox')) expect(checkbox).not.toBeChecked();
  });

  describe('accessibilité', () => {
    it('donne à « Non renseigné » un libellé lié à sa case', async () => {
      render(<DomaineFilter selectedIds={[]} onChange={vi.fn()} />);

      await openMenu();
      const checkbox = nonRenseigneCheckbox();

      expect(checkbox).toHaveAccessibleName('Non renseigné');
      expect(checkbox).toBeEnabled();
    });

    it('compte la sentinelle dans le nombre de valeurs sélectionnées annoncé', () => {
      render(<DomaineFilter selectedIds={[FILTRE_NON_RENSEIGNE, 'SOCIAL']} onChange={vi.fn()} />);

      const trigger = screen.getByRole('button', { name: /Domaine fonctionnel.*domaines sélectionnés/ });

      expect(trigger).toHaveTextContent('(2)');
    });
  });
});
