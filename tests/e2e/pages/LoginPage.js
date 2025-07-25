const BasePage = require('./BasePage');

/**
 * ログインページのPage Object Model
 */
class LoginPage extends BasePage {
  constructor(page) {
    super(page);
    
    // セレクタ定義
    this.selectors = {
      emailInput: '[name="email"]',
      passwordInput: '[name="password"]',
      loginButton: 'button[type="submit"]',
      registerLink: 'a[href="/register"]',
      forgotPasswordLink: 'a[href="/forgot-password"]',
      errorMessage: '.error-message',
      successMessage: '.success-message',
      socialLoginButtons: {
        google: '.social-login-google',
        github: '.social-login-github'
      }
    };
  }

  /**
   * ログインページに移動
   */
  async navigateToLogin() {
    await this.goto('/login.html');
    await this.waitForElement(this.selectors.emailInput);
  }

  /**
   * ログイン実行
   * @param {string} email - メールアドレス
   * @param {string} password - パスワード
   */
  async login(email, password) {
    await this.fillText(this.selectors.emailInput, email);
    await this.fillText(this.selectors.passwordInput, password);
    await this.click(this.selectors.loginButton);
    await this.waitForLoadState();
  }

  /**
   * ソーシャルログイン実行
   * @param {string} provider - プロバイダー名（google, github）
   */
  async socialLogin(provider) {
    const button = this.selectors.socialLoginButtons[provider];
    if (!button) {
      throw new Error(`Unsupported social login provider: ${provider}`);
    }
    await this.click(button);
    await this.waitForLoadState();
  }

  /**
   * 新規登録ページに移動
   */
  async goToRegister() {
    await this.click(this.selectors.registerLink);
    await this.waitForLoadState();
  }

  /**
   * パスワードリセットページに移動
   */
  async goToForgotPassword() {
    await this.click(this.selectors.forgotPasswordLink);
    await this.waitForLoadState();
  }

  /**
   * エラーメッセージを取得
   * @returns {string} エラーメッセージ
   */
  async getErrorMessage() {
    if (await this.isVisible(this.selectors.errorMessage)) {
      return await this.getText(this.selectors.errorMessage);
    }
    return null;
  }

  /**
   * 成功メッセージを取得
   * @returns {string} 成功メッセージ
   */
  async getSuccessMessage() {
    if (await this.isVisible(this.selectors.successMessage)) {
      return await this.getText(this.selectors.successMessage);
    }
    return null;
  }

  /**
   * ログインフォームが表示されているかチェック
   * @returns {boolean} フォームが表示されているかどうか
   */
  async isLoginFormVisible() {
    return await this.isVisible(this.selectors.emailInput) &&
           await this.isVisible(this.selectors.passwordInput) &&
           await this.isVisible(this.selectors.loginButton);
  }

  /**
   * 必須フィールドバリデーションをチェック
   * @returns {object} バリデーション結果
   */
  async checkValidation() {
    // 空のフォームで送信
    await this.click(this.selectors.loginButton);
    
    const emailValidation = await this.page.evaluate(() => {
      const emailInput = document.querySelector('[name="email"]');
      return {
        valid: emailInput.checkValidity(),
        message: emailInput.validationMessage
      };
    });

    const passwordValidation = await this.page.evaluate(() => {
      const passwordInput = document.querySelector('[name="password"]');
      return {
        valid: passwordInput.checkValidity(),
        message: passwordInput.validationMessage
      };
    });

    return {
      email: emailValidation,
      password: passwordValidation
    };
  }
}

module.exports = LoginPage;