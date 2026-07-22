import { Button } from '@codegouvfr/react-dsfr/Button';
import { useCallback, useState } from 'react';
import { fetchExportRequetesCsv } from '@/lib/api/fetchStatistics';
import { toastManager } from '@/lib/toastManager';

const FALLBACK_FILENAME = 'export-requetes-sirena.csv';

function getFilenameFromContentDisposition(contentDisposition: string | null) {
  const filenameMatch = contentDisposition?.match(/filename="?([^";]+)"?/i);
  return filenameMatch?.[1] ?? FALLBACK_FILENAME;
}

export function ExportRequetesButton() {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(async () => {
    setIsExporting(true);

    try {
      const response = await fetchExportRequetesCsv();
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = getFilenameFromContentDisposition(response.headers.get('Content-Disposition'));
      document.body.appendChild(link);

      try {
        link.click();
      } finally {
        link.remove();
        URL.revokeObjectURL(url);
      }
    } catch {
      toastManager.add({
        title: "Erreur lors de l'export",
        description: "L'export des requêtes a échoué. Veuillez réessayer.",
        timeout: 0,
        data: { icon: 'fr-alert--error' },
      });
    } finally {
      setIsExporting(false);
    }
  }, []);

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
