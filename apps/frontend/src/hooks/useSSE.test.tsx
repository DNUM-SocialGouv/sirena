import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { reconnectDelay, useSSE } from './useSSE';

type Listener = (event: MessageEvent) => void;

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  onopen: (() => void) | null = null;
  onerror: ((error: Event) => void) | null = null;
  listeners = new Map<string, Listener>();
  closed = false;

  constructor(public url: string) {
    FakeEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: Listener) {
    this.listeners.set(type, listener);
  }

  close() {
    this.closed = true;
  }

  emit(type: string, data: unknown) {
    this.listeners.get(type)?.({ data: JSON.stringify(data) } as MessageEvent);
  }
}

describe('useSSE', () => {
  beforeEach(() => {
    FakeEventSource.instances = [];
    vi.stubGlobal('EventSource', FakeEventSource);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('opens a single connection even when the caller passes a new callback on every render', () => {
    const { rerender } = renderHook(() =>
      useSSE<{ id: string }>({ url: '/api/sse/x', eventType: 'requete:updated', onMessage: () => {} }),
    );

    rerender();
    rerender();
    rerender();

    expect(FakeEventSource.instances).toHaveLength(1);
    expect(FakeEventSource.instances[0]?.closed).toBe(false);
  });

  it('always delivers events to the latest callback', () => {
    const received: string[] = [];
    const { rerender } = renderHook(
      ({ tag }) =>
        useSSE<{ id: string }>({
          url: '/api/sse/x',
          eventType: 'requete:updated',
          onMessage: (event) => received.push(`${tag}:${event.id}`),
        }),
      { initialProps: { tag: 'first' } },
    );

    rerender({ tag: 'second' });
    act(() => FakeEventSource.instances[0]?.emit('requete:updated', { id: 'E' }));

    expect(received).toEqual(['second:E']);
  });

  it('backs off exponentially with jitter, capped at 30 s', () => {
    const noJitter = () => 0;
    expect([1, 2, 3, 4, 5, 6].map((attempt) => reconnectDelay(attempt, 3000, noJitter))).toEqual([
      3000, 6000, 12000, 24000, 30000, 30000,
    ]);
    expect(reconnectDelay(1, 3000, () => 0.5)).toBe(3500);
  });

  it('tries again when the tab comes back to the foreground after giving up', () => {
    vi.useFakeTimers();
    renderHook(() => useSSE<{ id: string }>({ url: '/api/sse/x', eventType: 'requete:updated', onMessage: () => {} }));

    for (let attempt = 0; attempt < 5; attempt += 1) {
      act(() => FakeEventSource.instances.at(-1)?.onerror?.(new Event('error')));
      act(() => vi.advanceTimersByTime(60_000));
    }
    const givenUpAt = FakeEventSource.instances.length;
    act(() => vi.advanceTimersByTime(60_000));
    expect(FakeEventSource.instances).toHaveLength(givenUpAt);

    act(() => document.dispatchEvent(new Event('visibilitychange')));

    expect(FakeEventSource.instances).toHaveLength(givenUpAt + 1);
    vi.useRealTimers();
  });

  it('tries again when the network comes back after giving up', () => {
    vi.useFakeTimers();
    renderHook(() => useSSE<{ id: string }>({ url: '/api/sse/x', eventType: 'requete:updated', onMessage: () => {} }));

    for (let attempt = 0; attempt < 5; attempt += 1) {
      act(() => FakeEventSource.instances.at(-1)?.onerror?.(new Event('error')));
      act(() => vi.advanceTimersByTime(60_000));
    }
    const givenUpAt = FakeEventSource.instances.length;

    act(() => window.dispatchEvent(new Event('online')));

    expect(FakeEventSource.instances).toHaveLength(givenUpAt + 1);
    vi.useRealTimers();
  });

  it('does not open a second connection while the stream is live or a reconnection is pending', () => {
    vi.useFakeTimers();
    renderHook(() => useSSE<{ id: string }>({ url: '/api/sse/x', eventType: 'requete:updated', onMessage: () => {} }));

    act(() => FakeEventSource.instances.at(-1)?.onopen?.());
    act(() => window.dispatchEvent(new Event('online')));
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(FakeEventSource.instances).toHaveLength(1);

    act(() => FakeEventSource.instances.at(-1)?.onerror?.(new Event('error')));
    act(() => window.dispatchEvent(new Event('online')));
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(FakeEventSource.instances).toHaveLength(1);

    act(() => vi.advanceTimersByTime(60_000));
    expect(FakeEventSource.instances).toHaveLength(2);
    vi.useRealTimers();
  });

  it('reconnects with a fresh attempt budget after every successful open', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() =>
      useSSE<{ id: string }>({ url: '/api/sse/x', eventType: 'requete:updated', onMessage: () => {} }),
    );

    for (let cycle = 0; cycle < 10; cycle += 1) {
      const current = FakeEventSource.instances.at(-1);
      act(() => current?.onopen?.());
      act(() => current?.onerror?.(new Event('error')));
      act(() => vi.advanceTimersByTime(4000));
    }

    expect(result.current.reconnectAttempts).toBeLessThanOrEqual(1);
    expect(FakeEventSource.instances).toHaveLength(11);
    vi.useRealTimers();
  });
});
