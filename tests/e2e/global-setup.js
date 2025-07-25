const { chromium } = require('@playwright/test');
const path = require('path');

/**
 * グローバルセットアップ
 * テスト実行前に一度だけ実行される
 */
async function globalSetup(config) {
  console.log('🚀 E2Eテスト環境のセットアップを開始します...');
  
  // ブラウザを起動してテスト環境の準備
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // アプリケーションが起動しているかチェック
    console.log('📡 アプリケーションの起動状態をチェック中...');
    await page.goto(config.use.baseURL || 'http://localhost:3000', { 
      timeout: 30000,
      waitUntil: 'networkidle'
    });
    
    // テスト用データベースの初期化
    console.log('🗄️ テスト用データの準備中...');
    // Note: 実際の環境では、ここでテスト用データベースのシードを実行
    
    console.log('✅ グローバルセットアップが完了しました');
    
  } catch (error) {
    console.error('❌ グローバルセットアップでエラーが発生しました:', error.message);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

module.exports = globalSetup;