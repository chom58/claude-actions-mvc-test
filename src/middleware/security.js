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

// CSRF保護ミドルウェア
const csrfProtection = (req, res, next) => {
  // GET, HEAD, OPTIONS は除外
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const token = req.headers['x-csrf-token'] || req.body._csrf;
  const sessionToken = req.session?.csrfToken;

  if (!token || !sessionToken || token !== sessionToken) {
    return res.status(403).json({
      error: 'CSRF保護: 無効なトークンです'
    });
  }
  
  next();
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
  csrfProtection,
  securityHeaders,
  createIPWhitelist
};