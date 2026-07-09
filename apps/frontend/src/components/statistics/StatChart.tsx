import { SegmentedControl } from '@codegouvfr/react-dsfr/SegmentedControl';
import { useId, useMemo, useState } from 'react';
import { annularSectorPath, CHART_COLORS, numberFormatter, type ParsedCard, percentFormatter } from './chartData';
import { StatTable } from './StatTable';
import styles from './statChart.module.css';

type View = 'chart' | 'table';

const SIZE = 240;
const CENTER = SIZE / 2;
const R_OUTER = 112;
const R_INNER = 68;

interface StatChartProps {
  name: string;
  parsed: ParsedCard;
}

export function StatChart({ name, parsed }: StatChartProps) {
  const titleId = useId();
  const legendId = useId();
  const [view, setView] = useState<View>('table');
  const { items, total, dimensionLabel, metricLabel, percentLabel, hasPrecomputedPercent } = parsed;

  const slices = useMemo(() => {
    let angle = 0;
    return items
      .filter((item) => item.value > 0)
      .map((item, index) => {
        const fraction = item.value / total;
        const start = angle;
        const end = angle + fraction * 360;
        angle = end;
        return { ...item, fraction, start, end, color: CHART_COLORS[index % CHART_COLORS.length] };
      });
  }, [items, total]);

  if (total <= 0 || slices.length === 0) {
    return (
      <figure className={styles.figure} aria-labelledby={titleId}>
        <h2 id={titleId} className={styles.title}>
          {name}
        </h2>
        <p>Aucune donnée à afficher.</p>
      </figure>
    );
  }

  const isFullCircle = slices.length === 1;

  return (
    <figure className={styles.figure} aria-labelledby={titleId}>
      <div className={styles.header}>
        <h2 id={titleId} className={styles.title}>
          {name}
        </h2>

        <SegmentedControl
          small
          hideLegend
          legend="Choisir le type d'affichage des données"
          name={`${titleId}-view`}
          segments={[
            {
              label: 'Graphique',
              iconId: 'fr-icon-pie-chart-2-line',
              nativeInputProps: { checked: view === 'chart', onChange: () => setView('chart') },
            },
            {
              label: 'Tableau',
              iconId: 'fr-icon-table-line',
              nativeInputProps: { checked: view === 'table', onChange: () => setView('table') },
            },
          ]}
        />
      </div>

      {view === 'chart' ? (
        <div className={styles.layout}>
          <svg
            className={styles.svg}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            role="img"
            aria-label={`${name} : répartition en pourcentage.`}
            aria-describedby={legendId}
          >
            {isFullCircle ? (
              <circle
                cx={CENTER}
                cy={CENTER}
                r={(R_OUTER + R_INNER) / 2}
                fill="none"
                stroke={slices[0].color}
                strokeWidth={R_OUTER - R_INNER}
              />
            ) : (
              slices.map((slice) => (
                <path
                  key={`${slice.label}-${slice.start}`}
                  d={annularSectorPath(CENTER, CENTER, R_OUTER, R_INNER, slice.start, slice.end)}
                  fill={slice.color}
                  stroke="var(--background-default-grey)"
                  strokeWidth={2}
                />
              ))
            )}
          </svg>

          <ul id={legendId} className={styles.legend}>
            {slices.map((slice) => (
              <li key={`${slice.label}-${slice.start}`} className={styles.legendItem}>
                <span className={styles.swatch} style={{ background: slice.color }} aria-hidden="true" />
                <span className={styles.legendLabel}>{slice.label}</span>
                <span className={styles.legendValue}>
                  {numberFormatter.format(slice.value)} ({percentFormatter.format(slice.fraction)})
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <StatTable
          caption={name}
          items={items}
          total={total}
          dimensionLabel={dimensionLabel}
          metricLabel={metricLabel}
          percentLabel={percentLabel}
          hasPrecomputedPercent={hasPrecomputedPercent}
          hideCaption
        />
      )}
    </figure>
  );
}
