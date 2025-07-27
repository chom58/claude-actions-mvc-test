const { Command } = require('commander');
const chalk = require('chalk');
const inquirer = require('inquirer');
const fs = require('fs').promises;
const path = require('path');

// データベース抽象化レイヤー
const { 
  initialize, 
  createAdapter, 
  createAdapterFromUrl, 
  healthCheck, 
  getConfig,
  validateConfig,
  parseConnectionUrl 
} = require('../../database');

/**
 * データベース関連のCLIコマンド
 */
class DatabaseCommands {
  constructor() {
    this.program = new Command();
    this.setupCommands();
  }

  setupCommands() {
    // データベースコマンドグループ
    const dbCommand = this.program
      .command('db')
      .alias('database')
      .description('データベース関連操作');

    // 初期化コマンド
    dbCommand
      .command('init')
      .description('データベースの初期化')
      .option('-e, --env <environment>', '環境を指定', 'development')
      .option('-f, --force', '既存のデータベースを強制的に再初期化')
      .action(this.initDatabase.bind(this));

    // 接続テストコマンド
    dbCommand
      .command('test')
      .alias('ping')
      .description('データベース接続テスト')
      .option('-e, --env <environment>', '環境を指定')
      .option('-a, --adapter <name>', 'アダプター名を指定')
      .action(this.testConnection.bind(this));

    // ヘルスチェックコマンド
    dbCommand
      .command('health')
      .description('データベースヘルスチェック')
      .option('-w, --watch', '継続監視モード')
      .option('-i, --interval <seconds>', '監視間隔（秒）', '30')
      .action(this.healthCheck.bind(this));

    // 設定表示コマンド
    dbCommand
      .command('config')
      .description('データベース設定の表示')
      .option('-e, --env <environment>', '環境を指定')
      .option('--validate', '設定の検証のみ実行')
      .action(this.showConfig.bind(this));

    // マイグレーション関連
    const migrateCommand = dbCommand
      .command('migrate')
      .description('マイグレーション操作');

    migrateCommand
      .command('create <name>')
      .description('新しいマイグレーションファイルを作成')
      .option('-t, --template <type>', 'テンプレートタイプ', 'basic')
      .action(this.createMigration.bind(this));

    migrateCommand
      .command('up')
      .description('マイグレーションを実行')
      .option('-e, --env <environment>', '環境を指定', 'development')
      .option('-s, --steps <number>', '実行するステップ数')
      .action(this.runMigrationUp.bind(this));

    migrateCommand
      .command('down')
      .description('マイグレーションをロールバック')
      .option('-e, --env <environment>', '環境を指定', 'development')
      .option('-s, --steps <number>', 'ロールバックするステップ数', '1')
      .action(this.runMigrationDown.bind(this));

    migrateCommand
      .command('status')
      .description('マイグレーション状況を表示')
      .option('-e, --env <environment>', '環境を指定', 'development')
      .action(this.migrationStatus.bind(this));

    // スキーマ関連
    const schemaCommand = dbCommand
      .command('schema')
      .description('スキーマ操作');

    schemaCommand
      .command('sync')
      .description('スキーマを同期')
      .option('-e, --env <environment>', '環境を指定', 'development')
      .option('-f, --force', '強制実行（データ消失の可能性あり）')
      .action(this.syncSchema.bind(this));

    schemaCommand
      .command('dump')
      .description('スキーマをダンプ')
      .option('-e, --env <environment>', '環境を指定', 'development')
      .option('-o, --output <file>', '出力ファイル')
      .action(this.dumpSchema.bind(this));

    schemaCommand
      .command('load')
      .description('スキーマを読み込み')
      .option('-e, --env <environment>', '環境を指定', 'development')
      .option('-i, --input <file>', '入力ファイル')
      .action(this.loadSchema.bind(this));

    // 対話型セットアップ
    dbCommand
      .command('setup')
      .description('対話型データベースセットアップ')
      .action(this.interactiveSetup.bind(this));
  }

