import type { SSEEventType } from '@sirena/common/constants';
import { useCallback, useEffect, useRef, useState } from 'react';

export type { SSEEventType };

export interface SSEOptions<T> {
  url: string;
  eventType: SSEEventType;
  onMessage: (data: T) => void;
  onError?: (error: Event) => void;
  enabled?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export interface SSEState {
  isConnected: boolean;
  isConnecting: boolean;
  error: Event | null;
  reconnectAttempts: number;
}

const MAX_RECONNECT_DELAY_MS = 30_000;
const RECONNECT_JITTER_MS = 1_000;

export const reconnectDelay = (attempt: number, baseInterval: number, random = Math.random) =>
  Math.min(baseInterval * 2 ** Math.max(0, attempt - 1), MAX_RECONNECT_DELAY_MS) +
  Math.floor(random() * RECONNECT_JITTER_MS);

export function useSSE<T>(options: SSEOptions<T>) {
  const {
    url,
    eventType,
    onMessage,
    onError,
    enabled = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
  } = options;

  const [state, setState] = useState<SSEState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    reconnectAttempts: 0,
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const mountedRef = useRef(true);

  const onMessageRef = useRef(onMessage);
  const onErrorRef = useRef(onError);
  onMessageRef.current = onMessage;
  onErrorRef.current = onError;

  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (!enabled || !mountedRef.current) return;

    cleanup();

    setState((prev) => ({ ...prev, isConnecting: true, error: null }));

    const eventSource = new EventSource(url, { withCredentials: true });
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      if (!mountedRef.current) return;
      reconnectAttemptsRef.current = 0;
      setState({
        isConnected: true,
        isConnecting: false,
        error: null,
        reconnectAttempts: 0,
      });
    };

    eventSource.addEventListener(eventType, (event: MessageEvent) => {
      if (!mountedRef.current) return;
      try {
        const data = JSON.parse(event.data) as T;
        onMessageRef.current(data);
      } catch {
        console.error('Failed to parse SSE message:', event.data);
      }
    });

    eventSource.addEventListener('keep-alive', () => {});

    eventSource.onerror = (error) => {
      if (!mountedRef.current) return;

      eventSource.close();

      const attempts = reconnectAttemptsRef.current + 1;
      reconnectAttemptsRef.current = attempts;
      setState({
        isConnected: false,
        isConnecting: false,
        error,
        reconnectAttempts: attempts,
      });

      if (attempts >= maxReconnectAttempts) {
        onErrorRef.current?.(error);
        return;
      }

      reconnectTimeoutRef.current = setTimeout(
        () => {
          if (mountedRef.current) {
            connect();
          }
        },
        reconnectDelay(attempts, reconnectInterval),
      );
    };
  }, [enabled, url, eventType, reconnectInterval, maxReconnectAttempts, cleanup]);

  const disconnect = useCallback(() => {
    cleanup();
    reconnectAttemptsRef.current = 0;
    setState({
      isConnected: false,
      isConnecting: false,
      error: null,
      reconnectAttempts: 0,
    });
  }, [cleanup]);

  useEffect(() => {
    mountedRef.current = true;

    if (enabled) {
      connect();
    }

    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [enabled, connect, cleanup]);

  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    if (!enabled) return;

    const retryIfGivenUp = () => {
      if (document.visibilityState !== 'visible') return;
      const { isConnected, isConnecting } = stateRef.current;
      if (isConnected || isConnecting || reconnectAttemptsRef.current < maxReconnectAttempts) return;
      reconnectAttemptsRef.current = 0;
      setState((prev) => ({ ...prev, reconnectAttempts: 0 }));
      connect();
    };

    document.addEventListener('visibilitychange', retryIfGivenUp);
    window.addEventListener('online', retryIfGivenUp);
    return () => {
      document.removeEventListener('visibilitychange', retryIfGivenUp);
      window.removeEventListener('online', retryIfGivenUp);
    };
  }, [enabled, connect, maxReconnectAttempts]);

  return {
    ...state,
    disconnect,
    reconnect: connect,
  };
}
