import { describe, expect, it } from 'vitest';
import { StatisticsDashboardQuerySchema } from './statistics.schema.js';

describe('StatisticsDashboardQuerySchema', () => {
  it('accepts an empty query', () => {
    const result = StatisticsDashboardQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    expect(result.data).toEqual({});
  });

  it('accepts a single bound', () => {
    expect(StatisticsDashboardQuerySchema.safeParse({ startDate: '2026-01-01' }).success).toBe(true);
    expect(StatisticsDashboardQuerySchema.safeParse({ endDate: '2026-01-31' }).success).toBe(true);
  });

  it('accepts a valid range', () => {
    const result = StatisticsDashboardQuerySchema.safeParse({ startDate: '2026-01-01', endDate: '2026-03-31' });
    expect(result.success).toBe(true);
  });

  it('accepts an equal start and end', () => {
    const result = StatisticsDashboardQuerySchema.safeParse({ startDate: '2026-01-01', endDate: '2026-01-01' });
    expect(result.success).toBe(true);
  });

  it('rejects a start date after the end date', () => {
    const result = StatisticsDashboardQuerySchema.safeParse({ startDate: '2026-03-31', endDate: '2026-01-01' });
    expect(result.success).toBe(false);
  });

  it('rejects a malformed date', () => {
    expect(StatisticsDashboardQuerySchema.safeParse({ startDate: '31-03-2026' }).success).toBe(false);
    expect(StatisticsDashboardQuerySchema.safeParse({ startDate: '2026-13-01' }).success).toBe(false);
  });

  it('accepts one or several known domaines fonctionnels', () => {
    expect(StatisticsDashboardQuerySchema.safeParse({ domaineIds: 'SOCIAL' }).success).toBe(true);
    expect(StatisticsDashboardQuerySchema.safeParse({ domaineIds: 'SOCIAL,SANITAIRE' }).success).toBe(true);
  });

  it('rejects an unknown domaine fonctionnel', () => {
    expect(StatisticsDashboardQuerySchema.safeParse({ domaineIds: 'NOT_A_DOMAINE' }).success).toBe(false);
    expect(StatisticsDashboardQuerySchema.safeParse({ domaineIds: 'SOCIAL,NOT_A_DOMAINE' }).success).toBe(false);
  });

  it('normalises an empty list to undefined so Metabase never receives a blank filter', () => {
    expect(StatisticsDashboardQuerySchema.parse({ domaineIds: '' }).domaineIds).toBeUndefined();
    expect(StatisticsDashboardQuerySchema.parse({ domaineIds: ' , ' }).domaineIds).toBeUndefined();
  });

  it('strips stray whitespace and separators from the list', () => {
    expect(StatisticsDashboardQuerySchema.parse({ domaineIds: ' SOCIAL , SANITAIRE ' }).domaineIds).toBe(
      'SOCIAL,SANITAIRE',
    );
  });

  it('deduplicates the list so a repeated domaine cannot inflate the outgoing query string', () => {
    expect(StatisticsDashboardQuerySchema.parse({ domaineIds: 'SOCIAL,SOCIAL,SANITAIRE,SOCIAL' }).domaineIds).toBe(
      'SOCIAL,SANITAIRE',
    );
  });

  it('combines the period and the domaines filters', () => {
    const result = StatisticsDashboardQuerySchema.safeParse({
      startDate: '2026-01-01',
      endDate: '2026-03-31',
      domaineIds: 'SOCIAL,SANITAIRE',
    });
    expect(result.success).toBe(true);
  });

  it('accepts the EIG exclusion flag', () => {
    expect(StatisticsDashboardQuerySchema.parse({ includeEIG: 'false' }).includeEIG).toBe('false');
  });

  it('leaves the EIG flag undefined when absent, so the indicators keep the EIG requêtes', () => {
    expect(StatisticsDashboardQuerySchema.parse({}).includeEIG).toBeUndefined();
  });

  it('rejects any other value for the EIG flag rather than guessing what to do with the EIG requêtes', () => {
    expect(StatisticsDashboardQuerySchema.safeParse({ includeEIG: 'true' }).success).toBe(false);
    expect(StatisticsDashboardQuerySchema.safeParse({ includeEIG: '0' }).success).toBe(false);
  });

  it('combines the EIG exclusion with the period and the domaines filters', () => {
    const result = StatisticsDashboardQuerySchema.safeParse({
      startDate: '2026-01-01',
      endDate: '2026-03-31',
      domaineIds: 'SOCIAL,SANITAIRE',
      includeEIG: 'false',
    });
    expect(result.success).toBe(true);
  });

  it('accepts one or several known lieu types', () => {
    expect(StatisticsDashboardQuerySchema.safeParse({ lieuTypes: 'DOMICILE' }).success).toBe(true);
    expect(StatisticsDashboardQuerySchema.safeParse({ lieuTypes: 'DOMICILE,ETABLISSEMENT_SANTE' }).success).toBe(true);
  });

  it('accepts a precision token scoped to its lieu type', () => {
    expect(StatisticsDashboardQuerySchema.safeParse({ lieuTypes: 'DOMICILE:CHEZ_TIERS' }).success).toBe(true);
    expect(StatisticsDashboardQuerySchema.safeParse({ lieuTypes: 'ETABLISSEMENT_SANTE:CHU,DOMICILE' }).success).toBe(
      true,
    );
  });

  it('rejects an unknown lieu type or precision', () => {
    expect(StatisticsDashboardQuerySchema.safeParse({ lieuTypes: 'NOT_A_LIEU' }).success).toBe(false);
    expect(StatisticsDashboardQuerySchema.safeParse({ lieuTypes: 'DOMICILE:NOT_A_PRECISION' }).success).toBe(false);
  });

  it('rejects a precision that belongs to another lieu type', () => {
    expect(StatisticsDashboardQuerySchema.safeParse({ lieuTypes: 'DOMICILE:CHU' }).success).toBe(false);
  });

  it('rejects a malformed lieu token', () => {
    expect(StatisticsDashboardQuerySchema.safeParse({ lieuTypes: 'DOMICILE:CHEZ_TIERS:EXTRA' }).success).toBe(false);
    expect(StatisticsDashboardQuerySchema.safeParse({ lieuTypes: 'ETABLISSEMENT_FICTIF:AUTRE' }).success).toBe(false);
  });

  it('normalises and deduplicates the lieu list', () => {
    expect(StatisticsDashboardQuerySchema.parse({ lieuTypes: '' }).lieuTypes).toBeUndefined();
    expect(StatisticsDashboardQuerySchema.parse({ lieuTypes: ' , ' }).lieuTypes).toBeUndefined();
    expect(
      StatisticsDashboardQuerySchema.parse({ lieuTypes: ' DOMICILE , DOMICILE,ETABLISSEMENT_SANTE:CHU ' }).lieuTypes,
    ).toBe('DOMICILE,ETABLISSEMENT_SANTE:CHU');
  });

  it('combines the period, domaines and lieu filters', () => {
    const result = StatisticsDashboardQuerySchema.safeParse({
      startDate: '2026-01-01',
      endDate: '2026-03-31',
      domaineIds: 'SOCIAL',
      lieuTypes: 'DOMICILE:CHEZ_TIERS,ETABLISSEMENT_SANTE',
    });
    expect(result.success).toBe(true);
  });
});