  /**
   * データベース初期化
   */
  async initDatabase(options) {
    try {
      console.log(chalk.blue('📊 データベースを初期化中...'));
      
      const dbManager = await initialize(options.env);
      const health = await dbManager.healthCheck();
      
      if (health.overallHealth) {
        console.log(chalk.green('✅ データベース初期化完了'));
        console.log(chalk.gray(`環境: ${options.env}`));
        
        // アダプター一覧表示
        const adapters = dbManager.getAdapterList();
        console.log(chalk.gray(`アダプター: ${adapters.join(', ')}`));
      } else {
        console.log(chalk.red('❌ データベース初期化に失敗'));
        this.displayHealthStatus(health);
      }
    } catch (error) {
      console.error(chalk.red('❌ エラー:'), error.message);
      process.exit(1);
    }
  }

  /**
   * 接続テスト
   */
  async testConnection(options) {
    try {
      console.log(chalk.blue('🔍 データベース接続テスト中...'));
      
      const dbManager = await initialize(options.env);
      const adapter = options.adapter ? dbManager.getAdapter(options.adapter) : dbManager.getAdapter();
      
      const health = await adapter.healthCheck();
      
      if (health.healthy) {
        console.log(chalk.green('✅ 接続成功'));
        console.log(chalk.gray(`応答時間: ${health.responseTime}ms`));
        console.log(chalk.gray(`アダプター: ${health.adapter}`));
      } else {
        console.log(chalk.red('❌ 接続失敗'));
        console.log(chalk.red(health.error));
      }
    } catch (error) {
      console.error(chalk.red('❌ エラー:'), error.message);
      process.exit(1);
    }
  }

  /**
   * ヘルスチェック
   */
  async healthCheck(options) {
    try {
      if (options.watch) {
        console.log(chalk.blue('👀 データベース監視開始...'));
        console.log(chalk.gray('Ctrl+C で終了'));
        
        const interval = parseInt(options.interval) * 1000;
        
        setInterval(async () => {
          const health = await healthCheck();
          console.clear();
          console.log(chalk.blue(`🔍 ヘルスチェック - ${new Date().toLocaleString()}`));
          this.displayHealthStatus(health);
        }, interval);
        
        // 初回実行
        const health = await healthCheck();
        this.displayHealthStatus(health);
      } else {
        const health = await healthCheck();
        this.displayHealthStatus(health);
      }
    } catch (error) {
      console.error(chalk.red('❌ エラー:'), error.message);
      process.exit(1);
    }
  }

  /**
   * 設定表示
   */
  async showConfig(options) {
    try {
      const config = getConfig(options.env);
      
      if (options.validate) {
        const errors = validateConfig(config);
        
        if (errors.length === 0) {
          console.log(chalk.green('✅ 設定は有効です'));
        } else {
          console.log(chalk.red('❌ 設定エラー:'));
          errors.forEach(error => console.log(chalk.red(`  - ${error}`)));
          process.exit(1);
        }
      } else {
        console.log(chalk.blue(`📋 データベース設定 (${options.env || 'development'})`));
        console.log(chalk.gray(JSON.stringify(this.sanitizeConfig(config), null, 2)));
      }
    } catch (error) {
      console.error(chalk.red('❌ エラー:'), error.message);
      process.exit(1);
    }
  }

  /**
   * マイグレーション実行（UP）
   */
  async runMigrationUp(options) {
    console.log(chalk.blue('📈 マイグレーションを実行中...'));
    console.log(chalk.yellow('⚠️  この機能は未実装です。将来のバージョンで対応予定です。'));
  }

  /**
   * マイグレーション実行（DOWN）
   */
  async runMigrationDown(options) {
    console.log(chalk.blue('📉 マイグレーションをロールバック中...'));
    console.log(chalk.yellow('⚠️  この機能は未実装です。将来のバージョンで対応予定です。'));
  }

  /**
   * マイグレーション状況表示
   */
  async migrationStatus(options) {
    console.log(chalk.blue('📋 マイグレーション状況を表示中...'));
    console.log(chalk.yellow('⚠️  この機能は未実装です。将来のバージョンで対応予定です。'));
  }

