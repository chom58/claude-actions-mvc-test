const { User } = require('../models');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const asyncHandler = require('../utils/asyncHandler');
const { 
  checkValidationErrors,
  checkResourceExists,
  checkAuthentication,
  sendSuccessResponse,
  dbHelpers
} = require('../utils/controllerHelpers');
const { 
  AuthenticationError,
  ValidationError,
  UniqueConstraintError,
  createError 
} = require('../utils/errorTypes');

// JWT秘密鍵の検証
const validateJWTSecrets = () => {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your-secret-key') {
    throw createError.auth('JWT_SECRET環境変数が設定されていないか、デフォルト値が使用されています');
  }
  if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET === 'your-refresh-secret-key') {
    throw createError.auth('JWT_REFRESH_SECRET環境変数が設定されていないか、デフォルト値が使用されています');
  }
};

const generateToken = (userId) => {
  validateJWTSecrets();
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '15m' }
  );
};

const generateRefreshToken = (userId) => {
  validateJWTSecrets();
  return jwt.sign(
    { userId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
  );
};

// リフレッシュトークンの暗号化
const encryptRefreshToken = (token) => {
  if (!process.env.REFRESH_TOKEN_ENCRYPTION_KEY) {
    throw createError.auth('REFRESH_TOKEN_ENCRYPTION_KEY環境変数が設定されていません');
  }
  const cipher = crypto.createCipher('aes-256-cbc', process.env.REFRESH_TOKEN_ENCRYPTION_KEY);
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
};

// リフレッシュトークンの復号化
const decryptRefreshToken = (encryptedToken) => {
  if (!process.env.REFRESH_TOKEN_ENCRYPTION_KEY) {
    throw createError.auth('REFRESH_TOKEN_ENCRYPTION_KEY環境変数が設定されていません');
  }
  
  try {
    const decipher = crypto.createDecipher('aes-256-cbc', process.env.REFRESH_TOKEN_ENCRYPTION_KEY);
    let decrypted = decipher.update(encryptedToken, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    throw createError.invalidToken('リフレッシュトークンの復号化に失敗しました');
  }
};

// セキュアなクッキー設定のヘルパー
const setSecureCookie = (res, name, value, maxAge) => {
  res.cookie(name, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge
  });
};

/**
 * ユーザー登録
 */
exports.register = asyncHandler(async (req, res) => {
  checkValidationErrors(req);

  const { username, email, password } = req.body;

  // 既存ユーザーチェック
  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    throw new UniqueConstraintError('email', 'このメールアドレスは既に登録されています');
  }

  // ユーザー作成
  const user = await dbHelpers.create(User, {
    username,
    email,
    password
  });

  // トークン生成
  const token = generateToken(user.id);
  const refreshToken = generateRefreshToken(user.id);
  
  // リフレッシュトークンを暗号化してデータベースに保存
  const encryptedRefreshToken = encryptRefreshToken(refreshToken);
  user.refreshToken = encryptedRefreshToken;
  await user.save();

  // セキュアなクッキー設定
  setSecureCookie(res, 'accessToken', token, 15 * 60 * 1000); // 15分
  setSecureCookie(res, 'refreshToken', encryptedRefreshToken, 7 * 24 * 60 * 60 * 1000); // 7日

  sendSuccessResponse(res, {
    user: user.toJSON()
  }, 'ユーザー登録が完了しました', 201);
});

/**
 * ユーザーログイン
 */
exports.login = asyncHandler(async (req, res) => {
  checkValidationErrors(req);

  const { email, password } = req.body;

  // ユーザー検索とパスワード確認
  const user = await User.findOne({ where: { email } });
  if (!user || !(await user.comparePassword(password))) {
    throw new AuthenticationError('メールアドレスまたはパスワードが正しくありません');
  }

  // トークン生成
  const token = generateToken(user.id);
  const refreshToken = generateRefreshToken(user.id);
  
  // リフレッシュトークンを暗号化してデータベースに保存
  const encryptedRefreshToken = encryptRefreshToken(refreshToken);
  user.refreshToken = encryptedRefreshToken;
  user.lastLoginAt = new Date();
  await user.save();

  // セキュアなクッキー設定
  setSecureCookie(res, 'accessToken', token, 15 * 60 * 1000); // 15分
  setSecureCookie(res, 'refreshToken', encryptedRefreshToken, 7 * 24 * 60 * 60 * 1000); // 7日

  sendSuccessResponse(res, {
    user: user.toJSON()
  }, 'ログインに成功しました');
});

/**
 * プロフィール取得
 */
exports.getProfile = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.userId, {
    include: [{
      association: 'posts',
      attributes: ['id', 'title', 'published', 'createdAt']
    }]
  });

  checkResourceExists(user, 'ユーザー');

  sendSuccessResponse(res, {
    user: user.toJSON()
  }, 'プロフィールを取得しました');
});

/**
 * プロフィール更新
 */
