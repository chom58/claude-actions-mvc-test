const winston = require('winston');
const path = require('path');

/**
 * 構造化ログとパフォーマンスモニタリング用の拡張ロガー
 * 
 * 機能:
 * - 構造化ログ出力
 * - ログレベル管理
 * - ファイルローテーション
 * - プライバシー保護（個人情報マスキング）
 * - パフォーマンス測定
 */

const logDir = path.join(__dirname, '../../logs');

// ログフォーマット設定
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
    // プライバシー保護のため個人情報をマスキング
    const maskedMeta = maskSensitiveData(meta);
    
    return JSON.stringify({
      timestamp,
      level,
      message,
      service,
      ...maskedMeta
    });
  })
);

// コンソール用フォーマット
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
    const maskedMeta = maskSensitiveData(meta);
    const metaStr = Object.keys(maskedMeta).length > 0 ? 
      `\n${JSON.stringify(maskedMeta, null, 2)}` : '';
    return `${timestamp} [${service}] ${level}: ${message}${metaStr}`;
  })
);

/**
 * 個人情報や機密情報をマスキング
 */
function maskSensitiveData(data) {
  const sensitiveFields = [
    'password', 'token', 'secret', 'key', 'authorization',
    'email', 'phone', 'ssn', 'creditCard', 'ip'
  ];
  
  const masked = { ...data };
  
  function maskValue(obj) {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }
    
    const result = Array.isArray(obj) ? [] : {};
    
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      
      // 機密フィールドのマスキング
      if (sensitiveFields.some(field => lowerKey.includes(field))) {
        if (typeof value === 'string') {
          if (lowerKey.includes('email')) {
            // メールアドレスの場合、ドメイン部分は残す
            const emailParts = value.split('@');
            result[key] = emailParts.length === 2 ? 
              `${emailParts[0].substring(0, 2)}***@${emailParts[1]}` : '***';
          } else if (lowerKey.includes('ip')) {
            // IPアドレスの匿名化
            const ipParts = value.split('.');
            result[key] = ipParts.length === 4 ? 
              `${ipParts[0]}.${ipParts[1]}.xxx.xxx` : '***';
          } else {
            result[key] = '***';
          }
        } else {
          result[key] = '***';
        }
      } else if (typeof value === 'object' && value !== null) {
        result[key] = maskValue(value);
      } else {
        result[key] = value;
      }
    }
    
    return result;
  }
  
  return maskValue(masked);
}

// ロガー作成
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'harajuku-creative-community' },
  transports: [
    // エラーログファイル
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      tailable: true
    }),
    
    // 統合ログファイル
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 10,
      tailable: true
    }),
    
    // パフォーマンスログファイル
    new winston.transports.File({
      filename: path.join(logDir, 'performance.log'),
      level: 'info',
      maxsize: 5242880, // 5MB
      maxFiles: 3,
      tailable: true,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  ]
});

// 開発環境ではコンソール出力を追加
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

/**
 * 拡張ロガークラス
 * パフォーマンス測定とメトリクス統合機能を提供
 */
class EnhancedLogger {
  constructor(winstonLogger) {
    this.logger = winstonLogger;
    this.timers = new Map();
  }

  /**
   * 標準ログメソッド
   */
  error(message, meta = {}) {
    this.logger.error(message, { ...meta, timestamp: new Date().toISOString() });
  }

  warn(message, meta = {}) {
    this.logger.warn(message, { ...meta, timestamp: new Date().toISOString() });
  }

  info(message, meta = {}) {
    this.logger.info(message, { ...meta, timestamp: new Date().toISOString() });
  }

  debug(message, meta = {}) {
    this.logger.debug(message, { ...meta, timestamp: new Date().toISOString() });
  }

  /**
   * ユーザーアクション のログ
   */
  logUserAction(action, userId, metadata = {}) {
    this.info('User action', {
      action,
      userId,
      ...metadata,
      category: 'user_action'
    });
  }

  /**
   * API リクエストのログ
   */
  logApiRequest(method, path, statusCode, duration, metadata = {}) {
    const level = statusCode >= 400 ? 'warn' : 'info';
    this.logger[level]('API request', {
      method,
      path,
      statusCode,
      duration,
      ...metadata,
      category: 'api_request'
    });
  }

  /**
   * データベースクエリのログ
   */
  logDatabaseQuery(query, duration, metadata = {}) {
    this.info('Database query', {
      query: query.length > 200 ? query.substring(0, 200) + '...' : query,
      duration,
      ...metadata,
      category: 'database'
    });
  }

  /**
   * セキュリティイベントのログ
   */
  logSecurityEvent(event, userId = null, metadata = {}) {
    this.warn('Security event', {
      event,
      userId,
      ...metadata,
      category: 'security'
    });
  }

  /**
   * ビジネスメトリクスのログ
   */
  logBusinessMetric(metric, value, metadata = {}) {
    this.info('Business metric', {
      metric,
      value,
      ...metadata,
      category: 'business_metric'
    });
  }

  /**
   * パフォーマンス測定開始
   */
  startTimer(label) {
    this.timers.set(label, Date.now());
  }

  /**
   * パフォーマンス測定終了
   */
  endTimer(label, metadata = {}) {
    const startTime = this.timers.get(label);
    if (startTime) {
      const duration = Date.now() - startTime;
      this.logger.info('Performance measurement', {
        label,
        duration,
        ...metadata,
        category: 'performance'
      });
      this.timers.delete(label);
      return duration;
    }
    return null;
  }

  /**
   * エラーの詳細ログ
   */
  logError(error, context = {}) {
    this.error('Application error', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      context,
      category: 'error'
    });
  }

  /**
   * システムメトリクスのログ
   */
  logSystemMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    this.info('System metrics', {
      memory: {
        rss: Math.round(memUsage.rss / 1024 / 1024), // MB
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
        external: Math.round(memUsage.external / 1024 / 1024) // MB
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      uptime: process.uptime(),
      category: 'system_metrics'
    });
  }

  /**
   * ログレベルの動的変更
   */
  setLevel(level) {
    this.logger.level = level;
  }

  /**
   * ログ統計の取得
   */
  getStats() {
    return {
      activeTimers: this.timers.size,
      timerLabels: Array.from(this.timers.keys())
    };
  }
}

// 拡張ロガーのインスタンス作成
const enhancedLogger = new EnhancedLogger(logger);

// システムメトリクスの定期ログ出力（本番環境では無効化）
if (process.env.NODE_ENV !== 'production' && process.env.ENABLE_SYSTEM_METRICS_LOG === 'true') {
  setInterval(() => {
    enhancedLogger.logSystemMetrics();
  }, 60000); // 1分間隔
}

// プロセス終了時のクリーンアップ
process.on('SIGINT', () => {
  enhancedLogger.info('Application shutting down', { category: 'system' });
  process.exit(0);
});

process.on('SIGTERM', () => {
  enhancedLogger.info('Application terminated', { category: 'system' });
  process.exit(0);
});

// 未処理エラーのキャッチ
process.on('uncaughtException', (error) => {
  enhancedLogger.logError(error, { category: 'uncaught_exception' });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  enhancedLogger.error('Unhandled promise rejection', {
    reason: reason.toString(),
    promise: promise.toString(),
    category: 'unhandled_rejection'
  });
});

module.exports = enhancedLogger;