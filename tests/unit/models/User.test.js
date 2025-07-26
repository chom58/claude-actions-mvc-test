const { User } = require('../../../src/models');
const { userFactory, DatabaseHelper } = require('../../helpers');

describe('User Model', () => {
  beforeEach(async () => {
    await DatabaseHelper.cleanDatabase();
  });

  afterAll(async () => {
    await DatabaseHelper.closeDatabase();
  });

  describe('User作成', () => {
    test('有効なデータでユーザーを作成できる', async () => {
      const userData = userFactory.build();
      const user = await User.create(userData);

      expect(user.id).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.username).toBe(userData.username);
      expect(user.role).toBe('user');
    });

    test('重複したメールアドレスでユーザーを作成できない', async () => {
      const userData = userFactory.build({ email: 'test@example.com' });
      await User.create(userData);

      const duplicateUserData = userFactory.build({ email: 'test@example.com' });
      
      await expect(User.create(duplicateUserData)).rejects.toThrow();
    });

    test('無効なメールアドレスでユーザーを作成できない', async () => {
      const userData = userFactory.build({ email: 'invalid-email' });
      
      await expect(User.create(userData)).rejects.toThrow();
    });
  });

  describe('パスワードハッシュ化', () => {
    test('ユーザー作成時にパスワードがハッシュ化される', async () => {
      const plainPassword = 'Test123!';
      const userData = userFactory.build({ password: plainPassword });
      const user = await User.create(userData);

      expect(user.password).not.toBe(plainPassword);
      expect(user.password).toMatch(/^\$2[aby]\$/); // bcryptハッシュパターン
    });
  });

  describe('バリデーション', () => {
    test('メールアドレスが必須', async () => {
      const userData = userFactory.build({ email: null });
      
      await expect(User.create(userData)).rejects.toThrow();
    });

    test('ユーザー名が必須', async () => {
      const userData = userFactory.build({ username: null });
      
      await expect(User.create(userData)).rejects.toThrow();
    });

    test('パスワードが必須', async () => {
      const userData = userFactory.build({ password: null });
      
      await expect(User.create(userData)).rejects.toThrow();
    });
  });

  describe('ユーザー検索', () => {
    beforeEach(async () => {
      await userFactory.createMany(5);
    });

    test('全ユーザーを取得できる', async () => {
      const users = await User.findAll();
      expect(users).toHaveLength(5);
    });

    test('メールアドレスでユーザーを検索できる', async () => {
      const userData = userFactory.build({ email: 'search@test.com' });
      const createdUser = await User.create(userData);

      const foundUser = await User.findOne({ where: { email: 'search@test.com' } });
      expect(foundUser.id).toBe(createdUser.id);
    });
  });
});