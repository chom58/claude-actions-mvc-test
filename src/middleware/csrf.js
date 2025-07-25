const crypto = require('crypto');
const logger = require('../utils/logger');

// CSRFトークンの管理
const csrfTokens = new Map();
const TOKEN_EXPIRY = 2 * 60 * 60 * 1000; // 2時間

// トークンの生成
const generateToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// CSRFトークンの検証
const verifyToken = (sessionId, token) => {
  const storedData = csrfTokens.get(sessionId);
  
  if (!storedData) {
    return false;
  }
  
  // 有効期限チェック
  if (Date.now() > storedData.expiry) {
    csrfTokens.delete(sessionId);
    return false;
  }
  
  return storedData.token === token;
};

// CSRFトークンの作成と保存
const createToken = (sessionId) => {
  const token = generateToken();
  const expiry = Date.now() + TOKEN_EXPIRY;
  
  csrfTokens.set(sessionId, { token, expiry });
  
  return token;
};

// CSRFトークンミドルウェア（トークン生成用）
const csrfToken = (req, res, next) => {
  // セッションIDを取得（認証済みユーザーまたはセッションID）
  const sessionId = req.session?.id || req.userId || req.ip;
  
  if (!sessionId) {
    logger.warn('CSRF token generation failed: No session ID available');
    return next();
  }
  
  // 既存のトークンをチェック
  const existingData = csrfTokens.get(sessionId);
  let token;
  
  if (existingData && Date.now() < existingData.expiry) {
    token = existingData.token;
  } else {
    token = createToken(sessionId);
  }
  
  // レスポンスにトークンを追加
  res.locals.csrfToken = token;
  
  // APIレスポンスの場合はヘッダーに追加
  if (req.path.startsWith('/api/')) {
    res.setHeader('X-CSRF-Token', token);
  }
  
  next();
};

// CSRF保護ミドルウェア（検証用）
const csrfProtection = (options = {}) => {
  const {
    excludePaths = [],
    cookieName = 'csrf-token',
    headerName = 'x-csrf-token',
    bodyField = '_csrf',
    errorMessage = 'CSRFトークンが無効です'
  } = options;
  
  return (req, res, next) => {
    // 除外パスのチェック
    if (excludePaths.some(path => req.path.startsWith(path))) {
      return next();
    }
    
    // GETリクエストは除外
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
      return next();
    }
    
    // セッションIDを取得
    const sessionId = req.session?.id || req.userId || req.ip;
    
    if (!sessionId) {
      logger.warn('CSRF protection failed: No session ID available');
      return res.status(403).json({ error: errorMessage });
    }
    
    // トークンを取得（優先順位: ヘッダー > ボディ > クッキー）
    let token = req.headers[headerName] || 
                req.headers[headerName.toUpperCase()] ||
                req.body?.[bodyField] ||
                req.cookies?.[cookieName];
    
    if (!token) {
      logger.warn(`CSRF protection failed: No token provided for ${req.method} ${req.path}`);
      return res.status(403).json({ error: errorMessage });
    }
    
    // トークンの検証
    if (!verifyToken(sessionId, token)) {
      logger.warn(`CSRF protection failed: Invalid token for ${req.method} ${req.path}`);
      return res.status(403).json({ error: errorMessage });
    }
    
    // 成功
    next();
  };
};

// 定期的なクリーンアップ（期限切れトークンの削除）
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, data] of csrfTokens.entries()) {
    if (now > data.expiry) {
      csrfTokens.delete(sessionId);
    }
  }
}, 30 * 60 * 1000); // 30分ごと

// API用のCSRF設定（厳しめ）
const apiCsrfProtection = csrfProtection({
  excludePaths: ['/api/auth/login', '/api/auth/register'], // 初回認証は除外
  errorMessage: 'セキュリティトークンが無効です。ページを更新してください。'
});

// Web用のCSRF設定（標準）
const webCsrfProtection = csrfProtection({
  excludePaths: ['/api/public'], // 公開APIは除外
  cookieName: 'csrf-token',
  errorMessage: 'セッションが無効です。ページを更新してください。'
});

module.exports = {
  csrfToken,
  csrfProtection,
  apiCsrfProtection,
  webCsrfProtection,
  generateToken,
  createToken,
  verifyToken
};