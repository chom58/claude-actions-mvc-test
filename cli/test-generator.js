// 簡単なテストスクリプト - commanderなしでジェネレーターをテスト

const { generateModel } = require('./generators/model');
const { generateController } = require('./generators/controller');
const { generateRoutes } = require('./generators/routes');

console.log('🧪 CLIジェネレーターのテスト開始...\n');

try {
  // テスト用のモデル生成
  console.log('📦 テストモデル "Product" を生成中...');
  generateModel('Product', ['name:string:required', 'price:integer', 'description:text'], { migration: true });
  
  console.log('\n🎮 テストコントローラー "Product" を生成中...');
  generateController('Product', { actions: 'index,show,create,update,destroy' });
  
  console.log('\n🛣️ テストルート "Product" を生成中...');
  generateRoutes('Product', { rest: true });
  
  console.log('\n✅ すべてのテストが正常に完了しました！');
  
} catch (error) {
  console.error('❌ テスト中にエラーが発生しました:', error.message);
  console.error(error.stack);
}