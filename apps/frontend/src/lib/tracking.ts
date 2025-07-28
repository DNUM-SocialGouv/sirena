export const generateUUID = (): string => {
  if (self?.crypto?.randomUUID) {
    return self.crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const getSessionId = (): string => {
  const sessionId = sessionStorage.getItem('sessionId');
  if (sessionId) return sessionId;

  const newSessionId = generateUUID();
  sessionStorage.setItem('sessionId', newSessionId);
  return newSessionId;
};

export interface TrackingContext {
  requestId: string;
  traceId: string;
  sessionId: string;
}

export const createTrackingContext = (): TrackingContext => ({
  requestId: generateUUID(),
  traceId: generateUUID(),
  sessionId: getSessionId(),
});

export const getTrackingHeaders = (): Record<string, string> => {
  const context = createTrackingContext();
  return {
    'x-request-id': context.requestId,
    'x-trace-id': context.traceId,
    'x-session-id': context.sessionId,
  };
};
