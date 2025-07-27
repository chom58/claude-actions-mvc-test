// Redis/メモリベースレート制限ミドルウェア
// 本番環境ではRedisを使用し、フォールバック時はメモリベースを使用

const { rateLimitHelpers, checkRedisHealth } = require('../config/redis');
const logger = require('../utils/logger');

// メモリベースのフォールバック用
const rateLimitMap = new Map();

// メモリベースのレート制限実装（フォールバック用）
const memoryBasedRateLimit = (key, windowMs, max, now) => {
  const windowStart = now - windowMs;
  
  // 古いエントリを削除
  const clientData = rateLimitMap.get(key) || [];
  const filteredData = clientData.filter(timestamp => timestamp > windowStart);
  
  const isAllowed = filteredData.length < max;
  
  if (isAllowed) {
    filteredData.push(now);
    rateLimitMap.set(key, filteredData);
  }
  
  return {
    isAllowed,
    currentCount: filteredData.length,
    remainingRequests: Math.max(0, max - filteredData.length - (isAllowed ? 1 : 0)),
    retryAfter: filteredData.length > 0 ? Math.ceil((filteredData[0] - windowStart) / 1000) : null
  };
};

const createRateLimit = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15分
    max = 100, // 最大リクエスト数
    message = 'リクエストが多すぎます。しばらく待ってから再試行してください。',
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    keyGenerator = (req) => req.ip || req.connection.remoteAddress,
    algorithm = 'sliding_window', // 'sliding_window', 'fixed_window', 'token_bucket'
    keyPrefix = 'general'
  } = options;

  return async (req, res, next) => {
    // 開発環境でレート制限を無効化
    if (process.env.NODE_ENV === 'development' && process.env.RATE_LIMIT_DISABLED === 'true') {
      return next();
    }
    
    try {
      const identifier = keyGenerator(req);
      const now = Date.now();
      let result;

      // Redisの健全性をチェック
      const isRedisHealthy = await checkRedisHealth();
      
      if (isRedisHealthy) {
        // Redisベースの実装
        const redisKey = rateLimitHelpers.generateKey(keyPrefix, identifier);
        
        try {
          switch (algorithm) {
            case 'fixed_window':
              result = await rateLimitHelpers.fixedWindow(redisKey, windowMs, max);
              break;
            case 'token_bucket':
              result = await rateLimitHelpers.tokenBucket(redisKey, max, max / (windowMs / 1000));
              break;
            case 'sliding_window':
            default:
              result = await rateLimitHelpers.slidingWindow(redisKey, windowMs, max);
              break;
          }
          
          logger.debug(`Redis rate limit check: ${identifier} - ${result.currentCount}/${max}`);
        } catch (redisError) {
          logger.warn('Redis rate limit error, falling back to memory:', redisError.message);
          result = memoryBasedRateLimit(identifier, windowMs, max, now);
        }
      } else {
        // メモリベースのフォールバック
        logger.debug('Using memory-based rate limiting (Redis unavailable)');
        result = memoryBasedRateLimit(identifier, windowMs, max, now);
      }

      // レート制限に達した場合
      if (!result.isAllowed) {
        const headers = {
          'X-RateLimit-Limit': max,
          'X-RateLimit-Remaining': result.remainingRequests || 0,
          'X-RateLimit-Reset': new Date(now + windowMs).toISOString()
        };
        
        if (result.retryAfter) {
          headers['Retry-After'] = result.retryAfter;
        }
        
        // レスポンスヘッダーを設定
        Object.entries(headers).forEach(([key, value]) => {
          res.setHeader(key, value);
        });
        
        return res.status(429).json({
          error: message,
          retryAfter: result.retryAfter,
          limit: max,
          remaining: result.remainingRequests || 0
        });
      }

      // レスポンスヘッダーを設定
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', result.remainingRequests || 0);
      res.setHeader('X-RateLimit-Reset', new Date(now + windowMs).toISOString());

      // レスポンス後のクリーンアップ処理
      if (skipSuccessfulRequests || skipFailedRequests) {
        const originalSend = res.send;
        res.send = function(data) {
          const statusCode = res.statusCode;
          const isSuccess = statusCode >= 200 && statusCode < 300;
          const isFailure = statusCode >= 400;
          
          if ((skipSuccessfulRequests && isSuccess) || (skipFailedRequests && isFailure)) {
            // メモリベースの場合のみクリーンアップ処理を実行
            if (!isRedisHealthy) {
              const currentData = rateLimitMap.get(identifier) || [];
              const updatedData = currentData.slice(0, -1);
              if (updatedData.length > 0) {
                rateLimitMap.set(identifier, updatedData);
              } else {
                rateLimitMap.delete(identifier);
              }
            }
            // Redisベースの場合は、該当のエントリを削除する必要があれば別途実装
          }
          
          originalSend.call(this, data);
        };
      }
      
      next();
    } catch (error) {
      logger.error('Rate limiting error:', error);
      // エラーが発生した場合はリクエストを通す（fail-open）
      next();
    }
  };
};

