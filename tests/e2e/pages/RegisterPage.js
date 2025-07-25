const BasePage = require('./BasePage');

/**
 * ユーザー登録ページのPage Object Model
 */
class RegisterPage extends BasePage {
  constructor(page) {
    super(page);
    
    // セレクタ定義
    this.selectors = {
      usernameInput: '[name="username"]',
      emailInput: '[name="email"]',
      passwordInput: '[name="password"]',
      confirmPasswordInput: '[name="confirmPassword"]',
      profileTypeSelect: '[name="profileType"]',
      skillsInput: '[name="skills"]',
      experienceSelect: '[name="experience"]',
      portfolioUrlInput: '[name="portfolioUrl"]',
      registerButton: 'button[type="submit"]',
      loginLink: 'a[href="/login"]',
      termsCheckbox: '[name="agreeToTerms"]',
      errorMessage: '.error-message',
      successMessage: '.success-message',
      passwordStrength: '.password-strength',
      validationMessages: '.validation-message'
    };
  }

  /**
   * 登録ページに移動
   */
  async navigateToRegister() {
    await this.goto('/register.html');
    await this.waitForElement(this.selectors.usernameInput);
  }

  /**
   * ユーザー登録実行
   * @param {object} userData - ユーザーデータ
   */
  async register(userData) {
    const {
      username,
      email,
      password,
      confirmPassword,
      profileType = 'designer',
      skills = '',
      experience = 'beginner',
      portfolioUrl = '',
      agreeToTerms = true
    } = userData;

    // 基本情報入力
    await this.fillText(this.selectors.usernameInput, username);
    await this.fillText(this.selectors.emailInput, email);
    await this.fillText(this.selectors.passwordInput, password);
    
    if (confirmPassword !== undefined) {
      await this.fillText(this.selectors.confirmPasswordInput, confirmPassword);
    }

    // プロフィール情報入力
    await this.selectOption(this.selectors.profileTypeSelect, profileType);
    
    if (skills) {
      await this.fillText(this.selectors.skillsInput, skills);
    }
    
    await this.selectOption(this.selectors.experienceSelect, experience);
    
    if (portfolioUrl) {
      await this.fillText(this.selectors.portfolioUrlInput, portfolioUrl);
    }

    // 利用規約同意
    if (agreeToTerms) {
      await this.checkBox(this.selectors.termsCheckbox);
    }

    // 登録ボタンクリック
    await this.click(this.selectors.registerButton);
    await this.waitForLoadState();
  }

  /**
   * セレクトボックスで選択肢を選択
   * @param {string} selector - セレクタ
   * @param {string} value - 選択する値
   */
  async selectOption(selector, value) {
    await this.page.selectOption(selector, value);
  }

  /**
   * チェックボックスをチェック
   * @param {string} selector - セレクタ
   */
  async checkBox(selector) {
    await this.page.check(selector);
  }

  /**
   * ログインページに移動
   */
  async goToLogin() {
    await this.click(this.selectors.loginLink);
    await this.waitForLoadState();
  }

  /**
   * パスワード強度を取得
   * @returns {string} パスワード強度
   */
  async getPasswordStrength() {
    if (await this.isVisible(this.selectors.passwordStrength)) {
      return await this.getText(this.selectors.passwordStrength);
    }
    return null;
  }

  /**
   * バリデーションメッセージを取得
   * @returns {Array} バリデーションメッセージの配列
   */
  async getValidationMessages() {
    const messages = await this.page.$$eval(this.selectors.validationMessages, 
      elements => elements.map(el => el.textContent.trim())
    );
    return messages;
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
   * 登録フォームが表示されているかチェック
   * @returns {boolean} フォームが表示されているかどうか
   */
  async isRegisterFormVisible() {
    return await this.isVisible(this.selectors.usernameInput) &&
           await this.isVisible(this.selectors.emailInput) &&
           await this.isVisible(this.selectors.passwordInput) &&
           await this.isVisible(this.selectors.registerButton);
  }

  /**
   * パスワード確認フィールドの一致をチェック
   * @param {string} password - パスワード
   * @param {string} confirmPassword - 確認パスワード
   * @returns {boolean} パスワードが一致するかどうか
   */
  async checkPasswordMatch(password, confirmPassword) {
    await this.fillText(this.selectors.passwordInput, password);
    await this.fillText(this.selectors.confirmPasswordInput, confirmPassword);
    
    // パスワード確認フィールドからフォーカスを外す
    await this.page.press(this.selectors.confirmPasswordInput, 'Tab');
    
    // バリデーションメッセージをチェック
    const validationMessages = await this.getValidationMessages();
    return !validationMessages.some(msg => 
      msg.includes('パスワードが一致しません') || 
      msg.includes('passwords do not match')
    );
  }
}

module.exports = RegisterPage;