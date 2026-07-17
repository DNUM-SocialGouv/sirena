import { optionalEmailSchema, optionalPhoneSchema } from '@sirena/common/schemas';
import { useMemo, useState } from 'react';
import { z } from 'zod';
import { getFieldError, zodIssuesToFieldErrors } from '@/lib/zodFormValidation';

type LocalDirectionServiceFormValues = {
  nomComplet: string;
  label: string;
  email: string;
  emailContactUsager: string;
  telContactUsager: string;
  adresseContactUsager: string;
};

const emptyLocalDirectionServiceForm: LocalDirectionServiceFormValues = {
  nomComplet: '',
  label: '',
  email: '',
  emailContactUsager: '',
  telContactUsager: '',
  adresseContactUsager: '',
};

const createSchema = (kind: 'entite-administrative' | 'direction' | 'service') => {
  const entityName =
    kind === 'entite-administrative'
      ? 'de l’entité administrative'
      : kind === 'direction'
        ? 'de la direction'
        : 'du service';

  return z.object({
    nomComplet: z.string().trim().min(1, `Le champ "Nom ${entityName}" est vide. Veuillez le renseigner.`),
    label: z.string().trim().min(1, 'Le champ "Abréviation" est vide. Veuillez le renseigner.'),
    email: optionalEmailSchema,
    emailContactUsager: optionalEmailSchema,
    telContactUsager: optionalPhoneSchema,
    adresseContactUsager: z.string(),
  });
};

export function useLocalDirectionServiceForm(
  kind: 'entite-administrative' | 'direction' | 'service',
  initialValues: LocalDirectionServiceFormValues = emptyLocalDirectionServiceForm,
) {
  const schema = useMemo(() => createSchema(kind), [kind]);
  const [values, setValues] = useState(initialValues);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const onChange =
    (field: keyof LocalDirectionServiceFormValues) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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

  const validate = (additionalErrors: Record<string, string> = {}): LocalDirectionServiceFormValues | null => {
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

  return { values, validationErrors, onChange, clearError, validate };
}
