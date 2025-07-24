const session = require('express-session');
const RedisStore = require('connect-redis').default;
const { getRedisClient, checkRedisHealth } = require('./redis');
const logger = require('../utils/logger');

// セッション設定の作成
const createSessionConfig = async () => {
  let store;
  
  try {
    const isRedisHealthy = await checkRedisHealth();
    
    if (isRedisHealthy) {
      // Redisセッションストアを使用
      const redisClient = await getRedisClient();
      store = new RedisStore({
        client: redisClient,
        prefix: 'session:',
        ttl: parseInt(process.env.SESSION_TTL) || 24 * 60 * 60, // 24時間（秒）
        disableTouch: false,
        disableTTL: false
      });
      logger.info('Redisセッションストアを使用します');
    } else {
      // メモリセッションストア（開発環境のみ）
      logger.warn('Redisが利用できません。メモリセッションストアを使用します（本番環境では推奨されません）');
      store = undefined; // デフォルトのメモリストア
    }
  } catch (error) {
    logger.error('セッションストア設定エラー:', error);
    store = undefined; // フォールバック
  }

  return {
    store,
    secret: process.env.SESSION_SECRET || 'your-session-secret-key-change-in-production',
    name: process.env.SESSION_NAME || 'sessionId',
    resave: false,
    saveUninitialized: false,
    rolling: true, // アクティビティでセッション延長
    cookie: {
      secure: process.env.NODE_ENV === 'production', // HTTPSでのみ送信（本番環境）
      httpOnly: true,
      maxAge: parseInt(process.env.SESSION_MAX_AGE) || 24 * 60 * 60 * 1000, // 24時間（ミリ秒）
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
    }
  };
};

// セッション初期化ミドルウェア
const initializeSession = async (app) => {
  try {
    const sessionConfig = await createSessionConfig();
    const sessionMiddleware = session(sessionConfig);
    
    app.use(sessionMiddleware);
    logger.info('セッションミドルウェアが初期化されました');
    
    return sessionMiddleware;
  } catch (error) {
    logger.error('セッション初期化エラー:', error);
    throw error;
  }
};

// セッションヘルパー関数
const sessionHelpers = {
  // CSRFトークンをセッションに設定
  setCSRFToken: (req, token) => {
    if (req.session) {
      req.session.csrfToken = token;
    }
  },

  // CSRFトークンをセッションから取得
  getCSRFToken: (req) => {
    return req.session?.csrfToken;
  },

  // セッションの破棄
  destroySession: (req) => {
    return new Promise((resolve, reject) => {
      if (req.session) {
        req.session.destroy((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  },

  // セッション再生成
  regenerateSession: (req) => {
    return new Promise((resolve, reject) => {
      if (req.session) {
        req.session.regenerate((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  },

  // セッション保存
  saveSession: (req) => {
    return new Promise((resolve, reject) => {
      if (req.session) {
        req.session.save((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  },

  // ユーザー情報をセッションに設定
  setUserSession: (req, user) => {
    if (req.session) {
      req.session.user = {
        id: user.id,
        username: user.username,
        email: user.email,
        isActive: user.isActive,
        lastLoginAt: new Date()
      };
    }
  },

  // セッションからユーザー情報を取得
  getUserSession: (req) => {
    return req.session?.user;
  },

  // セッションからユーザー情報を削除
  clearUserSession: (req) => {
    if (req.session) {
      delete req.session.user;
    }
  },

  // セッションの有効性チェック
  isSessionValid: (req) => {
    return !!(req.session && req.session.user);
  },

  // セッション情報の取得（デバッグ用）
  getSessionInfo: (req) => {
    if (!req.session) return null;
    
    return {
      id: req.session.id,
      user: req.session.user,
      csrfToken: req.session.csrfToken ? 'SET' : 'NOT_SET',
      cookie: {
        maxAge: req.session.cookie.maxAge,
        expires: req.session.cookie.expires,
        secure: req.session.cookie.secure,
        httpOnly: req.session.cookie.httpOnly,
        sameSite: req.session.cookie.sameSite
      }
    };
  }
};

module.exports = {
  createSessionConfig,
  initializeSession,
  sessionHelpers
};