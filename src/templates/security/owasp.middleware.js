const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const crypto = require('crypto');

/**
 * OWASP準拠セキュリティミドルウェア
 * 
 * OWASP Top 10に対応したセキュリティ対策の実装
 */
class OWASPSecurityMiddleware {
  constructor(config = {}) {
    this.config = {
      environment: process.env.NODE_ENV || 'development',
      trustProxy: config.trustProxy || false,
      sessionSecret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
      ...config
    };
  }

  /**
   * A01:2021 – アクセス制御の不備
   * 適切な認証・認可の実装
   */
  accessControl() {
    const AuthTemplate = require('./auth.template');
    const PermissionTemplate = require('./permission.template');
    
    return {
      authenticate: new AuthTemplate().authenticate(),
      authorize: (...roles) => new AuthTemplate().authorize(...roles),
      requirePermission: (permission, options) => 
        PermissionTemplate.requirePermission(permission, options)
    };
  }

  /**
   * A02:2021 – 暗号化の失敗
   * HTTPS強制、安全な暗号化設定
   */
  cryptographicFailures() {
    return (req, res, next) => {
      // HTTPS強制（本番環境）
      if (this.config.environment === 'production' && !req.secure) {
        return res.redirect(301, `https://${req.headers.host}${req.url}`);
      }
      
      // セキュアクッキー設定
      if (this.config.environment === 'production') {
        req.sessionOptions = {
          secure: true,
          httpOnly: true,
          sameSite: 'strict'
        };
      }
      
      next();
    };
  }

