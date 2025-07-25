const request = require('supertest');
const app = require('../../src/app');
const { User } = require('../../src/models');

// セキュリティ特化のソーシャル認証テスト
describe('Social Authentication Security Tests', () => {
  beforeEach(async () => {
    await User.destroy({ where: {} });
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('セキュリティ脆弱性テスト', () => {
    it('should prevent CSRF attacks with invalid state parameter', async () => {
      const response = await request(app)
        .get('/api/social-auth/google/callback?code=valid-code&state=malicious-state')
        .expect(302);

      expect(response.headers.location).toContain('/auth/error');
      expect(response.headers.location).toContain('message=');
    });

    it('should sanitize redirect URLs to prevent open redirect attacks', async () => {
      const maliciousRedirect = 'http://evil.com/steal-tokens';
      const response = await request(app)
        .get(`/api/social-auth/urls?redirect=${encodeURIComponent(maliciousRedirect)}`)
        .expect(200);

      // リダイレクトURLが適切にサニタイズされていることを確認
      expect(response.body.urls.google).not.toContain('evil.com');
      expect(response.body.urls.github).not.toContain('evil.com');
    });

    it('should rate limit OAuth callback attempts', async () => {
      const promises = [];
      // 大量のリクエストを送信
      for (let i = 0; i < 20; i++) {
        promises.push(
          request(app)
            .get('/api/social-auth/google/callback?code=test-code')
            .send()
        );
      }

      const responses = await Promise.all(promises);
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should validate JWT token structure and prevent token manipulation', async () => {
      const maliciousToken = 'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJ1c2VySWQiOiIxMjMiLCJpc0FkbWluIjp0cnVlfQ.';
      
      const response = await request(app)
        .get('/api/social-auth/verify-token')
        .set('Authorization', `Bearer ${maliciousToken}`)
        .expect(401);

      expect(response.body.error).toContain('無効なトークン');
    });

    it('should prevent user enumeration attacks through error messages', async () => {
      // 存在しないユーザーでテスト
      const response1 = await request(app)
        .get('/api/social-auth/google/callback?code=invalid-code-nonexistent')
        .expect(302);

      // 存在するユーザーでテスト  
      await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      });

      const response2 = await request(app)
        .get('/api/social-auth/google/callback?code=invalid-code-existent')
        .expect(302);

      // エラーメッセージが同じであることを確認（情報漏洩防止）
      const error1 = new URL(response1.headers.location).searchParams.get('message');
      const error2 = new URL(response2.headers.location).searchParams.get('message');
      expect(error1).toBe(error2);
    });

    it('should sanitize user input from OAuth providers', async () => {
      const axios = require('axios');
      
      // XSSペイロードを含むユーザー情報をモック
      axios.post.mockResolvedValueOnce({
        data: { access_token: 'mock-access-token' }
      });
      
      axios.get.mockResolvedValueOnce({
        data: {
          id: 'google_123456',
          email: 'test@example.com',
          name: '<script>alert("XSS")</script>Malicious User',
          picture: 'javascript:alert("XSS")',
          verified_email: true
        }
      });

      const response = await request(app)
        .get('/api/social-auth/google/callback?code=mock-auth-code')
        .expect(302);

      // ユーザーが作成されたが、危険な文字列がサニタイズされていることを確認
      const user = await User.findOne({ where: { email: 'test@example.com' } });
      expect(user).toBeTruthy();
      expect(user.username).not.toContain('<script>');
      expect(user.username).not.toContain('javascript:');
    });
  });

  describe('OAuth設定セキュリティテスト', () => {
    it('should detect and warn about insecure OAuth configurations', async () => {
      // 弱いシークレットキーでテスト
      process.env.GOOGLE_CLIENT_SECRET = '123';
      process.env.GITHUB_CLIENT_SECRET = 'weak';

      const response = await request(app)
        .get('/api/social-auth/config-status')
        .expect(200);

      expect(response.body.security_warnings).toBeDefined();
      expect(response.body.security_warnings.length).toBeGreaterThan(0);
    });

    it('should require HTTPS in production environment', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      process.env.GOOGLE_REDIRECT_URI = 'http://insecure.com/callback';

      const response = await request(app)
        .get('/api/social-auth/config-status')
        .expect(200);

      expect(response.body.security_warnings).toContain('HTTPSが必要です');
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should validate redirect URI domains', async () => {
      process.env.GOOGLE_REDIRECT_URI = 'https://suspicious-domain.com/callback';

      const response = await request(app)
        .get('/api/social-auth/config-status')
        .expect(200);

      expect(response.body.warnings).toBeDefined();
    });
  });

  describe('セッション・トークン管理テスト', () => {
    it('should properly invalidate sessions on logout', async () => {
      // ログイン
      await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        })
        .expect(200);

      const token = loginResponse.body.token;

      // ログアウト
      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // トークンが無効化されていることを確認
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);

      expect(response.body.error).toContain('トークン');
    });

    it('should enforce token expiration', async () => {
      // 短い有効期限でテスト
      const originalExpire = process.env.JWT_EXPIRE;
      process.env.JWT_EXPIRE = '1ms';

      await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        })
        .expect(200);

      const token = response.body.token;

      // 少し待ってからアクセス
      await new Promise(resolve => setTimeout(resolve, 100));

      const verifyResponse = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);

      expect(verifyResponse.body.code).toBe('TOKEN_EXPIRED');
      
      process.env.JWT_EXPIRE = originalExpire;
    });

    it('should handle concurrent login attempts safely', async () => {
      await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      });

      // 同時ログイン試行
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app)
            .post('/api/auth/login')
            .send({
              email: 'test@example.com',
              password: 'password123'
            })
        );
      }

      const responses = await Promise.all(promises);
      const successfulLogins = responses.filter(res => res.status === 200);
      
      // すべて成功するか、適切にレート制限されることを確認
      expect(successfulLogins.length).toBeGreaterThan(0);
      expect(responses.some(res => res.status === 429)).toBeTruthy();
    });
  });

  describe('入力検証とサニタイゼーション', () => {
    it('should validate email format from OAuth providers', async () => {
      const axios = require('axios');
      
      axios.post.mockResolvedValueOnce({
        data: { access_token: 'mock-access-token' }
      });
      
      // 無効なメールアドレス
      axios.get.mockResolvedValueOnce({
        data: {
          id: 'google_123456',
          email: 'invalid-email-format',
          name: 'Test User',
          verified_email: true
        }
      });

      const response = await request(app)
        .get('/api/social-auth/google/callback?code=mock-auth-code')
        .expect(302);

      expect(response.headers.location).toContain('/auth/error');
      expect(response.headers.location).toContain('message=');
    });

    it('should handle extremely long usernames', async () => {
      const axios = require('axios');
      
      axios.post.mockResolvedValueOnce({
        data: { access_token: 'mock-access-token' }
      });
      
      // 非常に長いユーザー名
      const longName = 'a'.repeat(1000);
      axios.get.mockResolvedValueOnce({
        data: {
          id: 'google_123456',
          email: 'test@example.com',
          name: longName,
          verified_email: true
        }
      });

      const response = await request(app)
        .get('/api/social-auth/google/callback?code=mock-auth-code')
        .expect(302);

      // ユーザーが作成され、名前が適切に切り詰められていることを確認
      const user = await User.findOne({ where: { email: 'test@example.com' } });
      expect(user).toBeTruthy();
      expect(user.username.length).toBeLessThanOrEqual(255); // データベース制限
    });

    it('should handle null/undefined values from OAuth providers', async () => {
      const axios = require('axios');
      
      axios.post.mockResolvedValueOnce({
        data: { access_token: 'mock-access-token' }
      });
      
      // null/undefined値
      axios.get.mockResolvedValueOnce({
        data: {
          id: 'google_123456',
          email: 'test@example.com',
          name: null,
          picture: undefined,
          verified_email: true
        }
      });

      const response = await request(app)
        .get('/api/social-auth/google/callback?code=mock-auth-code')
        .expect(302);

      // ユーザーが作成され、null値が適切に処理されていることを確認
      const user = await User.findOne({ where: { email: 'test@example.com' } });
      expect(user).toBeTruthy();
      expect(user.username).toBeTruthy(); // デフォルト値が設定される
    });
  });
});