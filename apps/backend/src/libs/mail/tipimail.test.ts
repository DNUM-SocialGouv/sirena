import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SendTipimailOptions, TipimailSendResponse, TipimailSubstitution } from './tipimail.js';

global.fetch = vi.fn();

vi.mock('../config/env.js', () => ({
  envVars: {
    TIPIMAIL_API_URL: 'https://api.tipimail.com',
    TIPIMAIL_USER_ID: 'test-user-id',
    TIPIMAIL_API_KEY: 'test-api-key',
    TIPIMAIL_FROM_ADDRESS: 'default@example.com',
    TIPIMAIL_FROM_PERSONAL_NAME: 'Default Sender',
  },
}));

const { sendTipimailEmail } = await import('./tipimail.js');

describe('tipimail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sendTipimailEmail', () => {
    it('should send an email with minimal options', async () => {
      const mockResponse: TipimailSendResponse = { status: 'success' };
      vi.mocked(fetch).mockResolvedValueOnce({
        status: 200,
        json: async () => mockResponse,
      } as Response);

      const result = await sendTipimailEmail({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Test body',
      });

      expect(fetch).toHaveBeenCalledWith(
        'https://api.tipimail.com/messages/send',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Tipimail-ApiUser': 'test-user-id',
            'X-Tipimail-ApiKey': 'test-api-key',
          }),
          body: expect.stringContaining('"to"'),
        }),
      );

      expect(result).toEqual(mockResponse);
    });

    it('should send an email with all options', async () => {
      const mockResponse: TipimailSendResponse = { status: 'success' };
      vi.mocked(fetch).mockResolvedValueOnce({
        status: 200,
        json: async () => mockResponse,
      } as Response);

      const options: SendTipimailOptions = {
        to: [{ address: 'recipient@example.com', personalName: 'John Doe' }],
        from: { address: 'sender@example.com', personalName: 'Jane Smith' },
        replyTo: { address: 'reply@example.com', personalName: 'Support' },
        subject: 'Test Subject',
        html: '<p>HTML content</p>',
        text: 'Text content',
        template: 'my-template',
        meta: { purpose: 'test', userId: 123 },
        tags: ['tag1', 'tag2'],
        substitutions: [
          {
            email: 'recipient@example.com',
            values: { name: 'John', code: 'ABC123' },
          },
        ],
        images: [
          {
            filename: 'image.png',
            content: 'base64content',
            mimeType: 'image/png',
            contentId: 'img1',
          },
        ],
        attachments: [
          {
            filename: 'document.pdf',
            content: 'base64pdf',
            contentType: 'application/pdf',
          },
        ],
      };

      const result = await sendTipimailEmail(options);

      const callArgs = vi.mocked(fetch).mock.calls[0];
      const body = JSON.parse(callArgs[1]?.body as string);

      expect(body.to).toEqual([{ address: 'recipient@example.com', personalName: 'John Doe' }]);
      expect(body.msg.from).toEqual({ address: 'sender@example.com', personalName: 'Jane Smith' });
      expect(body.msg.replyTo).toBeUndefined();
      expect(body.msg.subject).toBe('Test Subject');
      expect(body.msg.html).toBe('<p>HTML content</p>');
      expect(body.msg.text).toBe('Text content');
      expect(body.headers['X-TM-TEMPLATE']).toBe('my-template');
      expect(body.headers['X-TM-META']).toEqual({ purpose: 'test', userId: 123 });
      expect(body.headers['X-TM-TAGS']).toEqual(['tag1', 'tag2']);
      expect(body.headers['X-TM-SUB']).toEqual([
        {
          email: 'recipient@example.com',
          values: { name: 'John', code: 'ABC123' },
        },
      ]);
      expect(body.msg.images).toEqual([
        {
          filename: 'image.png',
          content: 'base64content',
          type: 'image/png',
          contentId: 'img1',
        },
      ]);
      expect(body.msg.attachments).toEqual([
        {
          filename: 'document.pdf',
          content: 'base64pdf',
          contentType: 'application/pdf',
        },
      ]);

      expect(result).toEqual(mockResponse);
    });

    it('should use default from address when not provided', async () => {
      const mockResponse: TipimailSendResponse = { status: 'success' };
      vi.mocked(fetch).mockResolvedValueOnce({
        status: 200,
        json: async () => mockResponse,
      } as Response);

      await sendTipimailEmail({
        to: 'recipient@example.com',
        subject: 'Test',
        text: 'Test',
      });

      const callArgs = vi.mocked(fetch).mock.calls[0];
      const body = JSON.parse(callArgs[1]?.body as string);

      expect(body.msg.from).toEqual({
        address: 'default@example.com',
        personalName: 'Default Sender',
      });
    });

    it('should normalize string recipient to array', async () => {
      const mockResponse: TipimailSendResponse = { status: 'success' };
      vi.mocked(fetch).mockResolvedValueOnce({
        status: 200,
        json: async () => mockResponse,
      } as Response);

      await sendTipimailEmail({
        to: 'recipient@example.com',
        subject: 'Test',
        text: 'Test',
      });

      const callArgs = vi.mocked(fetch).mock.calls[0];
      const body = JSON.parse(callArgs[1]?.body as string);

      expect(body.to).toEqual([{ address: 'recipient@example.com' }]);
    });

    it('should normalize array of string recipients', async () => {
      const mockResponse: TipimailSendResponse = { status: 'success' };
      vi.mocked(fetch).mockResolvedValueOnce({
        status: 200,
        json: async () => mockResponse,
      } as Response);

      await sendTipimailEmail({
        to: ['recipient1@example.com', 'recipient2@example.com'],
        subject: 'Test',
        text: 'Test',
      });

      const callArgs = vi.mocked(fetch).mock.calls[0];
      const body = JSON.parse(callArgs[1]?.body as string);

      expect(body.to).toEqual([{ address: 'recipient1@example.com' }, { address: 'recipient2@example.com' }]);
    });

    it('should normalize string from to object', async () => {
      const mockResponse: TipimailSendResponse = { status: 'success' };
      vi.mocked(fetch).mockResolvedValueOnce({
        status: 200,
        json: async () => mockResponse,
      } as Response);

      await sendTipimailEmail({
        to: 'recipient@example.com',
        from: 'custom@example.com',
        subject: 'Test',
        text: 'Test',
      });

      const callArgs = vi.mocked(fetch).mock.calls[0];
      const body = JSON.parse(callArgs[1]?.body as string);

      expect(body.msg.from).toEqual({ address: 'custom@example.com' });
    });

    it('should normalize string replyTo to object', async () => {
      const mockResponse: TipimailSendResponse = { status: 'success' };
      vi.mocked(fetch).mockResolvedValueOnce({
        status: 200,
        json: async () => mockResponse,
      } as Response);

      await sendTipimailEmail({
        to: 'recipient@example.com',
        replyTo: 'reply@example.com',
        subject: 'Test',
        text: 'Test',
      });

      const callArgs = vi.mocked(fetch).mock.calls[0];
      const body = JSON.parse(callArgs[1]?.body as string);

      expect(body.msg.replyTo).toEqual({ address: 'reply@example.com' });
    });

    it('should not include replyTo when using template', async () => {
      const mockResponse: TipimailSendResponse = { status: 'success' };
      vi.mocked(fetch).mockResolvedValueOnce({
        status: 200,
        json: async () => mockResponse,
      } as Response);

      await sendTipimailEmail({
        to: 'recipient@example.com',
        replyTo: 'reply@example.com',
        template: 'my-template',
        subject: 'Test',
        text: 'Test',
      });

      const callArgs = vi.mocked(fetch).mock.calls[0];
      const body = JSON.parse(callArgs[1]?.body as string);

      expect(body.msg.replyTo).toBeUndefined();
    });

    it('should include replyTo when not using template', async () => {
      const mockResponse: TipimailSendResponse = { status: 'success' };
      vi.mocked(fetch).mockResolvedValueOnce({
        status: 200,
        json: async () => mockResponse,
      } as Response);

      await sendTipimailEmail({
        to: 'recipient@example.com',
        replyTo: 'reply@example.com',
        subject: 'Test',
        text: 'Test',
      });

      const callArgs = vi.mocked(fetch).mock.calls[0];
      const body = JSON.parse(callArgs[1]?.body as string);

      expect(body.msg.replyTo).toEqual({ address: 'reply@example.com' });
    });

    it('should validate that substitutions match recipients', async () => {
      const options: SendTipimailOptions = {
        to: ['recipient1@example.com', 'recipient2@example.com'],
        subject: 'Test',
        text: 'Test',
        substitutions: [
          {
            email: 'recipient1@example.com',
            values: { name: 'John' },
          },
          {
            email: 'invalid@example.com',
            values: { name: 'Jane' },
          },
        ],
      };

      await expect(sendTipimailEmail(options)).rejects.toThrow(
        "Tipimail X-TM-SUB contains emails not present in 'to': invalid@example.com",
      );
    });

    it('should validate substitutions with case-insensitive email matching', async () => {
      const mockResponse: TipimailSendResponse = { status: 'success' };
      vi.mocked(fetch).mockResolvedValueOnce({
        status: 200,
        json: async () => mockResponse,
      } as Response);

      await sendTipimailEmail({
        to: 'Recipient@Example.com',
        subject: 'Test',
        text: 'Test',
        substitutions: [
          {
            email: 'recipient@example.com',
            values: { name: 'John' },
          },
        ],
      });

      expect(fetch).toHaveBeenCalled();
    });

    it('should not include empty headers object', async () => {
      const mockResponse: TipimailSendResponse = { status: 'success' };
      vi.mocked(fetch).mockResolvedValueOnce({
        status: 200,
        json: async () => mockResponse,
      } as Response);

      await sendTipimailEmail({
        to: 'recipient@example.com',
        subject: 'Test',
        text: 'Test',
      });

      const callArgs = vi.mocked(fetch).mock.calls[0];
      const body = JSON.parse(callArgs[1]?.body as string);

      expect(body.headers).toBeUndefined();
    });

    it('should handle API errors with status code', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        status: 400,
        json: async () => ({ status: 'error', message: 'Bad request' }),
      } as Response);

      await expect(
        sendTipimailEmail({
          to: 'recipient@example.com',
          subject: 'Test',
          text: 'Test',
        }),
      ).rejects.toThrow('Tipimail API error error');
    });

    it('should handle API errors without status in response', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        status: 500,
        json: async () => ({ message: 'Internal server error' }),
      } as Response);

      await expect(
        sendTipimailEmail({
          to: 'recipient@example.com',
          subject: 'Test',
          text: 'Test',
        }),
      ).rejects.toThrow('Tipimail API error 500');
    });

    it('should use custom API key when provided', async () => {
      const mockResponse: TipimailSendResponse = { status: 'success' };
      vi.mocked(fetch).mockResolvedValueOnce({
        status: 200,
        json: async () => mockResponse,
      } as Response);

      await sendTipimailEmail({
        to: 'recipient@example.com',
        subject: 'Test',
        text: 'Test',
        apiKey: 'custom-api-key',
      });

      const callArgs = vi.mocked(fetch).mock.calls[0];
      const headers = callArgs[1]?.headers as Record<string, string>;

      expect(headers['X-Tipimail-ApiKey']).toBe('test-api-key');
    });

    it('should map images correctly', async () => {
      const mockResponse: TipimailSendResponse = { status: 'success' };
      vi.mocked(fetch).mockResolvedValueOnce({
        status: 200,
        json: async () => mockResponse,
      } as Response);

      await sendTipimailEmail({
        to: 'recipient@example.com',
        subject: 'Test',
        text: 'Test',
        images: [
          {
            filename: 'logo.png',
            content: 'base64logo',
            mimeType: 'image/png',
          },
          {
            filename: 'banner.jpg',
            content: 'base64banner',
            mimeType: 'image/jpeg',
            contentId: 'banner-id',
          },
        ],
      });

      const callArgs = vi.mocked(fetch).mock.calls[0];
      const body = JSON.parse(callArgs[1]?.body as string);

      expect(body.msg.images).toEqual([
        {
          filename: 'logo.png',
          content: 'base64logo',
          type: 'image/png',
        },
        {
          filename: 'banner.jpg',
          content: 'base64banner',
          type: 'image/jpeg',
          contentId: 'banner-id',
        },
      ]);
    });

    it('should handle multiple recipients with substitutions', async () => {
      const mockResponse: TipimailSendResponse = { status: 'success' };
      vi.mocked(fetch).mockResolvedValueOnce({
        status: 200,
        json: async () => mockResponse,
      } as Response);

      const substitutions: TipimailSubstitution[] = [
        {
          email: 'recipient1@example.com',
          values: { name: 'John', code: 'ABC' },
        },
        {
          email: 'recipient2@example.com',
          values: { name: 'Jane', code: 'XYZ' },
        },
      ];

      await sendTipimailEmail({
        to: ['recipient1@example.com', 'recipient2@example.com'],
        subject: 'Test',
        text: 'Test',
        substitutions,
      });

      const callArgs = vi.mocked(fetch).mock.calls[0];
      const body = JSON.parse(callArgs[1]?.body as string);

      expect(body.headers['X-TM-SUB']).toEqual(substitutions);
    });

    it('should include html when provided', async () => {
      const mockResponse: TipimailSendResponse = { status: 'success' };
      vi.mocked(fetch).mockResolvedValueOnce({
        status: 200,
        json: async () => mockResponse,
      } as Response);

      await sendTipimailEmail({
        to: 'recipient@example.com',
        subject: 'Test',
        text: 'Text version',
        html: '<p>HTML version</p>',
      });

      const callArgs = vi.mocked(fetch).mock.calls[0];
      const body = JSON.parse(callArgs[1]?.body as string);

      expect(body.msg.html).toBe('<p>HTML version</p>');
      expect(body.msg.text).toBe('Text version');
    });

    it('should not include html when not provided', async () => {
      const mockResponse: TipimailSendResponse = { status: 'success' };
      vi.mocked(fetch).mockResolvedValueOnce({
        status: 200,
        json: async () => mockResponse,
      } as Response);

      await sendTipimailEmail({
        to: 'recipient@example.com',
        subject: 'Test',
        text: 'Text version',
      });

      const callArgs = vi.mocked(fetch).mock.calls[0];
      const body = JSON.parse(callArgs[1]?.body as string);

      expect(body.msg.html).toBeUndefined();
    });
  });
});
