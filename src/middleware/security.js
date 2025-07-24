// セキュリティミドルウェア

// XSS防止ミドルウェア
const sanitizeInput = (req, res, next) => {
  const sanitizeObject = (obj) => {
    if (typeof obj === 'string') {
      // 基本的なXSS文字をエスケープ
      return obj
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitizeObject(value);
      }
      return sanitized;
    }
    
    return obj;
  };

  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }
  
  next();
};

// SQLインジェクション防止（基本的なバリデーション）
const preventSqlInjection = (req, res, next) => {
  const checkForSqlInjection = (str) => {
    if (typeof str !== 'string') return false;
    
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
      /(--|\/\*|\*\/|;|'|"|`)/,
      /(\bOR\b|\bAND\b).*(\b=\b|\b1=1\b|\b1=\b)/i
    ];
    
    return sqlPatterns.some(pattern => pattern.test(str));
  };

  const checkObject = (obj) => {
    if (typeof obj === 'string') {
      return checkForSqlInjection(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.some(checkObject);
    }
    
    if (obj && typeof obj === 'object') {
      return Object.values(obj).some(checkObject);
    }
    
    return false;
  };

  if (checkObject(req.body) || checkObject(req.query) || checkObject(req.params)) {
    return res.status(400).json({
      error: '不正な文字が含まれています'
    });
  }
  
  next();
};

// CSRF保護用のトークン生成
const generateCSRFToken = () => {
  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('hex');
};

// CSRFトークンのハッシュ化（セキュリティ強化）
const hashCSRFToken = (token, secret) => {
  const crypto = require('crypto');
  return crypto.createHmac('sha256', secret).update(token).digest('hex');
};

// CSRFトークンの検証
const verifyCSRFToken = (token, hashedToken, secret) => {
  try {
    const expectedHash = hashCSRFToken(token, secret);
    return crypto.timingSafeEqual(Buffer.from(expectedHash), Buffer.from(hashedToken));
  } catch (error) {
    return false;
  }
};

// CSRF保護ミドルウェア（改良版）
const csrfProtection = (options = {}) => {
  const {
    generateToken = true,
    validateToken = true,
    tokenName = 'csrfToken',
    headerName = 'x-csrf-token',
    bodyField = '_csrf',
    skipMethods = ['GET', 'HEAD', 'OPTIONS'],
    skipPaths = [],
    errorMessage = 'CSRF保護: 無効なトークンです'
  } = options;

  return (req, res, next) => {
    const { sessionHelpers } = require('../config/session');
    
    // セッションが必要
    if (!req.session) {
      return res.status(500).json({
        error: 'セッションが初期化されていません'
      });
    }

    // スキップするパスの確認
    if (skipPaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    // GETリクエストなどでトークンを生成
    if (skipMethods.includes(req.method)) {
      if (generateToken && !sessionHelpers.getCSRFToken(req)) {
        const token = generateCSRFToken();
        const secret = process.env.CSRF_SECRET || 'csrf-secret-key';
        const hashedToken = hashCSRFToken(token, secret);
        
        sessionHelpers.setCSRFToken(req, hashedToken);
        
        // レスポンスヘッダーにトークンを含める
        res.setHeader('X-CSRF-Token', token);
        
        // APIレスポンスにトークンを含める場合
        if (req.path.startsWith('/api/')) {
          res.locals.csrfToken = token;
        }
      }
      return next();
    }

    // POST、PUT、DELETE等でトークンを検証
    if (validateToken) {
      const token = req.headers[headerName] || req.body[bodyField];
      const sessionToken = sessionHelpers.getCSRFToken(req);
      const secret = process.env.CSRF_SECRET || 'csrf-secret-key';

      if (!token) {
        return res.status(403).json({
          error: 'CSRFトークンが提供されていません',
          code: 'CSRF_TOKEN_MISSING'
        });
      }

      if (!sessionToken) {
        return res.status(403).json({
          error: 'セッションにCSRFトークンがありません',
          code: 'CSRF_SESSION_MISSING'
        });
      }

      if (!verifyCSRFToken(token, sessionToken, secret)) {
        return res.status(403).json({
          error: errorMessage,
          code: 'CSRF_TOKEN_INVALID'
        });
      }
    }
    
    next();
  };
};

// CSRFトークン取得エンドポイント用ミドルウェア
const csrfTokenEndpoint = (req, res) => {
  const { sessionHelpers } = require('../config/session');
  
  if (!req.session) {
    return res.status(500).json({
      error: 'セッションが初期化されていません'
    });
  }

  let token = generateCSRFToken();
  let sessionToken = sessionHelpers.getCSRFToken(req);
  
  // 新しいトークンを生成してセッションに保存
  const secret = process.env.CSRF_SECRET || 'csrf-secret-key';
  const hashedToken = hashCSRFToken(token, secret);
  sessionHelpers.setCSRFToken(req, hashedToken);

  res.json({
    message: 'CSRFトークンを取得しました',
    csrfToken: token,
    expires: new Date(Date.now() + (req.session.cookie.maxAge || 24 * 60 * 60 * 1000))
  });
};

// セキュリティヘッダーの設定
const securityHeaders = (req, res, next) => {
  // Content Security Policy
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "font-src 'self' https:; " +
    "connect-src 'self';"
  );
  
  // X-Frame-Options
  res.setHeader('X-Frame-Options', 'DENY');
  
  // X-Content-Type-Options
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions Policy
  res.setHeader('Permissions-Policy', 
    'geolocation=(), microphone=(), camera=()'
  );
  
  next();
};

// IPホワイトリスト機能（管理用）
const createIPWhitelist = (allowedIPs = []) => {
  return (req, res, next) => {
    const clientIP = req.ip || 
                    req.connection.remoteAddress || 
                    req.socket.remoteAddress ||
                    (req.connection.socket ? req.connection.socket.remoteAddress : null);
    
    if (allowedIPs.length > 0 && !allowedIPs.includes(clientIP)) {
      return res.status(403).json({
        error: 'アクセスが拒否されました'
      });
    }
    
    next();
  };
};

module.exports = {
  sanitizeInput,
  preventSqlInjection,
  generateCSRFToken,
  hashCSRFToken,
  verifyCSRFToken,
  csrfProtection,
  csrfTokenEndpoint,
  securityHeaders,
  createIPWhitelist
};