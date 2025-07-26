const request = require('supertest');
const app = require('../../../src/app');
const { userFactory, DatabaseHelper } = require('../../helpers');
const bcrypt = require('bcryptjs');

describe('Authentication Integration Tests', () => {
  beforeEach(async () => {
    await DatabaseHelper.resetDatabase();
  });

  afterAll(async () => {
    await DatabaseHelper.closeDatabase();
  });

  describe('POST /api/auth/register', () => {
    test('正常なユーザー登録ができる', async () => {
      const userData = userFactory.build();

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user).not.toHaveProperty('password');
      expect(response.body.data.token).toBeDefined();
      expect(response.headers['set-cookie']).toBeDefined();
    });

    test('重複メールアドレスで登録エラー', async () => {
      const existingUser = await userFactory.create();
      const duplicateUserData = userFactory.build({ email: existingUser.email });

      const response = await request(app)
        .post('/api/auth/register')
        .send(duplicateUserData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('既に存在');
    });

    test('無効なメールアドレスで登録エラー', async () => {
      const invalidUserData = userFactory.build({ email: 'invalid-email' });

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidUserData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    test('弱いパスワードで登録エラー', async () => {
      const weakPasswordData = userFactory.build({ password: '123' });

      const response = await request(app)
        .post('/api/auth/register')
        .send(weakPasswordData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('POST /api/auth/login', () => {
    let testUser;
    const testPassword = 'Test123!';

    beforeEach(async () => {
      testUser = await userFactory.create({
        password: await bcrypt.hash(testPassword, 10)
      });
    });

    test('正常なログインができる', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testPassword
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.id).toBe(testUser.id);
      expect(response.body.data.user).not.toHaveProperty('password');
      expect(response.body.data.token).toBeDefined();
      expect(response.headers['set-cookie']).toBeDefined();
    });

    test('ユーザー名でのログインができる', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: testUser.username,
          password: testPassword
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.id).toBe(testUser.id);
    });

    test('間違ったパスワードでログインエラー', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrong-password'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('認証情報');
    });

    test('存在しないユーザーでログインエラー', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: testPassword
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('必須フィールド不足でバリデーションエラー', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email
          // passwordが不足
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('POST /api/auth/logout', () => {
    test('正常なログアウトができる', async () => {
      // まずログイン
      const user = await userFactory.create();
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: 'Test123!'
        });

      const token = loginResponse.body.data.token;

      // ログアウト
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('ログアウト');
    });

    test('無効なトークンでログアウトエラー', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/profile', () => {
    test('認証済みユーザーのプロフィール取得', async () => {
      const user = await userFactory.create();
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: 'Test123!'
        });

      const token = loginResponse.body.data.token;

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(user.id);
      expect(response.body.data).not.toHaveProperty('password');
    });

    test('未認証でプロフィール取得エラー', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    test('パスワードリセット要求ができる', async () => {
      const user = await userFactory.create();

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: user.email })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('リセット');
    });

    test('存在しないメールアドレスでもセキュリティ上成功レスポンス', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@test.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/auth/reset-password', () => {
    test('有効なトークンでパスワードリセットができる', async () => {
      const user = await userFactory.create();
      
      // リセット要求
      await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: user.email });

      // 実際のトークンの代わりにテスト用の固定トークンを使用
      const testToken = 'test-reset-token';
      const newPassword = 'NewPassword123!';

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: testToken,
          password: newPassword
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('リセット完了');
    });

    test('無効なトークンでパスワードリセットエラー', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'invalid-token',
          password: 'NewPassword123!'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('JWT Token Security', () => {
    test('改ざんされたトークンを拒否する', async () => {
      const user = await userFactory.create();
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: 'Test123!'
        });

      const validToken = loginResponse.body.data.token;
      const tamperedToken = validToken.slice(0, -5) + 'XXXXX';

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${tamperedToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('期限切れトークンを拒否する', async () => {
      // 期限切れトークンのテスト（実装により異なる）
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImV4cCI6MTYwOTQ1OTIwMH0.invalid';

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Rate Limiting', () => {
    test('ログイン試行回数制限', async () => {
      const user = await userFactory.create();

      // 複数回の失敗ログイン試行
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            email: user.email,
            password: 'wrong-password'
          });
      }

      // 6回目でレート制限
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: 'wrong-password'
        })
        .expect(429);

      expect(response.body.message).toContain('制限');
    });
  });

  describe('Session Management', () => {
    test('セッションクッキーが適切に設定される', async () => {
      const user = await userFactory.create();

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: 'Test123!'
        });

      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      
      const sessionCookie = cookies.find(cookie => cookie.includes('session'));
      expect(sessionCookie).toContain('HttpOnly');
      expect(sessionCookie).toContain('Secure');
    });
  });
});