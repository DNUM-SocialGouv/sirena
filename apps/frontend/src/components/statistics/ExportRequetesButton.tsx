import { Button } from '@codegouvfr/react-dsfr/Button';
import { useState } from 'react';

const FALLBACK_FILENAME = 'export-requetes-sirena.csv';

function getFilenameFromContentDisposition(contentDisposition: string | null) {
  const filenameMatch = contentDisposition?.match(/filename="?([^";]+)"?/i);
  return filenameMatch?.[1] ?? FALLBACK_FILENAME;
}

export function ExportRequetesButton() {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);

    const response = await fetch('/api/statistics/export-requetes');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = getFilenameFromContentDisposition(response.headers.get('Content-Disposition'));
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

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
