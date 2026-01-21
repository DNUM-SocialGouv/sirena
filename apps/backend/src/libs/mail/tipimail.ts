import { envVars } from '../config/env.js';

export interface Recipient {
  address: string;
  personalName?: string;
}

export interface From {
  address: string;
  personalName?: string;
}

export interface ReplyTo {
  address: string;
  personalName?: string;
}

export interface TipimailAttachment {
  content: string;
  filename: string;
  contentType: string;
}

export interface TipimailImageInput {
  filename: string;
  content: string;
  mimeType: string;
  contentId?: string;
}

export type TipimailMeta = Record<string, string | number | boolean | null>;

export interface TipimailSubstitution {
  email: string;
  values: Record<string, unknown>;
}

export interface TipimailHeaders {
  'X-TM-META'?: TipimailMeta;
  'X-TM-SUB'?: TipimailSubstitution[];
  'X-TM-TAGS'?: string[];
  'X-TM-TEMPLATE'?: string;
}

export interface TipimailEmailMessage {
  from?: From;
  subject: string;
  replyTo?: ReplyTo;
  html?: string;
  text: string;
  attachments?: TipimailAttachment[];

  images?: Array<{
    content: string;
    filename: string;
    type?: string;
    contentId?: string;
  }>;
}

export interface TipimailSendRequest {
  to: Recipient[];
  msg: TipimailEmailMessage;
  headers?: TipimailHeaders;
  apiKey?: string;
}

export interface TipimailSendResponse {
  status: 'success' | 'failure' | string;
}

export interface TipimailError {
  message?: string;
  error?: string;
}

export interface SendTipimailOptions {
  to: string | string[] | Recipient[];

  from?: string | From;
  replyTo?: string | ReplyTo;

  subject: string;
  html?: string;
  text: string;

  template?: string;

  meta?: TipimailMeta;
  tags?: string[];
  substitutions?: TipimailSubstitution[];

  images?: TipimailImageInput[];
  attachments?: TipimailAttachment[];

  apiKey?: string;
}

