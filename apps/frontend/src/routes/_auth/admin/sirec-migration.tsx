import Alert from '@codegouvfr/react-dsfr/Alert';
import Button from '@codegouvfr/react-dsfr/Button';
import { Input } from '@codegouvfr/react-dsfr/Input';
import { FEATURE_FLAGS, ROLES } from '@sirena/common/constants';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useId, useState } from 'react';
import { useResolvedFeatureFlags } from '@/hooks/queries/featureFlags.hook';
import { migrateByReclamations, migrateByServices } from '@/lib/api/fetchSirecMigration';
import { HttpError } from '@/lib/api/tanstackQuery';
import { requireAuthAndRoles } from '@/lib/auth-guards';

export const Route = createFileRoute('/_auth/admin/sirec-migration')({
  beforeLoad: async (ctx) => {
    await requireAuthAndRoles([ROLES.SUPER_ADMIN])(ctx);
  },
  head: () => ({
    meta: [{ title: 'Migration SIREC - Espace administrateur - SIRENA' }],
  }),
  component: RouteComponent,
});

function parseIds(raw: string): number[] {
  return [
    ...new Set(
      raw
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map(Number)
        .filter((n) => Number.isInteger(n) && n > 0),
    ),
  ];
}

type Mode = 'reclamations' | 'services';

export function RouteComponent() {
  const navigate = useNavigate();
  const { isPending, data: flags } = useResolvedFeatureFlags();
  const hasSirecMigration = flags?.[FEATURE_FLAGS.SIREC_MIGRATION] ?? false;

  useEffect(() => {
    if (!isPending && !hasSirecMigration) {
      navigate({ to: '/' });
    }
  }, [isPending, hasSirecMigration, navigate]);

  const uid = useId();
  const tabReclamationsId = `${uid}-tab-reclamations`;
  const tabServicesId = `${uid}-tab-services`;
  const panelReclamationsId = `${uid}-panel-reclamations`;
  const panelServicesId = `${uid}-panel-services`;

  const [mode, setMode] = useState<Mode>('reclamations');
  const [raw, setRaw] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [systemError, setSystemError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleModeChange = (newMode: Mode) => {
    setMode(newMode);
    setRaw('');
    setResult(null);
    setFieldError(null);
    setSystemError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);
    setFieldError(null);
    setSystemError(null);

    const ids = parseIds(raw);
    if (ids.length === 0) {
      setFieldError('Aucun identifiant valide trouvé.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'reclamations') {
        const { queued } = await migrateByReclamations(ids);
        setResult(`${queued} réclamation${queued > 1 ? 's' : ''} ajoutée${queued > 1 ? 's' : ''} à la queue.`);
      } else {
        const { queued, found } = await migrateByServices(ids);
        setResult(
          `${found} réclamation${found > 1 ? 's' : ''} trouvée${found > 1 ? 's' : ''}, ${queued} ajoutée${queued > 1 ? 's' : ''} à la queue.`,
        );
      }
      setRaw('');
    } catch (error) {
      if (error instanceof HttpError && error.status === 422) {
        const unknownIds = (error.rawData as { unknownIds?: number[] } | undefined)?.unknownIds;
        if (unknownIds && unknownIds.length > 0) {
          setFieldError(
            `Identifiant${unknownIds.length > 1 ? 's' : ''} introuvable${
              unknownIds.length > 1 ? 's' : ''
            } dans SIREC : ${unknownIds.join(', ')}.`,
          );
          return;
        }
      }
      setSystemError('Une erreur est survenue lors de la requête.');
    } finally {
      setLoading(false);
    }
  };

  const isReclamations = mode === 'reclamations';

  if (isPending || !hasSirecMigration) return null;

  return (
    <div>
      <div className="fr-tabs">
        <ul
          className="fr-tabs__list"
          // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: needed by the dsfr
          role="tablist"
          aria-label="Mode de migration SIREC"
        >
          <li role="presentation">
            <button
              type="button"
              id={tabReclamationsId}
              className="fr-tabs__tab"
              role="tab"
              tabIndex={isReclamations ? 0 : -1}
              aria-selected={isReclamations}
              aria-controls={panelReclamationsId}
              onClick={() => handleModeChange('reclamations')}
            >
              Par IDs de réclamations
            </button>
          </li>
          <li role="presentation">
            <button
              type="button"
              id={tabServicesId}
              className="fr-tabs__tab"
              role="tab"
              tabIndex={isReclamations ? -1 : 0}
              aria-selected={!isReclamations}
              aria-controls={panelServicesId}
              onClick={() => handleModeChange('services')}
            >
              Par IDs de services
            </button>
          </li>
        </ul>

        <div
          id={panelReclamationsId}
          className={`fr-tabs__panel${isReclamations ? ' fr-tabs__panel--selected' : ''}`}
          role="tabpanel"
          aria-labelledby={tabReclamationsId}
        >
          {isReclamations && (
            <form onSubmit={handleSubmit} className="fr-mt-2w">
              <Input
                label="IDs de réclamations SIREC"
                hintText="Un identifiant par ligne ou séparés par des virgules"
                state={fieldError ? 'error' : 'default'}
                stateRelatedMessage={fieldError ?? undefined}
                textArea
                nativeTextAreaProps={{
                  value: raw,
                  onChange: (e) => setRaw(e.target.value),
                  rows: 6,
                }}
              />
              <Button type="submit" disabled={loading}>
                {loading ? 'Envoi en cours…' : 'Ajouter à la queue'}
              </Button>
            </form>
          )}
        </div>

        <div
          id={panelServicesId}
          className={`fr-tabs__panel${!isReclamations ? ' fr-tabs__panel--selected' : ''}`}
          role="tabpanel"
          aria-labelledby={tabServicesId}
        >
          {!isReclamations && (
            <form onSubmit={handleSubmit} className="fr-mt-2w">
              <Input
                label="IDs de services SIREC"
                hintText="Un identifiant par ligne ou séparés par des virgules"
                state={fieldError ? 'error' : 'default'}
                stateRelatedMessage={fieldError ?? undefined}
                textArea
                nativeTextAreaProps={{
                  value: raw,
                  onChange: (e) => setRaw(e.target.value),
                  rows: 6,
                }}
              />
              <Button type="submit" disabled={loading}>
                {loading ? 'Recherche en cours…' : 'Rechercher et ajouter à la queue'}
              </Button>
            </form>
          )}
        </div>
      </div>

      {result && <Alert className="fr-mt-2w" severity="success" title={result} />}
      {systemError && <Alert className="fr-mt-2w" severity="error" title={systemError} />}
    </div>
  );
}
