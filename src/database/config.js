require('dotenv').config();

/**
 * データベース設定
 * 
 * 環境ごとのデータベース設定を管理
 */
const config = {
  development: {
    dialect: process.env.DB_DIALECT || 'sqlite',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'mvc_development',
    username: process.env.DB_USER || 'developer',
    password: process.env.DB_PASSWORD || 'password',
    storage: process.env.DB_STORAGE || './database.sqlite',
    
    // 接続プール設定
    pool: {
      max: parseInt(process.env.DB_POOL_MAX) || 20,
      min: parseInt(process.env.DB_POOL_MIN) || 5,
      idle: parseInt(process.env.DB_POOL_IDLE) || 10000,
      acquire: parseInt(process.env.DB_POOL_ACQUIRE) || 60000,
      evict: parseInt(process.env.DB_POOL_EVICT) || 1000
    },
    
    // セキュリティ設定
    ssl: process.env.DB_SSL === 'true' ? {
      require: true,
      rejectUnauthorized: false
    } : false,
    
    // その他の設定
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    charset: 'utf8mb4',
    timezone: '+09:00'
  },

  test: {
    dialect: process.env.TEST_DB_DIALECT || 'sqlite',
    host: process.env.TEST_DB_HOST || 'localhost',
    port: parseInt(process.env.TEST_DB_PORT) || 5432,
    database: process.env.TEST_DB_NAME || 'mvc_test',
    username: process.env.TEST_DB_USER || 'test_user',
    password: process.env.TEST_DB_PASSWORD || 'test_password',
    storage: process.env.TEST_DB_STORAGE || ':memory:',
    
    pool: {
      max: 5,
      min: 1,
      idle: 5000,
      acquire: 30000
    },
    
    ssl: false,
    logging: false,
    charset: 'utf8mb4',
    timezone: '+09:00'
  },

  production: {
    dialect: process.env.DB_DIALECT || 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    
    pool: {
      max: parseInt(process.env.DB_POOL_MAX) || 30,
      min: parseInt(process.env.DB_POOL_MIN) || 10,
      idle: parseInt(process.env.DB_POOL_IDLE) || 30000,
      acquire: parseInt(process.env.DB_POOL_ACQUIRE) || 60000,
      evict: parseInt(process.env.DB_POOL_EVICT) || 1000
    },
    
    ssl: process.env.DB_SSL === 'true' ? {
      require: true,
      rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false'
    } : false,
    
    logging: false,
    charset: 'utf8mb4',
    timezone: '+09:00',
    
    // 読み取り専用レプリカ（オプション）
    replica: process.env.DB_REPLICA_HOST ? {
      dialect: process.env.DB_DIALECT || 'postgres',
      host: process.env.DB_REPLICA_HOST,
      port: parseInt(process.env.DB_REPLICA_PORT) || 5432,
      database: process.env.DB_REPLICA_NAME || process.env.DB_NAME,
      username: process.env.DB_REPLICA_USER || process.env.DB_USER,
      password: process.env.DB_REPLICA_PASSWORD || process.env.DB_PASSWORD,
      
      pool: {
        max: parseInt(process.env.DB_REPLICA_POOL_MAX) || 20,
        min: parseInt(process.env.DB_REPLICA_POOL_MIN) || 5,
        idle: parseInt(process.env.DB_REPLICA_POOL_IDLE) || 30000,
        acquire: parseInt(process.env.DB_REPLICA_POOL_ACQUIRE) || 60000
      },
      
      ssl: process.env.DB_REPLICA_SSL === 'true' ? {
        require: true,
        rejectUnauthorized: process.env.DB_REPLICA_SSL_REJECT_UNAUTHORIZED !== 'false'
      } : false,
      
      logging: false,
      charset: 'utf8mb4',
      timezone: '+09:00'
    } : null
  }
};

/**
 * 現在の環境を取得
 */
function getCurrentEnvironment() {
  return process.env.NODE_ENV || 'development';
}

/**
 * 指定された環境の設定を取得
 * @param {string} env - 環境名
 * @returns {Object}
 */
function getConfig(env = null) {
  const environment = env || getCurrentEnvironment();
  const envConfig = config[environment];
  
  if (!envConfig) {
    throw new Error(`環境 '${environment}' の設定が見つかりません`);
  }
  
  return envConfig;
}

/**
 * 設定の検証
 * @param {Object} envConfig - 環境設定
 * @returns {Array} - エラーメッセージの配列
 */
function validateConfig(envConfig) {
  const errors = [];
  
  // 必須パラメーターのチェック
  if (!envConfig.dialect) {
    errors.push('dialect is required');
  }
  
  // PostgreSQL/MySQLの場合の必須パラメーター
  if (['postgres', 'postgresql', 'mysql', 'mariadb'].includes(envConfig.dialect)) {
    if (!envConfig.host) errors.push('host is required for SQL databases');
    if (!envConfig.database) errors.push('database is required for SQL databases');
    if (!envConfig.username) errors.push('username is required for SQL databases');
    if (envConfig.password === undefined) errors.push('password is required for SQL databases');
  }
  
  // SQLiteの場合
  if (['sqlite', 'sqlite3'].includes(envConfig.dialect)) {
    if (!envConfig.storage) {
      errors.push('storage path is required for SQLite');
    }
  }
  
  // プール設定の検証
  if (envConfig.pool) {
    if (envConfig.pool.max && envConfig.pool.min && envConfig.pool.max < envConfig.pool.min) {
      errors.push('pool.max must be greater than or equal to pool.min');
    }
  }
  
  return errors;
}

/**
 * 環境変数から動的に設定を構築
 * @param {string} prefix - 環境変数のプレフィックス
 * @returns {Object}
 */
function buildConfigFromEnv(prefix = 'DB_') {
  const envConfig = {
    dialect: process.env[`${prefix}DIALECT`],
    host: process.env[`${prefix}HOST`],
    port: parseInt(process.env[`${prefix}PORT`]) || undefined,
    database: process.env[`${prefix}NAME`],
    username: process.env[`${prefix}USER`],
    password: process.env[`${prefix}PASSWORD`],
    storage: process.env[`${prefix}STORAGE`]
  };
  
  // undefined の値を削除
  Object.keys(envConfig).forEach(key => {
    if (envConfig[key] === undefined) {
      delete envConfig[key];
    }
  });
  
  return envConfig;
}

/**
 * データベース接続URLから設定を解析
 * @param {string} url - データベース接続URL
 * @returns {Object}
 */
function parseConnectionUrl(url) {
  try {
    const parsed = new URL(url);
    
    let dialect;
    switch (parsed.protocol.slice(0, -1)) {
      case 'postgres':
      case 'postgresql':
        dialect = 'postgres';
        break;
      case 'mysql':
        dialect = 'mysql';
        break;
      case 'sqlite':
        dialect = 'sqlite';
        break;
      default:
        throw new Error(`未対応のプロトコル: ${parsed.protocol}`);
    }
    
    const config = {
      dialect,
      host: parsed.hostname,
      port: parseInt(parsed.port) || undefined,
      database: parsed.pathname.slice(1), // remove leading slash
      username: parsed.username,
      password: parsed.password
    };
    
    // SQLiteの場合は特別処理
    if (dialect === 'sqlite') {
      config.storage = parsed.pathname;
      delete config.host;
      delete config.port;
      delete config.username;
      delete config.password;
    }
    
    return config;
  } catch (error) {
    throw new Error(`無効な接続URL: ${error.message}`);
  }
}

module.exports = {
  config,
  getCurrentEnvironment,
  getConfig,
  validateConfig,
  buildConfigFromEnv,
  parseConnectionUrl
};