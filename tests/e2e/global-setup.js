const { chromium } = require('@playwright/test');
const path = require('path');
require('dotenv').config();

/**
 * グローバルセットアップ
 * テスト実行前に一度だけ実行される
 */
async function globalSetup(config) {
  console.log('🚀 E2Eテスト環境のセットアップを開始します...');

  // テスト用の環境変数設定
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-key-minimum-32-chars';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-minimum-32-chars';

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // アプリケーションのヘルスチェック
    console.log('📡 アプリケーションの起動状態をチェック中...');
    const baseURL = config.projects[0].use.baseURL || 'http://localhost:3000';
    
    const maxRetries = 30;
    let retries = 0;
    let serverReady = false;

    while (retries < maxRetries && !serverReady) {
      try {
        const response = await page.request.get(`${baseURL}/api/system/health`);
        
        if (response.ok()) {
          console.log('✅ サーバーの準備完了');
          serverReady = true;
        }
      } catch (error) {
        retries++;
        console.log(`⏳ サーバーの起動を待機中... (${retries}/${maxRetries})`);
        await page.waitForTimeout(1000);
      }
    }

    if (!serverReady) {
      throw new Error('サーバーがタイムアウト期間内に起動しませんでした');
    }

    // テストデータの準備
    await setupTestData(page, baseURL);

    console.log('✅ グローバルセットアップが完了しました');
    
  } catch (error) {
    console.error('❌ グローバルセットアップでエラーが発生しました:', error.message);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

/**
 * テストデータのセットアップ
 */
async function setupTestData(page, baseURL) {
  console.log('📊 テストデータを準備中...');

  // E2Eテスト用ユーザーの作成
  const testUsers = [
    {
      username: 'e2e_admin',
      email: 'e2e_admin@test.com',
      password: 'Admin123!@#',
      role: 'admin'
    },
    {
      username: 'e2e_user',
      email: 'e2e_user@test.com',
      password: 'User123!@#',
      role: 'user'
    }
  ];

  for (const userData of testUsers) {
    try {
      const response = await page.request.post(`${baseURL}/api/auth/register`, {
        data: userData
      });

      if (response.ok()) {
        console.log(`✅ テストユーザー作成: ${userData.username}`);
      }
    } catch (error) {
      // ユーザーが既に存在する場合は無視
      console.log(`ℹ️ テストユーザー ${userData.username} は既に存在している可能性があります`);
    }
  }

  // 認証トークンをグローバルに保存（必要に応じて）
  try {
    const loginResponse = await page.request.post(`${baseURL}/api/auth/login`, {
      data: {
        email: 'e2e_admin@test.com',
        password: 'Admin123!@#'
      }
    });

    if (loginResponse.ok()) {
      const { token } = await loginResponse.json();
      process.env.E2E_ADMIN_TOKEN = token;
      console.log('✅ 管理者トークンを保存しました');
    }
  } catch (error) {
    console.log('ℹ️ 管理者トークンの取得をスキップしました');
  }
}

module.exports = globalSetup;