import { emailSchema, optionalEmailSchema, optionalPhoneSchema } from '@sirena/common/schemas';
import { useMemo, useState } from 'react';
import { z } from 'zod';
import { getFieldError, zodIssuesToFieldErrors } from '@/lib/zodFormValidation';

export type LocalEntiteFormType = 'entite-administrative' | 'direction' | 'service';
export type LocalEntiteFormMode = 'create' | 'edit';
type LocalEntiteCreateFormType = 'direction' | 'service';

export const isNotificationEmailRequired = (entiteType: LocalEntiteFormType, mode: LocalEntiteFormMode) =>
  entiteType === 'entite-administrative' && mode === 'edit';

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

const contactShape = {
  email: optionalEmailSchema.default(''),
  emailContactUsager: optionalEmailSchema.default(''),
  telContactUsager: optionalPhoneSchema.default(''),
  adresseContactUsager: z.string(),
};

const editFormSchema = (entiteType: LocalEntiteFormType) =>
  z.object({
    ...contactShape,
    email: isNotificationEmailRequired(entiteType, 'edit')
      ? z
          .string()
          .trim()
          .min(1, 'Le champ "Adresse e-mail de notification" est vide. Veuillez le renseigner.')
          .pipe(emailSchema)
      : contactShape.email,
  });

const createFormSchema = (entiteType: LocalEntiteCreateFormType) => {
  const entityName = entiteType === 'direction' ? 'de la direction' : 'du service';

  return z.object({
    nomComplet: z.string().trim().min(1, `Le champ "Nom ${entityName}" est vide. Veuillez le renseigner.`),
    label: z.string().trim().min(1, 'Le champ "Abréviation" est vide. Veuillez le renseigner.'),
    ...contactShape,
  });
};

type EditFormValues = z.infer<ReturnType<typeof editFormSchema>>;
type CreateFormValues = z.infer<ReturnType<typeof createFormSchema>>;

type LocalEntiteForm<ValidatedValues> = {
  entiteType: LocalEntiteFormType;
  mode: LocalEntiteFormMode;
  values: LocalEntiteFormValues;
  validationErrors: Record<string, string>;
  onChange: (
    field: keyof LocalEntiteFormValues,
  ) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  clearError: (field: string) => void;
  validate: (additionalErrors?: Record<string, string>) => ValidatedValues | null;
};

export function useLocalEntiteForm(
  entiteType: LocalEntiteFormType,
  mode: 'edit',
  initialValues?: LocalEntiteFormValues,
): LocalEntiteForm<EditFormValues>;
export function useLocalEntiteForm(
  entiteType: LocalEntiteCreateFormType,
  mode: 'create',
  initialValues?: LocalEntiteFormValues,
): LocalEntiteForm<CreateFormValues>;
export function useLocalEntiteForm(
  entiteType: LocalEntiteFormType,
  mode: LocalEntiteFormMode,
  initialValues: LocalEntiteFormValues = emptyLocalEntiteForm,
): LocalEntiteForm<EditFormValues | CreateFormValues> {
  const schema = useMemo(
    () => (mode === 'edit' ? editFormSchema(entiteType) : createFormSchema(entiteType as LocalEntiteCreateFormType)),
    [entiteType, mode],
  );
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
            if (fieldError) return previousErrors;
            const next = { ...previousErrors };
            delete next[field];
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

  const validate = (additionalErrors: Record<string, string> = {}) => {
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

    return result.data;
  };

  return { entiteType, mode, values, validationErrors, onChange, clearError, validate };
}
