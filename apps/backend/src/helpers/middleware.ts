import type { Context } from 'hono';
import { envVars } from '@/config/env';

export const UNKNOWN_VALUE = 'unknown';
export const SOURCE_BACKEND = 'backend';

export const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

export interface User {
  id: string;
  email?: string;
  entiteId?: string;
  roleId?: string;
}

export interface RequestContext {
  requestId: string;
  traceId: string;
  sessionId: string;
  userId?: string;
  ip: string;
  userAgent: string;
  entiteId?: string;
  roleId?: string;
}

export interface RequestHeaders {
  'x-request-id'?: string;
  'x-trace-id'?: string;
  'x-session-id'?: string;
  'x-forwarded-for'?: string;
  'x-real-ip'?: string;
  'user-agent'?: string;
}

/**
 * Anonymizes an IP address for GDPR compliance
 * - IPv4: Replaces first 3 octets with xxx (e.g., 192.168.1.100 -> xxx.xxx.xxx.100)
 * - IPv6: Replaces first 6 groups with xxx (e.g., 2001:db8::1 -> xxx:xxx:xxx:xxx:xxx:xxx::1)
 * - Returns 'unknown' for invalid or missing IP addresses
 */
export const anonymizeIpAddress = (rawIp: string | undefined): string => {
  if (!rawIp || rawIp === UNKNOWN_VALUE) {
    return UNKNOWN_VALUE;
  }

  // IPv4 anonymization: replace first 3 octets with xxx
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const ipv4Match = rawIp.match(ipv4Regex);
  if (ipv4Match) {
    return `xxx.xxx.xxx.${ipv4Match[4]}`;
  }

  // IPv6 anonymization: replace first 6 groups with xxx
  const ipv6Regex =
    /^([0-9a-fA-F]{1,4}):([0-9a-fA-F]{1,4}):([0-9a-fA-F]{1,4}):([0-9a-fA-F]{1,4}):([0-9a-fA-F]{1,4}):([0-9a-fA-F]{1,4}):([0-9a-fA-F]{1,4}):([0-9a-fA-F]{1,4})$/;
  const ipv6Match = rawIp.match(ipv6Regex);
  if (ipv6Match) {
    return `xxx:xxx:xxx:xxx:xxx:xxx:${ipv6Match[7]}:${ipv6Match[8]}`;
  }

  // Handle IPv6 compressed format (::)
  if (rawIp.includes('::')) {
    const parts = rawIp.split('::');
    if (parts.length === 2) {
      const rightPart = parts[1];
      if (rightPart) {
        const rightGroups = rightPart.split(':').filter((g) => g);
        if (rightGroups.length >= 2) {
          const lastTwo = rightGroups.slice(-2).join(':');
          return `xxx:xxx:xxx:xxx:xxx:xxx::${lastTwo}`;
        } else if (rightGroups.length === 1) {
          // Handle case with only one group after ::
          return `xxx:xxx:xxx:xxx:xxx:xxx::${rightGroups[0]}`;
        }
      } else {
        // Handle :: at the end (e.g., 2001:db8::)
        return `xxx:xxx:xxx:xxx:xxx:xxx::`;
      }
    }
  }

  return UNKNOWN_VALUE;
};

// Constants for IP validation
const MAX_IP_LENGTH = 45;
const PRIVATE_IP_PREFIXES = ['10.', '172.', '192.168.', '127.', '::1'] as const;
const DEFAULT_STACK_DEPTH = 5;

// IP validation patterns
const IP_PATTERNS = {
  IPV4: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
  IPV6: /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/,
  IPV6_COMPRESSED: /^([0-9a-fA-F]{0,4}:){1,7}:([0-9a-fA-F]{0,4}:){0,6}[0-9a-fA-F]{0,4}$/,
} as const;

export const getTrustedIpHeaders = (): string[] => {
  return envVars.TRUSTED_IP_HEADERS ?? [];
};

/**
 * Checks if an IP address is private/local
 * @param ip IP address string to check
 * @returns true if IP is private/local
 */
const isPrivateIp = (ip: string): boolean => {
  return PRIVATE_IP_PREFIXES.some((prefix) => ip.startsWith(prefix));
};

const isValidIpFormat = (ip: string): boolean => {
  if (!ip || ip.length > MAX_IP_LENGTH) return false;

  return IP_PATTERNS.IPV4.test(ip) || IP_PATTERNS.IPV6.test(ip) || IP_PATTERNS.IPV6_COMPRESSED.test(ip);
};

/**
 * Extracts client IP from trusted headers in order of preference
 * Only uses headers explicitly configured in TRUSTED_IP_HEADERS environment variable
 * Includes security validation to prevent header injection attacks
 * SECURITY: No headers are trusted by default - explicit configuration required
 * @param c Hono context
 * @returns Anonymized IP address or 'unknown' if not found
 */
export const extractClientIp = (c: Context): string => {
  const trustedHeaders = getTrustedIpHeaders();

  // If no headers are trusted, skip header processing for security
  if (trustedHeaders.length === 0) {
    // Only use connection remote address as last resort
    const remoteAddress = c.env?.remoteAddress;
    if (remoteAddress && isValidIpFormat(remoteAddress)) {
      return anonymizeIpAddress(remoteAddress);
    }
    return UNKNOWN_VALUE;
  }

  // Try each trusted header in order
  for (const headerName of trustedHeaders) {
    const headerValue = c.req.header(headerName);
    if (!headerValue) {
      continue;
    }

    const ips = headerValue.split(',').map((ip) => ip.trim());

    for (const ip of ips) {
      if (ip && !isPrivateIp(ip) && isValidIpFormat(ip)) {
        return anonymizeIpAddress(ip);
      }
    }

    for (const ip of ips) {
      if (ip && isValidIpFormat(ip)) {
        return anonymizeIpAddress(ip);
      }
    }
  }

  // Fallback to connection remote address if available
  const remoteAddress = c.env?.remoteAddress;
  if (remoteAddress && isValidIpFormat(remoteAddress)) {
    return anonymizeIpAddress(remoteAddress);
  }

  return UNKNOWN_VALUE;
};

