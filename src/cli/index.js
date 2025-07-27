#!/usr/bin/env node

/**
 * MVC CLI - Express.js MVCパターンアプリケーション開発ツール
 */

const { Command } = require('commander');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');

// コマンドクラスをインポート
const DatabaseCommands = require('./commands/database');

// ジェネレータークラスをインポート
const ControllerGenerator = require('./generators/controller.generator');
const ModelGenerator = require('./generators/model.generator');
const RouteGenerator = require('./generators/route.generator');
const TestGenerator = require('./generators/test.generator');
const ProjectGenerator = require('./generators/project.generator');

/**
 * メインCLIプログラム
 */
class MVCCli {
  constructor() {
    this.program = new Command();
    this.setupProgram();
    this.setupCommands();
  }

  setupProgram() {
    const packageJson = this.getPackageInfo();
    
    this.program
      .name('mvc-cli')
      .description('Express.js MVCパターンアプリケーション開発CLI')
      .version(packageJson.version || '1.0.0')
      .option('-v, --verbose', '詳細出力')
      .option('--dry-run', '実際の変更は行わずプレビューのみ');
  }

  setupCommands() {
    // generateコマンドグループ
    const generateCommand = this.program
      .command('generate')
      .alias('g')
      .description('ファイル生成コマンド');

    // コントローラー生成
    generateCommand
      .command('controller <name>')
      .description('コントローラーファイルを生成')
      .option('-a, --actions <actions>', 'アクションメソッドをカンマ区切りで指定')
      .option('-m, --model <model>', '関連するモデル名')
      .option('--api', 'API用コントローラーとして生成')
      .option('--dry-run', '実際の変更は行わずプレビューのみ')
      .action(this.generateController.bind(this));

    // モデル生成
    generateCommand
      .command('model <name>')
      .description('モデルファイルを生成')
      .option('-f, --fields <fields>', 'フィールド定義をカンマ区切りで指定')
      .option('-r, --relations <relations>', 'リレーション定義をカンマ区切りで指定')
      .option('--migration', 'マイグレーションファイルも生成')
      .option('--dry-run', '実際の変更は行わずプレビューのみ')
      .action(this.generateModel.bind(this));

    // ルート生成
    generateCommand
      .command('route <name>')
      .description('ルートファイルを生成')
      .option('-c, --controller <controller>', '関連するコントローラー名')
      .option('-p, --prefix <prefix>', 'パスプレフィックス')
      .option('--api', 'API用ルートとして生成')
      .option('--dry-run', '実際の変更は行わずプレビューのみ')
      .action(this.generateRoute.bind(this));

    // テスト生成
    generateCommand
      .command('test <type> <name>')
      .description('テストファイルを生成')
      .option('-m, --methods <methods>', 'テストメソッドをカンマ区切りで指定')
      .option('--integration', '統合テストとして生成')
      .option('--dry-run', '実際の変更は行わずプレビューのみ')
      .action(this.generateTest.bind(this));

    // プロジェクト初期化
    this.program
      .command('init [name]')
      .description('新しいMVCプロジェクトを初期化')
      .option('-t, --template <template>', 'プロジェクトテンプレート', 'basic')
      .option('-i, --interactive', '対話型セットアップ')
      .option('--force', '既存ディレクトリを上書き')
      .action(this.initProject.bind(this));

    // データベースコマンド（DatabaseCommandsクラスから追加）
    const dbCommands = new DatabaseCommands();
    this.program.addCommand(dbCommands.getProgram().commands[0]);

    // バージョン情報コマンド
    this.program
      .command('version')
      .description('CLIバージョン情報を表示')
      .action(this.showVersion.bind(this));

    // 診断コマンド
    this.program
      .command('doctor')
      .description('プロジェクト環境の診断')
      .option('--fix', '可能な問題を自動修正')
      .action(this.runDiagnostics.bind(this));
  }

  /**
   * コントローラー生成
   */
  async generateController(name, options) {
    try {
      const generator = new ControllerGenerator();
      await generator.generate(name, options);
    } catch (error) {
      console.error(chalk.red('❌ コントローラー生成エラー:'), error.message);
      process.exit(1);
    }
  }

  /**
   * モデル生成
   */
  async generateModel(name, options) {
    try {
      const generator = new ModelGenerator();
      await generator.generate(name, options);
    } catch (error) {
      console.error(chalk.red('❌ モデル生成エラー:'), error.message);
      process.exit(1);
    }
  }

  /**
   * ルート生成
   */
  async generateRoute(name, options) {
    try {
      const generator = new RouteGenerator();
      await generator.generate(name, options);
    } catch (error) {
      console.error(chalk.red('❌ ルート生成エラー:'), error.message);
      process.exit(1);
    }
  }

  /**
   * テスト生成
   */
  async generateTest(type, name, options) {
    try {
      const generator = new TestGenerator();
      await generator.generate(type, name, options);
    } catch (error) {
      console.error(chalk.red('❌ テスト生成エラー:'), error.message);
      process.exit(1);
    }
  }

