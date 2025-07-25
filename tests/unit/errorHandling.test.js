const {
  checkValidationErrors,
  checkResourceExists,
  checkAuthentication,
  checkOwnership,
  getPaginationParams,
  getSortParams,
  sendSuccessResponse,
  sendPaginatedResponse,
  handleUploadError,
  dbHelpers,
  sanitizeSearchQuery,
  sanitizeHtml,
  parseJsonSafely
} = require('../../src/utils/controllerHelpers');

const {
  ValidationError,
  NotFoundError,
  AuthenticationError,
  createError
} = require('../../src/utils/errorTypes');

const { validationResult } = require('express-validator');

// Mocks
jest.mock('express-validator');

describe('Controller Helpers - Error Handling', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    mockReq = {
      body: {},
      query: {},
      user: null,
      session: {}
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis()
    };

    jest.clearAllMocks();
  });

  describe('checkValidationErrors', () => {
    it('should throw ValidationError when validation errors exist', () => {
      const mockErrors = {
        isEmpty: () => false,
        array: () => [
          { param: 'email', msg: 'Invalid email', value: 'invalid-email' },
          { param: 'password', msg: 'Password too short', value: '123' }
        ]
      };
      
      validationResult.mockReturnValue(mockErrors);

      expect(() => checkValidationErrors(mockReq)).toThrow(ValidationError);
      expect(() => checkValidationErrors(mockReq)).toThrow('入力データのバリデーションエラー');
    });

    it('should not throw when no validation errors exist', () => {
      const mockErrors = {
        isEmpty: () => true,
        array: () => []
      };
      
      validationResult.mockReturnValue(mockErrors);

      expect(() => checkValidationErrors(mockReq)).not.toThrow();
    });

    it('should format validation errors correctly', () => {
      const mockErrors = {
        isEmpty: () => false,
        array: () => [
          { param: 'email', msg: 'Invalid email format', value: 'test@' }
        ]
      };
      
      validationResult.mockReturnValue(mockErrors);

      try {
        checkValidationErrors(mockReq);
      } catch (error) {
        expect(error.details).toEqual([{
          field: 'email',
          message: 'Invalid email format',
          value: 'test@'
        }]);
      }
    });
  });

  describe('checkResourceExists', () => {
    it('should return resource when it exists', () => {
      const mockResource = { id: 1, name: 'Test Resource' };
      const result = checkResourceExists(mockResource, 'テストリソース');
      
      expect(result).toBe(mockResource);
    });

    it('should throw NotFoundError when resource is null', () => {
      expect(() => checkResourceExists(null, 'ユーザー')).toThrow(NotFoundError);
      expect(() => checkResourceExists(null, 'ユーザー')).toThrow('ユーザーが見つかりません');
    });

    it('should throw NotFoundError when resource is undefined', () => {
      expect(() => checkResourceExists(undefined, '投稿')).toThrow(NotFoundError);
      expect(() => checkResourceExists(undefined, '投稿')).toThrow('投稿が見つかりません');
    });

    it('should use default resource name when not provided', () => {
      expect(() => checkResourceExists(null)).toThrow('リソースが見つかりません');
    });
  });

  describe('checkAuthentication', () => {
    it('should return user from req.user', () => {
      const mockUser = { id: 1, username: 'testuser' };
      mockReq.user = mockUser;

      const result = checkAuthentication(mockReq);
      expect(result).toBe(mockUser);
    });

    it('should return user from req.session.user', () => {
      const mockUser = { id: 1, username: 'testuser' };
      mockReq.session.user = mockUser;

      const result = checkAuthentication(mockReq);
      expect(result).toBe(mockUser);
    });

    it('should throw AuthenticationError when no user is present', () => {
      expect(() => checkAuthentication(mockReq)).toThrow(AuthenticationError);
      expect(() => checkAuthentication(mockReq)).toThrow('ログインが必要です');
    });

    it('should prefer req.user over session.user', () => {
      const reqUser = { id: 1, username: 'requser' };
      const sessionUser = { id: 2, username: 'sessionuser' };
      
      mockReq.user = reqUser;
      mockReq.session.user = sessionUser;

      const result = checkAuthentication(mockReq);
      expect(result).toBe(reqUser);
    });
  });

  describe('checkOwnership', () => {
    it('should allow access for resource owner', () => {
      const user = { id: 1, role: 'user' };
      const resourceUserId = 1;

      expect(() => checkOwnership(user, {}, resourceUserId)).not.toThrow();
    });

    it('should allow access for admin user', () => {
      const user = { id: 2, role: 'admin' };
      const resourceUserId = 1;

      expect(() => checkOwnership(user, {}, resourceUserId)).not.toThrow();
    });

    it('should allow access for isAdmin flag', () => {
      const user = { id: 2, isAdmin: true };
      const resourceUserId = 1;

      expect(() => checkOwnership(user, {}, resourceUserId)).not.toThrow();
    });

    it('should throw AuthorizationError for non-owner non-admin', () => {
      const user = { id: 2, role: 'user' };
      const resourceUserId = 1;

      expect(() => checkOwnership(user, {}, resourceUserId)).toThrow();
    });

    it('should handle userId field properly', () => {
      const user = { userId: 1, role: 'user' };
      const resourceUserId = 1;

      expect(() => checkOwnership(user, {}, resourceUserId)).not.toThrow();
    });
  });

  describe('getPaginationParams', () => {
    it('should return default pagination params', () => {
      const result = getPaginationParams({});
      
      expect(result).toEqual({
        page: 1,
        limit: 20,
        offset: 0
      });
    });

    it('should parse valid pagination params', () => {
      const query = { page: '3', limit: '15' };
      const result = getPaginationParams(query);
      
      expect(result).toEqual({
        page: 3,
        limit: 15,
        offset: 30 // (3-1) * 15
      });
    });

    it('should enforce minimum values', () => {
      const query = { page: '0', limit: '0' };
      const result = getPaginationParams(query);
      
      expect(result).toEqual({
        page: 1,
        limit: 1,
        offset: 0
      });
    });

    it('should enforce maximum limit', () => {
      const query = { page: '1', limit: '200' };
      const result = getPaginationParams(query);
      
      expect(result.limit).toBe(100);
    });

    it('should handle invalid numeric values', () => {
      const query = { page: 'invalid', limit: 'invalid' };
      const result = getPaginationParams(query);
      
      expect(result).toEqual({
        page: 1,
        limit: 20,
        offset: 0
      });
    });
  });

  describe('getSortParams', () => {
    it('should return default sort params', () => {
      const result = getSortParams({});
      
      expect(result).toEqual({
        sortBy: 'createdAt',
        sortOrder: 'DESC'
      });
    });

    it('should parse valid sort params', () => {
      const query = { sortBy: 'updatedAt', sortOrder: 'ASC' };
      const result = getSortParams(query, ['createdAt', 'updatedAt']);
      
      expect(result).toEqual({
        sortBy: 'updatedAt',
        sortOrder: 'ASC'
      });
    });

    it('should reject invalid sortBy field', () => {
      const query = { sortBy: 'invalidField', sortOrder: 'ASC' };
      const result = getSortParams(query, ['createdAt', 'updatedAt']);
      
      expect(result.sortBy).toBe('createdAt');
    });

    it('should handle case insensitive sort order', () => {
      const query = { sortOrder: 'asc' };
      const result = getSortParams(query);
      
      expect(result.sortOrder).toBe('ASC');
    });

    it('should reject invalid sort order', () => {
      const query = { sortOrder: 'INVALID' };
      const result = getSortParams(query);
      
      expect(result.sortOrder).toBe('DESC');
    });
  });

  describe('sendSuccessResponse', () => {
    it('should send success response with default values', () => {
      const data = { id: 1, name: 'test' };
      sendSuccessResponse(mockRes, data);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: '処理が正常に完了しました',
        data,
        timestamp: expect.any(String)
      });
    });

    it('should send success response with custom values', () => {
      const data = { id: 1, name: 'test' };
      const message = 'カスタムメッセージ';
      const statusCode = 201;

      sendSuccessResponse(mockRes, data, message, statusCode);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message,
        data,
        timestamp: expect.any(String)
      });
    });
  });

  describe('sendPaginatedResponse', () => {
    it('should send paginated response', () => {
      const data = [{ id: 1 }, { id: 2 }];
      const pagination = { page: 1, limit: 10, total: 25 };

      sendPaginatedResponse(mockRes, data, pagination);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'データを取得しました',
        data,
        pagination: {
          currentPage: 1,
          totalPages: 3, // Math.ceil(25/10)
          totalItems: 25,
          itemsPerPage: 10
        },
        timestamp: expect.any(String)
      });
    });
  });

  describe('sanitizeSearchQuery', () => {
    it('should remove dangerous SQL characters', () => {
      const maliciousQuery = `test'; DROP TABLE users; --`;
      const result = sanitizeSearchQuery(maliciousQuery);

      expect(result).not.toContain("'");
      expect(result).not.toContain(';');
      expect(result).not.toContain('--');
      expect(result).toBe('test DROP TABLE users ');
    });

    it('should handle non-string input', () => {
      expect(sanitizeSearchQuery(null)).toBe('');
      expect(sanitizeSearchQuery(undefined)).toBe('');
      expect(sanitizeSearchQuery(123)).toBe('');
    });

    it('should limit string length', () => {
      const longString = 'a'.repeat(200);
      const result = sanitizeSearchQuery(longString);

      expect(result.length).toBeLessThanOrEqual(100);
    });

    it('should trim whitespace', () => {
      const result = sanitizeSearchQuery('  test query  ');
      expect(result).toBe('test query');
    });
  });

  describe('sanitizeHtml', () => {
    it('should escape HTML special characters', () => {
      const htmlString = '<script>alert("XSS")</script>';
      const result = sanitizeHtml(htmlString);

      expect(result).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;');
    });

    it('should handle non-string input', () => {
      expect(sanitizeHtml(null)).toBe(null);
      expect(sanitizeHtml(undefined)).toBe(undefined);
      expect(sanitizeHtml(123)).toBe(123);
    });

    it('should escape all dangerous characters', () => {
      const dangerous = '&<>"\'\/';
      const result = sanitizeHtml(dangerous);

      expect(result).toBe('&amp;&lt;&gt;&quot;&#x27;&#x2F;');
    });
  });

  describe('parseJsonSafely', () => {
    it('should parse valid JSON', () => {
      const jsonString = '{"key": "value", "number": 123}';
      const result = parseJsonSafely(jsonString);

      expect(result).toEqual({ key: 'value', number: 123 });
    });

    it('should return default value for invalid JSON', () => {
      const invalidJson = 'invalid json string';
      const result = parseJsonSafely(invalidJson, { default: true });

      expect(result).toEqual({ default: true });
    });

    it('should return null as default when no default provided', () => {
      const result = parseJsonSafely('invalid json');
      expect(result).toBe(null);
    });

    it('should handle edge cases', () => {
      expect(parseJsonSafely('')).toBe(null);
      expect(parseJsonSafely('null')).toBe(null);
      expect(parseJsonSafely('undefined')).toBe(null);
    });
  });

  describe('handleUploadError', () => {
    it('should handle LIMIT_FILE_SIZE error', () => {
      const error = { code: 'LIMIT_FILE_SIZE', limit: 1024000 };
      
      expect(() => handleUploadError(error)).toThrow('ファイルサイズが上限を超えています');
    });

    it('should handle LIMIT_FILE_COUNT error', () => {
      const error = { code: 'LIMIT_FILE_COUNT', limit: 5 };
      
      expect(() => handleUploadError(error)).toThrow('ファイル数が上限を超えています');
    });

    it('should handle LIMIT_UNEXPECTED_FILE error', () => {
      const error = { code: 'LIMIT_UNEXPECTED_FILE', field: 'invalidField' };
      
      expect(() => handleUploadError(error)).toThrow('予期しないファイルフィールドです');
    });

    it('should handle unknown upload errors', () => {
      const error = { code: 'UNKNOWN_ERROR', message: 'Something went wrong' };
      
      expect(() => handleUploadError(error)).toThrow('ファイルアップロードエラー');
    });
  });
});