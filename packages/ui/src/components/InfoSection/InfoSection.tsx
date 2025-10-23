import { fr } from '@codegouvfr/react-dsfr';
import { Accordion } from '@codegouvfr/react-dsfr/Accordion';
import { Button } from '@codegouvfr/react-dsfr/Button';
import React from 'react';
import styles from './InfoSection.module.css';

type InfoSectionProps = {
  id: string;
  title: string;
  onEdit?: () => void;
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
  onEdit,
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
        {canEdit && onEdit && (
          <Button iconPosition="right" iconId="fr-icon-pencil-line" priority="tertiary no outline" onClick={onEdit}>
            {editLabel}
          </Button>
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
                label={isDetailsExpanded ? 'Masquer le détail' : 'Voir le détail'}
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