  /**
   * スキーマ同期
   */
  async syncSchema(options) {
    console.log(chalk.blue('🔄 スキーマを同期中...'));
    console.log(chalk.yellow('⚠️  この機能は未実装です。将来のバージョンで対応予定です。'));
  }

  /**
   * スキーマダンプ
   */
  async dumpSchema(options) {
    console.log(chalk.blue('💾 スキーマをダンプ中...'));
    console.log(chalk.yellow('⚠️  この機能は未実装です。将来のバージョンで対応予定です。'));
  }

  /**
   * スキーマ読み込み
   */
  async loadSchema(options) {
    console.log(chalk.blue('📥 スキーマを読み込み中...'));
    console.log(chalk.yellow('⚠️  この機能は未実装です。将来のバージョンで対応予定です。'));
  }

  /**
   * マイグレーション作成
   */
  async createMigration(name, options) {
    try {
      const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
      const migrationName = `${timestamp}-${name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`;
      const migrationsDir = path.join(process.cwd(), 'src', 'migrations');
      
      // ディレクトリの確認・作成
      await fs.mkdir(migrationsDir, { recursive: true });
      
      const migrationPath = path.join(migrationsDir, `${migrationName}.js`);
      const template = this.getMigrationTemplate(name, options.template);
      
      await fs.writeFile(migrationPath, template);
      
      console.log(chalk.green('✅ マイグレーションファイルを作成しました'));
      console.log(chalk.gray(`ファイル: ${migrationPath}`));
    } catch (error) {
      console.error(chalk.red('❌ エラー:'), error.message);
      process.exit(1);
    }
  }

  /**
   * 対話型セットアップ
   */
  async interactiveSetup() {
    try {
      console.log(chalk.blue('🛠️  データベース対話型セットアップ'));
      
      const answers = await inquirer.prompt([
        {
          type: 'list',
          name: 'dialect',
          message: 'データベースタイプを選択してください:',
          choices: [
            { name: 'PostgreSQL', value: 'postgres' },
            { name: 'MySQL', value: 'mysql' },
            { name: 'SQLite', value: 'sqlite' }
          ]
        },
        {
          type: 'input',
          name: 'host',
          message: 'ホスト名:',
          default: 'localhost',
          when: (answers) => answers.dialect !== 'sqlite'
        },
        {
          type: 'input',
          name: 'port',
          message: 'ポート番号:',
          default: (answers) => answers.dialect === 'postgres' ? '5432' : '3306',
          when: (answers) => answers.dialect !== 'sqlite'
        },
        {
          type: 'input',
          name: 'database',
          message: 'データベース名:',
          default: 'mvc_app',
          when: (answers) => answers.dialect !== 'sqlite'
        },
        {
          type: 'input',
          name: 'username',
          message: 'ユーザー名:',
          when: (answers) => answers.dialect !== 'sqlite'
        },
        {
          type: 'password',
          name: 'password',
          message: 'パスワード:',
          when: (answers) => answers.dialect !== 'sqlite'
        },
        {
          type: 'input',
          name: 'storage',
          message: 'データベースファイルパス:',
          default: './database.sqlite',
          when: (answers) => answers.dialect === 'sqlite'
        }
      ]);

      // 接続テスト
      console.log(chalk.blue('🔍 接続テスト中...'));
      
      const config = {
        dialect: answers.dialect,
        host: answers.host,
        port: parseInt(answers.port),
        database: answers.database,
        username: answers.username,
        password: answers.password,
        storage: answers.storage
      };

      const adapter = await createAdapter(config, 'setup_test');
      const health = await adapter.healthCheck();
      
      if (health.healthy) {
        console.log(chalk.green('✅ 接続成功'));
        
        // 設定ファイルの生成を提案
        const shouldGenerateConfig = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'generate',
            message: '設定を環境変数ファイル(.env)に保存しますか？',
            default: true
          }
        ]);

