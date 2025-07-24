// 統一されたエラータイプの定義

class BaseError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.isOperational = true; // 予期されたエラーかどうか

    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp,
      isOperational: this.isOperational,
      ...(process.env.NODE_ENV === 'development' && { stack: this.stack })
    };
  }
}

// 認証関連エラー
class AuthenticationError extends BaseError {
  constructor(message = '認証に失敗しました', details = null) {
    super(message, 401, 'AUTH_FAILED', details);
  }
}

class AuthorizationError extends BaseError {
  constructor(message = 'アクセス権限がありません', details = null) {
    super(message, 403, 'ACCESS_DENIED', details);
  }
}

class TokenExpiredError extends BaseError {
  constructor(message = 'トークンの有効期限が切れています', details = null) {
    super(message, 401, 'TOKEN_EXPIRED', details);
  }
}

class InvalidTokenError extends BaseError {
  constructor(message = '無効なトークンです', details = null) {
    super(message, 401, 'INVALID_TOKEN', details);
  }
}

// バリデーション関連エラー
class ValidationError extends BaseError {
  constructor(message = 'バリデーションエラー', details = null) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

class RequiredFieldError extends BaseError {
  constructor(field, message = null) {
    const msg = message || `${field}は必須項目です`;
    super(msg, 400, 'REQUIRED_FIELD_MISSING', { field });
  }
}

class InvalidFormatError extends BaseError {
  constructor(field, format, message = null) {
    const msg = message || `${field}の形式が正しくありません。期待される形式: ${format}`;
    super(msg, 400, 'INVALID_FORMAT', { field, expectedFormat: format });
  }
}

// データベース関連エラー
class DatabaseError extends BaseError {
  constructor(message = 'データベースエラーが発生しました', details = null) {
    super(message, 500, 'DATABASE_ERROR', details);
  }
}

class UniqueConstraintError extends BaseError {
  constructor(field, message = null) {
    const msg = message || `${field}は既に使用されています`;
    super(msg, 400, 'DUPLICATE_ENTRY', { field });
  }
}

class NotFoundError extends BaseError {
  constructor(resource = 'リソース', message = null) {
    const msg = message || `${resource}が見つかりません`;
    super(msg, 404, 'NOT_FOUND', { resource });
  }
}

class ResourceConflictError extends BaseError {
  constructor(message = 'リソースの競合が発生しました', details = null) {
    super(message, 409, 'RESOURCE_CONFLICT', details);
  }
}

// レート制限関連エラー
class RateLimitError extends BaseError {
  constructor(message = 'リクエスト制限に達しました', details = null) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', details);
  }
}

// ファイル関連エラー
class FileError extends BaseError {
  constructor(message = 'ファイル処理エラー', details = null) {
    super(message, 400, 'FILE_ERROR', details);
  }
}

class FileSizeError extends BaseError {
  constructor(maxSize, message = null) {
    const msg = message || `ファイルサイズが上限（${maxSize}）を超えています`;
    super(msg, 400, 'FILE_SIZE_EXCEEDED', { maxSize });
  }
}

class FileTypeError extends BaseError {
  constructor(allowedTypes, message = null) {
    const msg = message || `許可されていないファイル形式です。許可される形式: ${allowedTypes.join(', ')}`;
    super(msg, 400, 'INVALID_FILE_TYPE', { allowedTypes });
  }
}

// 外部サービス関連エラー
class ExternalServiceError extends BaseError {
  constructor(service, message = null, details = null) {
    const msg = message || `外部サービス（${service}）でエラーが発生しました`;
    super(msg, 502, 'EXTERNAL_SERVICE_ERROR', { service, ...details });
  }
}

class ServiceUnavailableError extends BaseError {
  constructor(service, message = null) {
    const msg = message || `サービス（${service}）が利用できません`;
    super(msg, 503, 'SERVICE_UNAVAILABLE', { service });
  }
}

// CSRF関連エラー
class CSRFError extends BaseError {
  constructor(message = 'CSRF保護: 無効なトークンです', details = null) {
    super(message, 403, 'CSRF_TOKEN_INVALID', details);
  }
}

// セッション関連エラー
class SessionError extends BaseError {
  constructor(message = 'セッションエラー', details = null) {
    super(message, 401, 'SESSION_ERROR', details);
  }
}

class SessionExpiredError extends BaseError {
  constructor(message = 'セッションの有効期限が切れています', details = null) {
    super(message, 401, 'SESSION_EXPIRED', details);
  }
}

// OAuth関連エラー
class OAuthError extends BaseError {
  constructor(provider, message = null, details = null) {
    const msg = message || `OAuth認証（${provider}）に失敗しました`;
    super(msg, 401, 'OAUTH_ERROR', { provider, ...details });
  }
}

// エラーファクトリー関数
const createError = {
  auth: (message, details) => new AuthenticationError(message, details),
  authorization: (message, details) => new AuthorizationError(message, details),
  tokenExpired: (message, details) => new TokenExpiredError(message, details),
  invalidToken: (message, details) => new InvalidTokenError(message, details),
  validation: (message, details) => new ValidationError(message, details),
  requiredField: (field, message) => new RequiredFieldError(field, message),
  invalidFormat: (field, format, message) => new InvalidFormatError(field, format, message),
  database: (message, details) => new DatabaseError(message, details),
  uniqueConstraint: (field, message) => new UniqueConstraintError(field, message),
  notFound: (resource, message) => new NotFoundError(resource, message),
  conflict: (message, details) => new ResourceConflictError(message, details),
  rateLimit: (message, details) => new RateLimitError(message, details),
  file: (message, details) => new FileError(message, details),
  fileSize: (maxSize, message) => new FileSizeError(maxSize, message),
  fileType: (allowedTypes, message) => new FileTypeError(allowedTypes, message),
  externalService: (service, message, details) => new ExternalServiceError(service, message, details),
  serviceUnavailable: (service, message) => new ServiceUnavailableError(service, message),
  csrf: (message, details) => new CSRFError(message, details),
  session: (message, details) => new SessionError(message, details),
  sessionExpired: (message, details) => new SessionExpiredError(message, details),
  oauth: (provider, message, details) => new OAuthError(provider, message, details)
};

module.exports = {
  BaseError,
  AuthenticationError,
  AuthorizationError,
  TokenExpiredError,
  InvalidTokenError,
  ValidationError,
  RequiredFieldError,
  InvalidFormatError,
  DatabaseError,
  UniqueConstraintError,
  NotFoundError,
  ResourceConflictError,
  RateLimitError,
  FileError,
  FileSizeError,
  FileTypeError,
  ExternalServiceError,
  ServiceUnavailableError,
  CSRFError,
  SessionError,
  SessionExpiredError,
  OAuthError,
  createError
};