import { htmlToText as convertHtmlToText } from 'html-to-text';
import { RequetePdfBuilder } from '../../features/requetesEntite/requetesEntite.pdf.builder.js';
import { getLoggerStore } from '../asyncLocalStorage.js';
import { applySubstitutions, getTipimailTemplate, type TipimailTemplate } from './tipimail.js';

const EMAIL_PDF_TITLE = 'Accusé de réception - Email envoyé';

function formatDate(date: Date): string {
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function buildEmailPdf(
  from: { address: string; personalName?: string },
  to: string,
  sentDate: Date,
  subject: string,
  body: string,
): Promise<Buffer> {
  const fromText = from.personalName ? `${from.personalName} <${from.address}>` : from.address;

  const builder = new RequetePdfBuilder(EMAIL_PDF_TITLE);
  builder
    .h1(EMAIL_PDF_TITLE)
    .section('En-tête')
    .field('Expéditeur', fromText)
    .field('Destinataire', to)
    .field("Date d'envoi", formatDate(sentDate))
    .field('Objet', subject)
    .section("Contenu de l'e-mail");

  for (const line of body.split('\n')) {
    const trimmed = line.trim();
    if (trimmed) builder.paragraph(trimmed);
  }

  return builder.toBuffer();
}

export interface EmailPdfFromTextOptions {
  from: { address: string; personalName?: string };
  to: string;
  sentDate: Date;
  subject: string;
  text: string;
}

export async function generateEmailPdfFromText(options: EmailPdfFromTextOptions): Promise<Buffer> {
  const { from, to, sentDate, subject, text } = options;
  return buildEmailPdf(from, to, sentDate, subject, text);
}

export interface EmailPdfOptions {
  from: { address: string; personalName?: string };
  to: string;
  sentDate: Date;
  template: string;
  substitutions: Record<string, unknown>;
}

export async function generateEmailPdf(options: EmailPdfOptions): Promise<Buffer> {
  const logger = getLoggerStore();
  const { from, to, sentDate, template: templateId, substitutions } = options;

  let template: TipimailTemplate;
  try {
    template = await getTipimailTemplate(templateId);
  } catch (error: unknown) {
    logger.error({ template: templateId, error }, 'Failed to fetch template from Tipimail');
    throw new Error(`Failed to fetch template ${templateId} from Tipimail`);
  }

  const htmlContent = template.htmlContent ? applySubstitutions(template.htmlContent, substitutions) : '';
  const textContent = template.textContent
    ? applySubstitutions(template.textContent, substitutions)
    : convertHtmlToText(htmlContent);
  const subject = template.subject ? applySubstitutions(template.subject, substitutions) : '';
  const body = textContent || convertHtmlToText(htmlContent);

  return buildEmailPdf(from, to, sentDate, subject, body);
}
