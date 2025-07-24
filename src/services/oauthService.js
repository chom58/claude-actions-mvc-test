const axios = require('axios');
const logger = require('../utils/logger');

// OAuth設定
const oauthConfig = {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/social-auth/google/callback',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
    scopes: ['email', 'profile']
  },
  github: {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    redirectUri: process.env.GITHUB_REDIRECT_URI || 'http://localhost:3000/api/social-auth/github/callback',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user',
    userEmailUrl: 'https://api.github.com/user/emails',
    scopes: ['user:email']
  }
};

class OAuthService {
  // Google OAuth実装
  static async getGoogleUserInfo(authCode) {
    try {
      const config = oauthConfig.google;
      
      if (!config.clientId || !config.clientSecret) {
        throw new Error('Google OAuth認証情報が設定されていません');
      }

      // 認証コードをアクセストークンに交換
      const tokenResponse = await axios.post(config.tokenUrl, {
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code: authCode,
        grant_type: 'authorization_code',
        redirect_uri: config.redirectUri
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const { access_token } = tokenResponse.data;
      
      if (!access_token) {
        throw new Error('アクセストークンの取得に失敗しました');
      }

      // アクセストークンを使用してユーザー情報を取得
      const userResponse = await axios.get(config.userInfoUrl, {
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
      });

      const userData = userResponse.data;
      
      return {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        picture: userData.picture,
        verified_email: userData.verified_email,
        provider: 'google'
      };
    } catch (error) {
      logger.error('Google OAuth error:', error.response?.data || error.message);
      throw new Error('Google認証に失敗しました: ' + (error.response?.data?.error_description || error.message));
    }
  }

  // GitHub OAuth実装
  static async getGitHubUserInfo(authCode) {
    try {
      const config = oauthConfig.github;
      
      if (!config.clientId || !config.clientSecret) {
        throw new Error('GitHub OAuth認証情報が設定されていません');
      }

      // 認証コードをアクセストークンに交換
      const tokenResponse = await axios.post(config.tokenUrl, {
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code: authCode,
        redirect_uri: config.redirectUri
      }, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const { access_token } = tokenResponse.data;
      
      if (!access_token) {
        throw new Error('アクセストークンの取得に失敗しました');
      }

      // ユーザー基本情報を取得
      const userResponse = await axios.get(config.userInfoUrl, {
        headers: {
          'Authorization': `token ${access_token}`,
          'User-Agent': 'Claude-Auth-App'
        }
      });

      // ユーザーのメールアドレスを取得
      const emailResponse = await axios.get(config.userEmailUrl, {
        headers: {
          'Authorization': `token ${access_token}`,
          'User-Agent': 'Claude-Auth-App'
        }
      });

      const userData = userResponse.data;
      const emailData = emailResponse.data;
      
      // プライマリメールアドレスを取得
      const primaryEmail = emailData.find(email => email.primary && email.verified)?.email ||
                          emailData.find(email => email.primary)?.email ||
                          emailData[0]?.email;
      
      return {
        id: userData.id,
        username: userData.login,
        name: userData.name || userData.login,
        email: primaryEmail,
        avatar_url: userData.avatar_url,
        provider: 'github'
      };
    } catch (error) {
      logger.error('GitHub OAuth error:', error.response?.data || error.message);
      throw new Error('GitHub認証に失敗しました: ' + (error.response?.data?.message || error.message));
    }
  }

  // OAuth URLの生成
  static generateAuthUrl(provider, state = null) {
    const config = oauthConfig[provider];
    
    if (!config) {
      throw new Error(`サポートされていないプロバイダー: ${provider}`);
    }

    const params = new URLSearchParams();
    
    if (provider === 'google') {
      params.append('client_id', config.clientId);
      params.append('redirect_uri', config.redirectUri);
      params.append('response_type', 'code');
      params.append('scope', config.scopes.join(' '));
      params.append('access_type', 'offline');
      params.append('prompt', 'consent');
      
      if (state) params.append('state', state);
      
      return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    }
    
    if (provider === 'github') {
      params.append('client_id', config.clientId);
      params.append('redirect_uri', config.redirectUri);
      params.append('scope', config.scopes.join(' '));
      
      if (state) params.append('state', state);
      
      return `https://github.com/login/oauth/authorize?${params.toString()}`;
    }
    
    throw new Error(`未実装のプロバイダー: ${provider}`);
  }

  // 設定の検証
  static validateConfig(provider) {
    const config = oauthConfig[provider];
    
    if (!config) {
      return { valid: false, error: `サポートされていないプロバイダー: ${provider}` };
    }
    
    const required = ['clientId', 'clientSecret', 'redirectUri'];
    const missing = required.filter(key => !config[key]);
    
    if (missing.length > 0) {
      return { 
        valid: false, 
        error: `${provider} OAuth設定が不完全です: ${missing.join(', ')} が設定されていません` 
      };
    }
    
    return { valid: true };
  }

  // 全プロバイダーの設定状態を取得
  static getConfigStatus() {
    const providers = Object.keys(oauthConfig);
    const status = {};
    
    providers.forEach(provider => {
      status[provider] = this.validateConfig(provider);
    });
    
    return status;
  }
}

module.exports = OAuthService;