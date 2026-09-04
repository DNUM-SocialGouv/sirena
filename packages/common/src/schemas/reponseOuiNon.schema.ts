import { z } from 'zod';
import { REPONSE_OUI_NON } from '../constants/reponseOuiNon.constant.js';

export const ReponseOuiNonSchema = z.enum(REPONSE_OUI_NON);

export type ReponseOuiNon = z.infer<typeof ReponseOuiNonSchema>;

export type ReponseOuiNonValue = ReponseOuiNon | null | undefined;
