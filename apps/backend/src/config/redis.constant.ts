export const banKey = (clientIP: string) => `ban:${clientIP}`;
export const attemptsKey = (clientIP: string) => `attempts:${clientIP}`;
export const banCountKey = (clientIP: string) => `bancount:${clientIP}`;
// Held while a user's document export request is checked and created, so two clicks cannot both pass the check.
export const documentExportCreationLockKey = (userId: string) => `document-export:create:${userId}`;