  /**
   * プロジェクト初期化
   */
  async initProject(name, options) {
    try {
      const generator = new ProjectGenerator();
      await generator.generate(name, options);
    } catch (error) {
      console.error(chalk.red('❌ プロジェクト初期化エラー:'), error.message);
      process.exit(1);
    }
  }

  /**
   * バージョン情報表示
   */
  showVersion() {
    const packageJson = this.getPackageInfo();
    console.log(chalk.blue('🛠️  MVC CLI'));
    console.log(chalk.gray(`バージョン: ${packageJson.version || '1.0.0'}`));
    console.log(chalk.gray(`Node.js: ${process.version}`));
    console.log(chalk.gray(`プラットフォーム: ${process.platform} ${process.arch}`));
  }

  /**
   * 診断実行
   */
  async runDiagnostics(options) {
    console.log(chalk.blue('🔍 プロジェクト環境診断を実行中...'));
    
    const checks = [
      this.checkNodeVersion(),
      this.checkPackageJson(),
      this.checkDependencies(),
      this.checkProjectStructure(),
      this.checkDatabaseConfig(),
      this.checkGitRepository()
    ];

    const results = await Promise.all(checks);
    const issues = results.filter(r => !r.passed);

    console.log(chalk.blue('\n📊 診断結果:'));
    results.forEach(result => {
      const icon = result.passed ? '✅' : '❌';
      const color = result.passed ? chalk.green : chalk.red;
      console.log(color(`${icon} ${result.name}: ${result.message}`));
    });

    if (issues.length === 0) {
      console.log(chalk.green('\n🎉 全ての診断項目をパスしました！'));
    } else {
      console.log(chalk.yellow(`\n⚠️  ${issues.length}個の問題が検出されました。`));
      
      if (options.fix) {
        console.log(chalk.blue('\n🔧 自動修正を試行中...'));
        for (const issue of issues) {
          if (issue.autoFix) {
            try {
              await issue.autoFix();
              console.log(chalk.green(`✅ ${issue.name}を修正しました`));
            } catch (error) {
              console.log(chalk.red(`❌ ${issue.name}の修正に失敗: ${error.message}`));
            }
          }
        }
      }
    }
  }

  /**
   * 診断チェック: Node.jsバージョン
   */
  checkNodeVersion() {
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    const minRequired = 14;

    return {
      name: 'Node.jsバージョン',
      passed: majorVersion >= minRequired,
      message: majorVersion >= minRequired 
        ? `${nodeVersion} (推奨: >=14.0.0)`
        : `${nodeVersion} (推奨: >=14.0.0) - 更新が必要です`
    };
  }

  /**
   * 診断チェック: package.json
   */
  checkPackageJson() {
    const packagePath = path.join(process.cwd(), 'package.json');
    const exists = fs.existsSync(packagePath);

    return {
      name: 'package.json',
      passed: exists,
      message: exists ? '存在します' : '見つかりません'
    };
  }

  /**
   * 診断チェック: 依存関係
   */
  checkDependencies() {
    const requiredDeps = ['express', 'sequelize'];
    const packageJson = this.getPackageInfo();
    const deps = { ...(packageJson.dependencies || {}), ...(packageJson.devDependencies || {}) };
    
    const missing = requiredDeps.filter(dep => !deps[dep]);

    return {
      name: '必要な依存関係',
      passed: missing.length === 0,
      message: missing.length === 0 
        ? '全て揃っています' 
        : `不足: ${missing.join(', ')}`
    };
  }

  /**
   * 診断チェック: プロジェクト構造
   */
  checkProjectStructure() {
    const requiredDirs = ['src', 'src/controllers', 'src/models', 'src/routes'];
    const missing = requiredDirs.filter(dir => !fs.existsSync(path.join(process.cwd(), dir)));

    return {
      name: 'プロジェクト構造',
      passed: missing.length === 0,
      message: missing.length === 0 
        ? '正しく構成されています' 
        : `不足ディレクトリ: ${missing.join(', ')}`
    };
  }

  /**
   * 診断チェック: データベース設定
   */
  checkDatabaseConfig() {
    const configPath = path.join(process.cwd(), 'src/config/database.js');
    const exists = fs.existsSync(configPath);

    return {
      name: 'データベース設定',
      passed: exists,
      message: exists ? '設定ファイルが存在します' : '設定ファイルが見つかりません'
    };
  }

  /**
   * 診断チェック: Gitリポジトリ
   */
  checkGitRepository() {
    const gitPath = path.join(process.cwd(), '.git');
    const exists = fs.existsSync(gitPath);

    return {
      name: 'Gitリポジトリ',
      passed: exists,
      message: exists ? '初期化済み' : '未初期化'
    };
  }

  /**
   * package.json情報を取得
   */
  getPackageInfo() {
    try {
      const packagePath = path.join(process.cwd(), 'package.json');
      if (fs.existsSync(packagePath)) {
        return JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      }
    } catch (error) {
      // パッケージ情報が取得できない場合はデフォルト値を返す
    }
    return { version: '1.0.0' };
  }

  /**
   * CLIを実行
   */
  run() {
    this.program.parse(process.argv);
  }
}

// CLIを実行
if (require.main === module) {
  const cli = new MVCCli();
  cli.run();
}

module.exports = MVCCli;