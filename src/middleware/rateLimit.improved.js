const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const { createClient } = require('redis');
const EnvironmentConfig = require('../config/env');
const logger = require('../monitoring/logger');

/**
 * 改善されたレート制限ミドルウェア
 * 
 * 機能:
 * - エンドポイント別の制限
 * - ユーザー別の制限
 * - IP別の制限
 * - Redis対応（スケーラブル）
 * - 動的レート制限
 */

class RateLimitManager {
  constructor() {
    this.config = EnvironmentConfig.getConfig();
    this.redisClient = null;
    this.stores = new Map();
    
    this.initializeRedis();
  }

  /**
   * Redis初期化
   */
  async initializeRedis() {
    if (this.config.redis.enabled) {
      try {
        this.redisClient = createClient({
          url: this.config.redis.url
        });
        
        await this.redisClient.connect();
        
        this.redisClient.on('error', (err) => {
          logger.error('Redis Client Error', { error: err });
        });
        
        logger.info('Rate limit Redis client connected');
      } catch (error) {
        logger.error('Failed to connect to Redis for rate limiting', { error });
        this.redisClient = null;
      }
    }
  }

  /**
   * 基本的なレート制限設定
   */
  getBaseConfig(options = {}) {
    const baseConfig = {
      windowMs: options.windowMs || this.config.rateLimit.windowMs,
      max: options.max || this.config.rateLimit.max,
      message: options.message || 'リクエストが多すぎます。しばらくしてから再度お試しください。',
      standardHeaders: true,
      legacyHeaders: false,
      skipSuccessfulRequests: options.skipSuccessfulRequests || false,
      skipFailedRequests: options.skipFailedRequests || false,
      
      // カスタムキー生成
      keyGenerator: (req) => {
        if (options.keyGenerator) {
          return options.keyGenerator(req);
        }
        
        // デフォルト：IPアドレス
        return req.ip || req.connection.remoteAddress || 'unknown';
      },
      
      // エラーハンドラー
      handler: (req, res) => {
        logger.warn('Rate limit exceeded', {
          ip: req.ip,
          path: req.path,
          method: req.method,
          user: req.user?.id || 'anonymous'
        });
        
        res.status(429).json({
          success: false,
          error: {
            message: options.message || baseConfig.message,
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: res.getHeader('Retry-After')
          }
        });
      }
    };

    // Redisストアの使用
    if (this.redisClient && this.config.redis.enabled) {
      baseConfig.store = new RedisStore({
        client: this.redisClient,
        prefix: options.prefix || 'rl:',
        sendCommand: (...args) => this.redisClient.sendCommand(args)
      });
    }

    return baseConfig;
  }

  /**
   * 一般的なレート制限
   */
  general() {
    return rateLimit(this.getBaseConfig({
      windowMs: 15 * 60 * 1000, // 15分
      max: 100,
      message: '一般的なリクエスト制限を超過しました'
    }));
  }

  /**
   * 認証エンドポイント用
   */
  auth() {
    return rateLimit(this.getBaseConfig({
      windowMs: 15 * 60 * 1000, // 15分
      max: 5, // より厳しい制限
      message: 'ログイン試行が多すぎます。15分後に再度お試しください。',
      skipSuccessfulRequests: true, // 成功したリクエストはカウントしない
      prefix: 'rl:auth:'
    }));
  }

  /**
   * パスワードリセット用
   */
  passwordReset() {
    return rateLimit(this.getBaseConfig({
      windowMs: 60 * 60 * 1000, // 1時間
      max: 3,
      message: 'パスワードリセットリクエストが多すぎます。',
      prefix: 'rl:pwreset:'
    }));
  }

  /**
   * API用（認証済みユーザー）
   */
  api() {
    return rateLimit(this.getBaseConfig({
      windowMs: 15 * 60 * 1000, // 15分
      max: 1000, // 認証済みユーザーは緩い制限
      message: 'API制限を超過しました',
      prefix: 'rl:api:',
      keyGenerator: (req) => {
        // ユーザーIDベースの制限
        return req.user?.id || req.ip;
      }
    }));
  }

