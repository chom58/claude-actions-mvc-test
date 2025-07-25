const { validationResult } = require('express-validator');
const { 
  ValidationError, 
  NotFoundError, 
  AuthenticationError,
  createError 
} = require('./errorTypes');

/**
 * 統一されたバリデーションエラーチェック
 * express-validatorの結果をチェックし、エラーがあれば統一形式で投げる
 */
const checkValidationErrors = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const details = errors.array().map(error => ({
      field: error.param || error.path,
      message: error.msg,
      value: error.value
    }));
    throw new ValidationError('入力データのバリデーションエラー', details);
  }
};

/**
 * リソースの存在チェック
 * データベースから取得したリソースが存在しない場合、統一形式でエラーを投げる
 */
const checkResourceExists = (resource, resourceName = 'リソース') => {
  if (!resource) {
    throw new NotFoundError(resourceName);
  }
  return resource;
};

/**
 * 認証されたユーザーのチェック
 * リクエストにユーザー情報が含まれているかチェック
 */
const checkAuthentication = (req) => {
  if (!req.user && !req.session?.user) {
    throw new AuthenticationError('ログインが必要です');
  }
  return req.user || req.session.user;
};

/**
 * 権限チェック（所有者または管理者）
 * ユーザーがリソースの所有者または管理者かどうかチェック
 */
const checkOwnership = (user, resource, resourceUserId) => {
  const userId = user.id || user.userId;
  const isOwner = userId === resourceUserId;
  const isAdmin = user.role === 'admin' || user.isAdmin;
  
  if (!isOwner && !isAdmin) {
    throw createError.authorization('このリソースにアクセスする権限がありません');
  }
};

/**
 * ページネーション設定の取得
 * クエリパラメータからページネーション設定を取得し、バリデーション
 */
const getPaginationParams = (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const offset = (page - 1) * limit;

  return { page, limit, offset };
};

/**
 * ソート設定の取得
 * クエリパラメータからソート設定を取得し、バリデーション
 */
const getSortParams = (query, allowedFields = ['createdAt', 'updatedAt']) => {
  const sortBy = allowedFields.includes(query.sortBy) ? query.sortBy : 'createdAt';
  const sortOrder = ['ASC', 'DESC'].includes(query.sortOrder?.toUpperCase()) 
    ? query.sortOrder.toUpperCase() 
    : 'DESC';

  return { sortBy, sortOrder };
};

/**
 * 成功レスポンスの統一形式
 * APIレスポンスを統一形式で返すヘルパー
 */
const sendSuccessResponse = (res, data, message = '処理が正常に完了しました', statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

/**
 * ページネーション付き成功レスポンス
 * ページネーション情報を含む統一形式のレスポンス
 */
const sendPaginatedResponse = (res, data, pagination, message = 'データを取得しました') => {
  res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      currentPage: pagination.page,
      totalPages: Math.ceil(pagination.total / pagination.limit),
      totalItems: pagination.total,
      itemsPerPage: pagination.limit
    },
    timestamp: new Date().toISOString()
  });
};

/**
 * ファイルアップロードエラーのハンドリング
 * Multerエラーを統一形式に変換
 */
const handleUploadError = (error) => {
  if (error.code === 'LIMIT_FILE_SIZE') {
    throw createError.fileSize(error.limit, 'ファイルサイズが上限を超えています');
  }
  if (error.code === 'LIMIT_FILE_COUNT') {
    throw createError.file('ファイル数が上限を超えています', { limit: error.limit });
  }
  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    throw createError.file('予期しないファイルフィールドです', { field: error.field });
  }
  throw createError.file('ファイルアップロードエラー', { originalError: error.message });
};

/**
 * データベース操作の共通パターン
 * よくあるCRUD操作のパターンを統一
 */
const dbHelpers = {
  /**
   * リソースの作成
   */
  async create(Model, data, options = {}) {
    try {
      const resource = await Model.create(data, options);
      return resource;
    } catch (error) {
      // Sequelizeエラーは自動的に変換される
      throw error;
    }
  },

  /**
   * リソースの取得（IDによる）
   */
  async findById(Model, id, options = {}, resourceName = 'リソース') {
    const resource = await Model.findByPk(id, options);
    return checkResourceExists(resource, resourceName);
  },

  /**
   * リソースの更新
   */
  async update(Model, id, data, options = {}, resourceName = 'リソース') {
    const resource = await Model.findByPk(id);
    checkResourceExists(resource, resourceName);
    
    await resource.update(data, options);
    return resource;
  },

  /**
   * リソースの削除
   */
  async delete(Model, id, options = {}, resourceName = 'リソース') {
    const resource = await Model.findByPk(id);
    checkResourceExists(resource, resourceName);
    
    await resource.destroy(options);
    return resource;
  }
};

/**
 * SQLインジェクション対策のための文字列サニタイゼーション
 */
const sanitizeSearchQuery = (query) => {
  if (typeof query !== 'string') return '';
  
  // 危険な文字を除去
  return query
    .replace(/['"`;\\]/g, '') // SQL特殊文字を除去
    .replace(/--/g, '') // SQLコメントを除去
    .replace(/\/\*|\*\//g, '') // SQLコメントブロックを除去
    .trim()
    .substring(0, 100); // 長さ制限
};

/**
 * XSS対策のためのHTMLサニタイゼーション
 */
const sanitizeHtml = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * JSONフィールドの安全な解析
 */
const parseJsonSafely = (jsonString, defaultValue = null) => {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    return defaultValue;
  }
};

module.exports = {
  checkValidationErrors,
  checkResourceExists,
  checkAuthentication,
  checkOwnership,
  getPaginationParams,
  getSortParams,
  sendSuccessResponse,
  sendPaginatedResponse,
  handleUploadError,
  dbHelpers,
  sanitizeSearchQuery,
  sanitizeHtml,
  parseJsonSafely
};