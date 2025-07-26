/**
 * ベースページクラス
 * 全ページ共通の機能を提供
 */
class BasePage {
  constructor(page) {
    this.page = page;
  }

  /**
   * 指定されたURLに移動
   * @param {string} url - 移動先URL
   */
  async goto(url) {
    await this.page.goto(url, { waitUntil: 'networkidle' });
  }

  /**
   * 要素が表示されるまで待機
   * @param {string} selector - セレクタ
   * @param {number} timeout - タイムアウト（ミリ秒）
   */
  async waitForElement(selector, timeout = 10000) {
    await this.page.waitForSelector(selector, { timeout });
  }

  /**
   * テキストを入力
   * @param {string} selector - セレクタ
   * @param {string} text - 入力テキスト
   */
  async fillText(selector, text) {
    await this.page.fill(selector, text);
  }

  /**
   * 要素をクリック
   * @param {string} selector - セレクタ
   */
  async click(selector) {
    await this.page.click(selector);
  }

  /**
   * 現在のURLを取得
   * @returns {string} 現在のURL
   */
  getCurrentUrl() {
    return this.page.url();
  }

  /**
   * ページタイトルを取得
   * @returns {string} ページタイトル
   */
  async getTitle() {
    return await this.page.title();
  }

  /**
   * 要素のテキストを取得
   * @param {string} selector - セレクタ
   * @returns {string} 要素のテキスト
   */
  async getText(selector) {
    return await this.page.textContent(selector);
  }

  /**
   * 要素が表示されているかチェック
   * @param {string} selector - セレクタ
   * @returns {boolean} 表示されているかどうか
   */
  async isVisible(selector) {
    return await this.page.isVisible(selector);
  }

  /**
   * スクリーンショットを撮影
   * @param {string} name - ファイル名
   */
  async takeScreenshot(name) {
    await this.page.screenshot({ 
      path: `test-results/screenshots/${name}.png`,
      fullPage: true 
    });
  }

  /**
   * アラートを処理
   * @param {string} action - accept または dismiss
   */
  async handleAlert(action = 'accept') {
    this.page.on('dialog', async dialog => {
      console.log(`Alert: ${dialog.message()}`);
      if (action === 'accept') {
        await dialog.accept();
      } else {
        await dialog.dismiss();
      }
    });
  }

  /**
   * 要素が存在するまで待機
   * @param {string} selector - セレクタ
   * @param {number} timeout - タイムアウト（ミリ秒）
   */
  async waitForSelector(selector, timeout = 10000) {
    await this.page.waitForSelector(selector, { timeout });
  }

  /**
   * ローディング完了まで待機
   */
  async waitForLoadState() {
    await this.page.waitForLoadState('networkidle');
  }
}

module.exports = BasePage;