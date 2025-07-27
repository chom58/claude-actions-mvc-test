const logger = require('../utils/logger');

// 統一レスポンス形式のヘルパー関数
const createSuccessResponse = (data, message = null, pagination = null) => {
  const response = {
    success: true,
    data
  };
  
  if (message) {
    response.message = message;
  }
  
  if (pagination) {
    response.pagination = pagination;
  }
  
  return response;
};

const createErrorResponse = (error, code = 'UNKNOWN_ERROR', statusCode = 500, details = null) => {
  return {
    success: false,
    error,
    code,
    statusCode,
    timestamp: new Date().toISOString(),
    ...(details && { details })
  };
};

// 成功レスポンス用のミドルウェア
const sendSuccess = (res, data, message = null, statusCode = 200, pagination = null) => {
  const response = createSuccessResponse(data, message, pagination);
  
  // セキュリティヘッダーの追加
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  
  return res.status(statusCode).json(response);
};

// エラーレスポンス用のミドルウェア
const sendError = (res, error, code = 'UNKNOWN_ERROR', statusCode = 500, details = null) => {
  const response = createErrorResponse(error, code, statusCode, details);
  
  // セキュリティヘッダーの追加
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block'
  });
  
  return res.status(statusCode).json(response);
};

// 標準化されたレスポンスヘルパーをリクエストオブジェクトに追加
const attachResponseHelpers = (req, res, next) => {
  // 成功レスポンス
  res.success = (data, message = null, statusCode = 200, pagination = null) => {
    return sendSuccess(res, data, message, statusCode, pagination);
  };
  
  // エラーレスポンス
  res.error = (error, code = 'UNKNOWN_ERROR', statusCode = 500, details = null) => {
    return sendError(res, error, code, statusCode, details);
  };
  
  // 作成成功レスポンス
  res.created = (data, message = null) => {
    return sendSuccess(res, data, message, 201);
  };
  
  // 更新成功レスポンス
  res.updated = (data, message = null) => {
    return sendSuccess(res, data, message, 200);
  };
  
  // 削除成功レスポンス
  res.deleted = (message = 'リソースが削除されました') => {
    return res.status(204).send();
  };
  
  // バリデーションエラーレスポンス
  res.validationError = (errors) => {
    return res.status(400).json({
      errors: Array.isArray(errors) ? errors : [errors]
    });
  };
  
  // 未認証エラーレスポンス
  res.unauthorized = (message = '認証が必要です') => {
    return sendError(res, message, 'UNAUTHORIZED', 401);
  };
  
  // 権限なしエラーレスポンス
  res.forbidden = (message = 'アクセス権限がありません') => {
    return sendError(res, message, 'FORBIDDEN', 403);
  };
  
  // リソース未発見エラーレスポンス
  res.notFound = (message = 'リソースが見つかりません') => {
    return sendError(res, message, 'NOT_FOUND', 404);
  };
  
  // 競合エラーレスポンス
  res.conflict = (message = 'リソースの競合が発生しました') => {
    return sendError(res, message, 'CONFLICT', 409);
  };
  
  // サーバーエラーレスポンス
  res.serverError = (message = 'サーバーエラーが発生しました') => {
    return sendError(res, message, 'INTERNAL_SERVER_ERROR', 500);
  };
  
  // レート制限エラーレスポンス
  res.rateLimited = (message = 'リクエスト制限に達しました', retryAfter = 60) => {
    res.set('Retry-After', retryAfter);
    return sendError(res, message, 'RATE_LIMIT_EXCEEDED', 429, { retryAfter });
  };
  
  next();
};

// ページネーション情報の作成
const createPagination = (total, page, limit, hasNext = null, hasPrev = null) => {
  const currentPage = parseInt(page) || 1;
  const perPage = parseInt(limit) || 10;
  const totalPages = Math.ceil(total / perPage);
  
  return {
    total: parseInt(total),
    totalPages,
    currentPage,
    perPage,
    hasNext: hasNext !== null ? hasNext : currentPage < totalPages,
    hasPrev: hasPrev !== null ? hasPrev : currentPage > 1
  };
};

// エクスプレスバリデーターのエラーを標準形式に変換
const formatValidationErrors = (errors) => {
  return errors.map(error => ({
    type: error.type || 'field',
    msg: error.msg,
    path: error.path || error.param,
    location: error.location,
    value: error.value
  }));
};

// APIレスポンスのログ記録
const logApiResponse = (req, res, responseData, statusCode) => {
  const logData = {
    request: {
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      user: req.user?.id || req.session?.user?.id || 'anonymous'
    },
    response: {
      statusCode,
      success: statusCode < 400,
      dataSize: JSON.stringify(responseData).length
    },
    timestamp: new Date().toISOString()
  };
  
  if (statusCode >= 400) {
    logger.warn('API Error Response:', logData);
  } else {
    logger.info('API Success Response:', logData);
  }
};

module.exports = {
  attachResponseHelpers,
  createSuccessResponse,
  createErrorResponse,
  createPagination,
  formatValidationErrors,
  logApiResponse,
  sendSuccess,
  sendError
};