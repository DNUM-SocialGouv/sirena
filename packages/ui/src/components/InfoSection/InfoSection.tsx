import { fr } from '@codegouvfr/react-dsfr';
import { Accordion } from '@codegouvfr/react-dsfr/Accordion';
import { Link } from '@tanstack/react-router';
import React from 'react';
import styles from './InfoSection.module.css';

type InfoSectionProps = {
  id: string;
  title: string;
  editHref?: string;
  renderSummary?: () => React.ReactNode;
  renderDetails?: () => React.ReactNode;
  emptyLabel?: string;
  badges?: React.ReactNode[];
  replaceSummaryWithDetails?: boolean;
  canEdit?: boolean;
};

export function InfoSection({
  id,
  title,
  renderSummary,
  renderDetails,
  emptyLabel = 'Aucune information',
  editHref,
  badges,
  replaceSummaryWithDetails = false,
  canEdit = false,
}: InfoSectionProps) {
  const [isDetailsExpanded, setIsDetailsExpanded] = React.useState(false);

  const summaryContent = renderSummary?.();
  const detailsContent = renderDetails?.();

  const isEmpty = !summaryContent && !detailsContent;
  const hasSummary = !!summaryContent;
  const hasDetails = !!detailsContent;
  const shouldShowSummary = replaceSummaryWithDetails ? !isDetailsExpanded && hasSummary : hasSummary;

  const editLabel = isEmpty ? 'Compléter' : 'Éditer';

  const toggleDetails = () => setIsDetailsExpanded(!isDetailsExpanded);

  const titleId = id ? `${id}-title` : 'title';
  const detailsId = id ? `${id}-details` : 'details';

  const detailsLabel = isDetailsExpanded ? (
    <>
      Masquer le détail{`\u00A0`}
      <span className="fr-sr-only">{title}</span>
    </>
  ) : (
    <>
      Voir le détail{`\u00A0`}
      <span className="fr-sr-only">{title}</span>
    </>
  );

  return (
    <section aria-labelledby={titleId} className={styles.section}>
      <div className={isEmpty ? styles.headerContentEmpty : styles.headerContent}>
        <div className={styles.titleGroup}>
          <h2 id={titleId} className={fr.cx('fr-text--lg', 'fr-mb-0', 'fr-text--bold')}>
            {title}
          </h2>
          {badges?.map((badge, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: <static list>
            <output key={index} aria-label={`Badge ${index + 1}`}>
              {badge}
            </output>
          ))}
        </div>
        {canEdit && editHref ? (
          <Link to={editHref} className="fr-btn fr-btn--tertiary-no-outline fr-btn--icon-right fr-icon-pencil-line">
            {editLabel}
            <span className="fr-sr-only">{title}</span>
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className="fr-btn fr-btn--tertiary-no-outline fr-btn--icon-right fr-icon-pencil-line fr-btn--disabled"
          >
            {editLabel}
            <span className="fr-sr-only">{title}</span>
          </button>
        )}
      </div>

      {isEmpty ? (
        <p className={fr.cx('fr-text--xs')}>{emptyLabel}</p>
      ) : (
        <>
          {shouldShowSummary && summaryContent}
          {hasDetails && (
            <div className={fr.cx('fr-mt-2w')}>
              <Accordion
                label={detailsLabel}
                expanded={isDetailsExpanded}
                onExpandedChange={toggleDetails}
                id={detailsId}
              >
                {detailsContent || <div>{emptyLabel}</div>}
              </Accordion>
            </div>
          )}
        </>
      )}
    </section>
  );
}
