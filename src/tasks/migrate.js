#!/usr/bin/env node

const db = require('../lib/database');
const MigrationManager = require('../lib/database/MigrationManager');

/**
 * データベースマイグレーションタスク
 * Usage: 
 *   npm run migrate          # 未実行のマイグレーションを実行
 *   npm run migrate:up       # 未実行のマイグレーションを実行
 *   npm run migrate:down     # 最後のバッチをロールバック
 *   npm run migrate:status   # マイグレーション状態を表示
 *   npm run migrate:reset    # 全てのマイグレーションをリセット
 *   npm run migrate:create <name>  # 新しいマイグレーションファイルを作成
 */

async function main() {
  const command = process.argv[2] || 'up';
  const migrationName = process.argv[3];

  try {
    // データベースに接続
    await db.init();
    console.log('Database connected successfully');

    const migrationManager = db.migrations;

    switch (command) {
      case 'up':
        await migrationManager.up();
        break;

      case 'down':
        await migrationManager.down();
        break;

      case 'status':
        await migrationManager.status();
        break;

      case 'reset':
        console.log('WARNING: This will reset all migrations and drop all tables!');
        console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...');
        
        await new Promise(resolve => setTimeout(resolve, 5000));
        await migrationManager.reset();
        break;

      case 'create':
        if (!migrationName) {
          console.error('Migration name is required');
          console.log('Usage: npm run migrate:create <migration_name>');
          process.exit(1);
        }
        
        await migrationManager.create(migrationName);
        break;

      default:
        console.error(`Unknown command: ${command}`);
        console.log('Available commands: up, down, status, reset, create');
        process.exit(1);
    }

  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    // データベース接続を閉じる
    await db.close();
  }
}

// スクリプトが直接実行された場合のみ実行
if (require.main === module) {
  main();
}

module.exports = main;