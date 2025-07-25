/**
 * グローバルティアダウン
 * 全テスト実行後に一度だけ実行される
 */
async function globalTeardown(config) {
  console.log('🧹 E2Eテスト環境のクリーンアップを開始します...');
  
  try {
    // テスト用データのクリーンアップ
    console.log('🗑️ テストデータのクリーンアップ中...');
    // Note: 実際の環境では、ここでテスト用データベースのクリーンアップを実行
    
    // 一時ファイルの削除
    console.log('📁 一時ファイルのクリーンアップ中...');
    // Note: アップロードされたテスト画像などの削除
    
    console.log('✅ グローバルティアダウンが完了しました');
    
  } catch (error) {
    console.error('❌ グローバルティアダウンでエラーが発生しました:', error.message);
    // エラーが発生してもテストは終了させる
  }
}

module.exports = globalTeardown;