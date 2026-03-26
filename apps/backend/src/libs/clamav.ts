import * as net from 'node:net';
import type { Readable } from 'node:stream';
import { envVars } from '../config/env.js';
import { getLoggerStore } from './asyncLocalStorage.js';

const { CLAMAV_HOST, CLAMAV_PORT } = envVars;
const CLAMD_PORT = Number.parseInt(CLAMAV_PORT || '3310', 10);
const BASE_SCAN_TIMEOUT = 30000;
const SCAN_TIMEOUT_PER_MB = 1500;
const MAX_SCAN_TIMEOUT = 300000;
const PING_TIMEOUT = 5000;

const computeScanTimeout = (sizeBytes?: number): number => {
  if (!sizeBytes) return BASE_SCAN_TIMEOUT;
  const sizeMb = sizeBytes / (1024 * 1024);
  return Math.min(BASE_SCAN_TIMEOUT + Math.ceil(sizeMb) * SCAN_TIMEOUT_PER_MB, MAX_SCAN_TIMEOUT);
};

export type ClamAvErrorReason = 'timeout' | 'connection_refused' | 'unknown';

export const categorizeClamAvError = (error: unknown): ClamAvErrorReason => {
  if (!(error instanceof Error)) return 'unknown';
  const message = error.message.toLowerCase();
  if (message.includes('timeout')) return 'timeout';
  if (message.includes('econnrefused') || message.includes('connection refused')) return 'connection_refused';
  return 'unknown';
};

export const isTransientError = (error: unknown): boolean => {
  const reason = categorizeClamAvError(error);
  return reason === 'timeout' || reason === 'connection_refused';
};

export interface ClamAvScanResult {
  success: boolean;
  data?: {
    result: Array<{
      name: string;
      is_infected: boolean;
      viruses: string[];
    }>;
  };
  error?: string;
  errorReason?: ClamAvErrorReason;
}

export interface ClamAvHealthResult {
  clamav: {
    reachable: boolean;
    message: string;
    latencyMs?: number;
  };
  status: 'ok' | 'error';
}

const isClamAvEnabled = (): boolean => {
  return Boolean(CLAMAV_HOST && CLAMAV_HOST.length > 0);
};

const sendCommand = (command: string, timeout: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let response = '';

    socket.setTimeout(timeout);

    socket.on('data', (data) => {
      response += data.toString();
    });

    socket.on('end', () => {
      resolve(response.trim());
    });

    socket.on('error', (err) => {
      reject(err);
    });

    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error('Connection timeout'));
    });

    socket.connect(CLAMD_PORT, CLAMAV_HOST, () => {
      socket.write(`${command}\n`);
    });
  });
};

export const checkClamAvHealth = async (): Promise<ClamAvHealthResult> => {
  if (!isClamAvEnabled()) {
    return {
      clamav: { reachable: false, message: 'ClamAV not configured' },
      status: 'error',
    };
  }

  const logger = getLoggerStore();
  const startTime = Date.now();

  try {
    const response = await sendCommand('PING', PING_TIMEOUT);
    const latencyMs = Date.now() - startTime;

    if (response === 'PONG') {
      return {
        clamav: { reachable: true, message: 'connected', latencyMs },
        status: 'ok',
      };
    }

    return {
      clamav: { reachable: false, message: `Unexpected response: ${response}`, latencyMs },
      status: 'error',
    };
  } catch (error) {
    logger.error({ error }, 'ClamAV health check failed');
    return {
      clamav: {
        reachable: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        latencyMs: Date.now() - startTime,
      },
      status: 'error',
    };
  }
};

const CHUNK_SIZE = 8192;

const writeChunkToSocket = (socket: net.Socket, chunk: Buffer): Promise<void> => {
  const sizeBuffer = Buffer.alloc(4);
  sizeBuffer.writeUInt32BE(chunk.length, 0);
  socket.write(sizeBuffer);
  const canContinue = socket.write(chunk);
  if (canContinue) return Promise.resolve();
  return new Promise((resolve) => socket.once('drain', resolve));
};

const scanBufferWithInstream = (buffer: Buffer, timeout: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let response = '';
    let settled = false;

    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      fn();
    };

    socket.setTimeout(timeout);

    socket.on('data', (data) => {
      response += data.toString();
    });

    socket.on('end', () => settle(() => resolve(response.trim())));
    socket.on('error', (err) => settle(() => reject(err)));

    socket.on('timeout', () => {
      socket.destroy();
      settle(() => reject(new Error('Scan timeout')));
    });

    socket.connect(CLAMD_PORT, CLAMAV_HOST, async () => {
      try {
        socket.write('zINSTREAM\0');

        let offset = 0;
        while (offset < buffer.length) {
          const chunk = buffer.subarray(offset, offset + CHUNK_SIZE);
          await writeChunkToSocket(socket, chunk);
          offset += CHUNK_SIZE;
        }

        const endBuffer = Buffer.alloc(4);
        endBuffer.writeUInt32BE(0, 0);
        socket.write(endBuffer);
      } catch (err) {
        settle(() => reject(err));
      }
    });
  });
};

