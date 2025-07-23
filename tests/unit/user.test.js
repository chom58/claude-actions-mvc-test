const { User } = require('../../src/models');

describe('User Model', () => {
  beforeEach(async () => {
    await User.destroy({ where: {} });
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      const user = await User.create(userData);

      expect(user.username).toBe(userData.username);
      expect(user.email).toBe(userData.email);
      expect(user.password).not.toBe(userData.password); // パスワードはハッシュ化される
      expect(user.isActive).toBe(true);
    });

    it('should hash password before saving', async () => {
      const plainPassword = 'password123';
      const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: plainPassword
      });

      expect(user.password).not.toBe(plainPassword);
      expect(user.password.length).toBeGreaterThan(plainPassword.length);
    });

    it('should not allow duplicate email', async () => {
      const userData = {
        username: 'testuser1',
        email: 'test@example.com',
        password: 'password123'
      };

      await User.create(userData);

      await expect(User.create({
        username: 'testuser2',
        email: userData.email,
        password: 'password456'
      })).rejects.toThrow();
    });
  });

  describe('comparePassword', () => {
    it('should return true for correct password', async () => {
      const plainPassword = 'password123';
      const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: plainPassword
      });

      const isMatch = await user.comparePassword(plainPassword);
      expect(isMatch).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      });

      const isMatch = await user.comparePassword('wrongpassword');
      expect(isMatch).toBe(false);
    });
  });

  describe('toJSON', () => {
    it('should exclude password from JSON output', async () => {
      const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      });

      const json = user.toJSON();
      expect(json.password).toBeUndefined();
      expect(json.username).toBe('testuser');
      expect(json.email).toBe('test@example.com');
    });
  });
});