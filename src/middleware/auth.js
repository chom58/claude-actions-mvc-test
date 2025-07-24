const jwt = require('jsonwebtoken');

// JWT秘密鍵の検証
const validateJWTSecret = () => {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your-secret-key') {
    throw new Error('JWT_SECRET環境変数が設定されていないか、デフォルト値が使用されています');
  }
};

module.exports = (req, res, next) => {
  try {
    // JWT秘密鍵の検証
    validateJWTSecret();

    // Authorizationヘッダーまたはクッキーからトークンを取得
    const authHeader = req.headers.authorization;
    let token = null;

    // 1. Authorizationヘッダーから取得（APIリクエスト用）
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
    // 2. クッキーから取得（Webアプリケーション用） 
    else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }
    
    if (!token) {
      return res.status(401).json({
        error: '認証トークンが提供されていません'
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    req.userId = decoded.userId;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: '認証トークンの有効期限が切れています'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: '無効な認証トークンです'
      });
    }

    console.error('Auth middleware error:', error);
    res.status(500).json({
      error: '認証処理中にエラーが発生しました'
    });
  }
};