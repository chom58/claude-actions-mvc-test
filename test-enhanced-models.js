/**
 * 拡張モデルシステムの手動テストスクリプト
 */

async function testEnhancedModels() {
  console.log('🚀 拡張モデルシステムのテストを開始します...\n');

  try {
    // 拡張モデルシステムをロード
    const enhancedModels = require('./src/models/enhanced');
    
    console.log('📋 1. 拡張モデルシステムの初期化');
    await enhancedModels.initialize();
    console.log('✅ 初期化完了\n');

    console.log('📋 2. システム情報の確認');
    const systemInfo = enhancedModels.getSystemInfo();
    console.log('システム情報:', JSON.stringify(systemInfo, null, 2));
    console.log('');

    console.log('📋 3. データベース同期');
    await enhancedModels.syncDatabase();
    console.log('✅ データベース同期完了\n');

    console.log('📋 4. ヘルスチェック');
    const health = await enhancedModels.healthCheck();
    console.log('ヘルス状況:', JSON.stringify(health, null, 2));
    console.log('');

    console.log('📋 5. モデル統計情報');
    const stats = await enhancedModels.getStats();
    console.log('統計情報:', JSON.stringify(stats, null, 2));
    console.log('');

    console.log('📋 6. 従来のSequelizeアクセステスト');
    const User = enhancedModels.User;
    console.log('Userモデル取得:', User ? '✅ 成功' : '❌ 失敗');
    
    const sequelize = enhancedModels.sequelize;
    console.log('Sequelizeインスタンス取得:', sequelize ? '✅ 成功' : '❌ 失敗');
    console.log('');

    console.log('📋 7. 新機能アクセステスト');
    
    // getModel メソッド
    try {
      const userModel = enhancedModels.getModel('User');
      console.log('getModel メソッド:', userModel ? '✅ 成功' : '❌ 失敗');
    } catch (error) {
      console.log('getModel メソッド:', '❌ エラー:', error.message);
    }

    // SQL クエリ実行
    try {
      const result = await enhancedModels.sql('SELECT 1 as test');
      console.log('SQL実行:', result.rows[0].test === 1 ? '✅ 成功' : '❌ 失敗');
    } catch (error) {
      console.log('SQL実行:', '❌ エラー:', error.message);
    }

    // アダプター取得
    try {
      const adapter = enhancedModels.getAdapter();
      console.log('アダプター取得:', adapter ? '✅ 成功' : '❌ 失敗');
      console.log('アダプタータイプ:', adapter.constructor.name);
    } catch (error) {
      console.log('アダプター取得:', '❌ エラー:', error.message);
    }
    console.log('');

    console.log('📋 8. データ操作テスト（実際のデータベースを使用）');
    
    // 既存ユーザー数確認
    const userCount = await enhancedModels.User.count();
    console.log('既存ユーザー数:', userCount);

    // 最新のユーザーを1件取得
    const latestUser = await enhancedModels.User.findOne({
      order: [['createdAt', 'DESC']]
    });
    
    if (latestUser) {
      console.log('最新ユーザー:', {
        id: latestUser.id,
        username: latestUser.username,
        email: latestUser.email
      });
    } else {
      console.log('ユーザーが見つかりません');
    }
    console.log('');

    console.log('📋 9. トランザクションテスト（READ-ONLY）');
    try {
      const result = await enhancedModels.transaction(async (transaction, models) => {
        // READ-ONLYクエリのみ実行
        const count = await models.User.count({ transaction: transaction.transaction });
        return { userCount: count };
      });
      console.log('トランザクション実行:', '✅ 成功');
      console.log('結果:', result);
    } catch (error) {
      console.log('トランザクション実行:', '❌ エラー:', error.message);
    }
    console.log('');

    console.log('🎉 拡張モデルシステムのテストが完了しました！');
    
  } catch (error) {
    console.error('❌ テスト中にエラーが発生しました:', error.message);
    console.error(error.stack);
  } finally {
    // 接続を閉じる
    try {
      const enhancedModels = require('./src/models/enhanced');
      if (enhancedModels.sequelize) {
        await enhancedModels.sequelize.close();
        console.log('✅ データベース接続を閉じました');
      }
    } catch (error) {
      console.error('❌ 接続終了エラー:', error.message);
    }
  }
}

// テスト実行
if (require.main === module) {
  testEnhancedModels().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = testEnhancedModels;