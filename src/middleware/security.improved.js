const crypto = require('crypto');
const EnvironmentConfig = require('../config/env');

/**
 * 改善されたセキュリティミドルウェア
 * 
 * 機能:
 * - より強力なCSP設定
 * - XSS/SQLインジェクション防止の改善
 * - セキュリティヘッダーの最適化
 * - リクエスト署名検証
 * - コンテンツ検証
 */

class SecurityMiddleware {
  constructor() {
    this.config = EnvironmentConfig.getConfig();
    this.isProduction = EnvironmentConfig.isProduction();
  }

  /**
   * 包括的なセキュリティヘッダー
   */
  securityHeaders() {
    return (req, res, next) => {
      // Content Security Policy - より厳格な設定
      const cspDirectives = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com https://fonts.googleapis.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com",
        "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com",
        "img-src 'self' data: https: blob:",
        "connect-src 'self' wss: https:",
        "media-src 'self'",
        "object-src 'none'",
        "frame-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "upgrade-insecure-requests"
      ];

      res.setHeader('Content-Security-Policy', cspDirectives.join('; '));
      
      // Strict Transport Security
      if (this.isProduction) {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
      }
      
      // その他のセキュリティヘッダー
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      res.setHeader('Permissions-Policy', 
        'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()'
      );
      
      // CORS関連のヘッダー（必要に応じて）
      if (req.headers.origin) {
        const allowedOrigins = this.config.cors.origin.split(',').map(o => o.trim());
        if (allowedOrigins.includes(req.headers.origin) || allowedOrigins.includes('*')) {
          res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
          res.setHeader('Access-Control-Allow-Credentials', 'true');
        }
      }
      
      next();
    };
  }

  /**
   * 入力サニタイゼーション（改善版）
   */
  sanitizeInput() {
    return (req, res, next) => {
      const sanitizeValue = (value) => {
        if (typeof value !== 'string') return value;
        
        // HTMLエンティティのエスケープ
        return value
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#x27;')
          .replace(/\//g, '&#x2F;')
          .replace(/\\/g, '&#x5C;')
          .replace(/`/g, '&#96;');
      };

      const sanitizeObject = (obj) => {
        if (obj === null || obj === undefined) return obj;
        
        if (Array.isArray(obj)) {
          return obj.map(sanitizeObject);
        }
        
        if (typeof obj === 'object') {
          const sanitized = {};
          for (const [key, value] of Object.entries(obj)) {
            // キー名も検証
            if (this.isValidKey(key)) {
              sanitized[key] = sanitizeObject(value);
            }
          }
          return sanitized;
        }
        
        return sanitizeValue(obj);
      };

      // リクエストデータのサニタイゼーション
      if (req.body) req.body = sanitizeObject(req.body);
      if (req.query) req.query = sanitizeObject(req.query);
      if (req.params) req.params = sanitizeObject(req.params);
      
      next();
    };
  }

  /**
   * キー名の検証
   */
  isValidKey(key) {
    // プロトタイプ汚染を防ぐ
    const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
    return !dangerousKeys.includes(key);
  }

  /**
   * SQLインジェクション防止（改善版）
   */
  preventSqlInjection() {
    return (req, res, next) => {
      const sqlPatterns = [
        // 基本的なSQLコマンド
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|EXEC|EXECUTE)\b)/i,
        // SQLコメント
        /(--|#|\/\*|\*\/)/,
        // 危険な文字の組み合わせ
        /(\bUNION\b.*\bSELECT\b)/i,
        /(\bOR\b.*\b1\s*=\s*1\b)/i,
        /(\bAND\b.*\b1\s*=\s*1\b)/i,
        // 16進数エンコーディング
        /(0x[0-9a-fA-F]+)/,
        // バッチコマンド
        /(\bEXEC\b|\bxp_)/i
      ];

      const checkValue = (value) => {
        if (typeof value !== 'string') return false;
        return sqlPatterns.some(pattern => pattern.test(value));
      };

      const checkObject = (obj) => {
        if (obj === null || obj === undefined) return false;
        
        if (typeof obj === 'string') {
          return checkValue(obj);
        }
        
        if (Array.isArray(obj)) {
          return obj.some(checkObject);
        }
        
        if (typeof obj === 'object') {
          return Object.values(obj).some(checkObject);
        }
        
        return false;
      };

      // チェック
      if (checkObject(req.body) || checkObject(req.query) || checkObject(req.params)) {
        return res.status(400).json({
          success: false,
          error: {
            message: '不正な文字が含まれています',
            code: 'INVALID_INPUT'
          }
        });
      }
      
      next();
    };
  }

  /**
   * リクエストサイズ制限
   */
  requestSizeLimit() {
    return (req, res, next) => {
      const maxSize = this.config.upload.maxFileSize || 10485760; // 10MB
      
      let size = 0;
      req.on('data', (chunk) => {
        size += chunk.length;
        if (size > maxSize) {
          res.status(413).json({
            success: false,
            error: {
              message: 'リクエストサイズが大きすぎます',
              code: 'PAYLOAD_TOO_LARGE'
            }
          });
          req.connection.destroy();
        }
      });
      
      next();
    };
  }

  /**
   * リクエスト署名検証（Webhook等用）
   */
  verifyRequestSignature(secret) {
    return (req, res, next) => {
      const signature = req.headers['x-signature'];
      if (!signature) {
        return res.status(401).json({
          success: false,
          error: {
            message: '署名が提供されていません',
            code: 'MISSING_SIGNATURE'
          }
        });
      }

      const payload = JSON.stringify(req.body);
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
        return res.status(401).json({
          success: false,
          error: {
            message: '無効な署名です',
            code: 'INVALID_SIGNATURE'
          }
        });
      }

      next();
    };
  }

  /**
   * コンテンツタイプ検証
   */
  validateContentType(allowedTypes = ['application/json']) {
    return (req, res, next) => {
      if (req.method === 'GET' || req.method === 'DELETE') {
        return next();
      }

      const contentType = req.headers['content-type'];
      if (!contentType) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Content-Typeヘッダーが必要です',
            code: 'MISSING_CONTENT_TYPE'
          }
        });
      }

      const isAllowed = allowedTypes.some(type => contentType.includes(type));
      if (!isAllowed) {
        return res.status(415).json({
          success: false,
          error: {
            message: 'サポートされていないコンテンツタイプです',
            code: 'UNSUPPORTED_MEDIA_TYPE'
          }
        });
      }

      next();
    };
  }

  /**
   * IPベースのアクセス制御
   */
  ipAccessControl(options = {}) {
    const { whitelist = [], blacklist = [] } = options;
    
    return (req, res, next) => {
      const clientIP = this.getClientIP(req);
      
      // ブラックリストチェック
      if (blacklist.length > 0 && blacklist.includes(clientIP)) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'アクセスが拒否されました',
            code: 'ACCESS_DENIED'
          }
        });
      }
      
      // ホワイトリストチェック
      if (whitelist.length > 0 && !whitelist.includes(clientIP)) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'アクセスが許可されていません',
            code: 'ACCESS_NOT_ALLOWED'
          }
        });
      }
      
      next();
    };
  }

  /**
   * クライアントIPの取得
   */
  getClientIP(req) {
    return req.ip || 
           req.headers['x-forwarded-for']?.split(',')[0] ||
           req.connection.remoteAddress || 
           req.socket.remoteAddress ||
           'unknown';
  }

  /**
   * NoSQLインジェクション防止
   */
  preventNoSQLInjection() {
    return (req, res, next) => {
      const checkObject = (obj) => {
        if (obj === null || obj === undefined) return false;
        
        for (const [key, value] of Object.entries(obj)) {
          // MongoDBの危険なオペレーター
          if (key.startsWith('$')) {
            return true;
          }
          
          if (typeof value === 'object' && value !== null) {
            if (checkObject(value)) return true;
          }
        }
        
        return false;
      };

      if (checkObject(req.body) || checkObject(req.query)) {
        return res.status(400).json({
          success: false,
          error: {
            message: '不正なクエリオペレーターが検出されました',
            code: 'INVALID_OPERATOR'
          }
        });
      }
      
      next();
    };
  }
}

// シングルトンインスタンスを作成
const security = new SecurityMiddleware();

module.exports = {
  securityHeaders: security.securityHeaders.bind(security),
  sanitizeInput: security.sanitizeInput.bind(security),
  preventSqlInjection: security.preventSqlInjection.bind(security),
  requestSizeLimit: security.requestSizeLimit.bind(security),
  verifyRequestSignature: security.verifyRequestSignature.bind(security),
  validateContentType: security.validateContentType.bind(security),
  ipAccessControl: security.ipAccessControl.bind(security),
  preventNoSQLInjection: security.preventNoSQLInjection.bind(security)
};