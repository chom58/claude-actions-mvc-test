const { User } = require('../models');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: process.env.JWT_EXPIRE || '15m' } // アクセストークンを短く設定
  );
};

const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
  );
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
    
    // リフレッシュトークンをユーザーに保存
    user.refreshToken = refreshToken;
    await user.save();

    res.status(201).json({
      message: 'ユーザー登録が完了しました',
      user: user.toJSON(),
      token,
      refreshToken
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
    
    // リフレッシュトークンと最終ログイン時刻を更新
    user.refreshToken = refreshToken;
    user.lastLoginAt = new Date();
    await user.save();

    res.json({
      message: 'ログインに成功しました',
      user: user.toJSON(),
      token,
      refreshToken
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

    const { username, email } = req.body;
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

    await user.update({
      username: username || user.username,
      email: email || user.email
    });

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
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        error: 'リフレッシュトークンが提供されていません'
      });
    }

    // リフレッシュトークンを検証
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key'
    );

    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        error: '無効なリフレッシュトークンです'
      });
    }

    // ユーザーのリフレッシュトークンと照合
    const user = await User.findByPk(decoded.userId);
    
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({
        error: '無効なリフレッシュトークンです'
      });
    }

    // 新しいアクセストークンを生成
    const newToken = generateToken(user.id);
    const newRefreshToken = generateRefreshToken(user.id);
    
    // 新しいリフレッシュトークンを保存
    user.refreshToken = newRefreshToken;
    await user.save();

    res.json({
      message: 'トークンが更新されました',
      token: newToken,
      refreshToken: newRefreshToken
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