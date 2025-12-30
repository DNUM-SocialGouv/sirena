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
  const mountedRef = useRef(true);

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
        onMessage(data);
      } catch {
        console.error('Failed to parse SSE message:', event.data);
      }
    });

    eventSource.addEventListener('keep-alive', () => {});

    eventSource.onerror = (error) => {
      if (!mountedRef.current) return;

      eventSource.close();

      setState((prev) => {
        const newAttempts = prev.reconnectAttempts + 1;
        if (newAttempts >= maxReconnectAttempts) {
          onError?.(error);
          return {
            isConnected: false,
            isConnecting: false,
            error,
            reconnectAttempts: newAttempts,
          };
        }

        reconnectTimeoutRef.current = setTimeout(() => {
          if (mountedRef.current) {
            connect();
          }
        }, reconnectInterval);

        return {
          isConnected: false,
          isConnecting: false,
          error,
          reconnectAttempts: newAttempts,
        };
      });
    };
  }, [enabled, url, eventType, onMessage, onError, reconnectInterval, maxReconnectAttempts, cleanup]);

  const disconnect = useCallback(() => {
    cleanup();
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

  return {
    ...state,
    disconnect,
    reconnect: connect,
  };
}