  /**
   * ファイルアップロード用
   */
  upload() {
    return rateLimit(this.getBaseConfig({
      windowMs: 60 * 60 * 1000, // 1時間
      max: 20,
      message: 'アップロード制限を超過しました',
      prefix: 'rl:upload:',
      keyGenerator: (req) => {
        return req.user?.id || req.ip;
      }
    }));
  }

  /**
   * 検索エンドポイント用
   */
  search() {
    return rateLimit(this.getBaseConfig({
      windowMs: 1 * 60 * 1000, // 1分
      max: 30,
      message: '検索リクエストが多すぎます',
      prefix: 'rl:search:'
    }));
  }

  /**
   * WebSocket接続用
   */
  websocket() {
    return rateLimit(this.getBaseConfig({
      windowMs: 1 * 60 * 1000, // 1分
      max: 10,
      message: 'WebSocket接続試行が多すぎます',
      prefix: 'rl:ws:'
    }));
  }

  /**
   * 動的レート制限（ユーザーのプランに基づく）
   */
  dynamic() {
    return (req, res, next) => {
      const userPlan = req.user?.plan || 'free';
      
      const limits = {
        free: { windowMs: 15 * 60 * 1000, max: 100 },
        basic: { windowMs: 15 * 60 * 1000, max: 500 },
        premium: { windowMs: 15 * 60 * 1000, max: 2000 },
        enterprise: { windowMs: 15 * 60 * 1000, max: 10000 }
      };
      
      const config = limits[userPlan] || limits.free;
      
      const limiter = rateLimit(this.getBaseConfig({
        ...config,
        prefix: `rl:dynamic:${userPlan}:`,
        keyGenerator: (req) => req.user?.id || req.ip
      }));
      
      limiter(req, res, next);
    };
  }

  /**
   * IPベースの厳格な制限（DDoS対策）
   */
  strict() {
    return rateLimit(this.getBaseConfig({
      windowMs: 1 * 60 * 1000, // 1分
      max: 20,
      message: 'リクエストが多すぎます。DDoS保護が有効です。',
      prefix: 'rl:strict:',
      skipSuccessfulRequests: false,
      skipFailedRequests: false
    }));
  }

  /**
   * カスタムレート制限ファクトリー
   */
  custom(options) {
    return rateLimit(this.getBaseConfig(options));
  }

  /**
   * レート制限情報の取得
   */
  async getRateLimitInfo(key) {
    if (!this.redisClient) {
      return null;
    }
    
    try {
      const info = await this.redisClient.get(`rl:${key}`);
      return info ? JSON.parse(info) : null;
    } catch (error) {
      logger.error('Failed to get rate limit info', { error, key });
      return null;
    }
  }

  /**
   * レート制限のリセット
   */
  async resetRateLimit(key) {
    if (!this.redisClient) {
      return false;
    }
    
    try {
      await this.redisClient.del(`rl:${key}`);
      logger.info('Rate limit reset', { key });
      return true;
    } catch (error) {
      logger.error('Failed to reset rate limit', { error, key });
      return false;
    }
  }

  /**
   * クリーンアップ
   */
  async cleanup() {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }
}

// シングルトンインスタンスを作成
const rateLimitManager = new RateLimitManager();

// プロセス終了時のクリーンアップ
process.on('SIGINT', async () => {
  await rateLimitManager.cleanup();
});

module.exports = {
  generalRateLimit: rateLimitManager.general(),
  authRateLimit: rateLimitManager.auth(),
  passwordResetRateLimit: rateLimitManager.passwordReset(),
  apiRateLimit: rateLimitManager.api(),
  uploadRateLimit: rateLimitManager.upload(),
  searchRateLimit: rateLimitManager.search(),
  websocketRateLimit: rateLimitManager.websocket(),
  dynamicRateLimit: rateLimitManager.dynamic(),
  strictRateLimit: rateLimitManager.strict(),
  customRateLimit: (options) => rateLimitManager.custom(options),
  getRateLimitInfo: (key) => rateLimitManager.getRateLimitInfo(key),
  resetRateLimit: (key) => rateLimitManager.resetRateLimit(key)
};