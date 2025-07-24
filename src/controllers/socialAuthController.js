const { User } = require('../models');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const https = require('https');
const { URL } = require('url');

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
    
    // Google OAuth2 APIからユーザー情報を取得
    const googleUser = await getGoogleUserInfo(code);
    
    if (!googleUser) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/error?message=oauth_failed`);
    }

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

    // リフレッシュトークンを暗号化してデータベースに保存
    const encryptedRefreshToken = encryptRefreshToken(refreshToken);
    user.refreshToken = encryptedRefreshToken;
    await user.save();

    // トークンをHTTP-onlyクッキーとして設定（URLパラメータの代わり）
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
    const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback?success=true`;
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
    
    // GitHub OAuth APIからユーザー情報を取得
    const githubUser = await getGitHubUserInfo(code);
    
    if (!githubUser) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/error?message=oauth_failed`);
    }

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
    
    // セキュアなリダイレクト
    const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback?success=true`;
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

// Google OAuth2 API実装
const getGoogleUserInfo = async (code) => {
  try {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      throw new Error('Google OAuth設定が不完全です');
    }

    // 1. 認証コードをアクセストークンに交換
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      }),
    });

    if (!tokenResponse.ok) {
      console.error('Google token exchange failed:', await tokenResponse.text());
      return null;
    }

    const tokenData = await tokenResponse.json();

    // 2. アクセストークンを使用してユーザー情報を取得
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userResponse.ok) {
      console.error('Google user info fetch failed:', await userResponse.text());
      return null;
    }

    const userData = await userResponse.json();
    
    // 3. 必要な情報のみを返す
    return {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      verified_email: userData.verified_email,
    };
  } catch (error) {
    console.error('Google OAuth error:', error);
    return null;
  }
};

// GitHub OAuth API実装
const getGitHubUserInfo = async (code) => {
  try {
    if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
      throw new Error('GitHub OAuth設定が不完全です');
    }

    // 1. 認証コードをアクセストークンに交換
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code: code,
      }),
    });

    if (!tokenResponse.ok) {
      console.error('GitHub token exchange failed:', await tokenResponse.text());
      return null;
    }

    const tokenData = await tokenResponse.json();

    // 2. アクセストークンを使用してユーザー情報を取得
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `token ${tokenData.access_token}`,
        'User-Agent': 'Claude-Web-Server',
      },
    });

    if (!userResponse.ok) {
      console.error('GitHub user info fetch failed:', await userResponse.text());
      return null;
    }

    const userData = await userResponse.json();

    // 3. メールアドレスを別途取得（プライマリメールが必要）
    const emailResponse = await fetch('https://api.github.com/user/emails', {
      headers: {
        Authorization: `token ${tokenData.access_token}`,
        'User-Agent': 'Claude-Web-Server',
      },
    });

    let primaryEmail = userData.email; // 公開メールアドレス
    if (emailResponse.ok) {
      const emails = await emailResponse.json();
      const primary = emails.find(email => email.primary);
      if (primary) {
        primaryEmail = primary.email;
      }
    }

    // 4. 必要な情報のみを返す
    return {
      id: userData.id.toString(),
      email: primaryEmail,
      login: userData.login,
      name: userData.name || userData.login,
    };
  } catch (error) {
    console.error('GitHub OAuth error:', error);
    return null;
  }
};

module.exports = {
  googleCallback: exports.googleCallback,
  githubCallback: exports.githubCallback,
  getSocialLoginUrls: exports.getSocialLoginUrls
};