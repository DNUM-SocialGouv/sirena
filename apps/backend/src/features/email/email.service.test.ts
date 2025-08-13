import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderTemplate, sendMail } from './email.service';

vi.mock('node:fs');
vi.mock('@/libs/sarbacane', () => ({
  sendEmail: vi.fn().mockResolvedValue({ status: 'success' }),
}));

describe('email.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('renderTemplate', () => {
    it('should render template with simple variables', () => {
      const mockTemplate = '<h1>Hello {{name}}!</h1><p>{{message}}</p>';
      const mockFs = vi.mocked(fs);
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(mockTemplate);

      const result = renderTemplate('test', {
        name: 'John',
        message: 'Welcome to Sirena',
      });

      expect(result.html).toContain('<h1>Hello John!</h1>');
      expect(result.html).toContain('<p>Welcome to Sirena</p>');
      expect(result.text).toContain('HELLO JOHN!');
      expect(result.text).toContain('Welcome to Sirena');
    });

    it('should handle template without .hbs extension', () => {
      const mockTemplate = '<p>{{content}}</p>';
      const mockFs = vi.mocked(fs);
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(mockTemplate);

      renderTemplate('welcome', { content: 'test' });

      expect(mockFs.readFileSync).toHaveBeenCalledWith(expect.stringContaining('welcome.hbs'), 'utf8');
    });

    it('should handle template with .hbs extension', () => {
      const mockTemplate = '<p>{{content}}</p>';
      const mockFs = vi.mocked(fs);
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(mockTemplate);

      renderTemplate('welcome.hbs', { content: 'test' });

      expect(mockFs.readFileSync).toHaveBeenCalledWith(expect.stringContaining('welcome.hbs'), 'utf8');
    });

    it('should throw error when template not found', () => {
      const mockFs = vi.mocked(fs);
      mockFs.existsSync.mockReturnValue(false);

      expect(() => {
        renderTemplate('nonexistent', {});
      }).toThrow("Can't find template:");
    });

    it('should inline CSS styles', () => {
      const mockTemplate = `
        <style>
          .header { color: blue; font-size: 20px; }
        </style>
        <div class="header">{{title}}</div>
      `;
      const mockFs = vi.mocked(fs);
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(mockTemplate);

      const result = renderTemplate('styled', { title: 'Test Title' });

      expect(result.html).toContain('style="color: blue; font-size: 20px;"');
      expect(result.html).toContain('Test Title');
    });

    it('should generate text version without redundant links', () => {
      const mockTemplate = '<p>Visit <a href="https://sirena.fr">https://sirena.fr</a></p>';
      const mockFs = vi.mocked(fs);
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(mockTemplate);

      const result = renderTemplate('links', {});

      expect(result.text).toContain('Visit https://sirena.fr');
      expect(result.text).not.toContain('(https://sirena.fr)');
    });
  });

  describe('sendMail', () => {
    it('should send email with rendered template', async () => {
      const mockTemplate = '<h1>{{greeting}}</h1>';
      const mockFs = vi.mocked(fs);
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(mockTemplate);

      const { sendEmail } = await import('@/libs/sarbacane');
      const mockSendEmail = vi.mocked(sendEmail);

      await sendMail({
        template: 'welcome',
        variables: { greeting: 'Hello World' },
        to: 'test@example.com',
        from: 'noreply@sirena.fr',
        subject: 'Test Email',
      });

      expect(mockSendEmail).toHaveBeenCalledWith(
        'test@example.com',
        'noreply@sirena.fr',
        'Test Email',
        expect.stringContaining('<h1>Hello World</h1>'),
        expect.stringContaining('HELLO WORLD'),
      );
    });

    it('should handle multiple recipients', async () => {
      const mockTemplate = '<p>{{message}}</p>';
      const mockFs = vi.mocked(fs);
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(mockTemplate);

      const { sendEmail } = await import('@/libs/sarbacane');
      const mockSendEmail = vi.mocked(sendEmail);

      await sendMail({
        template: 'notification',
        variables: { message: 'Test message' },
        to: ['user1@example.com', 'user2@example.com'],
        from: 'noreply@sirena.fr',
        subject: 'Notification',
      });

      expect(mockSendEmail).toHaveBeenCalledWith(
        ['user1@example.com', 'user2@example.com'],
        'noreply@sirena.fr',
        'Notification',
        expect.any(String),
        expect.any(String),
      );
    });
  });
});
