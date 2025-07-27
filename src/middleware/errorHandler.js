const { 
  BaseError, 
  ValidationError, 
  UniqueConstraintError, 
  DatabaseError,
  createError 
} = require('../utils/errorTypes');
const logger = require('../utils/logger');

// エラー詳細の生成
const generateErrorDetails = (err) => {
  const details = {
    timestamp: new Date().toISOString(),
    path: err.path || 'unknown',
    method: err.method || 'unknown',
    ip: err.ip || 'unknown',
    userAgent: err.userAgent || 'unknown'
  };

  if (process.env.NODE_ENV === 'development') {
    details.stack = err.stack;
  }

  return details;
};

// Sequelizeエラーの変換
const handleSequelizeError = (err) => {
  if (err.name === 'SequelizeValidationError') {
    const details = err.errors.map(e => ({
      field: e.path,
      message: e.message,
      value: e.value
    }));
    return new ValidationError('バリデーションエラー', details);
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    const field = err.errors[0]?.path || 'unknown';
    return new UniqueConstraintError(field);
  }

  if (err.name === 'SequelizeDatabaseError') {
    return new DatabaseError('データベースエラーが発生しました', {
      originalError: err.original?.message
    });
  }

  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return createError.validation('関連するリソースが存在しません', {
      constraint: err.constraint,
      table: err.table
    });
  }

  if (err.name === 'SequelizeTimeoutError') {
    return createError.database('データベース接続がタイムアウトしました');
  }

  return new DatabaseError('データベースエラー', { originalError: err.message });
};

// JWTエラーの変換
const handleJWTError = (err) => {
  if (err.name === 'TokenExpiredError') {
    return createError.tokenExpired();
  }

  if (err.name === 'JsonWebTokenError') {
    return createError.invalidToken();
  }

  if (err.name === 'NotBeforeError') {
    return createError.invalidToken('トークンがまだ有効ではありません');
  }

  return createError.auth('認証トークンエラー', { originalError: err.message });
};

// バリデーションエラーの変換
const handleValidationError = (err) => {
  if (err.name === 'ValidationError' && err.details) {
    // express-validatorのエラー
    if (Array.isArray(err.details) && err.details[0]?.msg) {
      const details = err.details.map(detail => ({
        field: detail.param || detail.path,
        message: detail.msg,
        value: detail.value
      }));
      return new ValidationError('入力データのバリデーションエラー', details);
    }
  }

  return new ValidationError(err.message || 'バリデーションエラー', err.details);
};

// Multerエラーの変換
const handleMulterError = (err) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return createError.fileSize(err.limit, 'ファイルサイズが上限を超えています');
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    return createError.file('ファイル数が上限を超えています', { limit: err.limit });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return createError.file('予期しないファイルフィールドです', { field: err.field });
  }

  return createError.file('ファイルアップロードエラー', { originalError: err.message });
};

// メインのエラーハンドラー
module.exports = (err, req, res, next) => {
  // リクエスト情報を追加
  err.path = req.path;
  err.method = req.method;
  err.ip = req.ip;
  err.userAgent = req.get('User-Agent');

  let processedError = err;

  // エラータイプ別の処理
  if (err.name?.startsWith('Sequelize')) {
    processedError = handleSequelizeError(err);
  } else if (['TokenExpiredError', 'JsonWebTokenError', 'NotBeforeError'].includes(err.name)) {
    processedError = handleJWTError(err);
  } else if (err.name === 'ValidationError' && !err.isOperational) {
    processedError = handleValidationError(err);
  } else if (err.name === 'MulterError') {
    processedError = handleMulterError(err);
  } else if (err.type === 'entity.parse.failed') {
    processedError = createError.validation('無効なJSONです');
  } else if (err.type === 'entity.too.large') {
    processedError = createError.validation('リクエストサイズが大きすぎます');
  } else if (!err.isOperational) {
    // 予期しないエラーの場合はBaseErrorでラップ
    processedError = new BaseError(
      process.env.NODE_ENV === 'production' ? 'サーバーエラーが発生しました' : err.message,
      err.status || err.statusCode || 500,
      'INTERNAL_ERROR',
      process.env.NODE_ENV === 'development' ? { originalError: err.message } : null
    );
  }

  // ログ出力
  const logData = {
    error: processedError.toJSON ? processedError.toJSON() : processedError,
    request: {
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      body: req.method !== 'GET' ? req.body : undefined
    },
    user: req.user?.id || req.session?.user?.id || 'anonymous'
  };

  if (processedError.statusCode >= 500) {
    logger.error('Server Error:', logData);
  } else if (processedError.statusCode >= 400) {
    logger.warn('Client Error:', logData);
  }

  // バリデーションエラーの特別処理
  if (processedError.name === 'ValidationError' && Array.isArray(processedError.details)) {
    // express-validatorのエラー形式に合わせる
    const responseData = {
      errors: processedError.details.map(detail => ({
        type: 'field',
        msg: detail.message || detail.msg,
        path: detail.field || detail.path,
        location: 'body',
        value: detail.value
      }))
    };
    
    res.status(processedError.statusCode || 400).json(responseData);
    return;
  }

  // 標準エラーレスポンス
  const responseData = {
    success: false,
    error: processedError.message,
    code: processedError.code || 'UNKNOWN_ERROR',
    statusCode: processedError.statusCode || 500,
    timestamp: processedError.timestamp || new Date().toISOString()
  };

  // 詳細情報の追加（開発環境 or operationalエラー）
  if (processedError.details || (process.env.NODE_ENV === 'development' && processedError.stack)) {
    responseData.details = processedError.details;
    
    if (process.env.NODE_ENV === 'development') {
      responseData.stack = processedError.stack;
    }
  }

  // セキュリティヘッダーの追加
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block'
  });

  res.status(processedError.statusCode || 500).json(responseData);
};