  /**
   * A03:2021 – インジェクション
   * SQLインジェクション、NoSQLインジェクション、コマンドインジェクション対策
   */
  injectionPrevention() {
    return [
      // NoSQLインジェクション対策
      mongoSanitize({
        replaceWith: '_',
        onSanitize: ({ req, key }) => {
          console.warn(`NoSQL Injection attempt blocked: ${key}`);
        }
      }),
      
      // SQLインジェクション対策（カスタム実装）
      (req, res, next) => {
        const sqlPatterns = [
          /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|CREATE|ALTER)\b)/gi,
          /(--|#|\/\*|\*\/)/g,
          /(\bOR\b.*\b1\s*=\s*1\b)/gi,
          /(\bAND\b.*\b1\s*=\s*1\b)/gi
        ];
        
        const checkForInjection = (data) => {
          if (typeof data === 'string') {
            return sqlPatterns.some(pattern => pattern.test(data));
          }
          if (typeof data === 'object' && data !== null) {
            return Object.values(data).some(checkForInjection);
          }
          return false;
        };
        
        if (checkForInjection(req.body) || 
            checkForInjection(req.query) || 
            checkForInjection(req.params)) {
          return res.status(400).json({
            success: false,
            error: { message: '不正な入力が検出されました' }
          });
        }
        
        next();
      }
    ];
  }

  /**
   * A04:2021 – 安全でない設計
   * セキュアな設計原則の実装
   */
  secureDesign() {
    return [
      // Helmetによる基本的なセキュリティヘッダー
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'"],
            fontSrc: ["'self'", 'https://fonts.gstatic.com'],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
          },
        },
        crossOriginEmbedderPolicy: true,
        crossOriginOpenerPolicy: true,
        crossOriginResourcePolicy: { policy: "cross-origin" },
        dnsPrefetchControl: true,
        frameguard: { action: 'deny' },
        hidePoweredBy: true,
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true
        },
        ieNoOpen: true,
        noSniff: true,
        originAgentCluster: true,
        permittedCrossDomainPolicies: false,
        referrerPolicy: { policy: "no-referrer" },
        xssFilter: true,
      }),
      
      // HTTPパラメータ汚染対策
      hpp({
        whitelist: ['sort', 'fields', 'page', 'limit']
      })
    ];
  }

  /**
   * A05:2021 – セキュリティの設定ミス
   * 適切なセキュリティ設定の強制
   */
  securityMisconfiguration() {
    return (req, res, next) => {
      // デバッグ情報の漏洩防止
      if (this.config.environment === 'production') {
        delete req.headers['x-powered-by'];
        
        // エラーレスポンスの統一化
        const originalSend = res.send;
        res.send = function(data) {
          if (res.statusCode >= 400 && typeof data === 'object' && data.stack) {
            delete data.stack;
            delete data.sql;
            delete data.systemError;
          }
          originalSend.call(this, data);
        };
      }
      
      // デフォルトコンテンツタイプの設定
      if (!res.headersSent && !res.get('Content-Type')) {
        res.type('application/json');
      }
      
      next();
    };
  }

  /**
   * A06:2021 – 脆弱で古いコンポーネント
   * 依存関係の監視（実装は外部ツールに依存）
   */
  vulnerableComponents() {
    return (req, res, next) => {
      // npm auditやSnykなどの外部ツールでの監視を推奨
      // ここでは基本的なバージョン情報の隠蔽のみ
      res.removeHeader('X-Powered-By');
      next();
    };
  }

  /**
   * A07:2021 – 識別と認証の失敗
   * 強力な認証メカニズムの実装
   */
  authenticationFailures() {
    // 認証試行のレート制限
    const authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15分
      max: 5, // 最大5回
      message: 'ログイン試行回数が多すぎます。しばらくしてから再試行してください。',
      standardHeaders: true,
      legacyHeaders: false,
      skipSuccessfulRequests: true,
      keyGenerator: (req) => {
        return req.ip + ':' + (req.body.email || req.body.username || '');
      }
    });
    
    // パスワードリセットのレート制限
    const passwordResetLimiter = rateLimit({
      windowMs: 60 * 60 * 1000, // 1時間
      max: 3, // 最大3回
      message: 'パスワードリセット要求が多すぎます。'
    });
    
    return {
      authLimiter,
      passwordResetLimiter
    };
  }

  /**
   * A08:2021 – ソフトウェアとデータの整合性の不備
   * データ整合性の検証
   */
  dataIntegrity() {
    return (req, res, next) => {
      // リクエスト署名検証（Webhook等）
      if (req.headers['x-webhook-signature']) {
        const payload = JSON.stringify(req.body);
        const expectedSignature = crypto
          .createHmac('sha256', this.config.webhookSecret || 'secret')
          .update(payload)
          .digest('hex');
        
        if (req.headers['x-webhook-signature'] !== expectedSignature) {
          return res.status(401).json({
            success: false,
            error: { message: '無効な署名です' }
          });
        }
      }
      
      // Content-MD5チェック（オプション）
      if (req.headers['content-md5']) {
        const bodyMd5 = crypto
          .createHash('md5')
          .update(JSON.stringify(req.body))
          .digest('base64');
        
        if (req.headers['content-md5'] !== bodyMd5) {
          return res.status(400).json({
            success: false,
            error: { message: 'データ整合性エラー' }
          });
        }
      }
      
      next();
    };
  }

  /**
   * A09:2021 – セキュリティログとモニタリングの不備
   * 包括的なロギングとモニタリング
   */
  securityLogging() {
    return (req, res, next) => {
      // セキュリティイベントのロギング
      const securityEvents = [
        'authentication',
        'authorization',
        'data_access',
        'data_modification',
        'security_configuration'
      ];
      
      // リクエスト開始時刻
      req.startTime = Date.now();
      
      // レスポンス送信時のロギング
      const originalSend = res.send;
      res.send = function(data) {
        const duration = Date.now() - req.startTime;
        
        // セキュリティ関連のログ
        if (res.statusCode === 401 || res.statusCode === 403) {
          console.warn('Security Event:', {
            type: 'access_denied',
            method: req.method,
            path: req.path,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            statusCode: res.statusCode,
            duration,
            user: req.user?.id || 'anonymous'
          });
        }
        
        // 異常なレスポンス時間の検出
        if (duration > 5000) {
          console.warn('Slow Request:', {
            method: req.method,
            path: req.path,
            duration,
            user: req.user?.id
          });
        }
        
        originalSend.call(this, data);
      };
      
      next();
    };
  }

  /**
   * A10:2021 – サーバーサイドリクエストフォージェリ (SSRF)
   * SSRF攻撃の防止
   */
  ssrfPrevention() {
    return (req, res, next) => {
      // URLパラメータの検証
      const urlParams = ['url', 'website', 'link', 'source', 'target'];
      
      for (const param of urlParams) {
        const url = req.body[param] || req.query[param];
        
        if (url && typeof url === 'string') {
          try {
            const parsed = new URL(url);
            
            // 内部ネットワークへのアクセスを防ぐ
            const blockedHosts = [
              'localhost',
              '127.0.0.1',
              '0.0.0.0',
              '::1',
              '169.254.169.254', // AWSメタデータ
              '10.0.0.0/8',
              '172.16.0.0/12',
              '192.168.0.0/16'
            ];
            
            if (blockedHosts.some(host => parsed.hostname.includes(host))) {
              return res.status(400).json({
                success: false,
                error: { message: '無効なURLです' }
              });
            }
            
            // 許可されたプロトコルのみ
            if (!['http:', 'https:'].includes(parsed.protocol)) {
              return res.status(400).json({
                success: false,
                error: { message: '許可されていないプロトコルです' }
              });
            }
          } catch (error) {
            return res.status(400).json({
              success: false,
              error: { message: '無効なURL形式です' }
            });
          }
        }
      }
      
      next();
    };
  }

  /**
   * 全てのOWASPセキュリティミドルウェアを適用
   */
  applyAll() {
    return [
      this.cryptographicFailures(),
      ...this.injectionPrevention(),
      ...this.secureDesign(),
      this.securityMisconfiguration(),
      this.vulnerableComponents(),
      this.dataIntegrity(),
      this.securityLogging(),
      this.ssrfPrevention()
    ];
  }

  /**
   * 特定のルートに認証制限を適用
   */
  protectAuthRoutes() {
    const { authLimiter, passwordResetLimiter } = this.authenticationFailures();
    
    return {
      '/api/auth/login': authLimiter,
      '/api/auth/register': authLimiter,
      '/api/auth/forgot-password': passwordResetLimiter,
      '/api/auth/reset-password': passwordResetLimiter
    };
  }
}

module.exports = OWASPSecurityMiddleware;