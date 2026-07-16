import { Alert } from '@codegouvfr/react-dsfr/Alert';
import Input from '@codegouvfr/react-dsfr/Input';
import type { ReactNode } from 'react';

type SirenaField = 'nomComplet' | 'label' | 'email';
type ContactField = 'emailContactUsager' | 'telContactUsager' | 'adresseContactUsager';
type FieldChangeHandler = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;

type SirenaFieldsProps = {
  kind: 'direction' | 'service';
  formData: Record<SirenaField, string>;
  validationErrors: Record<string, string>;
  onChange: (field: SirenaField) => FieldChangeHandler;
  leadingField?: ReactNode;
};

export function LocalDirectionServiceSirenaFields({
  kind,
  formData,
  validationErrors,
  onChange,
  leadingField,
}: SirenaFieldsProps) {
  const isDirection = kind === 'direction';

  return (
    <fieldset className="fr-fieldset fr-mb-3w">
      <legend className="fr-fieldset__legend">Informations utilisées dans SIRENA</legend>

      <div className="fr-grid-row fr-grid-row--gutters">
        {leadingField}

        <div className="fr-col-12 fr-col-md-7">
          <Input
            className="fr-fieldset__content"
            label={`Nom ${isDirection ? 'de la direction' : 'du service'} (obligatoire)`}
            hintText={`Nom complet sans abréviation ou acronyme. Exemple : ${isDirection ? 'Direction de l’Offre de Soins' : 'Professions Médicales'}`}
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
            hintText={`Sigle, acronyme ou forme abrégée du nom. Exemple : ${isDirection ? 'DOS' : 'PM'}`}
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

type ContactFieldsProps = {
  formData: Record<ContactField, string>;
  validationErrors: Record<string, string>;
  onChange: (field: ContactField) => FieldChangeHandler;
};

export function LocalDirectionServiceContactFields({ formData, validationErrors, onChange }: ContactFieldsProps) {
  return (
    <fieldset className="fr-fieldset">
      <legend className="fr-fieldset__legend fr-mb-3w fr-pb-0">Informations de contact pour l’usager</legend>

      <div className="fr-pl-1w fr-mb-3w">
        <Alert
          severity="info"
          small
          description="Si vous ne renseignez pas ces informations, l’adresse e-mail de notification sera transmise au déclarant, dans l’accusé de réception, afin qu’il puisse vous contacter."
        />
      </div>

      <div className="fr-grid-row fr-grid-row--gutters">
        <div className="fr-col-12 fr-col-md-7">
          <Input
            className="fr-fieldset__content"
            label="Adresse e-mail de contact"
            hintText="Adresse transmise à l’usager pour vous contacter. Exemple : contact@direction.fr"
            state={validationErrors.emailContactUsager ? 'error' : 'default'}
            stateRelatedMessage={validationErrors.emailContactUsager}
            nativeInputProps={{
              name: 'emailContactUsager',
              value: formData.emailContactUsager,
              onChange: onChange('emailContactUsager'),
            }}
          />
        </div>

        <div className="fr-col-12 fr-col-md-5">
          <Input
            className="fr-fieldset__content"
            label="Numéro de téléphone"
            hintText="Format attendu : 10 chiffres ou +31XXXXXXXXXX (international)"
            state={validationErrors.telContactUsager ? 'error' : 'default'}
            stateRelatedMessage={validationErrors.telContactUsager}
            nativeInputProps={{
              name: 'telContactUsager',
              type: 'tel',
              value: formData.telContactUsager,
              onChange: onChange('telContactUsager'),
            }}
          />
        </div>

        <div className="fr-col-12">
          <Input
            className="fr-fieldset__content"
            label="Adresse postale"
            hintText="Adresse postale complète : service, numéro et libellé de voie, code postal, ville. Exemple : Sous-direction de l’autonomie, Direction des Solidarités (DSOL), 5 bd Diderot, 75012 Paris."
            textArea
            nativeTextAreaProps={{
              name: 'adresseContactUsager',
              rows: 4,
              value: formData.adresseContactUsager,
              onChange: onChange('adresseContactUsager'),
            }}
          />
        </div>
      </div>
    </fieldset>
  );
}
