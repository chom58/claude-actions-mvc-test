require('dotenv').config();

/**
 * 環境変数の検証とデフォルト値設定
 */
class EnvironmentConfig {
  constructor() {
    this.validateRequired();
    this.setDefaults();
  }

  /**
   * 必須環境変数の検証
   */
  validateRequired() {
    const required = [
      'JWT_SECRET',
      'JWT_REFRESH_SECRET'
    ];

    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    // JWTシークレットの最小長チェック
    if (process.env.JWT_SECRET.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters long');
    }
    
    if (process.env.JWT_REFRESH_SECRET.length < 32) {
      throw new Error('JWT_REFRESH_SECRET must be at least 32 characters long');
    }
  }

  /**
   * デフォルト値の設定
   */
  setDefaults() {
    // アプリケーション設定
    process.env.NODE_ENV = process.env.NODE_ENV || 'development';
    process.env.PORT = process.env.PORT || '3000';
    
    // CORS設定
    process.env.CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';
    process.env.CLIENT_URL = process.env.CLIENT_URL || process.env.CORS_ORIGIN;
    
    // JWT設定
    process.env.JWT_EXPIRE = process.env.JWT_EXPIRE || '15m';
    process.env.JWT_REFRESH_EXPIRE = process.env.JWT_REFRESH_EXPIRE || '7d';
    
    // セッション設定
    process.env.SESSION_SECRET = process.env.SESSION_SECRET || this.generateSecret();
    
    // Redis設定（オプション）
    if (!process.env.REDIS_URL && process.env.NODE_ENV === 'production') {
      console.warn('REDIS_URL not set. Redis features will be disabled in production.');
    }
    
    // アップロード設定
    process.env.MAX_FILE_SIZE = process.env.MAX_FILE_SIZE || '10485760'; // 10MB
    process.env.ALLOWED_FILE_TYPES = process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/gif,image/webp';
    
    // レート制限設定
    process.env.RATE_LIMIT_WINDOW_MS = process.env.RATE_LIMIT_WINDOW_MS || '900000'; // 15分
    process.env.RATE_LIMIT_MAX_REQUESTS = process.env.RATE_LIMIT_MAX_REQUESTS || '100';
    
    // ロギング設定
    process.env.LOG_LEVEL = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');
    process.env.ENABLE_SYSTEM_METRICS_LOG = process.env.ENABLE_SYSTEM_METRICS_LOG || 'false';
  }

  /**
   * シークレット生成（開発環境用）
   */
  generateSecret() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SESSION_SECRET must be explicitly set in production');
    }
    return require('crypto').randomBytes(32).toString('hex');
  }

  /**
   * 環境変数の取得（型変換付き）
   */
  static get(key, defaultValue = null) {
    return process.env[key] || defaultValue;
  }

  static getInt(key, defaultValue = 0) {
    const value = process.env[key];
    return value ? parseInt(value, 10) : defaultValue;
  }

  static getFloat(key, defaultValue = 0.0) {
    const value = process.env[key];
    return value ? parseFloat(value) : defaultValue;
  }

  static getBool(key, defaultValue = false) {
    const value = process.env[key];
    if (!value) return defaultValue;
    return value.toLowerCase() === 'true' || value === '1';
  }

  static getArray(key, defaultValue = [], separator = ',') {
    const value = process.env[key];
    return value ? value.split(separator).map(item => item.trim()) : defaultValue;
  }

  /**
   * 環境判定ヘルパー
   */
  static isProduction() {
    return process.env.NODE_ENV === 'production';
  }

  static isDevelopment() {
    return process.env.NODE_ENV === 'development';
  }

  static isTest() {
    return process.env.NODE_ENV === 'test';
  }

  /**
   * 設定のエクスポート
   */
  static getConfig() {
    return {
      app: {
        env: this.get('NODE_ENV', 'development'),
        port: this.getInt('PORT', 3000),
        name: this.get('APP_NAME', 'Harajuku Creative Community'),
        url: this.get('APP_URL', `http://localhost:${this.get('PORT', 3000)}`)
      },
      cors: {
        origin: this.get('CORS_ORIGIN', '*'),
        credentials: true
      },
      jwt: {
        secret: this.get('JWT_SECRET'),
        refreshSecret: this.get('JWT_REFRESH_SECRET'),
        expiresIn: this.get('JWT_EXPIRE', '15m'),
        refreshExpiresIn: this.get('JWT_REFRESH_EXPIRE', '7d')
      },
      session: {
        secret: this.get('SESSION_SECRET'),
        secure: this.isProduction(),
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24時間
      },
      redis: {
        url: this.get('REDIS_URL'),
        enabled: !!this.get('REDIS_URL')
      },
      upload: {
        maxFileSize: this.getInt('MAX_FILE_SIZE', 10485760),
        allowedTypes: this.getArray('ALLOWED_FILE_TYPES', ['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
      },
      rateLimit: {
        windowMs: this.getInt('RATE_LIMIT_WINDOW_MS', 900000),
        max: this.getInt('RATE_LIMIT_MAX_REQUESTS', 100)
      },
      logging: {
        level: this.get('LOG_LEVEL', 'info'),
        enableSystemMetrics: this.getBool('ENABLE_SYSTEM_METRICS_LOG', false)
      },
      oauth: {
        google: {
          clientId: this.get('GOOGLE_CLIENT_ID'),
          clientSecret: this.get('GOOGLE_CLIENT_SECRET'),
          redirectUri: this.get('GOOGLE_REDIRECT_URI')
        },
        github: {
          clientId: this.get('GITHUB_CLIENT_ID'),
          clientSecret: this.get('GITHUB_CLIENT_SECRET'),
          redirectUri: this.get('GITHUB_REDIRECT_URI')
        }
      }
    };
  }
}

// 初期化と検証
const envConfig = new EnvironmentConfig();

module.exports = EnvironmentConfig;