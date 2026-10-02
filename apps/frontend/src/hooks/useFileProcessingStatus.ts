import { useCallback, useEffect, useRef, useState } from 'react';
import { getFileProcessingState } from '@/components/common/fileDownloadState';
import { type FileProcessingStatus, getFileProcessingStatus } from '@/lib/api/fetchUploadedFiles';
import { HttpError } from '@/lib/api/tanstackQuery';
import { useFileStatusSSE } from './useFileStatusSSE';

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_DURATION_MS = 2 * 60 * 1000;

type UseFileProcessingStatusOptions = {
  fileId?: string;
  initialStatus: FileProcessingStatus | null;
};

export const useFileProcessingStatus = ({
  fileId,
  initialStatus,
}: UseFileProcessingStatusOptions): FileProcessingStatus | null => {
  const [fileStatus, setFileStatus] = useState<FileProcessingStatus | null>(initialStatus);
  const initialPollDoneRef = useRef(false);
  const pollingStoppedRef = useRef(false);
  const pollStartedAtRef = useRef<number | null>(null);
  const isComplete = getFileProcessingState(fileStatus).isComplete;

  const handleSSEStatusChange = useCallback((nextStatus: FileProcessingStatus) => {
    setFileStatus(nextStatus);
  }, []);

  const { isConnected: sseConnected } = useFileStatusSSE({
    fileId: fileId ?? '',
    enabled: !!fileId && !pollingStoppedRef.current && !isComplete,
    onStatusChange: handleSSEStatusChange,
  });

  const pollStatus = useCallback(async () => {
    if (!fileId || pollingStoppedRef.current) return;

    if (pollStartedAtRef.current !== null && Date.now() - pollStartedAtRef.current > MAX_POLL_DURATION_MS) {
      pollingStoppedRef.current = true;
      return;
    }

    try {
      const nextStatus = await getFileProcessingStatus(fileId);
      setFileStatus(nextStatus);
    } catch (error) {
      if (error instanceof HttpError && error.status === 404) {
        pollingStoppedRef.current = true;
      }
    }
  }, [fileId]);

  useEffect(() => {
    if (!fileId || pollingStoppedRef.current || getFileProcessingState(fileStatus).isComplete || sseConnected) {
      return;
    }

    if (pollStartedAtRef.current === null) {
      pollStartedAtRef.current = Date.now();
    }

    if (!initialPollDoneRef.current && !initialStatus) {
      initialPollDoneRef.current = true;
      void pollStatus();
    }

    const interval = setInterval(pollStatus, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [fileId, fileStatus, initialStatus, pollStatus, sseConnected]);

  return fileStatus;
};
