const userController = require('../../../src/controllers/userController');
const { User } = require('../../../src/models');
const { userFactory, DatabaseHelper } = require('../../helpers');

// モック設定
jest.mock('../../../src/models');

describe('User Controller', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      query: {},
      user: null
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };
    next = jest.fn();
    
    // モッククリア
    jest.clearAllMocks();
  });

  describe('ユーザー一覧取得', () => {
    test('正常にユーザー一覧を取得できる', async () => {
      const mockUsers = [
        userFactory.build({ id: 1 }),
        userFactory.build({ id: 2 })
      ];
      
      User.findAll.mockResolvedValue(mockUsers);

      await userController.getAllUsers(req, res, next);

      expect(User.findAll).toHaveBeenCalledWith({
        attributes: { exclude: ['password'] }
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockUsers
      });
    });

    test('データベースエラー時に500エラーを返す', async () => {
      const dbError = new Error('Database connection failed');
      User.findAll.mockRejectedValue(dbError);

      await userController.getAllUsers(req, res, next);

      expect(next).toHaveBeenCalledWith(dbError);
    });
  });

  describe('ユーザー詳細取得', () => {
    test('正常にユーザー詳細を取得できる', async () => {
      const userId = 1;
      const mockUser = userFactory.build({ id: userId });
      
      req.params.id = userId;
      User.findByPk.mockResolvedValue(mockUser);

      await userController.getUserById(req, res, next);

      expect(User.findByPk).toHaveBeenCalledWith(userId, {
        attributes: { exclude: ['password'] }
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockUser
      });
    });

    test('存在しないユーザーIDで404エラーを返す', async () => {
      const userId = 999;
      req.params.id = userId;
      User.findByPk.mockResolvedValue(null);

      await userController.getUserById(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'ユーザーが見つかりません'
      });
    });
  });

  describe('ユーザー作成', () => {
    test('正常にユーザーを作成できる', async () => {
      const userData = userFactory.build();
      const mockCreatedUser = { ...userData, id: 1 };
      
      req.body = userData;
      User.create.mockResolvedValue(mockCreatedUser);

      await userController.createUser(req, res, next);

      expect(User.create).toHaveBeenCalledWith(userData);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockCreatedUser,
        message: 'ユーザーが正常に作成されました'
      });
    });

    test('バリデーションエラー時に400エラーを返す', async () => {
      const invalidUserData = { email: 'invalid-email' };
      const validationError = new Error('Validation error');
      validationError.name = 'SequelizeValidationError';
      
      req.body = invalidUserData;
      User.create.mockRejectedValue(validationError);

      await userController.createUser(req, res, next);

      expect(next).toHaveBeenCalledWith(validationError);
    });
  });

  describe('ユーザー更新', () => {
    test('正常にユーザー情報を更新できる', async () => {
      const userId = 1;
      const updateData = { firstName: 'Updated Name' };
      const mockUser = userFactory.build({ id: userId });
      
      req.params.id = userId;
      req.body = updateData;
      User.findByPk.mockResolvedValue(mockUser);
      mockUser.update = jest.fn().mockResolvedValue({ ...mockUser, ...updateData });

      await userController.updateUser(req, res, next);

      expect(User.findByPk).toHaveBeenCalledWith(userId);
      expect(mockUser.update).toHaveBeenCalledWith(updateData);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('ユーザー削除', () => {
    test('正常にユーザーを削除できる', async () => {
      const userId = 1;
      const mockUser = userFactory.build({ id: userId });
      
      req.params.id = userId;
      User.findByPk.mockResolvedValue(mockUser);
      mockUser.destroy = jest.fn().mockResolvedValue();

      await userController.deleteUser(req, res, next);

      expect(User.findByPk).toHaveBeenCalledWith(userId);
      expect(mockUser.destroy).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'ユーザーが削除されました'
      });
    });
  });
});