const emailService = require('../../../src/services/emailService');
const nodemailer = require('nodemailer');

// nodemailerのモック
jest.mock('nodemailer');

describe('Email Service', () => {
  let mockTransporter;
  let mockSendMail;

  beforeEach(() => {
    mockSendMail = jest.fn();
    mockTransporter = {
      sendMail: mockSendMail,
      verify: jest.fn()
    };
    nodemailer.createTransporter = jest.fn().mockReturnValue(mockTransporter);
    
    // 環境変数のモック
    process.env.SMTP_HOST = 'smtp.test.com';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = 'test@example.com';
    process.env.SMTP_PASS = 'password';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendEmail', () => {
    test('正常にメールを送信できる', async () => {
      mockSendMail.mockResolvedValue({
        messageId: 'test-message-id',
        response: '250 OK'
      });

      const emailOptions = {
        to: 'recipient@test.com',
        subject: 'Test Subject',
        text: 'Test message',
        html: '<p>Test message</p>'
      };

      const result = await emailService.sendEmail(emailOptions);

      expect(mockSendMail).toHaveBeenCalledWith({
        from: process.env.SMTP_USER,
        to: emailOptions.to,
        subject: emailOptions.subject,
        text: emailOptions.text,
        html: emailOptions.html
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('test-message-id');
    });

    test('メール送信失敗時にエラーを処理する', async () => {
      const sendError = new Error('SMTP connection failed');
      mockSendMail.mockRejectedValue(sendError);

      const emailOptions = {
        to: 'recipient@test.com',
        subject: 'Test Subject',
        text: 'Test message'
      };

      const result = await emailService.sendEmail(emailOptions);

      expect(result.success).toBe(false);
      expect(result.error).toBe(sendError.message);
    });

    test('必須フィールドの検証', async () => {
      const invalidOptions = {
        subject: 'Test Subject',
        text: 'Test message'
        // to フィールドが不足
      };

      await expect(emailService.sendEmail(invalidOptions))
        .rejects
        .toThrow('受信者メールアドレスは必須です');
    });
  });

  describe('sendWelcomeEmail', () => {
    test('ウェルカムメールを正常に送信できる', async () => {
      mockSendMail.mockResolvedValue({
        messageId: 'welcome-message-id'
      });

      const user = {
        email: 'newuser@test.com',
        firstName: 'Test',
        lastName: 'User'
      };

      const result = await emailService.sendWelcomeEmail(user);

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: user.email,
          subject: expect.stringContaining('ようこそ'),
          html: expect.stringContaining(user.firstName)
        })
      );

      expect(result.success).toBe(true);
    });
  });

  describe('sendPasswordResetEmail', () => {
    test('パスワードリセットメールを正常に送信できる', async () => {
      mockSendMail.mockResolvedValue({
        messageId: 'reset-message-id'
      });

      const user = {
        email: 'user@test.com',
        firstName: 'Test'
      };
      const resetToken = 'reset-token-123';

      const result = await emailService.sendPasswordResetEmail(user, resetToken);

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: user.email,
          subject: expect.stringContaining('パスワードリセット'),
          html: expect.stringContaining(resetToken)
        })
      );

      expect(result.success).toBe(true);
    });

    test('無効なリセットトークンでエラー', async () => {
      const user = {
        email: 'user@test.com',
        firstName: 'Test'
      };

      await expect(emailService.sendPasswordResetEmail(user, ''))
        .rejects
        .toThrow('リセットトークンは必須です');
    });
  });

  describe('sendNotificationEmail', () => {
    test('通知メールを正常に送信できる', async () => {
      mockSendMail.mockResolvedValue({
        messageId: 'notification-message-id'
      });

      const notificationData = {
        to: 'user@test.com',
        type: 'new_message',
        data: {
          senderName: 'Sender User',
          message: 'Hello there!'
        }
      };

      const result = await emailService.sendNotificationEmail(notificationData);

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: notificationData.to,
          subject: expect.stringContaining('新しいメッセージ')
        })
      );

      expect(result.success).toBe(true);
    });
  });

  describe('verifyConnection', () => {
    test('SMTP接続の検証が成功する', async () => {
      mockTransporter.verify.mockResolvedValue(true);

      const result = await emailService.verifyConnection();

      expect(mockTransporter.verify).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    test('SMTP接続の検証が失敗する', async () => {
      mockTransporter.verify.mockRejectedValue(new Error('Connection failed'));

      const result = await emailService.verifyConnection();

      expect(result).toBe(false);
    });
  });

  describe('EmailTemplate', () => {
    test('テンプレートエンジンの動作確認', () => {
      const template = emailService.getTemplate('welcome');
      const variables = {
        userName: 'Test User',
        activationLink: 'https://example.com/activate'
      };

      const renderedHtml = template.render(variables);

      expect(renderedHtml).toContain('Test User');
      expect(renderedHtml).toContain('https://example.com/activate');
    });

    test('存在しないテンプレートでエラー', () => {
      expect(() => emailService.getTemplate('nonexistent'))
        .toThrow('テンプレートが見つかりません');
    });
  });

  describe('メール送信のリトライ機能', () => {
    test('一時的な障害時にリトライする', async () => {
      // 最初の2回は失敗、3回目は成功
      mockSendMail
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce({ messageId: 'retry-success' });

      const emailOptions = {
        to: 'recipient@test.com',
        subject: 'Test Subject',
        text: 'Test message'
      };

      const result = await emailService.sendEmailWithRetry(emailOptions, 3);

      expect(mockSendMail).toHaveBeenCalledTimes(3);
      expect(result.success).toBe(true);
    });

    test('最大リトライ回数後に失敗', async () => {
      mockSendMail.mockRejectedValue(new Error('Persistent failure'));

      const emailOptions = {
        to: 'recipient@test.com',
        subject: 'Test Subject',
        text: 'Test message'
      };

      const result = await emailService.sendEmailWithRetry(emailOptions, 2);

      expect(mockSendMail).toHaveBeenCalledTimes(2);
      expect(result.success).toBe(false);
    });
  });
});