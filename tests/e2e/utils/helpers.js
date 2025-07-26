/**
 * E2Eテスト用のヘルパー関数
 */

const { expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

/**
 * ページが正しく読み込まれるまで待機
 * @param {Page} page - Playwrightページオブジェクト
 * @param {string} expectedUrl - 期待するURL（部分一致）
 * @param {number} timeout - タイムアウト（ミリ秒）
 */
async function waitForPageLoad(page, expectedUrl = null, timeout = 30000) {
  await page.waitForLoadState('networkidle', { timeout });
  
  if (expectedUrl) {
    await expect(page).toHaveURL(new RegExp(expectedUrl), { timeout });
  }
}

/**
 * 要素が表示されるまで待機してクリック
 * @param {Page} page - Playwrightページオブジェクト
 * @param {string} selector - セレクタ
 * @param {number} timeout - タイムアウト（ミリ秒）
 */
async function waitAndClick(page, selector, timeout = 10000) {
  await page.waitForSelector(selector, { timeout });
  await page.click(selector);
}

/**
 * 要素が表示されるまで待機してテキスト入力
 * @param {Page} page - Playwrightページオブジェクト
 * @param {string} selector - セレクタ
 * @param {string} text - 入力テキスト
 * @param {number} timeout - タイムアウト（ミリ秒）
 */
async function waitAndFill(page, selector, text, timeout = 10000) {
  await page.waitForSelector(selector, { timeout });
  await page.fill(selector, text);
}

/**
 * ファイルアップロード
 * @param {Page} page - Playwrightページオブジェクト
 * @param {string} inputSelector - ファイル入力のセレクタ
 * @param {string} filePath - アップロードするファイルパス
 */
async function uploadFile(page, inputSelector, filePath) {
  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.click(inputSelector);
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(filePath);
}

/**
 * スクリーンショットを撮影（テスト名付き）
 * @param {Page} page - Playwrightページオブジェクト
 * @param {string} testName - テスト名
 * @param {string} step - ステップ名
 */
async function takeScreenshot(page, testName, step) {
  const screenshotDir = path.join(process.cwd(), 'test-results', 'screenshots');
  
  // ディレクトリが存在しない場合は作成
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${testName}_${step}_${timestamp}.png`;
  const filepath = path.join(screenshotDir, filename);
  
  await page.screenshot({ 
    path: filepath, 
    fullPage: true 
  });
  
  console.log(`Screenshot saved: ${filepath}`);
  return filepath;
}

/**
 * ローカルストレージをクリア
 * @param {Page} page - Playwrightページオブジェクト
 */
async function clearLocalStorage(page) {
  await page.evaluate(() => {
    localStorage.clear();
  });
}

/**
 * セッションストレージをクリア
 * @param {Page} page - Playwrightページオブジェクト
 */
async function clearSessionStorage(page) {
  await page.evaluate(() => {
    sessionStorage.clear();
  });
}

/**
 * すべてのストレージをクリア
 * @param {Page} page - Playwrightページオブジェクト
 */
async function clearAllStorage(page) {
  await clearLocalStorage(page);
  await clearSessionStorage(page);
  
  // Cookieもクリア
  const context = page.context();
  await context.clearCookies();
}

/**
 * ランダムな文字列を生成
 * @param {number} length - 文字列の長さ
 * @returns {string} ランダム文字列
 */
function generateRandomString(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 一意のメールアドレスを生成
 * @param {string} prefix - プリフィックス
 * @returns {string} 一意のメールアドレス
 */
function generateUniqueEmail(prefix = 'test') {
  const timestamp = Date.now();
  const random = generateRandomString(4);
  return `${prefix}_${timestamp}_${random}@example.com`;
}

/**
 * ページパフォーマンスメトリクスを取得
 * @param {Page} page - Playwrightページオブジェクト
 * @returns {object} パフォーマンスメトリクス
 */
async function getPerformanceMetrics(page) {
  const metrics = await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0];
    const paint = performance.getEntriesByType('paint');
    
    return {
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
      loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
      firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
      firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
      totalLoadTime: navigation.loadEventEnd - navigation.fetchStart
    };
  });
  
  return metrics;
}

/**
 * ページのアクセシビリティをチェック（基本的なチェック）
 * @param {Page} page - Playwrightページオブジェクト
 * @returns {object} アクセシビリティ問題の配列
 */
async function checkBasicAccessibility(page) {
  const issues = await page.evaluate(() => {
    const problems = [];
    
    // alt属性のない画像をチェック
    const imagesWithoutAlt = document.querySelectorAll('img:not([alt])');
    if (imagesWithoutAlt.length > 0) {
      problems.push({
        type: 'missing-alt',
        count: imagesWithoutAlt.length,
        message: 'Images without alt attributes found'
      });
    }
    
    // ラベルのないフォーム要素をチェック
    const inputsWithoutLabels = document.querySelectorAll('input:not([aria-label]):not([aria-labelledby])');
    const unlabeledInputs = Array.from(inputsWithoutLabels).filter(input => {
      const associatedLabel = document.querySelector(`label[for="${input.id}"]`);
      return !associatedLabel && input.type !== 'hidden';
    });
    
    if (unlabeledInputs.length > 0) {
      problems.push({
        type: 'missing-labels',
        count: unlabeledInputs.length,
        message: 'Form inputs without proper labels found'
      });
    }
    
    // ページタイトルをチェック
    if (!document.title || document.title.trim() === '') {
      problems.push({
        type: 'missing-title',
        message: 'Page title is missing or empty'
      });
    }
    
    return problems;
  });
  
  return issues;
}

/**
 * モバイルビューポートに切り替え
 * @param {Page} page - Playwrightページオブジェクト
 * @param {string} device - デバイス名（'mobile', 'tablet'など）
 */
async function switchToMobileViewport(page, device = 'mobile') {
  const viewports = {
    mobile: { width: 375, height: 667 },
    tablet: { width: 768, height: 1024 },
    desktop: { width: 1280, height: 720 }
  };
  
  const viewport = viewports[device] || viewports.mobile;
  await page.setViewportSize(viewport);
}

/**
 * エラーログを監視
 * @param {Page} page - Playwrightページオブジェクト
 * @returns {function} エラーログを取得する関数
 */
function monitorConsoleErrors(page) {
  const errors = [];
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push({
        text: msg.text(),
        location: msg.location(),
        timestamp: new Date().toISOString()
      });
    }
  });
  
  page.on('pageerror', error => {
    errors.push({
      text: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  });
  
  return () => errors;
}

/**
 * API レスポンスを監視
 * @param {Page} page - Playwrightページオブジェクト
 * @param {string} urlPattern - 監視するURLパターン
 * @returns {Promise} レスポンスデータ
 */
async function waitForApiResponse(page, urlPattern) {
  return page.waitForResponse(response => 
    response.url().includes(urlPattern) && response.status() === 200
  );
}

module.exports = {
  waitForPageLoad,
  waitAndClick,
  waitAndFill,
  uploadFile,
  takeScreenshot,
  clearLocalStorage,
  clearSessionStorage,
  clearAllStorage,
  generateRandomString,
  generateUniqueEmail,
  getPerformanceMetrics,
  checkBasicAccessibility,
  switchToMobileViewport,
  monitorConsoleErrors,
  waitForApiResponse
};