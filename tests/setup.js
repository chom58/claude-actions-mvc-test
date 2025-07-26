const { sequelize } = require('../src/models');
const { DatabaseHelper } = require('./helpers');

// Jest環境設定
global.console = {
  ...console,
  // 不要なログを無効化
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: console.error
};

// テストタイムアウト設定
jest.setTimeout(30000);

beforeAll(async () => {
  // テスト用データベース初期化
  await DatabaseHelper.syncDatabase(true);
});

afterAll(async () => {
  // データベース接続クローズ
  await DatabaseHelper.closeDatabase();
});

// 各テストファイル実行前の共通セットアップ
beforeEach(async () => {
  // トランザクションをリセット
  await DatabaseHelper.cleanDatabase();
});

// エラーハンドリングの改善
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// メモリリーク対策
afterEach(async () => {
  // 明示的にガベージコレクションを実行
  if (global.gc) {
    global.gc();
  }
});