import { Button } from '@codegouvfr/react-dsfr/Button';
import { useState } from 'react';

export function ExportRequetesButton() {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    await fetch('/api/statistics/export-requetes');
    setIsExporting(false);
  };

  return (
    <Button
      type="button"
      priority="secondary"
      iconId="fr-icon-download-line"
      onClick={handleExport}
      disabled={isExporting}
    >
      {isExporting ? 'Export en cours…' : 'Exporter les requêtes'}
    </Button>
  );
}