/**
 * Extracts common request headers with fallbacks
 */
export const extractRequestHeaders = (c: Context): RequestHeaders => {
  return {
    'x-request-id': c.req.header('x-request-id'),
    'x-trace-id': c.req.header('x-trace-id'),
    'x-session-id': c.req.header('x-session-id'),
    'x-forwarded-for': c.req.header('x-forwarded-for'),
    'x-real-ip': c.req.header('x-real-ip'),
    'user-agent': c.req.header('user-agent'),
  };
};

/**
 * Generates a UUID v4 string
 */
export const generateUUID = (): string => {
  return crypto.randomUUID();
};

/**
 * Extracts complete request context from Hono context
 */
export const extractRequestContext = (c: Context): RequestContext => {
  const headers = extractRequestHeaders(c);
  const user = c.get('user') as User | undefined;

  const requestId = headers['x-request-id'] || c.get('requestId') || generateUUID();
  const traceId = headers['x-trace-id'] || generateUUID();
  const sessionId = headers['x-session-id'] || UNKNOWN_VALUE;
  const ip = extractClientIp(c);
  const userAgent = headers['user-agent'] || UNKNOWN_VALUE;

  return {
    requestId,
    traceId,
    sessionId,
    userId: user?.id,
    ip,
    userAgent,
    entiteId: user?.entiteId,
    roleId: user?.roleId,
  };
};

/**
 * Creates Sentry-compatible user context with anonymized IP
 */
export const createSentryUserContext = (user: User, anonymizedIp: string) => {
  return {
    id: user.id,
    email: user.email,
    username: user.email,
    ...(anonymizedIp &&
      anonymizedIp !== UNKNOWN_VALUE && {
        ip_address: anonymizedIp,
      }),
  };
};

/**
 * Creates Sentry-compatible request context
 */
export const createSentryRequestContext = (c: Context, context: RequestContext) => {
  return {
    id: context.requestId,
    traceId: context.traceId,
    sessionId: context.sessionId,
    method: c.req.method,
    url: c.req.url,
    path: c.req.path,
    headers: Object.fromEntries(c.req.raw.headers.entries()),
    ...(context.ip &&
      context.ip !== UNKNOWN_VALUE && {
        ip: context.ip,
      }),
    userAgent: context.userAgent,
    source: SOURCE_BACKEND,
  };
};

/**
 * Creates Sentry-compatible business context
 */
export const createSentryBusinessContext = (context: RequestContext) => {
  const businessContext: Record<string, string> = {
    source: SOURCE_BACKEND,
  };

  if (context.userId) {
    businessContext.userId = context.userId;
  }

  if (context.entiteId) {
    businessContext.entiteId = context.entiteId;
  }

  if (context.roleId) {
    businessContext.roleId = context.roleId;
  }

  // Only return if we have meaningful business data
  return Object.keys(businessContext).length > 1 ? businessContext : undefined;
};

/**
 * Sets common Sentry tags for correlation
 */
export const setSentryCorrelationTags = (
  scope: { setTag: (key: string, value: string) => void },
  context: RequestContext,
): void => {
  scope.setTag('requestId', context.requestId);
  scope.setTag('traceId', context.traceId);
  scope.setTag('sessionId', context.sessionId);
  scope.setTag('source', SOURCE_BACKEND);

  if (context.userId) {
    scope.setTag('userId', context.userId);
  }

  if (context.entiteId) {
    scope.setTag('entiteId', context.entiteId);
  }

  if (context.roleId) {
    scope.setTag('roleId', context.roleId);
  }
};

/**
 * Utility to get caller information from stack trace
 */
export const getCaller = (stackDepth: number = DEFAULT_STACK_DEPTH): string => {
  const stack = new Error().stack;
  if (!stack) return UNKNOWN_VALUE;

  const lines = stack.split('\n');
  const callerLine = lines[stackDepth];
  if (!callerLine) return UNKNOWN_VALUE;

  const match = callerLine.match(/at .+ \((.+):(\d+):(\d+)\)/);
  if (match) {
    const [, filePath, line] = match;
    const fileName = filePath.split('/').pop();
    return `${fileName}:${line}`;
  }

  return UNKNOWN_VALUE;
};

export interface LogLevelConfig {
  console: LogLevel;
  sentry: LogLevel;
}

export const getLogLevelConfig = (): LogLevelConfig => {
  return {
    console: envVars.LOG_LEVEL,
    sentry: envVars.LOG_LEVEL_SENTRY,
  };
};

export const getLogExtraContext = (): Record<string, string> => {
  return envVars.LOG_EXTRA_CONTEXT || {};
};

export const shouldLog = (level: LogLevel, minLevel: LogLevel): boolean => {
  const levelIndex = LOG_LEVELS.indexOf(level);
  const minLevelIndex = LOG_LEVELS.indexOf(minLevel);

  // Lower index means higher severity, so we log if level index <= min level index
  return levelIndex <= minLevelIndex;
};

export const shouldSendToSentry = (level: LogLevel, config?: LogLevelConfig): boolean => {
  const logConfig = config || getLogLevelConfig();
  return shouldLog(level, logConfig.sentry);
};
