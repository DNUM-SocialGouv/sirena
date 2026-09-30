export const SSE_EVENT_TYPES = {
  USER_STATUS: 'user:status',
  USER_LIST: 'user:list',
  FILE_STATUS: 'file:status',
  REQUETE_UPDATED: 'requete:updated',
  REQUETE_MESSAGE: 'requete:message',
} as const;

export type SSEEventType = (typeof SSE_EVENT_TYPES)[keyof typeof SSE_EVENT_TYPES];

export const REQUETE_UPDATE_FIELDS = {
  CREATED: 'created',
  STATUS: 'status',
  PRIORITY: 'priority',
  DECLARANT: 'declarant',
  PARTICIPANT: 'participant',
  SITUATION: 'situation',
  FILES: 'files',
  DATE_TYPE: 'dateType',
  CLOSED: 'closed',
  REOPENED: 'reopened',
} as const;

export type RequeteUpdateField = (typeof REQUETE_UPDATE_FIELDS)[keyof typeof REQUETE_UPDATE_FIELDS];

export interface FileStatusEvent {
  fileId: string;
  entiteId: string | null;
  status: string;
  scanStatus: string;
  sanitizeStatus: string;
}

export interface UserStatusEvent {
  userId: string;
  statutId: string;
  roleId: string;
}

export interface UserListEvent {
  action: 'created' | 'updated' | 'deleted';
  userId: string;
  entiteId: string | null;
}

export interface RequeteUpdatedEvent {
  requeteId: string;
  entiteId: string;
  field: RequeteUpdateField;
}

interface RequeteMessageEventBase {
  requeteId: string;
  entiteId: string;
  entiteIds: string[];
}

export interface RequeteMessageCreatedEvent extends RequeteMessageEventBase {
  action: 'created';
  messageId: string;
}

export interface RequeteMessageReadEvent extends RequeteMessageEventBase {
  action: 'read';
  messageIds: string[];
  userId: string;
}

export type RequeteMessageEvent = RequeteMessageCreatedEvent | RequeteMessageReadEvent;
