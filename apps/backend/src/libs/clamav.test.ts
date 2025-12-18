import { EventEmitter } from 'node:events';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/config/env', () => ({
  envVars: {
    CLAMAV_HOST: 'clamav',
    CLAMAV_PORT: '3310',
  },
}));

vi.mock('./asyncLocalStorage', () => ({
  getLoggerStore: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  }),
}));

type MockSocket = EventEmitter & {
  setTimeout: ReturnType<typeof vi.fn>;
  connect: ReturnType<typeof vi.fn>;
  write: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
};

let mockSocketInstance: MockSocket;

const createMockSocket = (): MockSocket => {
  const socket = new EventEmitter() as MockSocket;
  socket.setTimeout = vi.fn();
  socket.connect = vi.fn();
  socket.write = vi.fn();
  socket.destroy = vi.fn();
  return socket;
};

vi.mock('node:net', () => {
  return {
    Socket: function MockSocketConstructor() {
      return mockSocketInstance;
    },
  };
});

describe('clamav', () => {
  let checkClamAvHealth: typeof import('./clamav').checkClamAvHealth;
  let scanBuffer: typeof import('./clamav').scanBuffer;
  let isFileInfected: typeof import('./clamav').isFileInfected;
  let getDetectedViruses: typeof import('./clamav').getDetectedViruses;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockSocketInstance = createMockSocket();
    vi.resetModules();
    const clamav = await import('./clamav');
    checkClamAvHealth = clamav.checkClamAvHealth;
    scanBuffer = clamav.scanBuffer;
    isFileInfected = clamav.isFileInfected;
    getDetectedViruses = clamav.getDetectedViruses;
  });

  describe('checkClamAvHealth', () => {
    it('should return healthy status when ClamAV responds with PONG', async () => {
      mockSocketInstance.connect = vi.fn((_port: number, _host: string, callback: () => void) => {
        setImmediate(() => {
          callback();
          mockSocketInstance.emit('data', Buffer.from('PONG'));
          mockSocketInstance.emit('end');
        });
      });

      const result = await checkClamAvHealth();

      expect(result.status).toBe('ok');
      expect(result.clamav.reachable).toBe(true);
      expect(result.clamav.message).toBe('connected');
    });

    it('should return error status when ClamAV is unreachable', async () => {
      mockSocketInstance.connect = vi.fn(() => {
        setImmediate(() => mockSocketInstance.emit('error', new Error('Connection refused')));
      });

      const result = await checkClamAvHealth();

      expect(result.status).toBe('error');
      expect(result.clamav.reachable).toBe(false);
      expect(result.clamav.message).toBe('Connection refused');
    });

    it('should return error status when response is not PONG', async () => {
      mockSocketInstance.connect = vi.fn((_port: number, _host: string, callback: () => void) => {
        setImmediate(() => {
          callback();
          mockSocketInstance.emit('data', Buffer.from('ERROR'));
          mockSocketInstance.emit('end');
        });
      });

      const result = await checkClamAvHealth();

      expect(result.status).toBe('error');
      expect(result.clamav.reachable).toBe(false);
      expect(result.clamav.message).toContain('Unexpected response');
    });
  });

  describe('scanBuffer', () => {
    it('should return clean result for non-infected file', async () => {
      mockSocketInstance.connect = vi.fn((_port: number, _host: string, callback: () => void) => {
        setImmediate(() => {
          callback();
          setImmediate(() => {
            mockSocketInstance.emit('data', Buffer.from('stream: OK'));
            mockSocketInstance.emit('end');
          });
        });
      });

      const buffer = Buffer.from('clean file content');
      const result = await scanBuffer(buffer, 'test.pdf');

      expect(result.success).toBe(true);
      expect(result.data?.result[0].is_infected).toBe(false);
      expect(result.data?.result[0].viruses).toHaveLength(0);
    });

    it('should return infected result for malicious file', async () => {
      mockSocketInstance.connect = vi.fn((_port: number, _host: string, callback: () => void) => {
        setImmediate(() => {
          callback();
          setImmediate(() => {
            mockSocketInstance.emit('data', Buffer.from('stream: Eicar-Signature FOUND'));
            mockSocketInstance.emit('end');
          });
        });
      });

      const buffer = Buffer.from('X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*');
      const result = await scanBuffer(buffer, 'malware.exe');

      expect(result.success).toBe(true);
      expect(result.data?.result[0].is_infected).toBe(true);
      expect(result.data?.result[0].viruses).toContain('Eicar-Signature');
    });

    it('should return error when scan fails', async () => {
      mockSocketInstance.connect = vi.fn(() => {
        setImmediate(() => mockSocketInstance.emit('error', new Error('Timeout')));
      });

      const buffer = Buffer.from('test content');
      const result = await scanBuffer(buffer, 'test.txt');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Timeout');
    });
  });

  describe('isFileInfected', () => {
    it('should return true for infected file', () => {
      const result = {
        success: true,
        data: {
          result: [{ name: 'test.exe', is_infected: true, viruses: ['Virus.Test'] }],
        },
      };

      expect(isFileInfected(result)).toBe(true);
    });

    it('should return false for clean file', () => {
      const result = {
        success: true,
        data: {
          result: [{ name: 'test.pdf', is_infected: false, viruses: [] }],
        },
      };

      expect(isFileInfected(result)).toBe(false);
    });

    it('should return false for failed scan', () => {
      const result = {
        success: false,
        error: 'Scan failed',
      };

      expect(isFileInfected(result)).toBe(false);
    });
  });

  describe('getDetectedViruses', () => {
    it('should return list of detected viruses', () => {
      const result = {
        success: true,
        data: {
          result: [{ name: 'test.exe', is_infected: true, viruses: ['Virus.A', 'Virus.B'] }],
        },
      };

      expect(getDetectedViruses(result)).toEqual(['Virus.A', 'Virus.B']);
    });

    it('should return empty array for clean file', () => {
      const result = {
        success: true,
        data: {
          result: [{ name: 'test.pdf', is_infected: false, viruses: [] }],
        },
      };

      expect(getDetectedViruses(result)).toEqual([]);
    });
  });
});
