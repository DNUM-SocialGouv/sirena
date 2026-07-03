export type MetabaseColumn = {
  name: string;
  display_name: string;
  base_type: string;
  semantic_type: string | null;
  // `breakout` = axe (dimension), `aggregation` = mesure (métrique) ; `null` pour une requête SQL native.
  source: string | null;
};

export type CardData = {
  cols: MetabaseColumn[];
  rows: unknown[][];
};

export type ChartItem = { label: string; value: number; percent?: number | null };

export type ParsedCard = {
  items: ChartItem[];
  total: number;
  dimensionLabel: string;
  metricLabel: string;
  percentLabel: string;
  hasPrecomputedPercent: boolean;
};

export const numberFormatter = new Intl.NumberFormat('fr-FR');
export const percentFormatter = new Intl.NumberFormat('fr-FR', { style: 'percent', maximumFractionDigits: 1 });
export const percentPointFormatter = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

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

const isNumericColumn = (col: MetabaseColumn): boolean => /Integer|Decimal|Float|Number/i.test(col.base_type);

const PERCENT_SEMANTIC_TYPE = 'type/Percentage';

const isPercentByName = (col: MetabaseColumn): boolean =>
  /%|pourcent/i.test(col.display_name) || /%|pourcent/i.test(col.name);

export const parseCard = ({ cols, rows }: CardData): ParsedCard | null => {
  if (cols.length < 2 || rows.length === 0) return null;

  const percentColumn =
    cols.find((col) => col.semantic_type === PERCENT_SEMANTIC_TYPE) ??
    cols.find((col) => isNumericColumn(col) && isPercentByName(col)) ??
    null;

  const metricCandidates = cols.filter((col) => col !== percentColumn && isNumericColumn(col));
  const percentCol = metricCandidates.length > 0 ? percentColumn : null;

  const metricCol =
    metricCandidates.find((col) => col.source === 'aggregation') ??
    metricCandidates.at(-1) ??
    cols.filter(isNumericColumn).at(-1) ??
    cols[cols.length - 1];

  const dimensionCol =
    cols.find((col) => col.source === 'breakout' && col !== metricCol && col !== percentCol) ??
    cols.find((col) => col !== metricCol && col !== percentCol && !isNumericColumn(col)) ??
    cols.find((col) => col !== metricCol && col !== percentCol) ??
    cols[0];

  const dimensionIndex = cols.indexOf(dimensionCol);
  const metricIndex = cols.indexOf(metricCol);
  const percentIndex = percentCol ? cols.indexOf(percentCol) : -1;

  const items = rows.map((row) => ({
    label: row[dimensionIndex] == null ? 'Non précisé' : String(row[dimensionIndex]),
    value: toNumber(row[metricIndex]) ?? 0,
    ...(percentCol ? { percent: toNumber(row[percentIndex]) } : {}),
  }));

  const total = items.reduce((sum, item) => sum + item.value, 0);

  return {
    items,
    total,
    dimensionLabel: dimensionCol.display_name,
    metricLabel: metricCol.display_name,
    percentLabel: percentCol ? percentCol.display_name : 'Part (%)',
    hasPrecomputedPercent: percentCol !== null,
  };
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
