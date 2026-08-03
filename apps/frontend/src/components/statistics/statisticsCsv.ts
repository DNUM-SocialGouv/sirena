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
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return `${slug || 'indicateur'}.csv`;
};
