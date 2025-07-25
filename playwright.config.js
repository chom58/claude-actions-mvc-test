const { defineConfig, devices } = require('@playwright/test');

/**
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
  testDir: './tests/e2e',
  // タイムアウト設定
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
  // 失敗時のリトライ回数
  retries: 2,
  // 並列実行のワーカー数
  workers: process.env.CI ? 1 : undefined,
  // レポーター設定
  reporter: [
    ['html', { outputFolder: 'test-results/html-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['line']
  ],
  // 全般設定
  use: {
    // ベースURL
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    // ブラウザ設定
    headless: true,
    viewport: { width: 1280, height: 720 },
    // スクリーンショット設定
    screenshot: 'only-on-failure',
    // ビデオ録画設定
    video: 'retain-on-failure',
    // トレース設定
    trace: 'retain-on-failure',
    // アクション間の待機時間
    actionTimeout: 10000,
    // ナビゲーションタイムアウト
    navigationTimeout: 15000,
  },
  // テスト環境別設定
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    // モバイル環境
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
  // テスト前後の処理
  globalSetup: require.resolve('./tests/e2e/global-setup.js'),
  globalTeardown: require.resolve('./tests/e2e/global-teardown.js'),
  // 出力ディレクトリ
  outputDir: './test-results/',
});