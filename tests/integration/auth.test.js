const request = require('supertest');
const app = require('../../src/app');
const { User } = require('../../src/models');

describe('Auth Endpoints', () => {
  beforeEach(async () => {
    await User.destroy({ where: {} });
  });

  describe('POST /api/users/register', () => {
    it('should register a new user', async () => {
      const userData = {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/users/register')
        .send(userData)
        .expect(201);

      expect(response.body.message).toBe('ユーザー登録が完了しました');
      expect(response.body.user.username).toBe(userData.username);
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user.password).toBeUndefined();
      expect(response.body.token).toBeDefined();
    });

    it('should return error for duplicate email', async () => {
      const userData = {
        username: 'user1',
        email: 'test@example.com',
        password: 'password123'
      };

      await User.create(userData);

      const response = await request(app)
        .post('/api/users/register')
        .send({
          username: 'user2',
          email: userData.email,
          password: 'password456'
        })
        .expect(400);

      expect(response.body.error).toBe('このメールアドレスは既に登録されています');
    });

    it('should validate input data', async () => {
      const response = await request(app)
        .post('/api/users/register')
        .send({
          username: 'ab', // 短すぎる
          email: 'invalid-email', // 無効なメール
          password: '12345' // 短すぎる
        })
        .expect(400);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/users/login', () => {
    let user;
    const password = 'password123';

    beforeEach(async () => {
      user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: password
      });
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/users/login')
        .send({
          email: user.email,
          password: password
        })
        .expect(200);

      expect(response.body.message).toBe('ログインに成功しました');
      expect(response.body.user.email).toBe(user.email);
      expect(response.body.token).toBeDefined();
    });

    it('should return error for invalid email', async () => {
      const response = await request(app)
        .post('/api/users/login')
        .send({
          email: 'wrong@example.com',
          password: password
        })
        .expect(401);

      expect(response.body.error).toBe('メールアドレスまたはパスワードが正しくありません');
    });

    it('should return error for invalid password', async () => {
      const response = await request(app)
        .post('/api/users/login')
        .send({
          email: user.email,
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body.error).toBe('メールアドレスまたはパスワードが正しくありません');
    });
  });

  describe('GET /api/users/profile', () => {
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

    it('should get user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.user.email).toBe(user.email);
      expect(response.body.user.username).toBe(user.username);
    });

    it('should return error without token', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .expect(401);

      expect(response.body.error).toBe('認証トークンが提供されていません');
    });

    it('should return error with invalid token', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.error).toBe('無効な認証トークンです');
    });
  });
});