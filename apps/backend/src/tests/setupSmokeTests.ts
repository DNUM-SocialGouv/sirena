import { vi } from 'vitest';

vi.mock('@sentry/node', () => ({
  getCurrentScope: vi.fn(() => ({
    setContext: vi.fn(),
    setTag: vi.fn(),
    setUser: vi.fn(),
    setFingerprint: vi.fn(),
    setLevel: vi.fn(),
  })),
  startSpan: vi.fn((_config: unknown, callback: (span: { setAttributes: ReturnType<typeof vi.fn> }) => unknown) =>
    callback({ setAttributes: vi.fn() }),
  ),
  withScope: vi.fn(
    (
      callback: (scope: {
        setContext: ReturnType<typeof vi.fn>;
        setTag: ReturnType<typeof vi.fn>;
        setUser: ReturnType<typeof vi.fn>;
        setLevel: ReturnType<typeof vi.fn>;
      }) => unknown,
    ) =>
      callback({
        setContext: vi.fn(),
        setTag: vi.fn(),
        setUser: vi.fn(),
        setLevel: vi.fn(),
      }),
  ),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

vi.mock('../libs/instrument.js', () => ({}));
