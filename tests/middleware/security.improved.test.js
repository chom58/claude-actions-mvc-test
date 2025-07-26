const security = require('../../src/middleware/security.improved');

describe('改善されたセキュリティミドルウェア', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {},
      query: {},
      params: {},
      headers: {},
      method: 'POST',
      path: '/api/test',
      ip: '127.0.0.1'
    };
    res = {
      setHeader: jest.fn(),
      status: jest.fn(() => res),
      json: jest.fn()
    };
    next = jest.fn();
  });

  describe('securityHeaders', () => {
    it('適切なセキュリティヘッダーを設定する', () => {
      const middleware = security.securityHeaders();
      middleware(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Security-Policy', expect.any(String));
      expect(res.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
      expect(res.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
      expect(res.setHeader).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block');
      expect(res.setHeader).toHaveBeenCalledWith('Referrer-Policy', 'strict-origin-when-cross-origin');
      expect(next).toHaveBeenCalled();
    });
  });

  describe('sanitizeInput', () => {
    it('HTMLエンティティをエスケープする', () => {
      req.body = {
        name: '<script>alert("XSS")</script>',
        description: 'Test & "quotes" \'single\''
      };

      const middleware = security.sanitizeInput();
      middleware(req, res, next);

      expect(req.body.name).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;');
      expect(req.body.description).toBe('Test &amp; &quot;quotes&quot; &#x27;single&#x27;');
      expect(next).toHaveBeenCalled();
    });

    it('プロトタイプ汚染を防ぐ', () => {
      req.body = {
        __proto__: { isAdmin: true },
        constructor: { isAdmin: true },
        normal: 'value'
      };

      const middleware = security.sanitizeInput();
      middleware(req, res, next);

      expect(req.body.__proto__).toBeUndefined();
      expect(req.body.constructor).toBeUndefined();
      expect(req.body.normal).toBe('value');
    });
  });

  describe('preventSqlInjection', () => {
    it('SQLインジェクションパターンを検出する', () => {
      const testCases = [
        'SELECT * FROM users',
        '1 OR 1=1',
        'DROP TABLE users--',
        'UNION SELECT password FROM users'
      ];

      const middleware = security.preventSqlInjection();

      testCases.forEach(injection => {
        req.body = { query: injection };
        middleware(req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          error: expect.objectContaining({
            code: 'INVALID_INPUT'
          })
        });
      });
    });

    it('正常な入力を通す', () => {
      req.body = { query: 'normal search term' };
      
      const middleware = security.preventSqlInjection();
      middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('preventNoSQLInjection', () => {
    it('MongoDBオペレーターを検出する', () => {
      req.body = {
        username: { $ne: null },
        password: { $gt: '' }
      };

      const middleware = security.preventNoSQLInjection();
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: expect.objectContaining({
          code: 'INVALID_OPERATOR'
        })
      });
    });
  });

  describe('validateContentType', () => {
    it('適切なContent-Typeを受け入れる', () => {
      req.headers['content-type'] = 'application/json';

      const middleware = security.validateContentType();
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('不適切なContent-Typeを拒否する', () => {
      req.headers['content-type'] = 'text/plain';

      const middleware = security.validateContentType();
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(415);
    });
  });
});