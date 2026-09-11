import { GEO_GUARDS } from './geoReferentiel.constant.js';

export class GeoReferentielDownloadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeoReferentielDownloadError';
  }
}

type FetchCsvLinesOptions = {
  encoding: 'utf-8' | 'latin1';
  delimiter: string;
  signal?: AbortSignal;
};

const withoutTrailingCr = (record: string) => (record.endsWith('\r') ? record.slice(0, -1) : record);

/**
 * Décode un flux d'octets en enregistrements CSV, sans jamais matérialiser le fichier entier.
 *
 * En latin-1, chaque caractère tient sur un octet : découper les chunks n'importe où est sûr,
 * et `Buffer.toString` évite d'exiger un Node compilé avec l'ICU complet.
 * En UTF-8, `TextDecoder` en mode `stream` est indispensable pour recoller un caractère
 * multi-octets coupé par une frontière de chunk.
 *
 * Le découpage suit les guillemets : un saut de ligne à l'intérieur d'un champ cité appartient
 * à l'enregistrement et ne le termine pas, sans quoi une poignée de libellés multi-lignes
 * suffirait à faire dépasser le seuil de lignes illisibles et à échouer la synchronisation.
 * Un guillemet n'ouvre un champ cité qu'en début de champ : un guillemet isolé au milieu d'un
 * champ non cité reste une donnée et n'emporte pas le reste du fichier.
 */
async function* decodeRecords(
  body: AsyncIterable<Uint8Array>,
  encoding: FetchCsvLinesOptions['encoding'],
  delimiter: string,
): AsyncGenerator<string> {
  const decoder = encoding === 'utf-8' ? new TextDecoder('utf-8') : null;
  let buffer = '';
  let cursor = 0;
  let recordStart = 0;
  let inQuotes = false;
  let atFieldStart = true;
  let justClosedQuotes = false;

  for await (const chunk of body) {
    buffer += decoder ? decoder.decode(chunk, { stream: true }) : Buffer.from(chunk).toString('latin1');

    while (cursor < buffer.length) {
      const char = buffer[cursor];
      cursor++;

      if (inQuotes) {
        if (char === '"') {
          inQuotes = false;
          justClosedQuotes = true;
        }
        continue;
      }

      // Un guillemet qui suit immédiatement le guillemet fermant est un `""` échappé : le
      // champ cité se poursuit.
      if (char === '"' && (atFieldStart || justClosedQuotes)) {
        inQuotes = true;
        atFieldStart = false;
        justClosedQuotes = false;
        continue;
      }

      justClosedQuotes = false;

      if (char === '\n') {
        yield withoutTrailingCr(buffer.slice(recordStart, cursor - 1));
        recordStart = cursor;
        atFieldStart = true;
        continue;
      }

      atFieldStart = char === delimiter;
    }

    // Une seule réallocation par chunk : tronquer le tampon à chaque enregistrement rendrait
    // l'extraction quadratique, soit des centaines de mégaoctets recopiés sur ces sources.
    buffer = buffer.slice(recordStart);
    cursor -= recordStart;
    recordStart = 0;
  }

  if (decoder) {
    buffer += decoder.decode();
  }

  if (buffer.length > 0) {
    yield withoutTrailingCr(buffer);
  }
}

/**
 * Télécharge un CSV distant et le restitue enregistrement par enregistrement.
 *
 * Aucun en-tête `Accept-Encoding` n'est posé volontairement : undici l'envoie et décompresse
 * de façon transparente, alors que le fournir à la main désactive cette décompression et
 * livre du gzip brut. Les 160 Mo du référentiel des communes transitent ainsi en 9 Mo.
 *
 * `redirect: 'follow'` est nécessaire : la source La Poste répond 301 vers data.laposte.fr.
 *
 * L'échéance couvre tout le téléchargement, corps compris : une source qui accepte la
 * connexion puis cesse d'émettre bloquerait sinon indéfiniment le script d'exploitation, que
 * ne protège aucun délai de job.
 */
export async function* fetchCsvLines(url: string, options: FetchCsvLinesOptions): AsyncGenerator<string> {
  const deadline = AbortSignal.timeout(GEO_GUARDS.DOWNLOAD_TIMEOUT_MS);
  const signal = options.signal ? AbortSignal.any([options.signal, deadline]) : deadline;

  const response = await fetch(url, { redirect: 'follow', signal });

  if (!response.ok) {
    throw new GeoReferentielDownloadError(`Téléchargement de ${url} échoué (HTTP ${response.status})`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('text/html')) {
    throw new GeoReferentielDownloadError(`Réponse HTML inattendue pour ${url} (content-type: ${contentType})`);
  }

  if (!response.body) {
    throw new GeoReferentielDownloadError(`Réponse sans corps pour ${url}`);
  }

  yield* decodeRecords(response.body as unknown as AsyncIterable<Uint8Array>, options.encoding, options.delimiter);
}
