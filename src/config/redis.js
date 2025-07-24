const redis = require('redis');
const logger = require('../utils/logger');

// Redisクライアントの設定
const createRedisClient = () => {
  const client = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    retry_delay_on_failover: 100,
    retry_delay_on_cluster_down: 300,
    connect_timeout: 60000,
    lazyConnect: true
  });

  // エラーハンドリング
  client.on('error', (err) => {
    logger.error('Redis接続エラー:', err);
  });

  client.on('connect', () => {
    logger.info('Redis接続が確立されました');
  });

  client.on('ready', () => {
    logger.info('Redisクライアントの準備が完了しました');
  });

  client.on('end', () => {
    logger.info('Redis接続が終了しました');
  });

  return client;
};

// Redisクライアントのシングルトンインスタンス
let redisClient = null;

const getRedisClient = async () => {
  if (!redisClient) {
    redisClient = createRedisClient();
    try {
      await redisClient.connect();
    } catch (error) {
      logger.error('Redis接続に失敗しました:', error);
      // Redis接続に失敗した場合はnullを返す（フォールバック処理用）
      redisClient = null;
      throw error;
    }
  }
  return redisClient;
};

// Redis接続のヘルスチェック
const checkRedisHealth = async () => {
  try {
    const client = await getRedisClient();
    if (!client) return false;
    
    const result = await client.ping();
    return result === 'PONG';
  } catch (error) {
    logger.error('Redisヘルスチェック失敗:', error);
    return false;
  }
};

// Redis接続の終了
const closeRedisConnection = async () => {
  if (redisClient) {
    try {
      await redisClient.disconnect();
      redisClient = null;
      logger.info('Redis接続を正常に終了しました');
    } catch (error) {
      logger.error('Redis接続終了時にエラーが発生しました:', error);
    }
  }
};

// レート制限用のヘルパー関数
const rateLimitHelpers = {
  // キーの生成
  generateKey: (prefix, identifier) => {
    return `rate_limit:${prefix}:${identifier}`;
  },

  // スライディングウィンドウ実装
  slidingWindow: async (key, windowMs, maxRequests) => {
    const client = await getRedisClient();
    if (!client) throw new Error('Redis接続が利用できません');

    const now = Date.now();
    const windowStart = now - windowMs;

    // Redisパイプラインを使用して原子的操作を実行
    const pipeline = client.multi();
    
    // 古いエントリを削除
    pipeline.zRemRangeByScore(key, 0, windowStart);
    
    // 現在のリクエスト数を取得
    pipeline.zCard(key);
    
    // 現在のタイムスタンプを追加
    pipeline.zAdd(key, { score: now, value: now.toString() });
    
    // TTLを設定（ウィンドウサイズの2倍）
    pipeline.expire(key, Math.ceil(windowMs / 1000) * 2);

    const results = await pipeline.exec();
    
    if (!results) {
      throw new Error('Redis操作に失敗しました');
    }

    const currentCount = results[1][1];
    const isAllowed = currentCount < maxRequests;
    
    return {
      isAllowed,
      currentCount,
      remainingRequests: Math.max(0, maxRequests - currentCount - 1)
    };
  },

  // 固定ウィンドウ実装
  fixedWindow: async (key, windowMs, maxRequests) => {
    const client = await getRedisClient();
    if (!client) throw new Error('Redis接続が利用できません');

    const now = Date.now();
    const windowKey = `${key}:${Math.floor(now / windowMs)}`;

    const pipeline = client.multi();
    pipeline.incr(windowKey);
    pipeline.expire(windowKey, Math.ceil(windowMs / 1000));
    
    const results = await pipeline.exec();
    
    if (!results) {
      throw new Error('Redis操作に失敗しました');
    }

    const currentCount = results[0][1];
    const isAllowed = currentCount <= maxRequests;
    
    return {
      isAllowed,
      currentCount,
      remainingRequests: Math.max(0, maxRequests - currentCount)
    };
  },

  // トークンバケット実装
  tokenBucket: async (key, capacity, refillRate, tokensRequested = 1) => {
    const client = await getRedisClient();
    if (!client) throw new Error('Redis接続が利用できません');

    const now = Date.now();
    const bucketData = await client.hGetAll(key);
    
    let tokens = parseFloat(bucketData.tokens) || capacity;
    let lastRefill = parseInt(bucketData.lastRefill) || now;
    
    // トークンの補充
    const timePassed = (now - lastRefill) / 1000; // 秒単位
    tokens = Math.min(capacity, tokens + (timePassed * refillRate));
    
    const isAllowed = tokens >= tokensRequested;
    
    if (isAllowed) {
      tokens -= tokensRequested;
    }
    
    // バケット状態を更新
    const pipeline = client.multi();
    pipeline.hSet(key, {
      tokens: tokens.toString(),
      lastRefill: now.toString()
    });
    pipeline.expire(key, 3600); // 1時間でTTL
    
    await pipeline.exec();
    
    return {
      isAllowed,
      remainingTokens: Math.floor(tokens)
    };
  }
};

module.exports = {
  getRedisClient,
  checkRedisHealth,
  closeRedisConnection,
  rateLimitHelpers
};