// プリセット設定
const strictRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 5, // 厳しい制限（認証試行など）
  message: '認証試行回数が上限に達しました。15分後に再試行してください。',
  keyPrefix: 'strict',
  algorithm: 'sliding_window'
});

const generalRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 100, // 一般的な制限
  keyPrefix: 'general',
  algorithm: 'sliding_window'
});

const passwordResetRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000, // 1時間
  max: 3, // パスワードリセットは1時間に3回まで
  message: 'パスワードリセット要求回数が上限に達しました。1時間後に再試行してください。',
  keyPrefix: 'password_reset',
  algorithm: 'fixed_window'
});

// APIレート制限（より厳しい制限）
const apiRateLimit = createRateLimit({
  windowMs: 5 * 60 * 1000, // 5分
  max: 50, // 5分間に50リクエスト
  message: 'APIリクエスト制限に達しました。5分後に再試行してください。',
  keyPrefix: 'api',
  algorithm: 'token_bucket'
});

// ログインレート制限（IPとユーザーID両方で制限）
const loginRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 5, // 15分間に5回まで
  message: 'ログイン試行回数が上限に達しました。15分後に再試行してください。',
  keyPrefix: 'login',
  keyGenerator: (req) => {
    // IPアドレスとユーザーIDの組み合わせでキーを生成
    const ip = req.ip || req.connection.remoteAddress;
    const userId = req.body?.email || req.body?.username || 'anonymous';
    return `${ip}:${userId}`;
  },
  algorithm: 'sliding_window'
});

// 画像アップロードレート制限
const uploadImageRateLimit = createRateLimit({
  windowMs: 10 * 60 * 1000, // 10分
  max: 20, // 10分間に20回まで
  message: '画像アップロード回数が制限に達しました。10分後に再試行してください。',
  keyPrefix: 'upload_image',
  keyGenerator: (req) => {
    // 認証済みユーザーID + IPアドレス
    const ip = req.ip || req.connection.remoteAddress;
    const userId = req.user?.id || 'anonymous';
    return `${userId}:${ip}`;
  },
  algorithm: 'sliding_window'
});

// 定期的なクリーンアップ（メモリリーク防止）
// Redisを使用している場合はTTLで自動削除されるため、メモリベースのみクリーンアップ
setInterval(() => {
  const now = Date.now();
  const maxAge = 60 * 60 * 1000; // 1時間
  
  for (const [key, timestamps] of rateLimitMap.entries()) {
    const filtered = timestamps.filter(timestamp => now - timestamp < maxAge);
    if (filtered.length === 0) {
      rateLimitMap.delete(key);
    } else {
      rateLimitMap.set(key, filtered);
    }
  }
}, 10 * 60 * 1000); // 10分ごとに実行

// プロセス終了時のクリーンアップ
process.on('SIGINT', async () => {
  const { closeRedisConnection } = require('../config/redis');
  await closeRedisConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  const { closeRedisConnection } = require('../config/redis');
  await closeRedisConnection();
  process.exit(0);
});

module.exports = {
  createRateLimit,
  strictRateLimit,
  generalRateLimit,
  passwordResetRateLimit,
  apiRateLimit,
  loginRateLimit,
  uploadImageRateLimit
};