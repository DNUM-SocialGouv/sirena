import { describe, expect, it } from 'vitest';
import { groupCardsByTab, resolveSelectedTab } from './dashboardTabs';
import type { StatisticsCard, StatisticsTab } from './statistics.types';

const tab = (id: number, name: string): StatisticsTab => ({ id, name, position: id });
const card = (id: number, tabId: number | null): StatisticsCard => ({
  id,
  dashcardId: id * 10,
  tabId,
  filterSlugs: [],
  name: `Carte ${id}`,
  description: null,
  display: null,
  layout: null,
  data: { cols: [], rows: [] },
});

describe('groupCardsByTab', () => {
  const tabs = [tab(1, 'Volumes'), tab(2, 'Délais')];

  it('groups the cards under their tab, keeping the tab order', () => {
    const sections = groupCardsByTab(tabs, [card(20, 2), card(10, 1), card(11, 1)]);

    expect(sections.map((section) => section.tab.name)).toEqual(['Volumes', 'Délais']);
    expect(sections.map((section) => section.cards.map((c) => c.id))).toEqual([[10, 11], [20]]);
  });

  it('attaches orphan cards (null or unknown tabId) to the first tab', () => {
    const sections = groupCardsByTab(tabs, [card(30, null), card(40, 99), card(20, 2)]);

    expect(sections[0].cards.map((c) => c.id)).toEqual([30, 40]);
    expect(sections[1].cards.map((c) => c.id)).toEqual([20]);
  });

  it('keeps an empty section for a tab without cards', () => {
    const sections = groupCardsByTab(tabs, [card(10, 1)]);

    expect(sections[1]).toEqual({ tab: tabs[1], cards: [] });
  });

  it('returns nothing when the dashboard has no tabs', () => {
    expect(groupCardsByTab([], [card(10, null)])).toEqual([]);
  });
});

describe('resolveSelectedTab', () => {
  const tabs = [tab(1, 'Volumes'), tab(2, 'Délais')];

  it('returns the requested tab when it exists', () => {
    expect(resolveSelectedTab(tabs, 2)).toEqual(tabs[1]);
  });

  it('falls back to the first tab when the requested one is missing or unknown', () => {
    expect(resolveSelectedTab(tabs, undefined)).toEqual(tabs[0]);
    expect(resolveSelectedTab(tabs, 99)).toEqual(tabs[0]);
  });

  it('returns null without tabs', () => {
    expect(resolveSelectedTab([], 1)).toBeNull();
  });
});
