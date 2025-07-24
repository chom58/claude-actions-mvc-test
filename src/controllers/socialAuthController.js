const { User } = require('../models');
const jwt = require('jsonwebtoken');
const OAuthService = require('../services/oauthService');
const { sessionHelpers } = require('../config/session');
const logger = require('../utils/logger');
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

// Google OAuth認証のコールバック処理
exports.googleCallback = async (req, res) => {
  try {
    const { code, state, error: oauthError } = req.query;
    
    if (oauthError) {
      logger.error('Google OAuth error:', oauthError);
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/error?error=${encodeURIComponent(oauthError)}`);
    }
    
    if (!code) {
      return res.status(400).json({
        error: '認証コードが提供されていません'
      });
    }

    // 実際のGoogle OAuth2 APIからユーザー情報を取得
    const googleUser = await OAuthService.getGoogleUserInfo(code);
    
    if (!googleUser || !googleUser.email) {
      throw new Error('Googleアカウントからメールアドレスを取得できませんでした');
    }

    // 既存ユーザーの確認（メールアドレスで検索）
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
      
      logger.info(`New Google user created: ${user.email}`);
    } else {
      // 最終ログイン時刻を更新
      user.lastLoginAt = new Date();
      await user.save();
      
      logger.info(`Existing Google user logged in: ${user.email}`);
    }

    // JWTトークンを生成
    const token = generateToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // リフレッシュトークンを暗号化してデータベースに保存
    const encryptedRefreshToken = encryptRefreshToken(refreshToken);
    user.refreshToken = encryptedRefreshToken;
    await user.save();

    // セッション再生成（セキュリティ強化）
    await sessionHelpers.regenerateSession(req);
    sessionHelpers.setUserSession(req, user);

    // トークンをHTTP-onlyクッキーとして設定（セキュリティ強化）
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
    
    // セキュアなリダイレクト（トークンをクッキーで送信）
    const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback?success=true&provider=google`;
    res.redirect(redirectUrl);
  } catch (error) {
    logger.error('Google OAuth callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/error?message=${encodeURIComponent(error.message)}`);
  }
};

// GitHub OAuth認証のコールバック処理
exports.githubCallback = async (req, res) => {
  try {
    const { code, state, error: oauthError } = req.query;
    
    if (oauthError) {
      logger.error('GitHub OAuth error:', oauthError);
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/error?error=${encodeURIComponent(oauthError)}`);
    }
    
    if (!code) {
      return res.status(400).json({
        error: '認証コードが提供されていません'
      });
    }

    // 実際のGitHub OAuth APIからユーザー情報を取得
    const githubUser = await OAuthService.getGitHubUserInfo(code);
    
    if (!githubUser || !githubUser.email) {
      throw new Error('GitHubアカウントからメールアドレスを取得できませんでした');
    }

    // 既存ユーザーの確認（メールアドレスで検索）
    let user = await User.findOne({
      where: { email: githubUser.email }
    });

    if (!user) {
      // 新規ユーザーの作成
      user = await User.create({
        username: githubUser.name || githubUser.username || `github_${githubUser.id}`,
        email: githubUser.email,
        password: `github_oauth_${githubUser.id}`, // OAuth用の仮パスワード
        isActive: true,
        lastLoginAt: new Date()
      });
      
      logger.info(`New GitHub user created: ${user.email}`);
    } else {
      // 最終ログイン時刻を更新
      user.lastLoginAt = new Date();
      await user.save();
      
      logger.info(`Existing GitHub user logged in: ${user.email}`);
    }

    // JWTトークンを生成
    const token = generateToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // リフレッシュトークンを暗号化してデータベースに保存
    const encryptedRefreshToken = encryptRefreshToken(refreshToken);
    user.refreshToken = encryptedRefreshToken;
    await user.save();

    // セッション再生成（セキュリティ強化）
    await sessionHelpers.regenerateSession(req);
    sessionHelpers.setUserSession(req, user);

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
    
    // セキュアなリダイレクト
    const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback?success=true&provider=github`;
    res.redirect(redirectUrl);
  } catch (error) {
    logger.error('GitHub OAuth callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/error?message=${encodeURIComponent(error.message)}`);
  }
};

// ソーシャルログインの開始URL取得
exports.getSocialLoginUrls = (req, res) => {
  try {
    const configStatus = OAuthService.getConfigStatus();
    const urls = {};
    const errors = {};
    
    // Google URL生成
    if (configStatus.google.valid) {
      const state = `google_login_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      urls.google = OAuthService.generateAuthUrl('google', state);
    } else {
      errors.google = configStatus.google.error;
    }
    
    // GitHub URL生成
    if (configStatus.github.valid) {
      const state = `github_login_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      urls.github = OAuthService.generateAuthUrl('github', state);
    } else {
      errors.github = configStatus.github.error;
    }

    const response = {
      message: 'ソーシャルログインURLを取得しました',
      urls,
      configStatus: Object.keys(configStatus).reduce((acc, provider) => {
        acc[provider] = configStatus[provider].valid ? 'OK' : 'ERROR';
        return acc;
      }, {})
    };
    
    if (Object.keys(errors).length > 0) {
      response.errors = errors;
      response.note = 'エラーがあるプロバイダーは使用できません。環境変数を確認してください。';
    }

    res.json(response);
  } catch (error) {
    logger.error('Social login URLs generation error:', error);
    res.status(500).json({
      error: 'ソーシャルログインURL生成に失敗しました',
      message: error.message
    });
  }
};

// OAuth設定状態確認エンドポイント
exports.getOAuthConfigStatus = (req, res) => {
  try {
    const configStatus = OAuthService.getConfigStatus();
    
    res.json({
      message: 'OAuth設定状態を取得しました',
      providers: configStatus,
      summary: {
        total: Object.keys(configStatus).length,
        configured: Object.values(configStatus).filter(status => status.valid).length,
        errors: Object.values(configStatus).filter(status => !status.valid).length
      }
    });
  } catch (error) {
    logger.error('OAuth config status error:', error);
    res.status(500).json({
      error: 'OAuth設定状態の取得に失敗しました',
      message: error.message
    });
  }
};

module.exports = {
  googleCallback: exports.googleCallback,
  githubCallback: exports.githubCallback,
  getSocialLoginUrls: exports.getSocialLoginUrls,
  getOAuthConfigStatus: exports.getOAuthConfigStatus
};