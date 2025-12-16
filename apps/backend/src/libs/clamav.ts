import * as net from 'node:net';
import type { Readable } from 'node:stream';
import { envVars } from '@/config/env';
import { getLoggerStore } from './asyncLocalStorage';

const { CLAMAV_HOST, CLAMAV_PORT } = envVars;
const CLAMD_PORT = Number.parseInt(CLAMAV_PORT || '3310', 10);
const SCAN_TIMEOUT = 60000;
const PING_TIMEOUT = 5000;

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

const scanWithInstream = (buffer: Buffer): Promise<string> => {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let response = '';

    socket.setTimeout(SCAN_TIMEOUT);

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
      reject(new Error('Scan timeout'));
    });

    socket.connect(CLAMD_PORT, CLAMAV_HOST, () => {
      socket.write('zINSTREAM\0');

      const CHUNK_SIZE = 8192;
      let offset = 0;

      while (offset < buffer.length) {
        const chunk = buffer.subarray(offset, offset + CHUNK_SIZE);
        const sizeBuffer = Buffer.alloc(4);
        sizeBuffer.writeUInt32BE(chunk.length, 0);
        socket.write(sizeBuffer);
        socket.write(chunk);
        offset += CHUNK_SIZE;
      }

      const endBuffer = Buffer.alloc(4);
      endBuffer.writeUInt32BE(0, 0);
      socket.write(endBuffer);
    });
  });
};

const parseClamscanResponse = (response: string, fileName: string): ClamAvScanResult => {
  const isInfected = response.includes('FOUND');

  let viruses: string[] = [];
  if (isInfected) {
    // Extract virus name from "stream: Eicar-Signature FOUND"
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

  try {
    const response = await scanWithInstream(buffer);
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
    };
  }
};

export const scanStream = async (stream: Readable, fileName: string): Promise<ClamAvScanResult> => {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);
  return scanBuffer(buffer, fileName);
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
