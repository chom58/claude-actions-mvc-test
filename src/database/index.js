/**
 * データベース抽象化レイヤー
 * 
 * 統一されたデータベースインターフェースを提供
 */

// コアクラス
const DatabaseManager = require('./DatabaseManager');
const DatabaseAdapter = require('./DatabaseAdapter');
const QueryBuilder = require('./QueryBuilder');

// アダプター
const PostgreSQLAdapter = require('./adapters/PostgreSQLAdapter');
const MySQLAdapter = require('./adapters/MySQLAdapter');
const SQLiteAdapter = require('./adapters/SQLiteAdapter');

// 設定
const { getConfig, validateConfig, parseConnectionUrl } = require('./config');

/**
 * データベースの初期化
 * @param {string} environment - 環境名
 * @returns {Promise<DatabaseManager>}
 */
async function initialize(environment = null) {
  const env = environment || process.env.NODE_ENV || 'development';
  
  try {
    // 設定の取得と検証
    const config = getConfig(env);
    const errors = validateConfig(config);
    
    if (errors.length > 0) {
      throw new Error(`設定エラー: ${errors.join(', ')}`);
    }
    
    // データベースマネージャーの初期化
    const environments = require('./config').config;
    await DatabaseManager.initializeFromConfig(environments, env);
    
    console.log(`✅ データベース初期化完了 (環境: ${env})`);
    return DatabaseManager;
  } catch (error) {
    console.error('❌ データベース初期化エラー:', error.message);
    throw error;
  }
}

/**
 * カスタム設定でアダプターを作成
 * @param {Object} config - データベース設定
 * @param {string} name - アダプター名
 * @returns {Promise<DatabaseAdapter>}
 */
async function createAdapter(config, name = 'custom') {
  const errors = validateConfig(config);
  if (errors.length > 0) {
    throw new Error(`設定エラー: ${errors.join(', ')}`);
  }
  
  return await DatabaseManager.registerAdapter(name, config);
}

/**
 * 接続URLからアダプターを作成
 * @param {string} url - データベース接続URL
 * @param {string} name - アダプター名
 * @returns {Promise<DatabaseAdapter>}
 */
async function createAdapterFromUrl(url, name = 'url_adapter') {
  const config = parseConnectionUrl(url);
  return await createAdapter(config, name);
}

/**
 * トランザクションヘルパー
 * @param {Function} callback - トランザクション内で実行する関数
 * @param {string} adapterName - 使用するアダプター名
 * @returns {Promise<*>}
 */
async function withTransaction(callback, adapterName = null) {
  return await DatabaseManager.transaction(callback, adapterName);
}

/**
 * クエリビルダーの取得
 * @param {string} adapterName - アダプター名
 * @returns {QueryBuilder}
 */
function createQueryBuilder(adapterName = null) {
  return DatabaseManager.getQueryBuilder(adapterName);
}

/**
 * データベースのヘルスチェック
 * @returns {Promise<Object>}
 */
async function healthCheck() {
  return await DatabaseManager.healthCheck();
}

/**
 * 全データベース接続を切断
 * @returns {Promise<void>}
 */
async function shutdown() {
  await DatabaseManager.disconnect();
}

// Express.js ミドルウェア
function createMiddleware(options = {}) {
  return async (req, res, next) => {
    try {
      // リクエストにデータベース接続を追加
      req.db = DatabaseManager;
      req.query = (sql, params) => DatabaseManager.query(sql, params);
      req.transaction = (callback) => DatabaseManager.transaction(callback);
      
      // ヘルスチェックエンドポイント
      if (req.path === (options.healthCheckPath || '/health/db')) {
        const health = await DatabaseManager.healthCheck();
        return res.json(health);
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
}

// グレースフルシャットダウンのセットアップ
function setupGracefulShutdown() {
  const signals = ['SIGTERM', 'SIGINT', 'SIGQUIT'];
  
  signals.forEach(signal => {
    process.on(signal, async () => {
      console.log(`\n${signal} received. Shutting down gracefully...`);
      
      try {
        await shutdown();
        console.log('✅ データベース接続を正常に切断しました');
        process.exit(0);
      } catch (error) {
        console.error('❌ データベース切断エラー:', error.message);
        process.exit(1);
      }
    });
  });
  
  // 予期しないエラーでの終了
  process.on('uncaughtException', async (error) => {
    console.error('❌ 予期しないエラー:', error);
    await shutdown().catch(() => {});
    process.exit(1);
  });
  
  process.on('unhandledRejection', async (reason, promise) => {
    console.error('❌ 未処理のPromise拒否:', reason);
    await shutdown().catch(() => {});
    process.exit(1);
  });
}

module.exports = {
  // コアクラス
  DatabaseManager,
  DatabaseAdapter,
  QueryBuilder,
  
  // アダプター
  PostgreSQLAdapter,
  MySQLAdapter,
  SQLiteAdapter,
  
  // 初期化とユーティリティ
  initialize,
  createAdapter,
  createAdapterFromUrl,
  withTransaction,
  createQueryBuilder,
  healthCheck,
  shutdown,
  
  // ミドルウェア
  createMiddleware,
  setupGracefulShutdown,
  
  // 設定関連
  getConfig,
  validateConfig,
  parseConnectionUrl
};