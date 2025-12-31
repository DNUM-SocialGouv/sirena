export const SSE_EVENT_TYPES = {
  USER_STATUS: 'user:status',
  USER_LIST: 'user:list',
  FILE_STATUS: 'file:status',
  REQUETE_UPDATED: 'requete:updated',
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
} as const;

export type RequeteUpdateField = (typeof REQUETE_UPDATE_FIELDS)[keyof typeof REQUETE_UPDATE_FIELDS];

export interface FileStatusEvent {
  fileId: string;
  entiteId: string | null;
  status: string;
  scanStatus: string;
  sanitizeStatus: string;
  processingError: string | null;
  safeFilePath: string | null;
}

export interface UserStatusEvent {
  userId: string;
  statutId: string;
  roleId: string;
}

export interface UserListEvent {
  action: 'created' | 'updated' | 'deleted';
  userId: string;
}

export interface RequeteUpdatedEvent {
  requeteId: string;
  entiteId: string;
  field: RequeteUpdateField;
}
