import { envVars } from '../config/env';

// ============================================================================
// TYPES
// ============================================================================

export interface Recipient {
  address: string;
  personalName?: string;
}

export interface From {
  address: string;
  personalName?: string;
}

export interface EmailMessage {
  from: From;
  subject: string;
  text: string;
  html: string;
}

export interface XSKTSubEntry {
  email: string;
  values: Record<string, string>;
}

export interface EmailHeaders {
  'X-SKT-SUB'?: XSKTSubEntry[];
  'X-SKT-TEMPLATE'?: string;
  'X-SKT-TAGS'?: string[];
  'X-SKT-META'?: Record<string, string>;
}

export interface EmailSendRequest {
  to: Recipient[];
  msg: EmailMessage;
  headers?: EmailHeaders;
}

export interface EmailSendResponse {
  status: string;
}

export interface GoogleAnalyticsConfig {
  enable?: boolean;
  utmSource?: string;
  utmContent?: string;
  utmCampaign?: string;
  utmMedia?: string;
}

export interface UnsubscribeConfig {
  enable?: boolean;
  blacklistId?: string;
  content?: string;
}

export interface CustomTrackItem {
  key: string;
  value: string;
}

export interface CustomTrackConfig {
  enable?: boolean;
  customs?: CustomTrackItem[];
}

export interface SendingConfig {
  id?: string;
  trackOpens?: boolean;
  trackMailTo?: boolean;
  trackClicks?: boolean;
  addNewDomains?: boolean;
  googleAnalytics?: GoogleAnalyticsConfig;
  unsubscribe?: UnsubscribeConfig;
  customTrack?: CustomTrackConfig;
}

export interface DomainInfo {
  sending: string;
  tracking: string;
  email: string;
  verifiedDkim?: boolean;
  verifiedSpf?: boolean;
  verifiedTracking?: boolean;
  verifiedMx?: boolean;
  verifiedA?: boolean;
  verifiedDomain?: boolean;
}

export interface AddDomainRequest {
  sending: string;
  tracking: string;
  email: string;
  dkim2048?: boolean;
}

export type BlacklistType = 'bounces' | 'unsubscribes' | 'complaints';

export interface BlacklistFetchResponse {
  email: string;
  blacklist: string;
  listName: string;
  createdDate: string;
  lastModifiedDate: string;
}

export interface BlacklistAddRequest {
  type: BlacklistType;
  email: string;
  list?: string;
}

export interface BlacklistEntry {
  email: string;
  date: number | string;
  reason?: string;
}

export interface BlacklistListRequest {
  type: BlacklistType;
  list?: string;
  pageSize?: number;
  page?: number;
  order?: 0 | 1; // 0=ASC 1=DESC by date
}

export interface BlacklistListResponse {
  items: BlacklistEntry[];
  total: number;
}

export interface BlacklistAddResponse {
  type: BlacklistType;
  email: string;
}

export interface SarbacaneError {
  message: string;
}

// ============================================================================
// CORE HTTP CLIENT
// ============================================================================

async function makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${envVars.SARBACANE_API_URL}${endpoint}`;

  const defaultHeaders = {
    'Content-Type': 'application/json',
    'x-apikey': envVars.SARBACANE_API_KEY,
  };

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData: SarbacaneError = await response.json().catch(() => ({
      message: `HTTP ${response.status}: ${response.statusText}`,
    }));
    throw new Error(errorData.message);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

// ============================================================================
// EMAIL FUNCTIONS
// ============================================================================

export async function sendEmail(
  to: string | string[] | Recipient[],
  from: string | From,
  subject: string,
  html: string,
  text: string,
): Promise<EmailSendResponse> {
  const request = createEmailRequest(to, from, subject, html, text);
  return makeRequest<EmailSendResponse>('/email/send', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

// ============================================================================
// SETTINGS FUNCTIONS
// ============================================================================

export async function getSettings(): Promise<SendingConfig> {
  return makeRequest<SendingConfig>('/email/settings', {
    method: 'GET',
  });
}

export async function updateSettings(settings: Partial<SendingConfig>): Promise<SendingConfig> {
  return makeRequest<SendingConfig>('/email/settings', {
    method: 'POST',
    body: JSON.stringify(settings),
  });
}

// ============================================================================
// DOMAIN FUNCTIONS
// ============================================================================

export async function listDomains(): Promise<DomainInfo[]> {
  return makeRequest<DomainInfo[]>('/email/domains', {
    method: 'GET',
  });
}

export async function addDomain(request: AddDomainRequest): Promise<DomainInfo> {
  return makeRequest<DomainInfo>('/email/domains', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

// ============================================================================
// BLACKLIST FUNCTIONS
// ============================================================================

export async function getBlacklistedEmail(type: BlacklistType, email: string): Promise<BlacklistFetchResponse> {
  return makeRequest<BlacklistFetchResponse>(`/email/blacklists/${type}/${encodeURIComponent(email)}`, {
    method: 'GET',
  });
}

export async function addToBlacklist(type: BlacklistType, email: string, list?: string): Promise<BlacklistAddResponse> {
  const request = createBlacklistRequest(type, email, list);
  return makeRequest<BlacklistAddResponse>('/email/blacklists', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

export async function listBlacklistedEmails(
  type: BlacklistType,
  options: {
    list?: string;
    pageSize?: number;
    page?: number;
    order?: 0 | 1;
  } = {},
): Promise<BlacklistListResponse> {
  const request = createBlacklistListRequest(type, options);
  return makeRequest<BlacklistListResponse>('/email/blacklists/list', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

export async function removeFromUnsubscribes(email: string): Promise<Record<string, never>> {
  return makeRequest<Record<string, never>>(`/email/blacklists/unsubscribes/${encodeURIComponent(email)}`, {
    method: 'DELETE',
  });
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function createEmailRequest(
  to: string | string[] | Recipient[],
  from: string | From,
  subject: string,
  html: string,
  text: string,
): EmailSendRequest {
  const recipients: Recipient[] = Array.isArray(to)
    ? to.map((addr) => (typeof addr === 'string' ? { address: addr } : addr))
    : [{ address: to }];

  const sender: From = typeof from === 'string' ? { address: from } : from;

  return {
    to: recipients,
    msg: {
      from: sender,
      subject,
      html,
      text,
    },
  };
}

function createBlacklistRequest(type: BlacklistType, email: string, list?: string): BlacklistAddRequest {
  return {
    type,
    email,
    list,
  };
}

function createBlacklistListRequest(
  type: BlacklistType,
  options: {
    list?: string;
    pageSize?: number;
    page?: number;
    order?: 0 | 1;
  } = {},
): BlacklistListRequest {
  return {
    type,
    ...options,
  };
}
