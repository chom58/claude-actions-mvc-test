#!/usr/bin/env node
/**
 * 求人データ初期化スクリプト
 * データベースをセットアップし、サンプル求人データを投入します
 */

require('dotenv').config();
const { syncDatabase } = require('./src/models');
const { seedDesignerJobs } = require('./src/seeders/designerJobSeed');

async function initJobData() {
  try {
    console.log('🚀 求人データベースの初期化を開始します...');
    
    // データベースの同期
    console.log('📊 データベースの同期中...');
    await syncDatabase();
    console.log('✅ データベースの同期が完了しました');
    
    // 求人データの投入
    console.log('💼 求人データの投入中...');
    const result = await seedDesignerJobs();
    
    console.log('\n🎉 求人データベースの初期化が完了しました！');
    console.log('\n📈 作成されたデータ:');
    console.log(`   - 求人サイト: ${result.jobSites.length}サイト`);
    console.log(`   - 求人情報: ${result.jobs.length}件`);
    console.log(`   - 未経験歓迎: ${result.stats.experienceWelcome}件`);
    console.log(`   - 新卒歓迎: ${result.stats.newGraduateWelcome}件`);
    console.log(`   - おすすめ求人: ${result.stats.featured}件`);
    console.log(`   - リモートOK: ${result.stats.remoteOk}件`);
    
    console.log('\n🌐 APIエンドポイント:');
    console.log('   - 求人一覧: GET /api/designer-jobs');
    console.log('   - 求人詳細: GET /api/designer-jobs/:id');
    console.log('   - 統計情報: GET /api/designer-jobs/stats/entry-level');
    console.log('   - おすすめ求人: GET /api/designer-jobs/featured/list');
    
    console.log('\n💻 フロントエンド:');
    console.log('   - 求人サイト: /designer-jobs.html');
    console.log('   - 検索テスト: /search-test.html');
    
    console.log('\n✨ アプリケーションサーバーを起動して求人機能をお試しください！');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ 求人データベースの初期化中にエラーが発生しました:', error);
    process.exit(1);
  }
}

// スクリプトとして実行された場合
if (require.main === module) {
  initJobData();
}

module.exports = initJobData;