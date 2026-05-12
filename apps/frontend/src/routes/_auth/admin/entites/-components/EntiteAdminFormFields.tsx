import Input from '@codegouvfr/react-dsfr/Input';
import Select from '@codegouvfr/react-dsfr/Select';

type EntiteAdminFormData = {
  nomComplet: string;
  label: string;
  email: string;
  emailContactUsager: string;
  adresseContactUsager: string;
  telContactUsager: string;
  isActive: string;
};

type EntiteAdminFormFieldsProps = {
  formData: EntiteAdminFormData;
  validationErrors: Record<string, string>;
  onChange: (
    field: keyof EntiteAdminFormData,
  ) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  legend: string;
};

export function EntiteAdminFormFields({ formData, validationErrors, onChange, legend }: EntiteAdminFormFieldsProps) {
  return (
    <>
      <fieldset className="fr-fieldset">
        <legend className="fr-fieldset__legend">{legend}</legend>

        <Input
          className="fr-fieldset__content"
          label="Nom - libellé long (obligatoire)"
          state={validationErrors.nomComplet ? 'error' : 'default'}
          stateRelatedMessage={validationErrors.nomComplet}
          nativeInputProps={{
            name: 'nomComplet',
            value: formData.nomComplet,
            onChange: onChange('nomComplet'),
          }}
        />

        <Input
          className="fr-fieldset__content"
          label="Nom court (obligatoire)"
          state={validationErrors.label ? 'error' : 'default'}
          stateRelatedMessage={validationErrors.label}
          nativeInputProps={{
            name: 'label',
            value: formData.label,
            onChange: onChange('label'),
          }}
        />

        <Input
          className="fr-fieldset__content"
          label="Adresse électronique de notification"
          hintText="Boîte e-mail générique pour la notification des nouvelles requêtes. Exemple : prenom.nom@exemple.com"
          state={validationErrors.email ? 'error' : 'default'}
          stateRelatedMessage={validationErrors.email}
          nativeInputProps={{
            name: 'email',
            value: formData.email,
            onChange: onChange('email'),
          }}
        />
      </fieldset>

      <fieldset className="fr-fieldset">
        <legend className="fr-fieldset__legend">Éléments de contact pour l’usager</legend>

        <Input
          className="fr-fieldset__content"
          label="Adresse électronique"
          hintText="Exemple : prenom.nom@exemple.com"
          state={validationErrors.emailContactUsager ? 'error' : 'default'}
          stateRelatedMessage={validationErrors.emailContactUsager}
          nativeInputProps={{
            name: 'emailContactUsager',
            value: formData.emailContactUsager,
            onChange: onChange('emailContactUsager'),
          }}
        />

        <Input
          className="fr-fieldset__content"
          label="Adresse postale"
          hintText="Adresse postale complète pour l’usager : service, numéro et libellé de voie, code postal, ville. Exemple : Sous-direction de l’autonomie, Direction des Solidarités (DSOL), 5 bd\n Diderot, 75012 Paris."
          textArea
          nativeTextAreaProps={{
            name: 'adresseContactUsager',
            rows: 4,
            value: formData.adresseContactUsager,
            onChange: onChange('adresseContactUsager'),
          }}
        />

        <Input
          className="fr-fieldset__content"
          label="Numéro de téléphone"
          hintText="Format attendu : 10 chiffres (français) ou +33XXXXXXXXXX (international)"
          state={validationErrors.telContactUsager ? 'error' : 'default'}
          stateRelatedMessage={validationErrors.telContactUsager}
          nativeInputProps={{
            name: 'telContactUsager',
            type: 'tel',
            value: formData.telContactUsager,
            onChange: onChange('telContactUsager'),
          }}
        />
      </fieldset>

      <fieldset className="fr-fieldset">
        <Select
          className="fr-fieldset__content"
          label="Actif dans SIRENA (obligatoire)"
          state={validationErrors.isActive ? 'error' : 'default'}
          stateRelatedMessage={validationErrors.isActive}
          nativeSelectProps={{
            name: 'isActive',
            value: formData.isActive,
            onChange: onChange('isActive'),
          }}
        >
          <option value="" disabled>
            Sélectionnez une option
          </option>
          <option value="oui">Oui</option>
          <option value="non">Non</option>
        </Select>
      </fieldset>
    </>
  );
}