exports.updateProfile = asyncHandler(async (req, res) => {
  checkValidationErrors(req);

  const { username, email } = req.body;
  const user = await dbHelpers.findById(User, req.userId, {}, 'ユーザー');

  // メールアドレス変更時の重複チェック
  if (email && email !== user.email) {
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      throw new UniqueConstraintError('email', 'このメールアドレスは既に使用されています');
    }
  }

  // プロフィール更新
  await user.update({
    username: username || user.username,
    email: email || user.email
  });

  sendSuccessResponse(res, {
    user: user.toJSON()
  }, 'プロフィールが更新されました');
});

/**
 * アカウント削除
 */
exports.deleteAccount = asyncHandler(async (req, res) => {
  const user = await dbHelpers.findById(User, req.userId, {}, 'ユーザー');
  await user.destroy();

  // クッキークリア
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');

  sendSuccessResponse(res, null, 'アカウントが削除されました');
});

/**
 * ログアウト
 */
exports.logout = asyncHandler(async (req, res) => {
  const user = await dbHelpers.findById(User, req.userId, {}, 'ユーザー');

  // リフレッシュトークンを無効化
  user.refreshToken = null;
  await user.save();

  // HTTP-onlyクッキーをクリア
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');

  sendSuccessResponse(res, null, 'ログアウトが完了しました');
});

/**
 * トークンリフレッシュ
 */
exports.refreshToken = asyncHandler(async (req, res) => {
  validateJWTSecrets();

  // リフレッシュトークンをクッキーまたはボディから取得
  const encryptedRefreshToken = req.cookies?.refreshToken || req.body.refreshToken;
  if (!encryptedRefreshToken) {
    throw createError.auth('リフレッシュトークンが提供されていません');
  }

  // 暗号化されたリフレッシュトークンを復号化
  const refreshToken = decryptRefreshToken(encryptedRefreshToken);

  // リフレッシュトークンを検証
  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw createError.tokenExpired('リフレッシュトークンの有効期限が切れています');
    }
    throw createError.invalidToken('無効なリフレッシュトークンです');
  }

  if (decoded.type !== 'refresh') {
    throw createError.invalidToken('無効なリフレッシュトークンです');
  }

  // ユーザーのリフレッシュトークンと照合
  const user = await dbHelpers.findById(User, decoded.userId, {}, 'ユーザー');
  
  if (user.refreshToken !== encryptedRefreshToken) {
    throw createError.invalidToken('無効なリフレッシュトークンです');
  }

  // 新しいトークンを生成
  const newToken = generateToken(user.id);
  const newRefreshToken = generateRefreshToken(user.id);
  
  // 新しいリフレッシュトークンを暗号化して保存
  const newEncryptedRefreshToken = encryptRefreshToken(newRefreshToken);
  user.refreshToken = newEncryptedRefreshToken;
  await user.save();

  // セキュアなクッキー設定
  setSecureCookie(res, 'accessToken', newToken, 15 * 60 * 1000); // 15分
  setSecureCookie(res, 'refreshToken', newEncryptedRefreshToken, 7 * 24 * 60 * 60 * 1000); // 7日

  sendSuccessResponse(res, null, 'トークンが更新されました');
});

/**
 * パスワードリセット要求
 */
exports.requestPasswordReset = asyncHandler(async (req, res) => {
  checkValidationErrors(req);

  const { email } = req.body;
  const user = await User.findOne({ where: { email } });

  // セキュリティのため、ユーザーが存在しなくても同じレスポンスを返す
  if (!user) {
    return sendSuccessResponse(res, null, 
      'パスワードリセットのメールを送信しました（該当するアカウントが存在する場合）');
  }

  // パスワードリセットトークンを生成
  const resetToken = user.generatePasswordResetToken();
  await user.save();

  // 実際のアプリケーションでは、ここでメール送信を行う
  // 開発用にトークンをログに出力
  console.log('Password reset token for', email, ':', resetToken);

  sendSuccessResponse(res, {
    // 開発用にトークンを返す（本番環境では削除）
    ...(process.env.NODE_ENV === 'development' && { resetToken })
  }, 'パスワードリセットのメールを送信しました（該当するアカウントが存在する場合）');
});

/**
 * パスワードリセット実行
 */
exports.resetPassword = asyncHandler(async (req, res) => {
  checkValidationErrors(req);

  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    throw new ValidationError('トークンと新しいパスワードが必要です');
  }

  // トークンを持つユーザーを検索
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  const user = await User.findOne({
    where: {
      resetPasswordToken: hashedToken,
      resetPasswordExpires: {
        [require('sequelize').Op.gt]: new Date()
      }
    }
  });

  if (!user) {
    throw new ValidationError('無効または期限切れのリセットトークンです');
  }

  // パスワードを更新（beforeSaveフックでハッシュ化される）
  user.password = newPassword;
  user.resetPasswordToken = null;
  user.resetPasswordExpires = null;
  user.refreshToken = null; // 既存のリフレッシュトークンを無効化
  await user.save();

  sendSuccessResponse(res, null, 'パスワードが正常にリセットされました');
});