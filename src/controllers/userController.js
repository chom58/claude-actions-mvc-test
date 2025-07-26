const { User } = require('../models');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const crypto = require('crypto');

// JWT秘密鍵の検証
const validateJWTSecrets = () => {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your-secret-key') {
    throw new Error('JWT_SECRET環境変数が設定されていないか、デフォルト値が使用されています');
  }
  if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET === 'your-refresh-secret-key') {
    throw new Error('JWT_REFRESH_SECRET環境変数が設定されていないか、デフォルト値が使用されています');
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
    throw new Error('REFRESH_TOKEN_ENCRYPTION_KEY環境変数が設定されていません');
  }
  const cipher = crypto.createCipher('aes-256-cbc', process.env.REFRESH_TOKEN_ENCRYPTION_KEY);
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
};

// リフレッシュトークンの復号化
const decryptRefreshToken = (encryptedToken) => {
  if (!process.env.REFRESH_TOKEN_ENCRYPTION_KEY) {
    throw new Error('REFRESH_TOKEN_ENCRYPTION_KEY環境変数が設定されていません');
  }
  const decipher = crypto.createDecipher('aes-256-cbc', process.env.REFRESH_TOKEN_ENCRYPTION_KEY);
  let decrypted = decipher.update(encryptedToken, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

exports.register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password } = req.body;

    const existingUser = await User.findOne({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({
        error: 'このメールアドレスは既に登録されています'
      });
    }

    const user = await User.create({
      username,
      email,
      password
    });

    const token = generateToken(user.id);
    const refreshToken = generateRefreshToken(user.id);
    
    // リフレッシュトークンを暗号化してデータベースに保存
    const encryptedRefreshToken = encryptRefreshToken(refreshToken);
    user.refreshToken = encryptedRefreshToken;
    await user.save();

    // トークンをHTTP-onlyクッキーとして設定
    res.cookie('accessToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000 // 15分
    });
    
    res.cookie('refreshToken', encryptedRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7日
    });

    res.status(201).json({
      message: 'ユーザー登録が完了しました',
      user: user.toJSON()
      // トークンは安全なHTTP-onlyクッキーとして送信
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'ユーザー登録中にエラーが発生しました'
    });
  }
};

exports.login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const user = await User.findOne({
      where: { email }
    });

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        error: 'メールアドレスまたはパスワードが正しくありません'
      });
    }

    const token = generateToken(user.id);
    const refreshToken = generateRefreshToken(user.id);
    
    // リフレッシュトークンを暗号化してデータベースに保存
    const encryptedRefreshToken = encryptRefreshToken(refreshToken);
    user.refreshToken = encryptedRefreshToken;
    user.lastLoginAt = new Date();
    await user.save();

    // トークンをHTTP-onlyクッキーとして設定
    res.cookie('accessToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000 // 15分
    });
    
    res.cookie('refreshToken', encryptedRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7日
    });

    res.json({
      message: 'ログインに成功しました',
      user: user.toJSON()
      // トークンは安全なHTTP-onlyクッキーとして送信
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'ログイン中にエラーが発生しました'
    });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.userId, {
      include: [{
        association: 'posts',
        attributes: ['id', 'title', 'published', 'createdAt']
      }]
    });

    if (!user) {
      return res.status(404).json({
        error: 'ユーザーが見つかりません'
      });
    }

    res.json({
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: 'プロフィール取得中にエラーが発生しました'
    });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, bio, website, location, skills } = req.body;
    const user = await User.findByPk(req.userId);

    if (!user) {
      return res.status(404).json({
        error: 'ユーザーが見つかりません'
      });
    }

    if (email && email !== user.email) {
      const existingUser = await User.findOne({
        where: { email }
      });

      if (existingUser) {
        return res.status(400).json({
          error: 'このメールアドレスは既に使用されています'
        });
      }
    }

    // 画像アップロード情報があれば追加
    const updateData = {
      username: username || user.username,
      email: email || user.email,
      bio: bio || user.bio,
      website: website || user.website,
      location: location || user.location,
      skills: skills ? (typeof skills === 'string' ? JSON.parse(skills) : skills) : user.skills
    };

    if (req.uploadedImage) {
      updateData.profileImage = req.uploadedImage.originalPath;
      updateData.profileImageThumbnail = req.uploadedImage.thumbnailPath;
    }

    await user.update(updateData);

    res.json({
      message: 'プロフィールが更新されました',
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      error: 'プロフィール更新中にエラーが発生しました'
    });
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    const user = await User.findByPk(req.userId);

    if (!user) {
      return res.status(404).json({
        error: 'ユーザーが見つかりません'
      });
    }

    await user.destroy();

    res.json({
      message: 'アカウントが削除されました'
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      error: 'アカウント削除中にエラーが発生しました'
    });
  }
};

