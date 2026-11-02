import {
  openApi401Unauthorized,
  openApi403Forbidden,
  openApiProtectedRoute,
  openApiResponse,
} from '@sirena/backend-utils/helpers';
import { describeRoute } from 'hono-openapi';
import { DocumentExportAccessSchema } from './documentExports.schema.js';

export const getDocumentExportAccessRoute = openApiProtectedRoute({
  description:
    "Indique ce que le lien de téléchargement d'un document mène à afficher : AVAILABLE (le fichier), " +
    "DENIED (l'utilisateur n'est pas le demandeur) ou EXPIRED (lien de plus de 30 min). Les refus sont tracés.",
  tags: ['document-exports'],
  responses: {
    ...openApiResponse(DocumentExportAccessSchema),
  },
});

export const getDocumentExportDownloadRoute = describeRoute({
  description:
    'Télécharge le document généré, réservé au demandeur tant que le lien est valide. ' +
    'Chaque téléchargement et chaque refus (cause.code DENIED ou EXPIRED) est tracé.',
  tags: ['document-exports'],
  responses: {
    ...openApi401Unauthorized(),
    ...openApi403Forbidden('Accès refusé ou lien expiré'),
    200: {
      description: 'Le fichier, en pièce jointe',
      content: {
        'text/csv': {
          schema: { type: 'string', format: 'binary' },
        },
      },
    },
  },
});
