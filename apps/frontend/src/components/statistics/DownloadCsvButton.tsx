import { fr } from '@codegouvfr/react-dsfr';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { useCallback } from 'react';
import type { StatisticsCard } from '@/lib/api/fetchStatistics';
import { buildCardCsv, buildCardCsvFilename } from './statisticsCsv';

export function DownloadCsvButton({ card }: { card: StatisticsCard }) {
  const label = `Télécharger le tableau « ${card.name} » au format CSV`;

  const handleDownload = useCallback(() => {
    const csv = buildCardCsv(card);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = buildCardCsvFilename(card.name);
    document.body.appendChild(link);

    try {
      link.click();
    } finally {
      link.remove();
      URL.revokeObjectURL(url);
    }
  }, [card]);

  return (
    <Button
      type="button"
      priority="tertiary no outline"
      size="small"
      iconId="fr-icon-download-line"
      title={label}
      onClick={handleDownload}
    >
      <span className={fr.cx('fr-sr-only')}>{label}</span>
    </Button>
  );
}
