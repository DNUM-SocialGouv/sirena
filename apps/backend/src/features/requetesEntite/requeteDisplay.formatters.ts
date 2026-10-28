import { capitalizeFirst } from '../../helpers/string.js';

// Display helpers shared by the requête PDF and the requêtes CSV export, so both read the same.

export type DisplayAgent = { prenom: string; nom: string };

export const formatRue = (adresse: { numero?: string | null; rue?: string | null } | null | undefined) =>
  adresse ? [adresse.numero, adresse.rue].filter(Boolean).join(' ') || null : null;

export const formatAgentName = (agent: DisplayAgent | null | undefined): string | null =>
  agent ? `${capitalizeFirst(agent.prenom)} ${capitalizeFirst(agent.nom)}` : null;
