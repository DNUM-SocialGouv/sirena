import { describe, expect, it } from 'vitest';
import { describeCreatedPeriod, describePeriod, resolveDateRange, resolvePeriodPreset } from './period';

// Jeudi 18 juin 2026 comme date de référence déterministe.
const today = new Date(2026, 5, 18);

describe('resolvePeriodPreset', () => {
  it('resolves the current week as Monday to Sunday', () => {
    expect(resolvePeriodPreset('current-week', today)).toEqual({ startDate: '2026-06-15', endDate: '2026-06-21' });
  });

  it('resolves the current month from the first to the last day', () => {
    expect(resolvePeriodPreset('current-month', today)).toEqual({ startDate: '2026-06-01', endDate: '2026-06-30' });
  });

  it('resolves the current year from January 1st to December 31st', () => {
    expect(resolvePeriodPreset('current-year', today)).toEqual({ startDate: '2026-01-01', endDate: '2026-12-31' });
  });

  it('resolves the rolling month from the same day one month earlier to today', () => {
    expect(resolvePeriodPreset('rolling-month', today)).toEqual({ startDate: '2026-05-18', endDate: '2026-06-18' });
  });
});

describe('resolveDateRange', () => {
  it('derives the range from a preset when one is selected', () => {
    expect(resolveDateRange({ period: 'current-month' }, today)).toEqual({
      startDate: '2026-06-01',
      endDate: '2026-06-30',
    });
  });

  it('passes custom dates through untouched', () => {
    expect(resolveDateRange({ startDate: '2026-01-01', endDate: '2026-03-31' }, today)).toEqual({
      startDate: '2026-01-01',
      endDate: '2026-03-31',
    });
  });

  it('returns an empty range when nothing is selected', () => {
    expect(resolveDateRange({}, today)).toEqual({ startDate: undefined, endDate: undefined });
  });
});

describe('describePeriod', () => {
  it('uses the preset label when a preset is selected', () => {
    expect(describePeriod({ period: 'rolling-month' })).toBe('Mois glissant');
  });

  it('describes a full custom range', () => {
    expect(describePeriod({ startDate: '2026-01-01', endDate: '2026-01-31' })).toBe('du 01/01/2026 au 31/01/2026');
  });

  it('describes an open-ended custom range', () => {
    expect(describePeriod({ startDate: '2026-01-01' })).toBe('à partir du 01/01/2026');
    expect(describePeriod({ endDate: '2026-01-31' })).toBe("jusqu'au 31/01/2026");
  });

  it('returns null when nothing is selected', () => {
    expect(describePeriod({})).toBeNull();
  });
});

describe('describeCreatedPeriod', () => {
  it('frames a preset around the request creation date', () => {
    expect(describeCreatedPeriod({ period: 'rolling-month' })).toBe('Requêtes créées : Mois glissant');
  });

  it('frames a full custom range with "entre le ... et le ..."', () => {
    expect(describeCreatedPeriod({ startDate: '2026-01-01', endDate: '2026-01-31' })).toBe(
      'Requêtes créées entre le 01/01/2026 et le 31/01/2026',
    );
  });

  it('frames an open-ended custom range', () => {
    expect(describeCreatedPeriod({ startDate: '2026-01-01' })).toBe('Requêtes créées à partir du 01/01/2026');
    expect(describeCreatedPeriod({ endDate: '2026-01-31' })).toBe("Requêtes créées jusqu'au 31/01/2026");
  });

  it('returns null when nothing is selected', () => {
    expect(describeCreatedPeriod({})).toBeNull();
  });
});
