import type { Context, Next } from 'hono';
import type { MockedFunction } from 'vitest';
import type { LogLevel, LogLevelConfig, RequestContext } from '@/helpers/middleware';
import type { User } from '@/libs/prisma';

export interface SentryScope {
  setContext(name: string, context: Record<string, unknown>): void;
  setTag(key: string, value: string): void;
  setUser(user: Record<string, unknown>): void;
  setFingerprint(fingerprint: string[]): void;
  setLevel(level: 'warning' | 'error' | 'info' | 'debug'): void;
}

export interface SentrySpan {
  setAttributes(attributes: Record<string, string | number | boolean>): void;
}

export interface MockedSentryScope extends SentryScope {
  setContext: MockedFunction<SentryScope['setContext']>;
  setTag: MockedFunction<SentryScope['setTag']>;
  setUser: MockedFunction<SentryScope['setUser']>;
  setFingerprint: MockedFunction<SentryScope['setFingerprint']>;
  setLevel: MockedFunction<SentryScope['setLevel']>;
}

export interface MockedSentrySpan extends SentrySpan {
  setAttributes: MockedFunction<SentrySpan['setAttributes']>;
}

export interface PinoLogger {
  info(data: Record<string, unknown>, message: string): void;
  warn(data: Record<string, unknown>, message: string): void;
  error(data: Record<string, unknown>, message: string): void;
  debug(data: Record<string, unknown>, message: string): void;
  trace(data: Record<string, unknown>, message: string): void;
  fatal(data: Record<string, unknown>, message: string): void;
  child(bindings: Record<string, unknown>): PinoLogger;
  level: string;
}

export interface MockedPinoLogger extends PinoLogger {
  info: MockedFunction<PinoLogger['info']>;
  warn: MockedFunction<PinoLogger['warn']>;
  error: MockedFunction<PinoLogger['error']>;
  debug: MockedFunction<PinoLogger['debug']>;
  trace: MockedFunction<PinoLogger['trace']>;
  fatal: MockedFunction<PinoLogger['fatal']>;
  child: MockedFunction<PinoLogger['child']>;
}

export interface EnhancedLogger extends PinoLogger {
  info(data: string | Record<string, unknown>, message?: string): void;
  warn(data: string | Record<string, unknown>, message?: string): void;
  error(data: string | Record<string, unknown>, message?: string): void;
  debug(data: string | Record<string, unknown>, message?: string): void;
  trace(data: string | Record<string, unknown>, message?: string): void;
  fatal(data: string | Record<string, unknown>, message?: string): void;
}

export interface RequestHeaders {
  'x-request-id'?: string;
  'x-trace-id'?: string;
  'x-session-id'?: string;
  'x-forwarded-for'?: string;
  'x-real-ip'?: string;
  'user-agent'?: string;
  authorization?: string;
  'content-type'?: string;
}

export interface MockRequest {
  header(name: string): string | undefined;
  method: string;
  url: string;
  path: string;
  raw: Request;
}

export interface MockedContext {
  get: MockedFunction<(key: string) => unknown>;
  set: MockedFunction<(key: string, value: unknown) => void>;
  header: MockedFunction<(name: string, value?: string) => string | undefined>;
  req: MockRequest;
}

export interface MiddlewareHelpers {
  extractRequestContext: (c: Context) => RequestContext;
  getLogLevelConfig: () => LogLevelConfig;
  shouldSendToSentry: (level: LogLevel, config?: LogLevelConfig) => boolean;
  getCaller: () => string;
  setSentryCorrelationTags: (scope: SentryScope, context: RequestContext) => void;
  getLogExtraContext: () => Record<string, string>;
  createSentryRequestContext: (c: Context, context: RequestContext) => SentryRequestContext;
  createSentryBusinessContext: (context: RequestContext, userEmail?: string) => SentryBusinessContext;
  extractClientIp: (c: Context) => string;
  UNKNOWN_VALUE: string;
  SOURCE_BACKEND: string;
}

export interface MockedMiddlewareHelpers extends MiddlewareHelpers {
  extractRequestContext: MockedFunction<MiddlewareHelpers['extractRequestContext']>;
  getLogLevelConfig: MockedFunction<MiddlewareHelpers['getLogLevelConfig']>;
  shouldSendToSentry: MockedFunction<MiddlewareHelpers['shouldSendToSentry']>;
  getCaller: MockedFunction<MiddlewareHelpers['getCaller']>;
  setSentryCorrelationTags: MockedFunction<MiddlewareHelpers['setSentryCorrelationTags']>;
  getLogExtraContext: MockedFunction<MiddlewareHelpers['getLogExtraContext']>;
  createSentryRequestContext: MockedFunction<MiddlewareHelpers['createSentryRequestContext']>;
  createSentryBusinessContext: MockedFunction<MiddlewareHelpers['createSentryBusinessContext']>;
  extractClientIp: MockedFunction<MiddlewareHelpers['extractClientIp']>;
}

export interface SentryRequestContext {
  id: string;
  traceId: string;
  sessionId: string;
  method: string;
  url: string;
  path: string;
  headers: Record<string, string>;
  ip: string;
  userAgent: string;
  source: string;
}

export interface SentryBusinessContext {
  source: string;
  userId?: string;
  entiteId?: string;
  roleId?: string;
  userEmail?: string;
}

export interface SentryUserContext {
  id: string;
  email?: string;
  username?: string;
  ip_address: string;
}

export interface TestUser extends User {
  email: string;
}

export interface TestRequestContext extends RequestContext {
  requestId: string;
  traceId: string;
  sessionId: string;
  ip: string;
  userAgent: string;
}

export interface LogTestCase {
  level: LogLevel;
  message: string;
  data?: Record<string, unknown>;
  shouldSendToSentry: boolean;
  sentryLevel?: 'warning' | 'error';
  expectSentryException?: boolean;
}

export interface LogExpectations {
  pinoLoggerCalled: boolean;
  sentryMessage?: string;
  sentryLevel?: 'warning' | 'error';
  sentryException?: Error;
}

export type MiddlewareFunction = (c: Context, next: Next) => Promise<undefined | Response>;

export interface MockedMiddlewareFunction {
  (c: Context, next: Next): Promise<undefined | Response>;
  mockImplementation?: (impl: MiddlewareFunction) => void;
  mockReturnValue?: (value: Promise<undefined | Response>) => void;
}

export interface EnvironmentVariables {
  LOG_LEVEL: LogLevel;
  LOG_LEVEL_SENTRY: LogLevel;
  LOG_FORMAT: 'json' | 'pretty';
  NODE_ENV?: 'development' | 'production' | 'test';
}

export interface TestError extends Error {
  code?: string;
  statusCode?: number;
  details?: Record<string, unknown>;
}

export interface LogAssertionOptions {
  expectRequestContext?: boolean;
  expectExtraData?: Record<string, unknown>;
  expectCaller?: boolean;
}

export interface SentryAssertionOptions {
  expectUserContext?: boolean;
  expectBusinessContext?: boolean;
  expectCorrelationTags?: boolean;
  expectedFingerprint?: string[];
}

export type MockFactory<T> = (overrides?: Partial<T>) => T;
export type MockedFactory<T> = (overrides?: Partial<T>) => MockedFunction<() => T>;

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type MockConfigOptions = {
  withSentry?: boolean;
  withPino?: boolean;
  withMiddlewareHelpers?: boolean;
  customRequestContext?: Partial<RequestContext>;
  customUser?: Partial<TestUser>;
};