        if (shouldGenerateConfig.generate) {
          await this.generateEnvConfig(config);
        }
      } else {
        console.log(chalk.red('❌ 接続失敗:'), health.error);
      }
    } catch (error) {
      console.error(chalk.red('❌ エラー:'), error.message);
    }
  }

  /**
   * ヘルスステータス表示
   * @private
   */
  displayHealthStatus(health) {
    console.log(chalk.blue(`📊 全体ステータス: ${health.overallHealth ? '正常' : '異常'}`));
    console.log(chalk.gray(`時刻: ${health.timestamp}`));
    
    Object.entries(health.adapters).forEach(([name, status]) => {
      const icon = status.healthy ? '✅' : '❌';
      const color = status.healthy ? chalk.green : chalk.red;
      
      console.log(color(`${icon} ${name}: ${status.status}`));
      if (status.responseTime) {
        console.log(chalk.gray(`   応答時間: ${status.responseTime}ms`));
      }
      if (status.error) {
        console.log(chalk.red(`   エラー: ${status.error}`));
      }
    });
  }

  /**
   * 設定のサニタイズ（パスワードなどを隠す）
   * @private
   */
  sanitizeConfig(config) {
    const sanitized = { ...config };
    if (sanitized.password) {
      sanitized.password = '***';
    }
    if (sanitized.replica && sanitized.replica.password) {
      sanitized.replica.password = '***';
    }
    return sanitized;
  }

  /**
   * マイグレーションテンプレート取得
   * @private
   */
  getMigrationTemplate(name, template) {
    const className = name.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join('');

    switch (template) {
      case 'table':
        return this.getCreateTableTemplate(className);
      case 'index':
        return this.getCreateIndexTemplate(className);
      default:
        return this.getBasicMigrationTemplate(className);
    }
  }

  /**
   * 基本マイグレーションテンプレート
   * @private
   */
  getBasicMigrationTemplate(className) {
    return `/**
 * ${className} マイグレーション
 * 
 * Generated by MVC CLI
 */

module.exports = {
  name: '${className}',
  
  /**
   * マイグレーション実行
   * @param {DatabaseAdapter} adapter
   */
  async up(adapter) {
    // TODO: マイグレーション処理を実装
    
    // 例: テーブル作成
    // await adapter.createTable('example_table', {
    //   id: {
    //     type: 'INTEGER',
    //     constraints: { primaryKey: true, autoIncrement: true }
    //   },
    //   name: {
    //     type: 'STRING',
    //     constraints: { allowNull: false }
    //   },
    //   created_at: {
    //     type: 'DATE',
    //     constraints: { allowNull: false }
    //   }
    // });
  },
  
  /**
   * マイグレーションロールバック
   * @param {DatabaseAdapter} adapter
   */
  async down(adapter) {
    // TODO: ロールバック処理を実装
    
    // 例: テーブル削除
    // await adapter.dropTable('example_table');
  }
};`;
  }

  /**
   * 環境設定ファイルの生成
   * @private
   */
  async generateEnvConfig(config) {
    const envContent = `
# データベース設定
DB_DIALECT=${config.dialect}
${config.host ? `DB_HOST=${config.host}` : ''}
${config.port ? `DB_PORT=${config.port}` : ''}
${config.database ? `DB_NAME=${config.database}` : ''}
${config.username ? `DB_USER=${config.username}` : ''}
${config.password ? `DB_PASSWORD=${config.password}` : ''}
${config.storage ? `DB_STORAGE=${config.storage}` : ''}

# 接続プール設定
DB_POOL_MAX=20
DB_POOL_MIN=5
DB_POOL_IDLE=10000
DB_POOL_ACQUIRE=60000
`;

    const envPath = path.join(process.cwd(), '.env');
    
    try {
      // 既存の.envファイルがあるかチェック
      await fs.access(envPath);
      
      // 既存ファイルがある場合は追記するか確認
      const shouldAppend = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'append',
          message: '.envファイルが既に存在します。追記しますか？',
          default: true
        }
      ]);

      if (shouldAppend.append) {
        await fs.appendFile(envPath, envContent);
        console.log(chalk.green('✅ .envファイルに設定を追記しました'));
      }
    } catch (error) {
      // ファイルが存在しない場合は新規作成
      await fs.writeFile(envPath, envContent.trim());
      console.log(chalk.green('✅ .envファイルを作成しました'));
    }
  }

  getProgram() {
    return this.program;
  }
}

module.exports = DatabaseCommands;