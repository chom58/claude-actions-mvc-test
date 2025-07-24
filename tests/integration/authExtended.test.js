const request = require('supertest');
const app = require('../../src/app');
const { User } = require('../../src/models');

describe('Extended Auth Endpoints', () => {
  beforeEach(async () => {
    await User.destroy({ where: {} });
  });

  describe('POST /api/users/logout', () => {
    let user, token;

    beforeEach(async () => {
      user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      });

      const response = await request(app)
        .post('/api/users/login')
        .send({
          email: user.email,
          password: 'password123'
        });

      token = response.body.token;
    });

    it('should logout user successfully', async () => {
      const response = await request(app)
        .post('/api/users/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.message).toBe('ログアウトが完了しました');

      // リフレッシュトークンが削除されていることを確認
      await user.reload();
      expect(user.refreshToken).toBeNull();
    });

    it('should return error without token', async () => {
      const response = await request(app)
        .post('/api/users/logout')
        .expect(401);

      expect(response.body.error).toBe('認証トークンが提供されていません');
    });
  });

  describe('POST /api/users/refresh-token', () => {
    let user, refreshToken;

    beforeEach(async () => {
      user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      });

      const response = await request(app)
        .post('/api/users/login')
        .send({
          email: user.email,
          password: 'password123'
        });

      refreshToken = response.body.refreshToken;
    });

    it('should refresh token successfully', async () => {
      const response = await request(app)
        .post('/api/users/refresh-token')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.message).toBe('トークンが更新されました');
      expect(response.body.token).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
      expect(response.body.refreshToken).not.toBe(refreshToken);
    });

    it('should return error with invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/users/refresh-token')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.error).toBe('無効なリフレッシュトークンです');
    });

    it('should return error without refresh token', async () => {
      const response = await request(app)
        .post('/api/users/refresh-token')
        .send({})
        .expect(401);

      expect(response.body.error).toBe('リフレッシュトークンが提供されていません');
    });
  });

  describe('POST /api/users/request-password-reset', () => {
    let user;

    beforeEach(async () => {
      user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      });
    });

    it('should request password reset successfully', async () => {
      const response = await request(app)
        .post('/api/users/request-password-reset')
        .send({ email: user.email })
        .expect(200);

      expect(response.body.message).toContain('パスワードリセットのメールを送信しました');
      
      // 開発環境ではトークンが返される
      if (process.env.NODE_ENV === 'development') {
        expect(response.body.resetToken).toBeDefined();
      }

      // データベースでリセットトークンが設定されていることを確認
      await user.reload();
      expect(user.resetPasswordToken).toBeDefined();
      expect(user.resetPasswordExpires).toBeDefined();
    });

    it('should return success even with non-existent email', async () => {
      const response = await request(app)
        .post('/api/users/request-password-reset')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      expect(response.body.message).toContain('パスワードリセットのメールを送信しました');
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/users/request-password-reset')
        .send({ email: 'invalid-email' })
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });
  });

  describe('POST /api/users/reset-password', () => {
    let user, resetToken;

    beforeEach(async () => {
      user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      });

      resetToken = user.generatePasswordResetToken();
      await user.save();
    });

    it('should reset password successfully', async () => {
      const newPassword = 'newpassword123';
      
      const response = await request(app)
        .post('/api/users/reset-password')
        .send({
          token: resetToken,
          newPassword: newPassword
        })
        .expect(200);

      expect(response.body.message).toBe('パスワードが正常にリセットされました');

      // パスワードが変更されていることを確認
      await user.reload();
      const isPasswordChanged = await user.comparePassword(newPassword);
      expect(isPasswordChanged).toBe(true);

      // リセットトークンがクリアされていることを確認
      expect(user.resetPasswordToken).toBeNull();
      expect(user.resetPasswordExpires).toBeNull();
      expect(user.refreshToken).toBeNull();
    });

    it('should return error with invalid token', async () => {
      const response = await request(app)
        .post('/api/users/reset-password')
        .send({
          token: 'invalid-token',
          newPassword: 'newpassword123'
        })
        .expect(400);

      expect(response.body.error).toBe('無効または期限切れのリセットトークンです');
    });

    it('should validate new password length', async () => {
      const response = await request(app)
        .post('/api/users/reset-password')
        .send({
          token: resetToken,
          newPassword: '123' // 短すぎる
        })
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });

    it('should return error with expired token', async () => {
      // トークンを期限切れにする
      user.resetPasswordExpires = new Date(Date.now() - 60 * 60 * 1000); // 1時間前
      await user.save();

      const response = await request(app)
        .post('/api/users/reset-password')
        .send({
          token: resetToken,
          newPassword: 'newpassword123'
        })
        .expect(400);

      expect(response.body.error).toBe('無効または期限切れのリセットトークンです');
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to login attempts', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      // 複数回のログイン試行
      const promises = Array.from({ length: 10 }, () =>
        request(app)
          .post('/api/users/login')
          .send(userData)
      );

      const responses = await Promise.all(promises);
      
      // 一部のリクエストがレート制限に引っかかることを確認
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });
});