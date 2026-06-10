export type ChartItem = { label: string; value: number };

export type ParsedCard = {
  items: ChartItem[];
  total: number;
  dimensionLabel: string;
  metricLabel: string;
};

export const numberFormatter = new Intl.NumberFormat('fr-FR');
export const percentFormatter = new Intl.NumberFormat('fr-FR', { style: 'percent', maximumFractionDigits: 1 });

export const CHART_COLORS = [
  'var(--sirena-chart-color-01)',
  'var(--sirena-chart-color-02)',
  'var(--sirena-chart-color-03)',
  'var(--sirena-chart-color-04)',
  'var(--sirena-chart-color-05)',
  'var(--sirena-chart-color-06)',
  'var(--sirena-chart-color-07)',
  'var(--sirena-chart-color-08)',
] as const;

const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const humanize = (key: string): string => {
  const spaced = key
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/^nb\s+/i, 'Nombre de ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};

export const parseCard = (rows: Array<Record<string, unknown>>): ParsedCard | null => {
  const [first] = rows;
  if (!first) return null;
  const keys = Object.keys(first);
  if (keys.length < 2) return null;

  // Plusieurs colonnes peuvent être numériques (ex. un id technique + la valeur) :
  // la métrique est la dernière colonne numérique, Metabase plaçant les agrégats en fin de ligne.
  const numericKeys = keys.filter((key) => rows.every((row) => toNumber(row[key]) !== null));
  const metricKey = numericKeys.at(-1) ?? keys[keys.length - 1];
  const dimensionKey =
    keys.find((key) => !numericKeys.includes(key)) ?? keys.find((key) => key !== metricKey) ?? keys[0];

  const items = rows.map((row) => ({
    label: row[dimensionKey] == null ? 'Non précisé' : String(row[dimensionKey]),
    value: toNumber(row[metricKey]) ?? 0,
  }));

  const total = items.reduce((sum, item) => sum + item.value, 0);

  return { items, total, dimensionLabel: humanize(dimensionKey), metricLabel: humanize(metricKey) };
};

const polarToCartesian = (cx: number, cy: number, radius: number, angleDeg: number): [number, number] => {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return [cx + radius * Math.cos(angleRad), cy + radius * Math.sin(angleRad)];
};

export const annularSectorPath = (
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  startAngle: number,
  endAngle: number,
): string => {
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  const [ox1, oy1] = polarToCartesian(cx, cy, rOuter, startAngle);
  const [ox2, oy2] = polarToCartesian(cx, cy, rOuter, endAngle);
  const [ix2, iy2] = polarToCartesian(cx, cy, rInner, endAngle);
  const [ix1, iy1] = polarToCartesian(cx, cy, rInner, startAngle);
  return [
    `M ${ox1} ${oy1}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${ox2} ${oy2}`,
    `L ${ix2} ${iy2}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 0 ${ix1} ${iy1}`,
    'Z',
  ].join(' ');
};
