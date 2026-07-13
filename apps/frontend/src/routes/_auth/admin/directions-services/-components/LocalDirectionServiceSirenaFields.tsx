import Input from '@codegouvfr/react-dsfr/Input';

type VisibleField = 'nomComplet' | 'label' | 'email';

type Props = {
  kind: 'direction' | 'service';
  formData: Record<VisibleField, string>;
  validationErrors: Record<string, string>;
  onChange: (field: VisibleField) => (event: React.ChangeEvent<HTMLInputElement>) => void;
};

export function LocalDirectionServiceSirenaFields({ kind, formData, validationErrors, onChange }: Props) {
  const isDirection = kind === 'direction';

  return (
    <fieldset className="fr-fieldset fr-mb-3w">
      <legend className="fr-fieldset__legend">Informations utilisées dans SIRENA</legend>

      <div className="fr-grid-row fr-grid-row--gutters">
        <div className="fr-col-12 fr-col-md-7">
          <Input
            className="fr-fieldset__content"
            label={`Nom ${isDirection ? 'de la direction' : 'du service'} (obligatoire)`}
            hintText={`Nom complet sans abréviation ou acronyme. Exemple : ${isDirection ? 'Direction de l’Offre de Soins' : 'Service des personnes âgées'}`}
            state={validationErrors.nomComplet ? 'error' : 'default'}
            stateRelatedMessage={validationErrors.nomComplet}
            nativeInputProps={{
              name: 'nomComplet',
              value: formData.nomComplet,
              onChange: onChange('nomComplet'),
            }}
          />
        </div>

        <div className="fr-col-12 fr-col-md-5">
          <Input
            className="fr-fieldset__content"
            label="Abréviation (obligatoire)"
            hintText={`Sigle, acronyme ou forme abrégée du nom. Exemple : ${isDirection ? 'DOS' : 'PA'}`}
            state={validationErrors.label ? 'error' : 'default'}
            stateRelatedMessage={validationErrors.label}
            nativeInputProps={{ name: 'label', value: formData.label, onChange: onChange('label') }}
          />
        </div>

        <div className="fr-col-12 fr-col-md-7">
          <Input
            className="fr-fieldset__content"
            label="Adresse e-mail de notification"
            hintText="Adresse générique pour la notification des nouvelles requêtes. Exemple : reclamations@direction.fr"
            state={validationErrors.email ? 'error' : 'default'}
            stateRelatedMessage={validationErrors.email}
            nativeInputProps={{ name: 'email', value: formData.email, onChange: onChange('email') }}
          />
        </div>
      </div>
    </fieldset>
  );
}
