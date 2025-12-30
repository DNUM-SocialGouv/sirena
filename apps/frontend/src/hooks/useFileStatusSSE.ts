import { type FileStatusEvent, SSE_EVENT_TYPES } from '@sirena/common/constants';
import { useCallback } from 'react';
import type { FileProcessingStatus } from '@/lib/api/fetchUploadedFiles';
import { useSSE } from './useSSE';

interface UseFileStatusSSEOptions {
  fileId: string;
  enabled?: boolean;
  onStatusChange?: (status: FileProcessingStatus) => void;
}

export function useFileStatusSSE(options: UseFileStatusSSEOptions) {
  const { fileId, enabled = true, onStatusChange } = options;

  const handleMessage = useCallback(
    (data: FileStatusEvent) => {
      const status: FileProcessingStatus = {
        id: data.fileId,
        status: data.status,
        scanStatus: data.scanStatus,
        sanitizeStatus: data.sanitizeStatus,
        processingError: data.processingError,
        safeFilePath: data.safeFilePath,
      };
      onStatusChange?.(status);
    },
    [onStatusChange],
  );

  return useSSE<FileStatusEvent>({
    url: `/api/sse/files/${fileId}`,
    eventType: SSE_EVENT_TYPES.FILE_STATUS,
    onMessage: handleMessage,
    enabled: enabled && !!fileId,
  });
}
