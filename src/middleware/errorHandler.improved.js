const logger = require('../monitoring/logger');
const EnvironmentConfig = require('../config/env');

/**
 * 改善されたエラーハンドリングミドルウェア
 * 
 * 機能:
 * - 統一されたエラーレスポンス形式
 * - 詳細なエラーロギング
 * - セキュリティを考慮したエラー情報の制御
 * - エラートラッキング対応
 */

class ErrorHandler {
  constructor() {
    this.isDevelopment = EnvironmentConfig.isDevelopment();
    this.isProduction = EnvironmentConfig.isProduction();
  }

  /**
   * エラータイプの判定
   */
  getErrorType(error) {
    // Sequelizeエラー
    if (error.name && error.name.startsWith('Sequelize')) {
      return 'database';
    }
    
    // JWTエラー
    if (['TokenExpiredError', 'JsonWebTokenError', 'NotBeforeError'].includes(error.name)) {
      return 'authentication';
    }
    
    // Multerエラー
    if (error.name === 'MulterError') {
      return 'upload';
    }
    
    // バリデーションエラー
    if (error.name === 'ValidationError' || error.type === 'validation') {
      return 'validation';
    }
    
    // その他の既知のエラー
    if (error.isOperational) {
      return 'operational';
    }
    
    return 'unknown';
  }

  /**
   * エラーの正規化
   */
  normalizeError(error, req) {
    const errorType = this.getErrorType(error);
    
    const normalized = {
      type: errorType,
      message: this.getErrorMessage(error, errorType),
      statusCode: this.getStatusCode(error),
      code: this.getErrorCode(error, errorType),
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method,
      requestId: req.id || 'unknown'
    };

    // 開発環境では詳細情報を追加
    if (this.isDevelopment) {
      normalized.stack = error.stack;
      normalized.originalError = {
        name: error.name,
        message: error.message,
        ...error
      };
    }

    // バリデーションエラーの詳細
    if (errorType === 'validation' && error.details) {
      normalized.validationErrors = this.formatValidationErrors(error.details);
    }

    return normalized;
  }

  /**
   * エラーメッセージの取得
   */
  getErrorMessage(error, errorType) {
    // 本番環境では一般的なメッセージを返す
    if (this.isProduction && !error.isOperational) {
      const messages = {
        database: 'データベースエラーが発生しました',
        authentication: '認証エラーが発生しました',
        upload: 'ファイルアップロードエラーが発生しました',
        validation: '入力データに問題があります',
        unknown: 'サーバーエラーが発生しました'
      };
      return messages[errorType] || messages.unknown;
    }

    return error.message || 'エラーが発生しました';
  }

  /**
   * ステータスコードの取得
   */
  getStatusCode(error) {
    // 既存のステータスコード
    if (error.statusCode && error.statusCode >= 400 && error.statusCode < 600) {
      return error.statusCode;
    }
    
    if (error.status && error.status >= 400 && error.status < 600) {
      return error.status;
    }

    // エラータイプ別のデフォルトステータスコード
    const statusCodes = {
      ValidationError: 400,
      UnauthorizedError: 401,
      ForbiddenError: 403,
      NotFoundError: 404,
      ConflictError: 409,
      TokenExpiredError: 401,
      JsonWebTokenError: 401,
      MulterError: 400
    };

    return statusCodes[error.name] || 500;
  }

  /**
   * エラーコードの取得
   */
  getErrorCode(error, errorType) {
    if (error.code) return error.code;

    const codes = {
      database: 'DATABASE_ERROR',
      authentication: 'AUTH_ERROR',
      upload: 'UPLOAD_ERROR',
      validation: 'VALIDATION_ERROR',
      operational: 'OPERATIONAL_ERROR',
      unknown: 'INTERNAL_ERROR'
    };

    return codes[errorType] || 'UNKNOWN_ERROR';
  }

  /**
   * バリデーションエラーのフォーマット
   */
  formatValidationErrors(details) {
    if (Array.isArray(details)) {
      return details.map(detail => ({
        field: detail.field || detail.param || detail.path,
        message: detail.message || detail.msg,
        value: this.isProduction ? undefined : detail.value
      }));
    }
    return details;
  }

  /**
   * エラーログの記録
   */
  logError(error, req, normalizedError) {
    const logData = {
      error: normalizedError,
      request: {
        method: req.method,
        path: req.path,
        query: req.query,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        referer: req.get('Referer'),
        user: req.user?.id || 'anonymous'
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        memory: process.memoryUsage()
      }
    };

    // 重要度によってログレベルを変更
    if (normalizedError.statusCode >= 500) {
      logger.logError(error, logData);
    } else if (normalizedError.statusCode >= 400) {
      logger.warn('Client error occurred', logData);
    } else {
      logger.info('Error handled', logData);
    }
  }

  /**
   * レスポンスの送信
   */
  sendErrorResponse(res, normalizedError) {
    // セキュリティヘッダーの設定
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'X-Request-ID': normalizedError.requestId
    });

    const response = {
      success: false,
      error: {
        message: normalizedError.message,
        code: normalizedError.code,
        timestamp: normalizedError.timestamp,
        path: normalizedError.path,
        method: normalizedError.method
      }
    };

    // 追加情報
    if (normalizedError.validationErrors) {
      response.error.validationErrors = normalizedError.validationErrors;
    }

    if (this.isDevelopment) {
      response.error.type = normalizedError.type;
      response.error.stack = normalizedError.stack;
      response.error.details = normalizedError.originalError;
    }

    res.status(normalizedError.statusCode).json(response);
  }

  /**
   * ミドルウェア関数
   */
  middleware() {
    return (error, req, res, next) => {
      // レスポンスが既に送信されている場合
      if (res.headersSent) {
        return next(error);
      }

      try {
        // エラーの正規化
        const normalizedError = this.normalizeError(error, req);

        // ログ記録
        this.logError(error, req, normalizedError);

        // レスポンス送信
        this.sendErrorResponse(res, normalizedError);

      } catch (handlerError) {
        // エラーハンドラー自体のエラー
        console.error('Error in error handler:', handlerError);
        
        res.status(500).json({
          success: false,
          error: {
            message: 'サーバーエラーが発生しました',
            code: 'HANDLER_ERROR',
            timestamp: new Date().toISOString()
          }
        });
      }
    };
  }
}

// シングルトンインスタンスを作成
const errorHandler = new ErrorHandler();

module.exports = errorHandler.middleware();