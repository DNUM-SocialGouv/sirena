import { optionalEmailSchema, optionalPhoneSchema } from '@sirena/common/schemas';
import { useMemo, useState } from 'react';
import { z } from 'zod';
import { getFieldError, zodIssuesToFieldErrors } from '@/lib/zodFormValidation';

export type LocalEntiteFormType = 'entite-administrative' | 'direction' | 'service';

export type LocalEntiteFormValues = {
  nomComplet: string;
  label: string;
  email: string;
  emailContactUsager: string;
  telContactUsager: string;
  adresseContactUsager: string;
};

const emptyLocalEntiteForm: LocalEntiteFormValues = {
  nomComplet: '',
  label: '',
  email: '',
  emailContactUsager: '',
  telContactUsager: '',
  adresseContactUsager: '',
};

const createSchema = (entiteType: LocalEntiteFormType) => {
  const entityName =
    entiteType === 'entite-administrative'
      ? 'de l’entité administrative'
      : entiteType === 'direction'
        ? 'de la direction'
        : 'du service';

  return z.object({
    nomComplet:
      entiteType === 'entite-administrative'
        ? z.string()
        : z.string().trim().min(1, `Le champ "Nom ${entityName}" est vide. Veuillez le renseigner.`),
    label:
      entiteType === 'entite-administrative'
        ? z.string()
        : z.string().trim().min(1, 'Le champ "Abréviation" est vide. Veuillez le renseigner.'),
    email: optionalEmailSchema,
    emailContactUsager: optionalEmailSchema,
    telContactUsager: optionalPhoneSchema,
    adresseContactUsager: z.string(),
  });
};

export function useLocalEntiteForm(
  entiteType: LocalEntiteFormType,
  initialValues: LocalEntiteFormValues = emptyLocalEntiteForm,
) {
  const schema = useMemo(() => createSchema(entiteType), [entiteType]);
  const [values, setValues] = useState(initialValues);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const onChange =
    (field: keyof LocalEntiteFormValues) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      setValues((previous) => {
        const updated = { ...previous, [field]: value };

        if (hasSubmitted && validationErrors[field]) {
          const fieldError = getFieldError(schema, updated, field);
          setValidationErrors((previousErrors) => {
            const next = { ...previousErrors };
            if (fieldError) next[field] = fieldError;
            else delete next[field];
            return next;
          });
        }

        return updated;
      });
    };

  const clearError = (field: string) => {
    setValidationErrors((previous) => {
      if (!previous[field]) return previous;
      const next = { ...previous };
      delete next[field];
      return next;
    });
  };

  const validate = (additionalErrors: Record<string, string> = {}): LocalEntiteFormValues | null => {
    setHasSubmitted(true);
    const result = schema.safeParse(values);
    const errors = {
      ...additionalErrors,
      ...(result.success ? {} : zodIssuesToFieldErrors(result.error)),
    };
    const firstField = Object.keys(errors)[0];

    if (firstField) {
      setValidationErrors(errors);
      document.querySelector<HTMLElement>(`[name="${firstField}"]`)?.focus();
      return null;
    }

    setValidationErrors({});
    if (!result.success) return null;

    return {
      nomComplet: result.data.nomComplet,
      label: result.data.label,
      email: result.data.email ?? '',
      emailContactUsager: result.data.emailContactUsager ?? '',
      telContactUsager: result.data.telContactUsager ?? '',
      adresseContactUsager: result.data.adresseContactUsager,
    };
  };

  return { entiteType, values, validationErrors, onChange, clearError, validate };
}
