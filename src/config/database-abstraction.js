require('dotenv').config();

const databaseConfig = {
  // デフォルトのデータベース接続
  default: process.env.DB_TYPE || 'sqlite',
  
  // 各データベースの接続設定
  connections: {
    sqlite: {
      driver: 'sqlite3',
      filename: process.env.SQLITE_FILENAME || './database.sqlite',
      options: {
        // SQLite固有のオプション
        enableForeignKeys: true,
        busyTimeout: 30000
      }
    },
    
    postgres: {
      driver: 'pg',
      host: process.env.PG_HOST || 'localhost',
      port: process.env.PG_PORT || 5432,
      database: process.env.PG_DATABASE || 'claude_db',
      user: process.env.PG_USER || 'postgres',
      password: process.env.PG_PASSWORD || '',
      options: {
        // PostgreSQL固有のオプション
        ssl: process.env.PG_SSL === 'true' ? {
          require: true,
          rejectUnauthorized: false
        } : false,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
        max: 20 // 接続プールの最大接続数
      }
    },
    
    mysql: {
      driver: 'mysql2',
      host: process.env.MYSQL_HOST || 'localhost',
      port: process.env.MYSQL_PORT || 3306,
      database: process.env.MYSQL_DATABASE || 'claude_db',
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      options: {
        // MySQL固有のオプション
        charset: 'utf8mb4',
        collation: 'utf8mb4_unicode_ci',
        acquireTimeout: 60000,
        timeout: 60000,
        reconnect: true,
        connectionLimit: 20
      }
    },
    
    mongodb: {
      driver: 'mongodb',
      url: process.env.MONGODB_URL || 'mongodb://localhost:27017/claude_db',
      options: {
        // MongoDB固有のオプション
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: 20,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferMaxEntries: 0,
        bufferCommands: false
      }
    },
    
    redis: {
      driver: 'redis',
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || '',
      database: process.env.REDIS_DB || 0,
      options: {
        // Redis固有のオプション
        retryDelayOnFailover: 100,
        enableReadyCheck: false,
        maxRetriesPerRequest: null,
        lazyConnect: true
      }
    }
  },
  
  // マイグレーション設定
  migrations: {
    directory: './src/migrations',
    tableName: 'migrations'
  },
  
  // 接続プール設定
  pool: {
    min: 2,
    max: 20,
    acquire: 30000,
    idle: 10000
  }
};

module.exports = databaseConfig;