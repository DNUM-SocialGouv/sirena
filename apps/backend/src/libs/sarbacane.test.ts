import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addDomain,
  addToBlacklist,
  getBlacklistedEmail,
  getSettings,
  listBlacklistedEmails,
  listDomains,
  removeFromUnsubscribes,
  sendEmail,
  updateSettings,
} from './sarbacane';

vi.mock('../config/env', () => ({
  envVars: {
    SARBACANE_API_URL: 'https://api.sarbacane.com/sendkit',
    SARBACANE_API_KEY: 'test-api-key',
  },
}));

const { mockFetch } = vi.hoisted(() => {
  const mockFetch = vi.fn();
  return { mockFetch };
});

vi.stubGlobal('fetch', mockFetch);

describe('sarbacane.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sendEmail', () => {
    it('should successfully send an email', async () => {
      const mockResponse = { status: 'sent' };
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
      });

      const result = await sendEmail(
        'test@example.com',
        'sender@example.com',
        'Test Subject',
        '<h1>Test HTML</h1>',
        'Test text',
      );

      expect(mockFetch).toHaveBeenCalledWith('https://api.sarbacane.com/sendkit/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-apikey': 'test-api-key',
        },
        body: JSON.stringify({
          to: [{ address: 'test@example.com' }],
          msg: {
            from: { address: 'sender@example.com' },
            subject: 'Test Subject',
            html: '<h1>Test HTML</h1>',
            text: 'Test text',
          },
        }),
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle multiple recipients', async () => {
      const mockResponse = { status: 'sent' };
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
      });

      await sendEmail(
        ['test1@example.com', 'test2@example.com'],
        'sender@example.com',
        'Test Subject',
        '<h1>Test HTML</h1>',
        'Test text',
      );

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[0]).toBe('https://api.sarbacane.com/sendkit/email/send');
      expect(callArgs[1].body).toContain('test1@example.com');
      expect(callArgs[1].body).toContain('test2@example.com');
    });
  });

  describe('getSettings', () => {
    it('should fetch settings successfully', async () => {
      const mockResponse = { trackOpens: true, trackClicks: false };
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
      });

      const result = await getSettings();

      expect(mockFetch).toHaveBeenCalledWith('https://api.sarbacane.com/sendkit/email/settings', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-apikey': 'test-api-key',
        },
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('updateSettings', () => {
    it('should update settings successfully', async () => {
      const settings = { trackOpens: true };
      const mockResponse = { trackOpens: true, trackClicks: false };
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
      });

      const result = await updateSettings(settings);

      expect(mockFetch).toHaveBeenCalledWith('https://api.sarbacane.com/sendkit/email/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-apikey': 'test-api-key',
        },
        body: JSON.stringify(settings),
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('listDomains', () => {
    it('should list domains successfully', async () => {
      const mockResponse = [{ sending: 'test.com', tracking: 'track.test.com', email: 'admin@test.com' }];
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
      });

      const result = await listDomains();

      expect(mockFetch).toHaveBeenCalledWith('https://api.sarbacane.com/sendkit/email/domains', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-apikey': 'test-api-key',
        },
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('addDomain', () => {
    it('should add domain successfully', async () => {
      const domainRequest = {
        sending: 'test.com',
        tracking: 'track.test.com',
        email: 'admin@test.com',
      };
      const mockResponse = { ...domainRequest, verifiedDkim: true };
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
      });

      const result = await addDomain(domainRequest);

      expect(mockFetch).toHaveBeenCalledWith('https://api.sarbacane.com/sendkit/email/domains', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-apikey': 'test-api-key',
        },
        body: JSON.stringify(domainRequest),
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getBlacklistedEmail', () => {
    it('should get blacklisted email successfully', async () => {
      const mockResponse = {
        email: 'test@example.com',
        blacklist: 'unsubscribes',
        listName: 'Newsletter',
        createdDate: '2024-01-01',
        lastModifiedDate: '2024-01-01',
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
      });

      const result = await getBlacklistedEmail('unsubscribes', 'test@example.com');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.sarbacane.com/sendkit/email/blacklists/unsubscribes/test%40example.com',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'x-apikey': 'test-api-key',
          },
        },
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('addToBlacklist', () => {
    it('should add email to blacklist successfully', async () => {
      const mockResponse = { type: 'unsubscribes', email: 'test@example.com' };
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
      });

      const result = await addToBlacklist('unsubscribes', 'test@example.com', 'Newsletter');

      expect(mockFetch).toHaveBeenCalledWith('https://api.sarbacane.com/sendkit/email/blacklists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-apikey': 'test-api-key',
        },
        body: JSON.stringify({
          type: 'unsubscribes',
          email: 'test@example.com',
          list: 'Newsletter',
        }),
      });
      expect(result).toEqual(mockResponse);
    });

    it('should add email to blacklist without list', async () => {
      const mockResponse = { type: 'bounces', email: 'test@example.com' };
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
      });

      await addToBlacklist('bounces', 'test@example.com');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.sarbacane.com/sendkit/email/blacklists',
        expect.objectContaining({
          body: JSON.stringify({
            type: 'bounces',
            email: 'test@example.com',
            list: undefined,
          }),
        }),
      );
    });
  });

  describe('listBlacklistedEmails', () => {
    it('should list blacklisted emails successfully', async () => {
      const mockResponse = {
        items: [{ email: 'test@example.com', date: '2024-01-01', reason: 'Unsubscribed' }],
        total: 1,
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
      });

      const result = await listBlacklistedEmails('unsubscribes', {
        pageSize: 10,
        page: 1,
        order: 1,
      });

      expect(mockFetch).toHaveBeenCalledWith('https://api.sarbacane.com/sendkit/email/blacklists/list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-apikey': 'test-api-key',
        },
        body: JSON.stringify({
          type: 'unsubscribes',
          pageSize: 10,
          page: 1,
          order: 1,
        }),
      });
      expect(result).toEqual(mockResponse);
    });

    it('should list blacklisted emails with default options', async () => {
      const mockResponse = { items: [], total: 0 };
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
      });

      await listBlacklistedEmails('complaints');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.sarbacane.com/sendkit/email/blacklists/list',
        expect.objectContaining({
          body: JSON.stringify({
            type: 'complaints',
          }),
        }),
      );
    });
  });

  describe('removeFromUnsubscribes', () => {
    it('should remove email from unsubscribes successfully', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 204,
      });

      const result = await removeFromUnsubscribes('test@example.com');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.sarbacane.com/sendkit/email/blacklists/unsubscribes/test%40example.com',
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'x-apikey': 'test-api-key',
          },
        },
      );
      expect(result).toEqual({});
    });
  });

  describe('error handling', () => {
    it('should handle API errors', async () => {
      const errorResponse = { message: 'Unauthorized' };
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: vi.fn().mockResolvedValue(errorResponse),
      });

      await expect(
        sendEmail('test@example.com', 'sender@example.com', 'Test', '<h1>Test</h1>', 'Test'),
      ).rejects.toThrow('Unauthorized');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(
        sendEmail('test@example.com', 'sender@example.com', 'Test', '<h1>Test</h1>', 'Test'),
      ).rejects.toThrow('Network error');
    });
  });
});
