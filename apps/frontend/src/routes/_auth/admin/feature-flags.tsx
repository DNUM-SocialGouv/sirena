import Badge from '@codegouvfr/react-dsfr/Badge';
import Button from '@codegouvfr/react-dsfr/Button';
import Input from '@codegouvfr/react-dsfr/Input';
import ToggleSwitch from '@codegouvfr/react-dsfr/ToggleSwitch';
import { ROLES } from '@sirena/common/constants';
import { type Cells, type Column, DataTable, Toast } from '@sirena/ui';
import { createFileRoute } from '@tanstack/react-router';
import { useCallback, useState } from 'react';
import { useCreateFeatureFlag, useDeleteFeatureFlag, usePatchFeatureFlag } from '@/hooks/mutations/featureFlags.hook';
import { useFeatureFlags } from '@/hooks/queries/featureFlags.hook';
import { requireAuthAndRoles } from '@/lib/auth-guards';

export const Route = createFileRoute('/_auth/admin/feature-flags')({
  beforeLoad: requireAuthAndRoles([ROLES.SUPER_ADMIN]),
  head: () => ({
    meta: [{ title: 'Feature flags - SIRENA' }],
  }),
  component: RouteComponent,
});

type FeatureFlag = {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  userEmails: string[];
  entiteIds: string[];
  createdAt: string;
  updatedAt: string;
};

type FormData = {
  name: string;
  description: string;
  enabled: boolean;
  userEmails: string;
  entiteIds: string;
};

const emptyForm: FormData = {
  name: '',
  description: '',
  enabled: false,
  userEmails: '',
  entiteIds: '',
};

