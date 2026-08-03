import { serializeCsv } from '@sirena/common/utils';
import type { StatisticsCard } from '@/lib/api/fetchStatistics';

export const buildCardCsv = (card: StatisticsCard): string => {
  const cols = card.data?.cols ?? [];
  const rows = card.data?.rows ?? [];
  return serializeCsv(
    cols.map((col) => col.display_name),
    rows,
  );
};

export const buildCardCsvFilename = (name: string): string => {
  const slug = name
    .normalize('NFC')
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .toLowerCase()
    .slice(0, 100)
    .replace(/^-+|-+$/g, '');
  return `${slug || 'indicateur'}.csv`;
};
