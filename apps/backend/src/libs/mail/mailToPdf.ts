import { htmlToText as convertHtmlToText } from 'html-to-text';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { getLoggerStore } from '../asyncLocalStorage.js';
import { applySubstitutions, getTipimailTemplate, type TipimailTemplate } from './tipimail.js';

export interface EmailPdfOptions {
  from: { address: string; personalName?: string };
  to: string;
  sentDate: Date;
  template: string;
  substitutions: Record<string, unknown>;
}

/**
 * Wraps text to fit within a given width and returns lines
 */
function wrapText(
  text: string,
  maxWidth: number,
  font: { widthOfTextAtSize: (text: string, size: number) => number },
  fontSize: number,
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const textWidth = font.widthOfTextAtSize(testLine, fontSize);

    if (textWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Generates a PDF document with the actual email content from Tipimail template
 */
export async function generateEmailPdf(options: EmailPdfOptions): Promise<Buffer> {
  const logger = getLoggerStore();
  const { from, to, sentDate, template: templateId, substitutions } = options;

  // Get template from Tipimail
  let template: TipimailTemplate;
  try {
    template = await getTipimailTemplate(templateId);
  } catch (error: unknown) {
    logger.error({ template: templateId, error }, 'Failed to fetch template from Tipimail');
    throw new Error(`Failed to fetch template ${templateId} from Tipimail`);
  }

  // Apply substitutions to HTML and text content
  const htmlContent = template.htmlContent ? applySubstitutions(template.htmlContent, substitutions) : '';
  const textContent = template.textContent
    ? applySubstitutions(template.textContent, substitutions)
    : convertHtmlToText(htmlContent);
  const subject = template.subject ? applySubstitutions(template.subject, substitutions) : '';

  // Generate PDF
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4 size
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let yPosition = 800;
  const lineHeight = 18;
  const margin = 50;
  const maxWidth = 495; // page width - 2*margin

  // Title
  page.drawText('Accusé de réception - Email envoyé', {
    x: margin,
    y: yPosition,
    size: 16,
    font: boldFont,
    color: rgb(0, 0, 0),
  });
  yPosition -= 40;

  // From
  page.drawText('Expéditeur :', {
    x: margin,
    y: yPosition,
    size: 12,
    font: boldFont,
    color: rgb(0, 0, 0),
  });
  yPosition -= lineHeight;
  const fromText = from.personalName ? `${from.personalName} <${from.address}>` : from.address;
  const fromLines = wrapText(fromText, maxWidth, font, 10);
  for (const line of fromLines) {
    page.drawText(line, {
      x: margin + 20,
      y: yPosition,
      size: 10,
      font: font,
      color: rgb(0, 0, 0),
    });
    yPosition -= lineHeight;
  }
  yPosition -= 10;

  // To
  page.drawText('Destinataire :', {
    x: margin,
    y: yPosition,
    size: 12,
    font: boldFont,
    color: rgb(0, 0, 0),
  });
  yPosition -= lineHeight;
  const toLines = wrapText(to, maxWidth, font, 10);
  for (const line of toLines) {
    page.drawText(line, {
      x: margin + 20,
      y: yPosition,
      size: 10,
      font: font,
      color: rgb(0, 0, 0),
    });
    yPosition -= lineHeight;
  }
  yPosition -= 10;

  // Date
  page.drawText("Date d'envoi :", {
    x: margin,
    y: yPosition,
    size: 12,
    font: boldFont,
    color: rgb(0, 0, 0),
  });
  yPosition -= lineHeight;
  const formattedDate = sentDate.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  page.drawText(formattedDate, {
    x: margin + 20,
    y: yPosition,
    size: 10,
    font: font,
    color: rgb(0, 0, 0),
  });
  yPosition -= 20;

  // Subject
  if (subject) {
    page.drawText('Sujet :', {
      x: margin,
      y: yPosition,
      size: 12,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    yPosition -= lineHeight;
    const subjectLines = wrapText(subject, maxWidth, font, 10);
    for (const line of subjectLines) {
      page.drawText(line, {
        x: margin + 20,
        y: yPosition,
        size: 10,
        font: font,
        color: rgb(0, 0, 0),
      });
      yPosition -= lineHeight;
    }
    yPosition -= 10;
  }

  // Email content
  page.drawText("Contenu de l'email :", {
    x: margin,
    y: yPosition,
    size: 12,
    font: boldFont,
    color: rgb(0, 0, 0),
  });
  yPosition -= lineHeight + 5;

  // Use text content (cleaner for PDF) or convert HTML to text
  const emailBody = textContent || convertHtmlToText(htmlContent);
  const emailLines = emailBody.split('\n').flatMap((line: string) => wrapText(line.trim(), maxWidth, font, 10));

  let currentPage = page;
  for (const line of emailLines) {
    if (yPosition < 50) {
      // Add new page if needed
      currentPage = pdfDoc.addPage([595, 842]);
      yPosition = 800;
    }

    if (line.trim()) {
      currentPage.drawText(line, {
        x: margin,
        y: yPosition,
        size: 10,
        font: font,
        color: rgb(0, 0, 0),
      });
    }
    yPosition -= lineHeight;
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
