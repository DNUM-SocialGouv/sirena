import type { StatisticsCard, StatisticsTab } from './statistics.types';

export type TabSection = {
  tab: StatisticsTab;
  cards: StatisticsCard[];
};

export function groupCardsByTab(tabs: StatisticsTab[], cards: StatisticsCard[]): TabSection[] {
  if (tabs.length === 0) return [];
  const [firstTab] = tabs;
  const knownTabIds = new Set(tabs.map((tab) => tab.id));
  return tabs.map((tab) => ({
    tab,
    cards: cards.filter((card) => {
      if (card.tabId != null && knownTabIds.has(card.tabId)) return card.tabId === tab.id;
      return tab.id === firstTab.id;
    }),
  }));
}

export function resolveSelectedTab(tabs: StatisticsTab[], requestedTabId: number | undefined): StatisticsTab | null {
  if (tabs.length === 0) return null;
  const requested = tabs.find((tab) => tab.id === requestedTabId);
  if (requested) return requested;
  const [firstTab] = tabs;
  return firstTab;
}