async function makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${envVars.TIPIMAIL_API_URL}${endpoint}`;

  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Tipimail-ApiUser': envVars.TIPIMAIL_USER_ID,
    'X-Tipimail-ApiKey': envVars.TIPIMAIL_API_KEY,
  };

  const headers = {
    ...defaultHeaders,
    ...(options.headers as Record<string, string> | undefined),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  let responseData: unknown;
  try {
    responseData = (await response.json()) as unknown;
  } catch {
    const text = await response.text();
    throw new Error(
      `Tipimail API error ${response.status}: Failed to parse JSON response. Response body: ${text.substring(0, 500)}`,
    );
  }

  if (response.status !== 200) {
    const errorDetails =
      responseData && typeof responseData === 'object' ? JSON.stringify(responseData, null, 2) : String(responseData);
    const msg =
      responseData && typeof responseData === 'object' && 'status' in responseData
        ? `Tipimail API error ${(responseData as { status: string }).status}: ${errorDetails}`
        : `Tipimail API error ${response.status}: ${errorDetails}`;
    throw new Error(msg);
  }
  return responseData as T;
}

// Send an email using Tipimail API
export async function sendTipimailEmail(options: SendTipimailOptions): Promise<TipimailSendResponse> {
  const request = createTipimailRequest(options);

  return makeRequest<TipimailSendResponse>('/messages/send', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

export interface TipimailTemplate {
  id: string;
  templateName: string;
  description: string;
  from: {
    address: string;
    personalName: string;
  };
  subject: string;
  htmlContent: string;
  textContent: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * Gets a template from Tipimail API
 * @param templateId - The ID or name of the template to retrieve
 * @returns Template content with HTML and text versions
 */
export async function getTipimailTemplate(templateId: string): Promise<TipimailTemplate> {
  return makeRequest<TipimailTemplate>(`/settings/templates/${templateId}`, {
    method: 'GET',
  });
}

/**
 * Applies substitutions to a template string
 * Replaces {{variable}} or {variable} with the corresponding value from substitutions
 */
export function applySubstitutions(template: string, substitutions: Record<string, unknown>): string {
  let result = template;
  for (const [key, value] of Object.entries(substitutions)) {
    const patterns = [
      new RegExp(`\\{\\{${key}\\}\\}`, 'gi'),
      new RegExp(`\\{${key}\\}`, 'gi'),
      new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi'),
      new RegExp(`\\{\\s*${key}\\s*\\}`, 'gi'),
    ];
    for (const pattern of patterns) {
      result = result.replace(pattern, String(value || ''));
    }
  }
  return result;
}

function normalizeRecipients(to: string | string[] | Recipient[]): Recipient[] {
  if (Array.isArray(to)) {
    return to.map((item) => (typeof item === 'string' ? { address: item } : item));
  }
  return typeof to === 'string' ? [{ address: to }] : [to];
}

function normalizeFrom(from?: string | From): From {
  if (!from) {
    return {
      address: envVars.TIPIMAIL_FROM_ADDRESS,
      personalName: envVars.TIPIMAIL_FROM_PERSONAL_NAME,
    };
  }
  return typeof from === 'string' ? { address: from } : from;
}

function normalizeReplyTo(replyTo?: string | ReplyTo): ReplyTo | undefined {
  if (!replyTo) return undefined;
  return typeof replyTo === 'string' ? { address: replyTo } : replyTo;
}

function assertSubstitutionsMatchRecipients(recipients: Recipient[], subs?: TipimailSubstitution[]) {
  if (!subs?.length) return;

  const recipientEmails = new Set(recipients.map((r) => r.address.toLowerCase()));
  const invalid = subs.filter((s) => !recipientEmails.has(s.email.toLowerCase()));

  if (invalid.length) {
    const bad = invalid.map((i) => i.email).join(', ');
    throw new Error(
      `Tipimail X-TM-SUB contains emails not present in 'to': ${bad}. Each substitution email must match a recipient address.`,
    );
  }
}

/* Create a Tipimail request object . Attachments and images contents are base64 encoded strings.
 Use X-TM-SUB to set substitutions for templating 
 
 Exemple of a request with a template and a substitution:

 await sendTipimailEmail({
      to: [{ address: 'to@example.com', personalName: 'John Doe' }],
      subject: 'test', // Subject will be ignored if using a template but always required
      text: 'test', // Text will be ignored if using a template but always required
      template: 'template_name', // Template name to use
      substitutions: [
        {
          email: 'to@example.com',
          values: { name: 'John', code: 'ABC123' }, // Values to use in the template
        },
      ],
      attachments: [
        {
          filename: 'test.pdf',
          contentType: 'application/pdf',
          content: PDF_BASE64,
        },
      ],
    });
 */

function createTipimailRequest(options: SendTipimailOptions): TipimailSendRequest {
  const recipients = normalizeRecipients(options.to);
  const from = normalizeFrom(options.from);
  const replyTo = normalizeReplyTo(options.replyTo);

  assertSubstitutionsMatchRecipients(recipients, options.substitutions);

  const usingTemplate = !!options.template;

  const msg: TipimailEmailMessage = {
    from,
    ...(usingTemplate ? {} : replyTo ? { replyTo } : {}),
    subject: options.subject, // it will be ignored if using a template
    text: options.text, // it will be ignored if using a template
    ...(options.html ? { html: options.html } : {}),
    ...(options.attachments?.length
      ? {
          attachments: options.attachments.map((a) => ({
            filename: a.filename,
            content: a.content,
            contentType: a.contentType,
          })),
        }
      : {}),
    ...(options.images?.length
      ? {
          images: options.images.map((img) => ({
            content: img.content,
            filename: img.filename,
            type: img.mimeType,
            ...(img.contentId ? { contentId: img.contentId } : {}),
          })),
        }
      : {}),
  };

  const request: TipimailSendRequest = {
    to: recipients,
    msg,
    headers: {
      ...(options.template ? { 'X-TM-TEMPLATE': options.template } : {}),
      ...(options.meta ? { 'X-TM-META': options.meta } : {}),
      ...(options.substitutions?.length ? { 'X-TM-SUB': options.substitutions } : {}),
      ...(options.tags?.length ? { 'X-TM-TAGS': options.tags } : {}),
    },
  };

  if (request.headers && Object.keys(request.headers).length === 0) delete request.headers;

  return request;
}
