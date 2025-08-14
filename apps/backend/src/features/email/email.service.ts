import fs from 'node:fs';
import path from 'node:path';
import Handlebars from 'handlebars';
import { htmlToText } from 'html-to-text';
import juice from 'juice';
import { type From, type Recipient, sendEmail } from '@/libs/sarbacane';

export type SendMailParams = {
  template: string;
  variables: Record<string, unknown>;
  to: string | string[] | Recipient[];
  from: string | From;
  subject: string;
};

export function renderTemplate(
  templateName: string,
  variables: Record<string, unknown>,
): { html: string; text: string } {
  const templatesDir = path.join(__dirname, 'templates');
  const fileName = templateName.endsWith('.hbs') ? templateName : `${templateName}.hbs`;
  const filePath = path.join(templatesDir, fileName);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Can't find template: ${filePath}`);
  }

  const source = fs.readFileSync(filePath, 'utf8');
  const compiled = Handlebars.compile(source);
  const html = compiled(variables);
  const inlined = juice(html);
  const text = htmlToText(inlined, {
    wordwrap: 100,
    selectors: [{ selector: 'a', options: { hideLinkHrefIfSameAsText: true } }],
  });
  return { html: inlined, text };
}

export async function sendMail(params: SendMailParams) {
  const { html, text } = renderTemplate(params.template, params.variables);
  return sendEmail(params.to, params.from, params.subject, html, text);
}
