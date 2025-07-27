/**
 * パフォーマンステストスクリプト
 */

const chalk = require('chalk');

async function measurePerformance(name, fn) {
  const start = process.hrtime.bigint();
  const startMemory = process.memoryUsage();
  
  try {
    const result = await fn();
    const end = process.hrtime.bigint();
    const endMemory = process.memoryUsage();
    
    const duration = Number(end - start) / 1000000; // ナノ秒からミリ秒に変換
    const memoryDiff = endMemory.heapUsed - startMemory.heapUsed;
    
    return {
      name,
      success: true,
      duration,
      memoryDiff,
      result
    };
  } catch (error) {
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1000000;
    
    return {
      name,
      success: false,
      duration,
      error: error.message
    };
  }
}

async function testPerformance() {
  console.log(chalk.blue('🚀 パフォーマンステストを開始します...\n'));

  // 拡張モデルシステムを使用してテスト
  const enhancedModels = require('./src/models/enhanced');

  const tests = [
    {
      name: 'システム初期化時間',
      fn: async () => {
        await enhancedModels.initialize();
        return 'initialized';
      }
    },
    {
      name: 'ヘルスチェック応答時間',
      fn: async () => {
        return await enhancedModels.healthCheck();
      }
    },
    {
      name: 'データベース統計取得時間',
      fn: async () => {
        return await enhancedModels.getStats();
      }
    },
    {
      name: '単純SQLクエリ実行時間',
      fn: async () => {
        return await enhancedModels.sql('SELECT 1 as test');
      }
    },
    {
      name: 'ユーザーカウント取得時間',
      fn: async () => {
        return await enhancedModels.User.count();
      }
    },
    {
      name: '複数回のユーザーカウント（10回）',
      fn: async () => {
        const promises = [];
        for (let i = 0; i < 10; i++) {
          promises.push(enhancedModels.User.count());
        }
        return await Promise.all(promises);
      }
    },
    {
      name: 'システム情報取得時間',
      fn: async () => {
        return enhancedModels.getSystemInfo();
      }
    },
    {
      name: 'アダプター取得時間',
      fn: async () => {
        return enhancedModels.getAdapter();
      }
    }
  ];

  const results = [];

  for (const test of tests) {
    console.log(chalk.blue(`📊 ${test.name}を測定中...`));
    
    const result = await measurePerformance(test.name, test.fn);
    results.push(result);
    
    if (result.success) {
      const duration = result.duration.toFixed(2);
      const memory = (result.memoryDiff / 1024 / 1024).toFixed(2);
      
      console.log(chalk.green(`✅ ${test.name}`));
      console.log(chalk.gray(`   実行時間: ${duration}ms`));
      console.log(chalk.gray(`   メモリ使用量変化: ${memory}MB`));
      
      // パフォーマンス警告
      if (result.duration > 1000) {
        console.log(chalk.yellow(`   ⚠️  実行時間が1秒を超えています`));
      }
      if (Math.abs(result.memoryDiff) > 50 * 1024 * 1024) { // 50MB
        console.log(chalk.yellow(`   ⚠️  メモリ使用量変化が大きいです`));
      }
    } else {
      console.log(chalk.red(`❌ ${test.name}: ${result.error}`));
    }
    
    console.log('');
  }

  // 結果のサマリー
  console.log(chalk.blue('📊 パフォーマンステスト結果サマリー'));
  console.log(chalk.blue('='.repeat(60)));
  
  const successResults = results.filter(r => r.success);
  const averageDuration = successResults.reduce((sum, r) => sum + r.duration, 0) / successResults.length;
  const totalMemoryChange = successResults.reduce((sum, r) => sum + r.memoryDiff, 0);
  
  console.log(chalk.green(`✅ 成功したテスト: ${successResults.length}/${results.length}`));
  console.log(chalk.blue(`📈 平均実行時間: ${averageDuration.toFixed(2)}ms`));
  console.log(chalk.blue(`💾 総メモリ使用量変化: ${(totalMemoryChange / 1024 / 1024).toFixed(2)}MB`));
  
  // 最も遅いテスト
  const slowestTest = successResults.reduce((prev, current) => 
    (prev.duration > current.duration) ? prev : current
  );
  console.log(chalk.yellow(`🐌 最も遅いテスト: ${slowestTest.name} (${slowestTest.duration.toFixed(2)}ms)`));
  
  // 最も速いテスト
  const fastestTest = successResults.reduce((prev, current) => 
    (prev.duration < current.duration) ? prev : current
  );
  console.log(chalk.green(`⚡ 最も速いテスト: ${fastestTest.name} (${fastestTest.duration.toFixed(2)}ms)`));

  // パフォーマンス評価
  console.log(chalk.blue('\n📈 パフォーマンス評価:'));
  
  if (averageDuration < 100) {
    console.log(chalk.green('🚀 優秀: 平均実行時間が100ms未満です'));
  } else if (averageDuration < 500) {
    console.log(chalk.yellow('👍 良好: 平均実行時間が500ms未満です'));
  } else {
    console.log(chalk.red('⚠️  改善余地: 平均実行時間が500ms以上です'));
  }

  if (Math.abs(totalMemoryChange) < 10 * 1024 * 1024) { // 10MB
    console.log(chalk.green('💚 メモリ効率: メモリ使用量が安定しています'));
  } else {
    console.log(chalk.yellow('💛 メモリ注意: メモリ使用量の変化が大きいです'));
  }

  // 接続を閉じる
  try {
    if (enhancedModels.sequelize) {
      await enhancedModels.sequelize.close();
      console.log(chalk.gray('\n✅ データベース接続を閉じました'));
    }
  } catch (error) {
    console.error(chalk.red('❌ 接続終了エラー:'), error.message);
  }

  return results;
}

// テスト実行
if (require.main === module) {
  testPerformance().then((results) => {
    const allPassed = results.every(r => r.success);
    console.log(chalk.blue('\n🎉 パフォーマンステストが完了しました！'));
    process.exit(allPassed ? 0 : 1);
  }).catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = testPerformance;