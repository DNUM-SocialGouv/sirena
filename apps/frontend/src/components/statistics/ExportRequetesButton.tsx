import Alert from '@codegouvfr/react-dsfr/Alert';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { useState } from 'react';
import { handleRequestErrors } from '@/lib/api/tanstackQuery';

const FALLBACK_FILENAME = 'export-requetes-sirena.csv';

function getFilenameFromContentDisposition(contentDisposition: string | null) {
  const filenameMatch = contentDisposition?.match(/filename="?([^";]+)"?/i);
  return filenameMatch?.[1] ?? FALLBACK_FILENAME;
}

export function ExportRequetesButton() {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);

    try {
      const response = await fetch('/api/statistics/export-requetes');

      await handleRequestErrors(response, { silentToastError: true });

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = getFilenameFromContentDisposition(response.headers.get('Content-Disposition'));
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("L'export des requêtes a échoué. Veuillez réessayer.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        priority="secondary"
        iconId="fr-icon-download-line"
        onClick={handleExport}
        disabled={isExporting}
      >
        {isExporting ? 'Export en cours…' : 'Exporter les requêtes'}
      </Button>
      {error ? <Alert className="fr-mt-2w" severity="error" small title={error} /> : null}
    </>
  );
}
