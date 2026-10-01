import { describe, expect, it } from 'vitest';
import { resolveAvailableFilters } from './filterAvailability';
import type { StatisticsCard } from './statistics.types';

const card = (id: number, filterSlugs: string[]): StatisticsCard => ({
  id,
  dashcardId: id * 10,
  tabId: null,
  filterSlugs,
  name: `Carte ${id}`,
  description: null,
  display: null,
  layout: null,
  data: { cols: [], rows: [] },
});

describe('resolveAvailableFilters', () => {
  it('keeps every filter when no card declares any mapping', () => {
    const cards = [card(1, []), card(2, [])];

    expect([...resolveAvailableFilters(cards, cards)]).toEqual(['period', 'domaine', 'lieu', 'eig']);
  });

  it('only keeps the filters used by at least one visible card', () => {
    const visible = [card(1, ['start_date', 'end_date']), card(2, ['inclure_eig'])];
    const all = [...visible, card(3, ['domaine_fonctionnel', 'lieu_de_survenue'])];

    expect([...resolveAvailableFilters(visible, all)]).toEqual(['period', 'eig']);
  });

  it('shows the period filter as soon as one of its two dates is mapped', () => {
    const visible = [card(1, ['end_date'])];

    expect([...resolveAvailableFilters(visible, visible)]).toEqual(['period']);
  });

  it('hides every filter on a tab whose cards use none, when the dashboard does declare mappings', () => {
    const visible = [card(1, [])];
    const all = [...visible, card(2, ['domaine_fonctionnel'])];

    expect(resolveAvailableFilters(visible, all).size).toBe(0);
  });
});
