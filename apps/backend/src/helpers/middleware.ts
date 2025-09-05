import type { Context } from 'hono';
import { envVars } from '@/config/env';

export const UNKNOWN_VALUE = 'unknown';
export const SOURCE_BACKEND = 'backend';

export const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

export interface RequestContext {
  requestId: string;
  traceId: string;
  sessionId: string;
  userId?: string;
  ip: string;
  userAgent: string;
  entiteIds?: string[] | null;
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

export const getRawIpAddress = (rawIp: string | undefined): string => {
  if (!rawIp || rawIp === UNKNOWN_VALUE) {
    return UNKNOWN_VALUE;
  }

  return rawIp;
};

const MAX_IP_LENGTH = 45;
const PRIVATE_IP_PREFIXES = ['10.', '172.', '192.168.', '127.', '::1'] as const;
const DEFAULT_STACK_DEPTH = 5;

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
 * @returns Raw IP address or 'unknown' if not found
 */
export const extractClientIp = (c: Context): string => {
  const trustedHeaders = getTrustedIpHeaders();

  if (trustedHeaders.length === 0) {
    const remoteAddress = c.env?.remoteAddress;
    if (remoteAddress && isValidIpFormat(remoteAddress)) {
      return getRawIpAddress(remoteAddress);
    }
    return UNKNOWN_VALUE;
  }

  for (const headerName of trustedHeaders) {
    const headerValue = c.req.header(headerName);
    if (!headerValue) {
      continue;
    }

    const ips = headerValue.split(',').map((ip) => ip.trim());

    for (const ip of ips) {
      if (ip && !isPrivateIp(ip) && isValidIpFormat(ip)) {
        return getRawIpAddress(ip);
      }
    }

    for (const ip of ips) {
      if (ip && isValidIpFormat(ip)) {
        return getRawIpAddress(ip);
      }
    }
  }

  const remoteAddress = c.env?.remoteAddress;
  if (remoteAddress && isValidIpFormat(remoteAddress)) {
    return getRawIpAddress(remoteAddress);
  }

  return UNKNOWN_VALUE;
};

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

export const extractRequestContext = (c: Context): RequestContext => {
  const headers = extractRequestHeaders(c);
  const userId = c.get('userId') as string | undefined;
  const roleId = c.get('roleId') as string | undefined;
  const entiteIds = c.get('entiteIds') as string[] | null | undefined;

  const requestId = headers['x-request-id'] || c.get('requestId') || crypto.randomUUID();
  const traceId = headers['x-trace-id'] || crypto.randomUUID();
  const sessionId = headers['x-session-id'] || UNKNOWN_VALUE;
  const ip = extractClientIp(c);
  const userAgent = headers['user-agent'] || UNKNOWN_VALUE;

  return {
    requestId,
    traceId,
    sessionId,
    userId,
    ip,
    userAgent,
    entiteIds,
    roleId,
  };
};

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
}

export const getLogLevelConfig = (): LogLevelConfig => {
  return {
    console: envVars.LOG_LEVEL,
  };
};

export const getLogExtraContext = (): Record<string, string> => {
  return envVars.LOG_EXTRA_CONTEXT || {};
};

export const shouldLog = (level: LogLevel, minLevel: LogLevel): boolean => {
  const levelIndex = LOG_LEVELS.indexOf(level);
  const minLevelIndex = LOG_LEVELS.indexOf(minLevel);

  return levelIndex <= minLevelIndex;
};

export interface EnrichedUserContext {
  userId: string;
  email?: string;
  roleId?: string;
  entiteIds?: string[] | null;
}

export interface EnrichedRequestContext extends RequestContext {
  caller?: string;
  extraContext?: Record<string, string>;
}

export const enrichUserContext = (context: RequestContext): EnrichedUserContext | null => {
  if (!context.userId) {
    return null;
  }

  return {
    userId: context.userId,
    roleId: context.roleId,
    entiteIds: context.entiteIds,
  };
};

export const enrichRequestContext = (context: RequestContext): EnrichedRequestContext => {
  const caller = getCaller();
  const extraContext = getLogExtraContext();

  return {
    ...context,
    caller,
    ...(Object.keys(extraContext).length > 0 && { extraContext }),
  };
};

export const createPinoContextData = (
  requestContext: EnrichedRequestContext,
  userContext: EnrichedUserContext | null,
): Record<string, unknown> => {
  return {
    requestId: requestContext.requestId,
    traceId: requestContext.traceId,
    sessionId: requestContext.sessionId,
    ip: requestContext.ip,
    userAgent: requestContext.userAgent,
    ...(userContext && {
      userId: userContext.userId,
      roleId: userContext.roleId,
      entiteIds: userContext.entiteIds,
    }),
    ...(requestContext.caller && { caller: requestContext.caller }),
    ...(requestContext.extraContext && { extraContext: requestContext.extraContext }),
  };
};
