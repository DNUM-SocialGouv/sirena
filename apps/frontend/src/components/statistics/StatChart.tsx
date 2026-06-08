import { useId, useMemo } from 'react';
import { annularSectorPath, CHART_COLORS, numberFormatter, type ParsedCard, percentFormatter } from './chartData';
import { StatTable } from './StatTable';
import styles from './statChart.module.css';

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
  const { items, total, dimensionLabel, metricLabel } = parsed;

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
      <h2 id={titleId} className={styles.title}>
        {name}
      </h2>

      <div className={styles.layout}>
        <svg
          className={styles.svg}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label={`${name} : répartition en pourcentage. Données détaillées dans la légende ci-après.`}
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
            // Survol géré en CSS pur (:hover) : liseré contrasté sur la part pointée, sans handlers JS
            // sur un élément non opérable au clavier (la donnée vit dans la légende et le tableau).
            slices.map((slice) => (
              <path
                key={slice.label}
                className={styles.slice}
                d={annularSectorPath(CENTER, CENTER, R_OUTER, R_INNER, slice.start, slice.end)}
                fill={slice.color}
                stroke="var(--background-default-grey)"
                strokeWidth={2}
              />
            ))
          )}
        </svg>

        <ul className={styles.legend}>
          {slices.map((slice) => (
            <li key={slice.label} className={styles.legendItem}>
              <span className={styles.swatch} style={{ background: slice.color }} aria-hidden="true" />
              <span className={styles.legendLabel}>{slice.label}</span>
              <span className={styles.legendValue}>
                {numberFormatter.format(slice.value)} ({percentFormatter.format(slice.fraction)})
              </span>
            </li>
          ))}
        </ul>
      </div>

      <details className={styles.details}>
        <summary>Afficher les données du graphique</summary>
        <StatTable
          caption={name}
          items={items}
          total={total}
          dimensionLabel={dimensionLabel}
          metricLabel={metricLabel}
          hideCaption
        />
      </details>
    </figure>
  );
}