const scanStreamWithInstream = (inputStream: Readable, timeout: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let response = '';
    let settled = false;

    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      fn();
    };

    socket.setTimeout(timeout);

    socket.on('data', (data) => {
      response += data.toString();
    });

    socket.on('end', () => settle(() => resolve(response.trim())));

    socket.on('error', (err) => {
      inputStream.destroy();
      settle(() => reject(err));
    });

    socket.on('timeout', () => {
      inputStream.destroy();
      socket.destroy();
      settle(() => reject(new Error('Scan timeout')));
    });

    socket.connect(CLAMD_PORT, CLAMAV_HOST, () => {
      socket.write('zINSTREAM\0');

      inputStream.on('data', async (chunk: Buffer) => {
        inputStream.pause();
        try {
          let offset = 0;
          while (offset < chunk.length) {
            const piece = chunk.subarray(offset, offset + CHUNK_SIZE);
            await writeChunkToSocket(socket, piece);
            offset += CHUNK_SIZE;
          }
        } catch (err) {
          inputStream.destroy();
          socket.destroy();
          settle(() => reject(err instanceof Error ? err : new Error(String(err))));
          return;
        }
        inputStream.resume();
      });

      inputStream.on('end', () => {
        const endBuffer = Buffer.alloc(4);
        endBuffer.writeUInt32BE(0, 0);
        socket.write(endBuffer);
      });

      inputStream.on('error', (err) => {
        socket.destroy();
        settle(() => reject(err));
      });
    });
  });
};

const parseClamscanResponse = (response: string, fileName: string): ClamAvScanResult => {
  if (response.includes('INSTREAM size limit exceeded')) {
    return {
      success: false,
      error: 'INSTREAM size limit exceeded - file too large for ClamAV',
      errorReason: 'unknown',
    };
  }

  if (response.includes('ERROR')) {
    return {
      success: false,
      error: `ClamAV error: ${response}`,
      errorReason: 'unknown',
    };
  }

  const isInfected = response.includes('FOUND');

  let viruses: string[] = [];
  if (isInfected) {
    const match = response.match(/stream:\s*(.+)\s+FOUND/);
    if (match?.[1]) {
      viruses = [match[1].trim()];
    }
  }

  return {
    success: true,
    data: {
      result: [
        {
          name: fileName,
          is_infected: isInfected,
          viruses,
        },
      ],
    },
  };
};

export const scanBuffer = async (buffer: Buffer, fileName: string): Promise<ClamAvScanResult> => {
  if (!isClamAvEnabled()) {
    return {
      success: false,
      error: 'ClamAV not configured',
    };
  }

  const logger = getLoggerStore();
  const startTime = Date.now();
  const timeout = computeScanTimeout(buffer.length);

  try {
    const response = await scanBufferWithInstream(buffer, timeout);
    const latencyMs = Date.now() - startTime;

    const result = parseClamscanResponse(response, fileName);

    logger.info(
      {
        fileName,
        latencyMs,
        isInfected: result.data?.result?.[0]?.is_infected ?? false,
        viruses: result.data?.result?.[0]?.viruses ?? [],
        rawResponse: response,
      },
      'ClamAV scan completed',
    );

    return result;
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    logger.error({ error, fileName, latencyMs }, 'ClamAV scan error');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during scan',
      errorReason: categorizeClamAvError(error),
    };
  }
};

export const scanStream = async (stream: Readable, fileName: string, sizeBytes?: number): Promise<ClamAvScanResult> => {
  if (!isClamAvEnabled()) {
    return {
      success: false,
      error: 'ClamAV not configured',
    };
  }

  const logger = getLoggerStore();
  const startTime = Date.now();
  const timeout = computeScanTimeout(sizeBytes);

  try {
    const response = await scanStreamWithInstream(stream, timeout);
    const latencyMs = Date.now() - startTime;

    const result = parseClamscanResponse(response, fileName);

    logger.info(
      {
        fileName,
        latencyMs,
        isInfected: result.data?.result?.[0]?.is_infected ?? false,
        viruses: result.data?.result?.[0]?.viruses ?? [],
      },
      'ClamAV stream scan completed',
    );

    return result;
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    logger.error({ error, fileName, latencyMs }, 'ClamAV stream scan error');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during scan',
      errorReason: categorizeClamAvError(error),
    };
  }
};

export const isFileInfected = (scanResult: ClamAvScanResult): boolean => {
  if (!scanResult.success || !scanResult.data?.result?.length) {
    return false;
  }
  return scanResult.data.result.some((r) => r.is_infected);
};

export const getDetectedViruses = (scanResult: ClamAvScanResult): string[] => {
  if (!scanResult.success || !scanResult.data?.result?.length) {
    return [];
  }
  return scanResult.data.result.flatMap((r) => r.viruses);
};
