const { expect } = require('@playwright/test');

/**
 * ログインページのPage Object Model
 */
class LoginPage {
  constructor(page) {
    this.page = page;
    
    // セレクター定義
    this.selectors = {
      emailInput: 'input[name="email"]',
      passwordInput: 'input[name="password"]',
      loginButton: 'button[type="submit"]',
      errorMessage: '.error-message',
      successMessage: '.success-message',
      rememberMeCheckbox: 'input[name="remember"]',
      forgotPasswordLink: 'a[href*="forgot-password"]',
      registerLink: 'a[href*="register"]',
      socialLoginButtons: {
        google: 'button[data-provider="google"]',
        github: 'button[data-provider="github"]'
      }
    };
  }

  /**
   * ページに移動
   */
  async goto() {
    await this.page.goto('/login.html');
    await this.waitForPageLoad();
  }

  /**
   * ページ読み込み完了を待機
   */
  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForSelector(this.selectors.emailInput);
  }

  /**
   * ログイン実行
   */
  async login(email, password, rememberMe = false) {
    await this.fillEmail(email);
    await this.fillPassword(password);
    
    if (rememberMe) {
      await this.checkRememberMe();
    }
    
    await this.clickLogin();
  }

  /**
   * メールアドレス入力
   */
  async fillEmail(email) {
    await this.page.fill(this.selectors.emailInput, email);
  }

  /**
   * パスワード入力
   */
  async fillPassword(password) {
    await this.page.fill(this.selectors.passwordInput, password);
  }

  /**
   * Remember Meチェック
   */
  async checkRememberMe() {
    await this.page.check(this.selectors.rememberMeCheckbox);
  }

  /**
   * ログインボタンクリック
   */
  async clickLogin() {
    await Promise.all([
      this.page.waitForResponse(response => 
        response.url().includes('/api/auth/login') && 
        response.status() === 200
      ),
      this.page.click(this.selectors.loginButton)
    ]);
  }

  /**
   * ソーシャルログイン
   */
  async socialLogin(provider) {
    const selector = this.selectors.socialLoginButtons[provider];
    if (!selector) {
      throw new Error(`Unknown social login provider: ${provider}`);
    }
    
    await this.page.click(selector);
  }

  /**
   * エラーメッセージの取得
   */
  async getErrorMessage() {
    await this.page.waitForSelector(this.selectors.errorMessage);
    return await this.page.textContent(this.selectors.errorMessage);
  }

  /**
   * エラーメッセージが表示されているか
   */
  async hasErrorMessage() {
    return await this.page.isVisible(this.selectors.errorMessage);
  }

  /**
   * 成功メッセージの取得
   */
  async getSuccessMessage() {
    await this.page.waitForSelector(this.selectors.successMessage);
    return await this.page.textContent(this.selectors.successMessage);
  }

  /**
   * パスワードリセットリンクをクリック
   */
  async clickForgotPassword() {
    await this.page.click(this.selectors.forgotPasswordLink);
  }

  /**
   * 新規登録リンクをクリック
   */
  async clickRegisterLink() {
    await this.page.click(this.selectors.registerLink);
  }

  /**
   * フォームバリデーションの確認
   */
  async checkValidation() {
    // HTML5バリデーションメッセージの取得
    const emailValidity = await this.page.evaluate(selector => {
      const input = document.querySelector(selector);
      return {
        valid: input.checkValidity(),
        message: input.validationMessage
      };
    }, this.selectors.emailInput);

    const passwordValidity = await this.page.evaluate(selector => {
      const input = document.querySelector(selector);
      return {
        valid: input.checkValidity(),
        message: input.validationMessage
      };
    }, this.selectors.passwordInput);

    return { email: emailValidity, password: passwordValidity };
  }

  /**
   * ログインフォームの状態をリセット
   */
  async resetForm() {
    await this.page.fill(this.selectors.emailInput, '');
    await this.page.fill(this.selectors.passwordInput, '');
    await this.page.uncheck(this.selectors.rememberMeCheckbox);
  }

  /**
   * ログイン成功後のリダイレクトを待機
   */
  async waitForLoginSuccess(expectedUrl = '/') {
    await this.page.waitForURL(expectedUrl);
  }

  /**
   * 特定の要素が表示されるまで待機
   */
  async waitForElement(selector, options = {}) {
    await this.page.waitForSelector(selector, {
      state: 'visible',
      ...options
    });
  }

  /**
   * スクリーンショットを撮影
   */
  async takeScreenshot(name) {
    await this.page.screenshot({ 
      path: `test-results/screenshots/login-${name}.png`,
      fullPage: true 
    });
  }
}

module.exports = LoginPage;