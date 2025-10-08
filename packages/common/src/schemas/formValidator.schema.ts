import { z } from 'zod';

export const emailSchema = z.string().email('Adresse email invalide');

export const phoneSchema = z.string().refine(
  (value) => {
    const cleanValue = value.replace(/[\s-]/g, '');

    if (cleanValue.startsWith('+')) {
      const digits = cleanValue.slice(1);
      return /^\d{10,12}$/.test(digits);
    }

    return /^\d{10}$/.test(cleanValue);
  },
  {
    message: 'Le numéro de téléphone doit être au format national ou international (+33XXXXXXXXXX)',
  },
);

export const optionalEmailSchema = emailSchema.optional().or(z.literal(''));

export const optionalPhoneSchema = phoneSchema.optional().or(z.literal(''));
