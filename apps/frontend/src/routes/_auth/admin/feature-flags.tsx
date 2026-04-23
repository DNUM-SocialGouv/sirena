import Badge from '@codegouvfr/react-dsfr/Badge';
import Button from '@codegouvfr/react-dsfr/Button';
import Input from '@codegouvfr/react-dsfr/Input';
import { createModal } from '@codegouvfr/react-dsfr/Modal';
import ToggleSwitch from '@codegouvfr/react-dsfr/ToggleSwitch';
import { ROLES } from '@sirena/common/constants';
import { type Cells, type Column, DataTable, Toast } from '@sirena/ui';
import { createFileRoute } from '@tanstack/react-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useCreateFeatureFlag, useDeleteFeatureFlag, usePatchFeatureFlag } from '@/hooks/mutations/featureFlags.hook';
import { useFeatureFlags } from '@/hooks/queries/featureFlags.hook';
import { requireAuthAndRoles } from '@/lib/auth-guards';
import { parseIds } from '@/utils/featureFlags';

export const Route = createFileRoute('/_auth/admin/feature-flags')({
  beforeLoad: requireAuthAndRoles([ROLES.SUPER_ADMIN]),
  head: () => ({
    meta: [{ title: 'Gestion des fonctionnalités - SIRENA' }],
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

const deleteFlagModal = createModal({
  id: 'delete-feature-flag-modal',
  isOpenedByDefault: false,
});

function RouteComponent() {
  const toastManager = Toast.useToastManager();
  const { data: featureFlags, isFetching } = useFeatureFlags();
  const createFlag = useCreateFeatureFlag();
  const patchFlag = usePatchFeatureFlag();
  const deleteFlag = useDeleteFeatureFlag();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [flagToDelete, setFlagToDelete] = useState<FeatureFlag | null>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!showForm) return;
    const frame = requestAnimationFrame(() => {
      firstInputRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [showForm]);

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

  const notifySuccess = useCallback(
    (title: string, description: string) => {
      toastManager.add({
        title,
        description,
        timeout: 0,
        data: { icon: 'fr-alert--success' },
      });
    },
    [toastManager],
  );

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
      notifySuccess('Fonctionnalité modifiée avec succès', `Le flag "${formData.name}" a été mis à jour.`);
    } else {
      await createFlag.mutateAsync(payload);
      notifySuccess('Fonctionnalité créée avec succès', `Le flag "${formData.name}" a été créé.`);
    }

    handleCancel();
  };

  const handleDelete = useCallback((flag: FeatureFlag) => {
    setFlagToDelete(flag);
    deleteFlagModal.open();
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!flagToDelete) return;
    await deleteFlag.mutateAsync(flagToDelete.id);
    notifySuccess('Fonctionnalité supprimée avec succès', `Le flag "${flagToDelete.name}" a été supprimé.`);
    setFlagToDelete(null);
    deleteFlagModal.close();
  }, [deleteFlag, flagToDelete, notifySuccess]);

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
          Modifier <span className="fr-sr-only">la fonctionnalité {row.name}</span>
        </Button>
        <Button priority="tertiary" size="small" onClick={() => handleDelete(row)}>
          Supprimer <span className="fr-sr-only">la fonctionnalité {row.name}</span>
        </Button>
      </div>
    ),
  };

  const isPending = createFlag.isPending || patchFlag.isPending;

  return (
    <div className="home">
      <h1 className="fr-mt-3w">Gestion des fonctionnalités</h1>

      {!showForm && (
        <div className="fr-mb-2w">
          <Button iconId="fr-icon-add-line" onClick={handleCreate}>
            Créer une fonctionnalité
          </Button>
        </div>
      )}

      {showForm && (
        <div
          className="fr-mb-4w fr-p-3w"
          style={{ border: '1px solid var(--border-default-grey)', borderRadius: '4px' }}
        >
          <h2>{editingId ? 'Modifier la fonctionnalité' : 'Créer une fonctionnalité'}</h2>
          <form onSubmit={handleSubmit}>
            <Input
              label="Nom (identifiant unique, obligatoire)"
              hintText="Exemple : MA_FONCTIONNALITE"
              disabled={!!editingId}
              nativeInputProps={{
                ref: editingId ? undefined : firstInputRef,
                value: formData.name,
                onChange: (e) => setFormData((prev) => ({ ...prev, name: e.target.value })),
                required: true,
              }}
            />
            <Input
              label="Description"
              nativeInputProps={{
                ref: editingId ? firstInputRef : undefined,
                value: formData.description,
                onChange: (e) => setFormData((prev) => ({ ...prev, description: e.target.value })),
              }}
            />
            <ToggleSwitch
              label="Activer la fonctionnalité par défaut"
              helperText="Utilisé uniquement si aucun utilisateur ou entité n’est ciblé"
              checked={formData.enabled}
              onChange={(checked) => setFormData((prev) => ({ ...prev, enabled: checked }))}
            />
            <Input
              label="Emails utilisateurs ciblés (séparés par des virgules)"
              hintText="Laisser vide pour ne pas cibler d'utilisateurs spécifiques. Exemple : jean.dupont@sante.gouv.fr, marie.martin@sante.gouv.fr"
              nativeInputProps={{
                value: formData.userEmails,
                onChange: (e) => setFormData((prev) => ({ ...prev, userEmails: e.target.value })),
              }}
            />
            <Input
              label="Identifiants d'entités ciblées (séparés par des virgules)"
              hintText="Laisser vide pour ne pas cibler d'entités spécifiques. Exemple : entite-id-1, entite-id-2"
              nativeInputProps={{
                value: formData.entiteIds,
                onChange: (e) => setFormData((prev) => ({ ...prev, entiteIds: e.target.value })),
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

      <deleteFlagModal.Component
        title="Suppression d'une fonctionnalité"
        buttons={[
          { doClosesModal: true, children: 'Annuler' },
          { doClosesModal: false, children: 'Supprimer', onClick: confirmDelete },
        ]}
      >
        <p>Êtes-vous sûr de vouloir supprimer la fonctionnalité « {flagToDelete?.name} » ?</p>
      </deleteFlagModal.Component>
    </div>
  );
}
