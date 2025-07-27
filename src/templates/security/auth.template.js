const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { User } = require('../../models');

/**
 * 認証・認可テンプレート
 * 
 * セキュアな認証フローの実装テンプレート
 */
class AuthTemplate {
  constructor(config = {}) {
    this.config = {
      jwtSecret: process.env.JWT_SECRET || config.jwtSecret,
      jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || config.jwtRefreshSecret,
      accessTokenExpiry: config.accessTokenExpiry || '15m',
      refreshTokenExpiry: config.refreshTokenExpiry || '7d',
      bcryptRounds: config.bcryptRounds || 12,
      passwordMinLength: config.passwordMinLength || 8,
      passwordMaxLength: config.passwordMaxLength || 128,
      maxLoginAttempts: config.maxLoginAttempts || 5,
      lockoutDuration: config.lockoutDuration || 15 * 60 * 1000, // 15分
      ...config
    };
  }

  /**
   * パスワードハッシュ化
   */
  async hashPassword(password) {
    return bcrypt.hash(password, this.config.bcryptRounds);
  }

  /**
   * パスワード検証
   */
  async verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
  }

  /**
   * パスワード強度チェック
   */
  validatePasswordStrength(password) {
    const errors = [];
    
    if (password.length < this.config.passwordMinLength) {
      errors.push(`パスワードは${this.config.passwordMinLength}文字以上必要です`);
    }
    
    if (password.length > this.config.passwordMaxLength) {
      errors.push(`パスワードは${this.config.passwordMaxLength}文字以下にしてください`);
    }
    
    // 複雑性チェック
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    const complexityScore = [hasUppercase, hasLowercase, hasNumbers, hasSpecialChar]
      .filter(Boolean).length;
    
    if (complexityScore < 3) {
      errors.push('パスワードは大文字、小文字、数字、特殊文字のうち3種類以上を含む必要があります');
    }
    
    // 一般的な弱いパスワードチェック
    const commonPasswords = ['password', '12345678', 'qwerty', 'admin', 'letmein'];
    if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
      errors.push('一般的すぎるパスワードは使用できません');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      score: complexityScore
    };
  }

  /**
   * JWTトークン生成
   */
  generateTokens(payload) {
    const accessToken = jwt.sign(
      payload,
      this.config.jwtSecret,
      { 
        expiresIn: this.config.accessTokenExpiry,
        issuer: 'auth-template',
        audience: 'api'
      }
    );
    
    const refreshToken = jwt.sign(
      { userId: payload.userId },
      this.config.jwtRefreshSecret,
      { 
        expiresIn: this.config.refreshTokenExpiry,
        issuer: 'auth-template',
        audience: 'refresh'
      }
    );
    
    return { accessToken, refreshToken };
  }

  /**
   * トークン検証
   */
  verifyAccessToken(token) {
    try {
      return jwt.verify(token, this.config.jwtSecret, {
        issuer: 'auth-template',
        audience: 'api'
      });
    } catch (error) {
      throw new Error('無効なトークンです');
    }
  }

  /**
   * リフレッシュトークン検証
   */
  verifyRefreshToken(token) {
    try {
      return jwt.verify(token, this.config.jwtRefreshSecret, {
        issuer: 'auth-template',
        audience: 'refresh'
      });
    } catch (error) {
      throw new Error('無効なリフレッシュトークンです');
    }
  }

  /**
   * ユーザー登録フロー
   */
  async register(userData) {
    const { email, password, username, ...additionalData } = userData;
    
    // パスワード強度チェック
    const passwordValidation = this.validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      throw new Error(passwordValidation.errors.join(', '));
    }
    
    // 既存ユーザーチェック
    const existingUser = await User.findOne({
      where: { email }
    });
    
    if (existingUser) {
      throw new Error('このメールアドレスは既に登録されています');
    }
    
    // パスワードハッシュ化
    const hashedPassword = await this.hashPassword(password);
    
    // ユーザー作成
    const user = await User.create({
      email,
      username,
      password: hashedPassword,
      isActive: true,
      emailVerified: false,
      emailVerificationToken: this.generateVerificationToken(),
      ...additionalData
    });
    
    // トークン生成
    const tokens = this.generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role
    });
    
    return {
      user: this.sanitizeUser(user),
      ...tokens
    };
  }

  /**
   * ログインフロー
   */
  async login(email, password, ipAddress = null) {
    const user = await User.findOne({
      where: { email }
    });
    
    if (!user) {
      throw new Error('認証に失敗しました');
    }
    
    // アカウントロック確認
    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      const remainingTime = Math.ceil((user.lockoutUntil - new Date()) / 1000 / 60);
      throw new Error(`アカウントがロックされています。${remainingTime}分後に再試行してください`);
    }
    
    // パスワード検証
    const isValidPassword = await this.verifyPassword(password, user.password);
    
    if (!isValidPassword) {
      // ログイン失敗回数を増やす
      await this.handleFailedLogin(user);
      throw new Error('認証に失敗しました');
    }
    
    // アカウントアクティブチェック
    if (!user.isActive) {
      throw new Error('アカウントが無効化されています');
    }
    
    // ログイン成功処理
    await this.handleSuccessfulLogin(user, ipAddress);
    
    // トークン生成
    const tokens = this.generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role
    });
    
    return {
      user: this.sanitizeUser(user),
      ...tokens
    };
  }

  /**
   * ログイン失敗処理
   */
  async handleFailedLogin(user) {
    user.loginAttempts = (user.loginAttempts || 0) + 1;
    
    if (user.loginAttempts >= this.config.maxLoginAttempts) {
      user.lockoutUntil = new Date(Date.now() + this.config.lockoutDuration);
      user.loginAttempts = 0;
    }
    
    await user.save();
  }

  /**
   * ログイン成功処理
   */
  async handleSuccessfulLogin(user, ipAddress) {
    user.loginAttempts = 0;
    user.lockoutUntil = null;
    user.lastLoginAt = new Date();
    user.lastLoginIp = ipAddress;
    
    await user.save();
  }

  /**
   * トークンリフレッシュ
   */
  async refreshTokens(refreshToken) {
    const decoded = this.verifyRefreshToken(refreshToken);
    
    const user = await User.findByPk(decoded.userId);
    if (!user || !user.isActive) {
      throw new Error('ユーザーが見つかりません');
    }
    
    const tokens = this.generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role
    });
    
    return tokens;
  }

  /**
   * パスワードリセットトークン生成
   */
  generatePasswordResetToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * メール検証トークン生成
   */
  generateVerificationToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * ユーザー情報のサニタイズ
   */
  sanitizeUser(user) {
    const { password, ...sanitized } = user.toJSON();
    return sanitized;
  }

  /**
   * 認証ミドルウェア
   */
  authenticate() {
    return async (req, res, next) => {
      try {
        const token = this.extractToken(req);
        
        if (!token) {
          return res.status(401).json({
            success: false,
            error: { message: '認証が必要です' }
          });
        }
        
        const decoded = this.verifyAccessToken(token);
        
        // ユーザー情報を取得
        const user = await User.findByPk(decoded.userId, {
          attributes: { exclude: ['password'] }
        });
        
        if (!user || !user.isActive) {
          return res.status(401).json({
            success: false,
            error: { message: '無効なユーザーです' }
          });
        }
        
        req.user = user;
        req.auth = decoded;
        next();
      } catch (error) {
        return res.status(401).json({
          success: false,
          error: { message: error.message }
        });
      }
    };
  }

  /**
   * 認可ミドルウェア（ロールベース）
   */
  authorize(...roles) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: { message: '認証が必要です' }
        });
      }
      
      if (roles.length && !roles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          error: { message: 'アクセス権限がありません' }
        });
      }
      
      next();
    };
  }

  /**
   * トークン抽出
   */
  extractToken(req) {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    
    return req.cookies?.accessToken || null;
  }

  /**
   * 2要素認証トークン生成
   */
  generate2FAToken() {
    return crypto.randomInt(100000, 999999).toString();
  }

  /**
   * 2要素認証検証
   */
  verify2FAToken(userToken, storedToken, expiryTime) {
    if (new Date() > expiryTime) {
      throw new Error('2要素認証コードの有効期限が切れています');
    }
    
    return crypto.timingSafeEqual(
      Buffer.from(userToken),
      Buffer.from(storedToken)
    );
  }
}

module.exports = AuthTemplate;