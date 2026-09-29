import { fr } from '@codegouvfr/react-dsfr';
import { SegmentedControl } from '@codegouvfr/react-dsfr/SegmentedControl';
import { type ReactNode, useId, useMemo, useState } from 'react';
import { CardHelp } from './CardHelp';
import {
  annularSectorPath,
  CHART_COLORS,
  formatShare,
  numberFormatter,
  type ParsedCard,
  sliceSweeps,
} from './chartData';
import { StatTable } from './StatTable';
import styles from './statChart.module.css';

type View = 'chart' | 'table';

const SIZE = 240;
const CENTER = SIZE / 2;
const R_OUTER = 112;
const R_INNER = 68;
const MIN_SLICE_SWEEP = 5;

interface StatChartProps {
  name: string;
  description?: string | null;
  parsed: ParsedCard;
  action?: ReactNode;
}

export function StatChart({ name, description, parsed, action }: StatChartProps) {
  const titleId = useId();
  const legendId = useId();
  const [view, setView] = useState<View>('chart');
  const { items, total } = parsed;

  const slices = useMemo(() => {
    const visibleItems = items.filter((item) => item.value > 0);
    const sweeps = sliceSweeps(
      visibleItems.map((item) => item.value),
      MIN_SLICE_SWEEP,
    );
    let angle = 0;
    return visibleItems.map((item, index) => {
      const start = angle;
      const end = angle + sweeps[index];
      angle = end;
      return { ...item, fraction: item.value / total, start, end, color: CHART_COLORS[index % CHART_COLORS.length] };
    });
  }, [items, total]);

  if (total <= 0 || slices.length === 0) {
    return (
      <figure className={styles.figure} aria-labelledby={titleId}>
        <div className={styles.titleGroup}>
          <h2 id={titleId} className={fr.cx('fr-text--md', 'fr-text--bold', 'fr-mb-0')}>
            {name}
          </h2>
          <CardHelp description={description} />
          {action}
        </div>
        <p>Aucune donnée à afficher.</p>
      </figure>
    );
  }

  const isFullCircle = slices.length === 1;

  return (
    <figure className={styles.figure} aria-labelledby={titleId}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <h2 id={titleId} className={fr.cx('fr-text--md', 'fr-text--bold', 'fr-mb-0')}>
            {name}
          </h2>
          <CardHelp description={description} />
          {action}
        </div>

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
                  {numberFormatter.format(slice.value)} ({formatShare(slice.fraction)})
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <StatTable caption={name} parsed={parsed} hideCaption />
      )}
    </figure>
  );
}
