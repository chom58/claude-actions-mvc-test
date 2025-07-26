const request = require('supertest');
const app = require('../../../src/app');
const { userFactory, AuthHelper, DatabaseHelper } = require('../../helpers');

describe('Users API Integration Tests', () => {
  beforeEach(async () => {
    await DatabaseHelper.resetDatabase();
  });

  afterAll(async () => {
    await DatabaseHelper.closeDatabase();
  });

  describe('GET /api/users', () => {
    test('管理者権限でユーザー一覧を取得できる', async () => {
      await userFactory.createMany(3);
      const { token } = await AuthHelper.createAdminWithToken();

      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(4); // 3 + 1 admin
      expect(response.body.data[0]).not.toHaveProperty('password');
    });

    test('一般ユーザーではアクセス不可', async () => {
      const { token } = await AuthHelper.createUserWithToken();

      await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    test('認証なしではアクセス不可', async () => {
      await request(app)
        .get('/api/users')
        .expect(401);
    });
  });

  describe('GET /api/users/:id', () => {
    test('正常にユーザー詳細を取得できる', async () => {
      const user = await userFactory.create();
      const { token } = await AuthHelper.createUserWithToken();

      const response = await request(app)
        .get(`/api/users/${user.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(user.id);
      expect(response.body.data.email).toBe(user.email);
      expect(response.body.data).not.toHaveProperty('password');
    });

    test('存在しないユーザーIDで404エラー', async () => {
      const { token } = await AuthHelper.createUserWithToken();

      const response = await request(app)
        .get('/api/users/999')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('ユーザーが見つかりません');
    });
  });

  describe('POST /api/users', () => {
    test('管理者権限で新規ユーザーを作成できる', async () => {
      const { token } = await AuthHelper.createAdminWithToken();
      const userData = userFactory.build();

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${token}`)
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe(userData.email);
      expect(response.body.data.username).toBe(userData.username);
      expect(response.body.message).toBe('ユーザーが正常に作成されました');
    });

    test('重複メールアドレスで作成エラー', async () => {
      const existingUser = await userFactory.create();
      const { token } = await AuthHelper.createAdminWithToken();
      const duplicateUserData = userFactory.build({ email: existingUser.email });

      await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${token}`)
        .send(duplicateUserData)
        .expect(400);
    });

    test('無効なデータで作成エラー', async () => {
      const { token } = await AuthHelper.createAdminWithToken();
      const invalidUserData = {
        email: 'invalid-email',
        username: '',
        password: '123' // 短すぎるパスワード
      };

      await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${token}`)
        .send(invalidUserData)
        .expect(400);
    });
  });

  describe('PUT /api/users/:id', () => {
    test('ユーザーが自分の情報を更新できる', async () => {
      const { user, token } = await AuthHelper.createUserWithToken();
      const updateData = {
        firstName: 'Updated First Name',
        lastName: 'Updated Last Name'
      };

      const response = await request(app)
        .put(`/api/users/${user.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.firstName).toBe(updateData.firstName);
      expect(response.body.data.lastName).toBe(updateData.lastName);
    });

    test('他のユーザーの情報は更新できない', async () => {
      const otherUser = await userFactory.create();
      const { token } = await AuthHelper.createUserWithToken();
      const updateData = { firstName: 'Hacked Name' };

      await request(app)
        .put(`/api/users/${otherUser.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(403);
    });

    test('管理者は他のユーザー情報を更新できる', async () => {
      const user = await userFactory.create();
      const { token } = await AuthHelper.createAdminWithToken();
      const updateData = { firstName: 'Admin Updated' };

      const response = await request(app)
        .put(`/api/users/${user.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.firstName).toBe(updateData.firstName);
    });
  });

  describe('DELETE /api/users/:id', () => {
    test('管理者権限でユーザーを削除できる', async () => {
      const user = await userFactory.create();
      const { token } = await AuthHelper.createAdminWithToken();

      const response = await request(app)
        .delete(`/api/users/${user.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('ユーザーが削除されました');
    });

    test('一般ユーザーはユーザーを削除できない', async () => {
      const userToDelete = await userFactory.create();
      const { token } = await AuthHelper.createUserWithToken();

      await request(app)
        .delete(`/api/users/${userToDelete.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });

  describe('レート制限テスト', () => {
    test('短時間での連続リクエストはレート制限される', async () => {
      const { token } = await AuthHelper.createUserWithToken();
      
      // 短時間で多数のリクエストを送信
      const requests = Array(20).fill().map(() =>
        request(app)
          .get('/api/users/profile')
          .set('Authorization', `Bearer ${token}`)
      );

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });
});