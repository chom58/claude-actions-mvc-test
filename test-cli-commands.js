/**
 * CLIコマンドの統合テストスクリプト
 */

const { spawn } = require('child_process');
const chalk = require('chalk');

async function runCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    const process = spawn('node', [command, ...args], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: __dirname
    });

    let stdout = '';
    let stderr = '';

    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    process.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });

    process.on('error', (error) => {
      reject(error);
    });

    // プロセスが長時間実行される場合は強制終了
    setTimeout(() => {
      process.kill('SIGTERM');
      reject(new Error('Command timeout'));
    }, 30000);
  });
}

async function testCLICommands() {
  console.log(chalk.blue('🚀 CLIコマンドの統合テストを開始します...\n'));

  const tests = [
    {
      name: 'CLIコマンドヘルプ表示',
      command: 'src/cli/index.js',
      args: ['--help'],
      expectedCode: 0
    },
    {
      name: 'データベースヘルスチェック',
      command: 'src/cli/index.js',
      args: ['db', 'health'],
      expectedCode: 0
    },
    {
      name: 'データベース設定表示',
      command: 'src/cli/index.js',
      args: ['db', 'config'],
      expectedCode: 0
    },
    {
      name: 'データベース接続テスト',
      command: 'src/cli/index.js',
      args: ['db', 'test'],
      expectedCode: 0
    },
    {
      name: 'コントローラー生成（ドライラン）',
      command: 'src/cli/index.js',
      args: ['generate', 'controller', 'TestController', '--dry-run'],
      expectedCode: 0
    },
    {
      name: 'モデル生成（ドライラン）',
      command: 'src/cli/index.js',
      args: ['generate', 'model', 'TestModel', '--dry-run'],
      expectedCode: 0
    }
  ];

  const results = [];

  for (const test of tests) {
    console.log(chalk.blue(`📋 ${test.name}をテスト中...`));
    
    try {
      const result = await runCommand(test.command, test.args);
      
      const success = result.code === test.expectedCode;
      results.push({ ...test, success, result });
      
      if (success) {
        console.log(chalk.green(`✅ ${test.name}: 成功`));
      } else {
        console.log(chalk.red(`❌ ${test.name}: 失敗 (終了コード: ${result.code})`));
        console.log(chalk.gray('STDOUT:'), result.stdout.slice(0, 200));
        console.log(chalk.gray('STDERR:'), result.stderr.slice(0, 200));
      }
    } catch (error) {
      console.log(chalk.red(`❌ ${test.name}: エラー`));
      console.log(chalk.gray('エラー:'), error.message);
      results.push({ ...test, success: false, error });
    }
    
    console.log('');
  }

  // 結果のサマリー
  console.log(chalk.blue('📊 テスト結果サマリー'));
  console.log(chalk.blue('='.repeat(50)));
  
  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  
  console.log(chalk.green(`✅ 成功: ${successCount}/${totalCount}`));
  console.log(chalk.red(`❌ 失敗: ${totalCount - successCount}/${totalCount}`));
  
  if (successCount === totalCount) {
    console.log(chalk.green('\n🎉 全てのCLIコマンドテストが成功しました！'));
  } else {
    console.log(chalk.yellow('\n⚠️  一部のテストが失敗しました。詳細を確認してください。'));
  }

  return results;
}

// テスト実行
if (require.main === module) {
  testCLICommands().then((results) => {
    const allPassed = results.every(r => r.success);
    process.exit(allPassed ? 0 : 1);
  }).catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = testCLICommands;