// ログアウト機能
exports.logout = async (req, res) => {
  try {
    const user = await User.findByPk(req.userId);
    
    if (!user) {
      return res.status(404).json({
        error: 'ユーザーが見つかりません'
      });
    }

    // リフレッシュトークンを無効化
    user.refreshToken = null;
    await user.save();

    // HTTP-onlyクッキーをクリア
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    res.json({
      message: 'ログアウトが完了しました'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'ログアウト中にエラーが発生しました'
    });
  }
};

// リフレッシュトークンを使用してアクセストークンを更新
exports.refreshToken = async (req, res) => {
  try {
    // JWT秘密鍵の検証
    validateJWTSecrets();

    // リフレッシュトークンをクッキーまたはボディから取得
    let encryptedRefreshToken = req.cookies?.refreshToken || req.body.refreshToken;

    if (!encryptedRefreshToken) {
      return res.status(401).json({
        error: 'リフレッシュトークンが提供されていません'
      });
    }

    // 暗号化されたリフレッシュトークンを復号化
    let refreshToken;
    try {
      refreshToken = decryptRefreshToken(encryptedRefreshToken);
    } catch (error) {
      return res.status(401).json({
        error: '無効なリフレッシュトークンです'
      });
    }

    // リフレッシュトークンを検証
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET
    );

    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        error: '無効なリフレッシュトークンです'
      });
    }

    // ユーザーのリフレッシュトークンと照合
    const user = await User.findByPk(decoded.userId);
    
    if (!user || user.refreshToken !== encryptedRefreshToken) {
      return res.status(401).json({
        error: '無効なリフレッシュトークンです'
      });
    }

    // 新しいアクセストークンを生成
    const newToken = generateToken(user.id);
    const newRefreshToken = generateRefreshToken(user.id);
    
    // 新しいリフレッシュトークンを暗号化して保存
    const newEncryptedRefreshToken = encryptRefreshToken(newRefreshToken);
    user.refreshToken = newEncryptedRefreshToken;
    await user.save();

    // 新しいトークンをHTTP-onlyクッキーとして設定
    res.cookie('accessToken', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000 // 15分
    });
    
    res.cookie('refreshToken', newEncryptedRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7日
    });

    res.json({
      message: 'トークンが更新されました'
      // トークンは安全なHTTP-onlyクッキーとして送信
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'リフレッシュトークンの有効期限が切れています'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: '無効なリフレッシュトークンです'
      });
    }

    console.error('Refresh token error:', error);
    res.status(500).json({
      error: 'トークン更新中にエラーが発生しました'
    });
  }
};

// パスワードリセット要求
exports.requestPasswordReset = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;
    const user = await User.findOne({ where: { email } });

    if (!user) {
      // セキュリティのため、ユーザーが存在しなくても成功レスポンスを返す
      return res.json({
        message: 'パスワードリセットのメールを送信しました（該当するアカウントが存在する場合）'
      });
    }

    // パスワードリセットトークンを生成
    const resetToken = user.generatePasswordResetToken();
    await user.save();

    // 実際のアプリケーションでは、ここでメール送信を行う
    // 開発用にトークンをログに出力
    console.log('Password reset token for', email, ':', resetToken);

    res.json({
      message: 'パスワードリセットのメールを送信しました（該当するアカウントが存在する場合）',
      // 開発用にトークンを返す（本番環境では削除）
      ...(process.env.NODE_ENV === 'development' && { resetToken })
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({
      error: 'パスワードリセット要求中にエラーが発生しました'
    });
  }
};

// パスワードリセット実行
exports.resetPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        error: 'トークンと新しいパスワードが必要です'
      });
    }

    // トークンを持つユーザーを検索
    const crypto = require('crypto');
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
      return res.status(400).json({
        error: '無効または期限切れのリセットトークンです'
      });
    }

    // パスワードを更新（beforeSaveフックでハッシュ化される）
    user.password = newPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    user.refreshToken = null; // 既存のリフレッシュトークンを無効化
    await user.save();

    res.json({
      message: 'パスワードが正常にリセットされました'
    });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      error: 'パスワードリセット中にエラーが発生しました'
    });
  }
};