function RouteComponent() {
  const toastManager = Toast.useToastManager();
  const { data: featureFlags, isFetching } = useFeatureFlags();
  const createFlag = useCreateFeatureFlag();
  const patchFlag = usePatchFeatureFlag();
  const deleteFlag = useDeleteFeatureFlag();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);

  const handleCreate = useCallback(() => {
    setEditingId(null);
    setFormData(emptyForm);
    setShowForm(true);
  }, []);

  const handleEdit = useCallback((flag: FeatureFlag) => {
    setEditingId(flag.id);
    setFormData({
      name: flag.name,
      description: flag.description,
      enabled: flag.enabled,
      userEmails: flag.userEmails.join(', '),
      entiteIds: flag.entiteIds.join(', '),
    });
    setShowForm(true);
  }, []);

  const handleCancel = useCallback(() => {
    setShowForm(false);
    setEditingId(null);
    setFormData(emptyForm);
  }, []);

  const parseIds = (value: string): string[] =>
    value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      name: formData.name,
      description: formData.description,
      enabled: formData.enabled,
      userEmails: parseIds(formData.userEmails),
      entiteIds: parseIds(formData.entiteIds),
    };

    if (editingId) {
      const { name: _, ...patchPayload } = payload;
      await patchFlag.mutateAsync({ id: editingId, json: patchPayload });
      toastManager.add({
        title: 'Feature flag modifié',
        description: `Le flag "${formData.name}" a été mis à jour.`,
        timeout: 0,
        data: { icon: 'fr-alert--success' },
      });
    } else {
      await createFlag.mutateAsync(payload);
      toastManager.add({
        title: 'Feature flag créé',
        description: `Le flag "${formData.name}" a été créé.`,
        timeout: 0,
        data: { icon: 'fr-alert--success' },
      });
    }

    handleCancel();
  };

  const handleDelete = useCallback(
    async (flag: FeatureFlag) => {
      if (!window.confirm(`Supprimer le flag "${flag.name}" ?`)) return;

      await deleteFlag.mutateAsync(flag.id);
      toastManager.add({
        title: 'Feature flag supprimé',
        description: `Le flag "${flag.name}" a été supprimé.`,
        timeout: 0,
        data: { icon: 'fr-alert--success' },
      });
    },
    [deleteFlag, toastManager],
  );

  const columns: Column<FeatureFlag>[] = [
    { key: 'name', label: 'Nom', isSortable: true },
    { key: 'description', label: 'Description' },
    { key: 'custom:status', label: 'Statut' },
    { key: 'custom:targets', label: 'Ciblage' },
    { key: 'custom:actions', label: 'Actions', isFixedRight: true },
  ];

  const cells: Cells<FeatureFlag> = {
    'custom:status': (row: FeatureFlag) => (
      <Badge severity={row.enabled ? 'success' : 'error'}>{row.enabled ? 'Activé' : 'Désactivé'}</Badge>
    ),
    'custom:targets': (row: FeatureFlag) => {
      const parts: string[] = [];
      if (row.userEmails.length > 0) parts.push(`${row.userEmails.length} email(s)`);
      if (row.entiteIds.length > 0) parts.push(`${row.entiteIds.length} entité(s)`);
      if (parts.length === 0) return 'Tout le monde';
      return parts.join(', ');
    },
    'custom:actions': (row: FeatureFlag) => (
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <Button priority="secondary" size="small" onClick={() => handleEdit(row)}>
          Modifier
        </Button>
        <Button priority="tertiary" size="small" onClick={() => handleDelete(row)}>
          Supprimer
        </Button>
      </div>
    ),
  };

  const isPending = createFlag.isPending || patchFlag.isPending;

  return (
    <div className="home">
      <h1>Feature flags</h1>

      {!showForm && (
        <div className="fr-mb-2w">
          <Button iconId="fr-icon-add-line" onClick={handleCreate}>
            Créer un feature flag
          </Button>
        </div>
      )}

      {showForm && (
        <div
          className="fr-mb-4w fr-p-3w"
          style={{ border: '1px solid var(--border-default-grey)', borderRadius: '4px' }}
        >
          <h2>{editingId ? 'Modifier le feature flag' : 'Créer un feature flag'}</h2>
          <form onSubmit={handleSubmit}>
            <Input
              label="Nom (identifiant unique)"
              disabled={!!editingId}
              nativeInputProps={{
                value: formData.name,
                onChange: (e) => setFormData((prev) => ({ ...prev, name: e.target.value })),
                required: true,
                placeholder: 'MY_FEATURE_FLAG',
              }}
            />
            <Input
              label="Description"
              nativeInputProps={{
                value: formData.description,
                onChange: (e) => setFormData((prev) => ({ ...prev, description: e.target.value })),
              }}
            />
            <ToggleSwitch
              label="Activé"
              checked={formData.enabled}
              onChange={(checked) => setFormData((prev) => ({ ...prev, enabled: checked }))}
            />
            <Input
              label="Emails utilisateurs ciblés (séparés par des virgules)"
              hintText="Laisser vide pour ne pas cibler d'utilisateurs spécifiques"
              nativeInputProps={{
                value: formData.userEmails,
                onChange: (e) => setFormData((prev) => ({ ...prev, userEmails: e.target.value })),
                placeholder: 'jean.dupont@sante.gouv.fr, marie.martin@sante.gouv.fr',
              }}
            />
            <Input
              label="IDs entités ciblées (séparés par des virgules)"
              hintText="Laisser vide pour ne pas cibler d'entités spécifiques"
              nativeInputProps={{
                value: formData.entiteIds,
                onChange: (e) => setFormData((prev) => ({ ...prev, entiteIds: e.target.value })),
                placeholder: 'entite-id-1, entite-id-2',
              }}
            />
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <Button type="button" priority="secondary" onClick={handleCancel}>
                Annuler
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'En cours...' : editingId ? 'Modifier' : 'Créer'}
              </Button>
            </div>
          </form>
        </div>
      )}

      <DataTable
        title="Liste des feature flags"
        rowId="id"
        data={(featureFlags ?? []) as FeatureFlag[]}
        columns={columns}
        cells={cells}
        isLoading={isFetching}
        emptyPlaceholder="Aucun feature flag configuré"
      />
    </div>
  );
}
