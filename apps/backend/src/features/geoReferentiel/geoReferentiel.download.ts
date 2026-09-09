export class GeoReferentielDownloadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeoReferentielDownloadError';
  }
}

type FetchCsvLinesOptions = {
  encoding: 'utf-8' | 'latin1';
  signal?: AbortSignal;
};

/**
 * Décode un flux d'octets en lignes de texte, sans jamais matérialiser le fichier entier.
 *
 * En latin-1, chaque caractère tient sur un octet : découper les chunks n'importe où est sûr,
 * et `Buffer.toString` évite d'exiger un Node compilé avec l'ICU complet.
 * En UTF-8, `TextDecoder` en mode `stream` est indispensable pour recoller un caractère
 * multi-octets coupé par une frontière de chunk.
 */
async function* decodeLines(
  body: AsyncIterable<Uint8Array>,
  encoding: FetchCsvLinesOptions['encoding'],
): AsyncGenerator<string> {
  const decoder = encoding === 'utf-8' ? new TextDecoder('utf-8') : null;
  let buffer = '';

  for await (const chunk of body) {
    buffer += decoder ? decoder.decode(chunk, { stream: true }) : Buffer.from(chunk).toString('latin1');

    let newlineIndex = buffer.indexOf('\n');
    while (newlineIndex !== -1) {
      const line = buffer.slice(0, newlineIndex);
      buffer = buffer.slice(newlineIndex + 1);
      yield line.endsWith('\r') ? line.slice(0, -1) : line;
      newlineIndex = buffer.indexOf('\n');
    }
  }

  if (decoder) {
    buffer += decoder.decode();
  }

  if (buffer.length > 0) {
    yield buffer.endsWith('\r') ? buffer.slice(0, -1) : buffer;
  }
}

/**
 * Télécharge un CSV distant et le restitue ligne par ligne.
 *
 * Aucun en-tête `Accept-Encoding` n'est posé volontairement : undici l'envoie et décompresse
 * de façon transparente, alors que le fournir à la main désactive cette décompression et
 * livre du gzip brut. Les 160 Mo du référentiel des communes transitent ainsi en 9 Mo.
 *
 * `redirect: 'follow'` est nécessaire : la source La Poste répond 301 vers data.laposte.fr.
 */
export async function* fetchCsvLines(url: string, options: FetchCsvLinesOptions): AsyncGenerator<string> {
  const response = await fetch(url, { redirect: 'follow', signal: options.signal });

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

  yield* decodeLines(response.body as unknown as AsyncIterable<Uint8Array>, options.encoding);
}
