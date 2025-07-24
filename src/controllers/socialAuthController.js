const { User } = require('../models');
const jwt = require('jsonwebtoken');

const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: process.env.JWT_EXPIRE || '15m' }
  );
};

const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
  );
};

// Google OAuth認証のコールバック処理
exports.googleCallback = async (req, res) => {
  try {
    // 実際の実装では、GoogleのOAuth2ライブラリを使用してユーザー情報を取得
    // ここでは基本的な構造のみを示す
    
    const { code } = req.query;
    
    if (!code) {
      return res.status(400).json({
        error: '認証コードが提供されていません'
      });
    }

    // Google OAuth2 APIからユーザー情報を取得（実装必要）
    // const googleUser = await getGoogleUserInfo(code);
    
    // 開発用のモックデータ
    const googleUser = {
      id: 'google_123456',
      email: 'user@gmail.com',
      name: 'Google User',
      verified_email: true
    };

    // 既存ユーザーの確認
    let user = await User.findOne({
      where: { email: googleUser.email }
    });

    if (!user) {
      // 新規ユーザーの作成
      user = await User.create({
        username: googleUser.name || `google_${googleUser.id}`,
        email: googleUser.email,
        password: `google_oauth_${googleUser.id}`, // OAuth用の仮パスワード
        isActive: true,
        lastLoginAt: new Date()
      });
    } else {
      // 最終ログイン時刻を更新
      user.lastLoginAt = new Date();
      await user.save();
    }

    // トークンを生成
    const token = generateToken(user.id);
    const refreshToken = generateRefreshToken(user.id);
    
    user.refreshToken = refreshToken;
    await user.save();

    // フロントエンドにリダイレクト（トークンをクエリパラメータで渡す）
    const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback?token=${token}&refreshToken=${refreshToken}`;
    
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/error`);
  }
};

// GitHub OAuth認証のコールバック処理
exports.githubCallback = async (req, res) => {
  try {
    const { code } = req.query;
    
    if (!code) {
      return res.status(400).json({
        error: '認証コードが提供されていません'
      });
    }

    // GitHub OAuth APIからユーザー情報を取得（実装必要）
    // const githubUser = await getGitHubUserInfo(code);
    
    // 開発用のモックデータ
    const githubUser = {
      id: 'github_789012',
      email: 'user@users.noreply.github.com',
      login: 'githubuser',
      name: 'GitHub User'
    };

    // 既存ユーザーの確認
    let user = await User.findOne({
      where: { email: githubUser.email }
    });

    if (!user) {
      // 新規ユーザーの作成
      user = await User.create({
        username: githubUser.name || githubUser.login || `github_${githubUser.id}`,
        email: githubUser.email,
        password: `github_oauth_${githubUser.id}`, // OAuth用の仮パスワード
        isActive: true,
        lastLoginAt: new Date()
      });
    } else {
      // 最終ログイン時刻を更新
      user.lastLoginAt = new Date();
      await user.save();
    }

    // トークンを生成
    const token = generateToken(user.id);
    const refreshToken = generateRefreshToken(user.id);
    
    user.refreshToken = refreshToken;
    await user.save();

    // フロントエンドにリダイレクト
    const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback?token=${token}&refreshToken=${refreshToken}`;
    
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('GitHub OAuth callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/error`);
  }
};

// ソーシャルログインの開始URL取得
exports.getSocialLoginUrls = (req, res) => {
  const googleLoginUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${process.env.GOOGLE_CLIENT_ID}&` +
    `redirect_uri=${process.env.GOOGLE_REDIRECT_URI}&` +
    `response_type=code&` +
    `scope=email profile&` +
    `state=google_login`;

  const githubLoginUrl = `https://github.com/login/oauth/authorize?` +
    `client_id=${process.env.GITHUB_CLIENT_ID}&` +
    `redirect_uri=${process.env.GITHUB_REDIRECT_URI}&` +
    `scope=user:email&` +
    `state=github_login`;

  res.json({
    message: 'ソーシャルログインURLを取得しました',
    urls: {
      google: googleLoginUrl,
      github: githubLoginUrl
    },
    note: '環境変数の設定が必要です: GOOGLE_CLIENT_ID, GOOGLE_REDIRECT_URI, GITHUB_CLIENT_ID, GITHUB_REDIRECT_URI'
  });
};

// 実際のGoogle OAuth2 API実装用のヘルパー関数（未実装）
// const getGoogleUserInfo = async (code) => {
//   // 1. 認証コードをアクセストークンに交換
//   // 2. アクセストークンを使用してユーザー情報を取得
//   // 3. ユーザー情報を返す
// };

// 実際のGitHub OAuth API実装用のヘルパー関数（未実装）
// const getGitHubUserInfo = async (code) => {
//   // 1. 認証コードをアクセストークンに交換
//   // 2. アクセストークンを使用してユーザー情報を取得
//   // 3. ユーザー情報を返す
// };

module.exports = {
  googleCallback: exports.googleCallback,
  githubCallback: exports.githubCallback,
  getSocialLoginUrls: exports.getSocialLoginUrls
};