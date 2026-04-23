import Button from '@codegouvfr/react-dsfr/Button';
import Input from '@codegouvfr/react-dsfr/Input';
import RadioButtons from '@codegouvfr/react-dsfr/RadioButtons';
import { ROLES } from '@sirena/common/constants';
import { Toast } from '@sirena/ui';
import { createFileRoute, Link, useRouter } from '@tanstack/react-router';
import { type SubmitEvent, useEffect } from 'react';
import { useCreateChildEntiteAdmin, useEntiteByIdAdmin, useEntiteChain } from '@/hooks/queries/entites.hook';
import { requireAuthAndRoles } from '@/lib/auth-guards';

export const Route = createFileRoute('/_auth/admin/entites/$entiteId/create')({
  beforeLoad: requireAuthAndRoles([ROLES.SUPER_ADMIN]),
  component: RouteComponent,
});

export function RouteComponent() {
  const router = useRouter();
  const { entiteId } = Route.useParams();
  const toastManager = Toast.useToastManager();
  const createEntiteAdminChild = useCreateChildEntiteAdmin();
  const entiteQuery = useEntiteByIdAdmin(entiteId);
  const entiteChainQuery = useEntiteChain(entiteId);

  if (entiteQuery.isPending || entiteChainQuery.isPending) {
    return null;
  }

  if (entiteQuery.isError || !entiteQuery.data || entiteChainQuery.isError || !entiteChainQuery.data) {
    return null;
  }

  const entiteDepth = entiteChainQuery.data.length;
  const title = entiteDepth === 1 ? 'Créer une direction' : 'Créer un service';

  useEffect(() => {
    if (entiteDepth >= 3) {
      router.navigate({
        to: '/admin/entites/$entiteId',
        params: { entiteId },
      });
    }
  }, [entiteDepth, entiteId, router]);

  if (entiteDepth >= 3) {
    return null;
  }

  const handleBack = () => {
    if (window.history.length > 1) {
      router.history.back();
    } else {
      router.navigate({ to: '/admin/entites' });
    }
  };

  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);

    await createEntiteAdminChild.mutateAsync({
      id: entiteId,
      input: {
        nomComplet: String(formData.get('nomComplet') ?? ''),
        label: String(formData.get('label') ?? ''),
        email: String(formData.get('email') ?? ''),
        emailDomain: String(formData.get('emailDomain') ?? ''),
        organizationalUnit: String(formData.get('organizationalUnit') ?? ''),
        emailContactUsager: String(formData.get('emailContactUsager') ?? ''),
        adresseContactUsager: String(formData.get('adresseContactUsager') ?? ''),
        telContactUsager: String(formData.get('telContactUsager') ?? ''),
        isActive: formData.get('isActive') === 'oui',
      },
    });

    toastManager.add({
      title: 'Entité créée',
      description: 'La nouvelle entité a été enregistrée avec succès.',
      timeout: 0,
      data: { icon: 'fr-alert--success' },
    });

    handleBack();
  };

  return (
    <div className="fr-container fr-mt-4w">
      <div className="fr-mb-3w">
        <Link className="fr-link" to="/admin/entites/$entiteId" params={{ entiteId }}>
          <span className="fr-icon-arrow-left-line fr-icon--sm" aria-hidden="true" />
          Modifier l'entité
        </Link>
      </div>

      <h1 className="fr-mb-4w">{title}</h1>

      <div
        className="fr-p-4w fr-mb-4w"
        style={{ border: '1px solid var(--border-default-grey)', borderRadius: '0.25rem' }}
      >
        <h2 className="fr-h6 fr-mb-2w">Contexte de création</h2>

        <p className="fr-text--sm fr-text-mention--grey fr-mb-1w">Entité mère</p>
        <p className="fr-mb-0">{entiteQuery.data.nomComplet}</p>
      </div>

      <div
        className="fr-p-4w fr-mb-4w"
        style={{ border: '1px solid var(--border-default-grey)', borderRadius: '0.25rem' }}
      >
        <form onSubmit={handleSubmit}>
          <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
            <legend>
              <h2 className="fr-h6 fr-mb-3w">Informations de la nouvelle entité</h2>
            </legend>

            <Input
              className="fr-fieldset__content"
              label="Nom (libellé long)"
              nativeInputProps={{
                name: 'nomComplet',
              }}
            />

            <Input
              className="fr-fieldset__content"
              label="Nom court"
              nativeInputProps={{
                name: 'label',
              }}
            />

            <Input
              className="fr-fieldset__content"
              label="Adresse électronique de notification"
              nativeInputProps={{
                name: 'email',
                type: 'email',
              }}
            />

            <Input
              className="fr-fieldset__content"
              label="Domaine e-mail"
              nativeInputProps={{
                name: 'emailDomain',
              }}
            />

            <Input
              className="fr-fieldset__content"
              label="Unité organisationnelle"
              nativeInputProps={{
                name: 'organizationalUnit',
              }}
            />
          </fieldset>

          <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
            <legend>
              <h2 className="fr-h6 fr-mb-3w">Éléments de contact pour l’usager</h2>
            </legend>

            <Input
              className="fr-fieldset__content"
              label="Adresse électronique"
              nativeInputProps={{
                name: 'emailContactUsager',
                type: 'email',
              }}
            />

            <Input
              className="fr-fieldset__content"
              label="Adresse postale"
              textArea
              nativeTextAreaProps={{
                name: 'adresseContactUsager',
                rows: 4,
              }}
            />

            <Input
              className="fr-fieldset__content"
              label="Téléphone"
              nativeInputProps={{
                name: 'telContactUsager',
              }}
            />
          </fieldset>

          <RadioButtons
            legend="Actif dans SIRENA"
            name="isActive"
            orientation="horizontal"
            options={[
              {
                label: 'Oui',
                nativeInputProps: {
                  value: 'oui',
                },
              },
              {
                label: 'Non',
                nativeInputProps: {
                  value: 'non',
                },
              },
            ]}
          />

          <div className="fr-btns-group fr-btns-group--right fr-btns-group--inline-md">
            <Button type="submit">Créer</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
