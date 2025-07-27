#!/usr/bin/env node

const { program } = require('commander');
const inquirer = require('inquirer');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs').promises;

// ジェネレーターのインポート
const ControllerGenerator = require('../src/cli/generators/controller.generator');
const ModelGenerator = require('../src/cli/generators/model.generator');
const RouteGenerator = require('../src/cli/generators/route.generator');
const TestGenerator = require('../src/cli/generators/test.generator');
const ProjectInitializer = require('../src/cli/generators/project.generator');

// データベースコマンドのインポート
const DatabaseCommands = require('../src/cli/commands/database');

// CLIバージョン
const packageJson = require('../package.json');

// プログラムの設定
program
  .name('mvc-cli')
  .description('Express MVC アプリケーションのCLIジェネレーター')
  .version(packageJson.version);

// データベースコマンドの追加
const dbCommands = new DatabaseCommands();
program.addCommand(dbCommands.getProgram().commands.find(cmd => cmd.name() === 'db'));

// プロジェクト初期化コマンド
program
  .command('init [project-name]')
  .description('新しいMVCプロジェクトを初期化')
  .option('-t, --template <template>', 'テンプレートを指定 (basic, full, api)', 'basic')
  .option('--skip-install', 'npm installをスキップ')
  .option('--git', 'Gitリポジトリを初期化')
  .action(async (projectName, options) => {
    try {
      console.log(chalk.blue('🚀 MVCプロジェクトの初期化を開始します...\n'));
      
      const initializer = new ProjectInitializer();
      await initializer.init(projectName, options);
      
      console.log(chalk.green('\n✅ プロジェクトの初期化が完了しました！'));
    } catch (error) {
      console.error(chalk.red('❌ エラー:'), error.message);
      process.exit(1);
    }
  });

// コントローラー生成コマンド
program
  .command('generate:controller <name>')
  .alias('g:c')
  .description('新しいコントローラーを生成')
  .option('-a, --actions <actions...>', 'アクションメソッドを指定')
  .option('-r, --resource', 'RESTfulリソースコントローラーを生成')
  .option('--api', 'APIコントローラーとして生成')
  .option('--auth', '認証が必要なコントローラーとして生成')
  .action(async (name, options) => {
    try {
      console.log(chalk.blue(`📄 コントローラー "${name}" を生成中...`));
      
      const generator = new ControllerGenerator();
      const result = await generator.generate(name, options);
      
      console.log(chalk.green(`✅ コントローラーが生成されました: ${result.controllerPath}`));
      
      if (result.routePath) {
        console.log(chalk.green(`✅ ルートが生成されました: ${result.routePath}`));
      }
      
      if (result.testPath) {
        console.log(chalk.green(`✅ テストが生成されました: ${result.testPath}`));
      }
    } catch (error) {
      console.error(chalk.red('❌ エラー:'), error.message);
      process.exit(1);
    }
  });

// モデル生成コマンド
program
  .command('generate:model <name>')
  .alias('g:m')
  .description('新しいモデルを生成')
  .option('-a, --attributes <attributes...>', '属性を指定 (name:type)')
  .option('--timestamps', 'タイムスタンプを追加', true)
  .option('--paranoid', '論理削除を有効化')
  .option('--migration', 'マイグレーションファイルも生成', true)
  .action(async (name, options) => {
    try {
      console.log(chalk.blue(`📊 モデル "${name}" を生成中...`));
      
      const generator = new ModelGenerator();
      const result = await generator.generate(name, options);
      
      console.log(chalk.green(`✅ モデルが生成されました: ${result.modelPath}`));
      
      if (result.migrationPath) {
        console.log(chalk.green(`✅ マイグレーションが生成されました: ${result.migrationPath}`));
      }
    } catch (error) {
      console.error(chalk.red('❌ エラー:'), error.message);
      process.exit(1);
    }
  });

// ルート生成コマンド
program
  .command('generate:route <name>')
  .alias('g:r')
  .description('新しいルートを生成')
  .option('-m, --methods <methods...>', 'HTTPメソッドを指定', ['GET', 'POST', 'PUT', 'DELETE'])
  .option('-p, --prefix <prefix>', 'URLプレフィックスを指定')
  .option('--middleware <middleware...>', 'ミドルウェアを追加')
  .action(async (name, options) => {
    try {
      console.log(chalk.blue(`🔗 ルート "${name}" を生成中...`));
      
      const generator = new RouteGenerator();
      const result = await generator.generate(name, options);
      
      console.log(chalk.green(`✅ ルートが生成されました: ${result.routePath}`));
      console.log(chalk.yellow(`\n📝 以下をapp.jsまたはroutes/index.jsに追加してください:`));
      console.log(chalk.gray(`app.use('${result.mountPath}', require('${result.requirePath}'));`));
    } catch (error) {
      console.error(chalk.red('❌ エラー:'), error.message);
      process.exit(1);
    }
  });

// テスト生成コマンド
program
  .command('generate:test <type> <name>')
  .alias('g:t')
  .description('テストファイルを生成')
  .option('-t, --test-type <type>', 'テストタイプ (unit, integration, e2e)', 'unit')
  .action(async (type, name, options) => {
    try {
      console.log(chalk.blue(`🧪 ${type}のテスト "${name}" を生成中...`));
      
      const generator = new TestGenerator();
      const result = await generator.generate(type, name, options);
      
      console.log(chalk.green(`✅ テストが生成されました: ${result.testPath}`));
    } catch (error) {
      console.error(chalk.red('❌ エラー:'), error.message);
      process.exit(1);
    }
  });

// 対話型ジェネレーターコマンド
program
  .command('generate')
  .alias('g')
  .description('対話型ジェネレーター')
  .action(async () => {
    try {
      const answers = await inquirer.prompt([
        {
          type: 'list',
          name: 'type',
          message: '何を生成しますか？',
          choices: [
            { name: 'コントローラー', value: 'controller' },
            { name: 'モデル', value: 'model' },
            { name: 'ルート', value: 'route' },
            { name: 'テスト', value: 'test' },
            { name: 'フルスタック機能（CRUD）', value: 'scaffold' }
          ]
        }
      ]);

      switch (answers.type) {
        case 'controller':
          await generateControllerInteractive();
          break;
        case 'model':
          await generateModelInteractive();
          break;
        case 'route':
          await generateRouteInteractive();
          break;
        case 'test':
          await generateTestInteractive();
          break;
        case 'scaffold':
          await generateScaffoldInteractive();
          break;
      }
    } catch (error) {
      console.error(chalk.red('❌ エラー:'), error.message);
      process.exit(1);
    }
  });

// リストコマンド
program
  .command('list <type>')
  .alias('ls')
  .description('既存のリソースを一覧表示')
  .action(async (type) => {
    try {
      console.log(chalk.blue(`📋 ${type}の一覧を表示中...\n`));
      
      switch (type) {
        case 'controllers':
          await listControllers();
          break;
        case 'models':
          await listModels();
          break;
        case 'routes':
          await listRoutes();
          break;
        default:
          console.log(chalk.yellow('利用可能なタイプ: controllers, models, routes'));
      }
    } catch (error) {
      console.error(chalk.red('❌ エラー:'), error.message);
    }
  });

// 対話型コントローラー生成
async function generateControllerInteractive() {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'コントローラー名:',
      validate: input => input.length > 0 || '名前を入力してください'
    },
    {
      type: 'confirm',
      name: 'resource',
      message: 'RESTfulリソースコントローラーを生成しますか？',
      default: true
    },
    {
      type: 'checkbox',
      name: 'actions',
      message: 'アクションを選択してください:',
      choices: ['index', 'show', 'create', 'update', 'delete'],
      when: answers => !answers.resource
    },
    {
      type: 'confirm',
      name: 'api',
      message: 'APIコントローラーとして生成しますか？',
      default: false
    },
    {
      type: 'confirm',
      name: 'auth',
      message: '認証を必要としますか？',
      default: false
    },
    {
      type: 'confirm',
      name: 'generateTest',
      message: 'テストファイルも生成しますか？',
      default: true
    }
  ]);

  const generator = new ControllerGenerator();
  const result = await generator.generate(answers.name, answers);
  
  console.log(chalk.green('\n✅ 生成完了！'));
  console.log(chalk.gray(`コントローラー: ${result.controllerPath}`));
  if (result.routePath) {
    console.log(chalk.gray(`ルート: ${result.routePath}`));
  }
  if (result.testPath) {
    console.log(chalk.gray(`テスト: ${result.testPath}`));
  }
}

// 対話型モデル生成
async function generateModelInteractive() {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'モデル名:',
      validate: input => input.length > 0 || '名前を入力してください'
    },
    {
      type: 'confirm',
      name: 'addAttributes',
      message: '属性を追加しますか？',
      default: true
    }
  ]);

  const attributes = [];
  
  if (answers.addAttributes) {
    let addMore = true;
    while (addMore) {
      const attr = await inquirer.prompt([
        {
          type: 'input',
          name: 'name',
          message: '属性名:',
          validate: input => input.length > 0 || '属性名を入力してください'
        },
        {
          type: 'list',
          name: 'type',
          message: 'データ型:',
          choices: [
            'STRING',
            'TEXT',
            'INTEGER',
            'BIGINT',
            'FLOAT',
            'DOUBLE',
            'DECIMAL',
            'BOOLEAN',
            'DATE',
            'DATEONLY',
            'JSON',
            'JSONB',
            'UUID'
          ]
        },
        {
          type: 'confirm',
          name: 'required',
          message: '必須項目にしますか？',
          default: false
        },
        {
          type: 'confirm',
          name: 'unique',
          message: 'ユニーク制約を追加しますか？',
          default: false
        }
      ]);
      
      attributes.push(`${attr.name}:${attr.type}${attr.required ? ':required' : ''}${attr.unique ? ':unique' : ''}`);
      
      const { continue: cont } = await inquirer.prompt({
        type: 'confirm',
        name: 'continue',
        message: '別の属性を追加しますか？',
        default: false
      });
      
      addMore = cont;
    }
  }

  const additionalOptions = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'timestamps',
      message: 'タイムスタンプ（createdAt, updatedAt）を追加しますか？',
      default: true
    },
    {
      type: 'confirm',
      name: 'paranoid',
      message: '論理削除（deletedAt）を有効にしますか？',
      default: false
    },
    {
      type: 'confirm',
      name: 'migration',
      message: 'マイグレーションファイルも生成しますか？',
      default: true
    }
  ]);

  const generator = new ModelGenerator();
  const result = await generator.generate(answers.name, {
    attributes,
    ...additionalOptions
  });
  
  console.log(chalk.green('\n✅ 生成完了！'));
  console.log(chalk.gray(`モデル: ${result.modelPath}`));
  if (result.migrationPath) {
    console.log(chalk.gray(`マイグレーション: ${result.migrationPath}`));
  }
}

// 対話型ルート生成
async function generateRouteInteractive() {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'ルート名:',
      validate: input => input.length > 0 || '名前を入力してください'
    },
    {
      type: 'input',
      name: 'prefix',
      message: 'URLプレフィックス (例: /api/v1):',
      default: '/api'
    },
    {
      type: 'checkbox',
      name: 'methods',
      message: '使用するHTTPメソッド:',
      choices: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      default: ['GET', 'POST']
    },
    {
      type: 'checkbox',
      name: 'middleware',
      message: '使用するミドルウェア:',
      choices: [
        { name: '認証 (auth)', value: 'auth' },
        { name: 'レート制限 (rateLimit)', value: 'rateLimit' },
        { name: 'バリデーション (validation)', value: 'validation' },
        { name: 'ファイルアップロード (upload)', value: 'upload' }
      ]
    }
  ]);

  const generator = new RouteGenerator();
  const result = await generator.generate(answers.name, answers);
  
  console.log(chalk.green('\n✅ 生成完了！'));
  console.log(chalk.gray(`ルート: ${result.routePath}`));
  console.log(chalk.yellow(`\n📝 以下をapp.jsに追加してください:`));
  console.log(chalk.gray(`app.use('${result.mountPath}', require('${result.requirePath}'));`));
}

// 対話型テスト生成
async function generateTestInteractive() {
  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'type',
      message: 'テスト対象:',
      choices: [
        { name: 'コントローラー', value: 'controller' },
        { name: 'モデル', value: 'model' },
        { name: 'ミドルウェア', value: 'middleware' },
        { name: 'サービス', value: 'service' },
        { name: 'ユーティリティ', value: 'util' }
      ]
    },
    {
      type: 'input',
      name: 'name',
      message: 'テスト対象の名前:',
      validate: input => input.length > 0 || '名前を入力してください'
    },
    {
      type: 'list',
      name: 'testType',
      message: 'テストタイプ:',
      choices: [
        { name: '単体テスト', value: 'unit' },
        { name: '統合テスト', value: 'integration' },
        { name: 'E2Eテスト', value: 'e2e' }
      ]
    }
  ]);

  const generator = new TestGenerator();
  const result = await generator.generate(answers.type, answers.name, {
    testType: answers.testType
  });
  
  console.log(chalk.green('\n✅ 生成完了！'));
  console.log(chalk.gray(`テスト: ${result.testPath}`));
}

// スキャフォールド生成（CRUD全体）
async function generateScaffoldInteractive() {
  console.log(chalk.blue('\n🏗️  フルスタック機能（CRUD）の生成\n'));
  
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'リソース名（単数形）:',
      validate: input => input.length > 0 || '名前を入力してください'
    },
    {
      type: 'confirm',
      name: 'api',
      message: 'API形式で生成しますか？',
      default: true
    }
  ]);

  console.log(chalk.yellow('\n生成中...'));

  // モデル生成
  const modelGenerator = new ModelGenerator();
  const model = await modelGenerator.generate(answers.name, {
    attributes: ['name:STRING:required', 'description:TEXT'],
    timestamps: true,
    migration: true
  });

  // コントローラー生成
  const controllerGenerator = new ControllerGenerator();
  const controller = await controllerGenerator.generate(answers.name, {
    resource: true,
    api: answers.api
  });

  // ルート生成
  const routeGenerator = new RouteGenerator();
  const route = await routeGenerator.generate(answers.name, {
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    prefix: answers.api ? '/api' : ''
  });

  // テスト生成
  const testGenerator = new TestGenerator();
  const test = await testGenerator.generate('controller', answers.name, {
    testType: 'integration'
  });

  console.log(chalk.green('\n✅ スキャフォールドが完成しました！'));
  console.log(chalk.gray(`\nモデル: ${model.modelPath}`));
  console.log(chalk.gray(`マイグレーション: ${model.migrationPath}`));
  console.log(chalk.gray(`コントローラー: ${controller.controllerPath}`));
  console.log(chalk.gray(`ルート: ${route.routePath}`));
  console.log(chalk.gray(`テスト: ${test.testPath}`));
  
  console.log(chalk.yellow(`\n📝 次のステップ:`));
  console.log(chalk.gray(`1. マイグレーションを実行: npm run migrate`));
  console.log(chalk.gray(`2. ルートを登録: app.use('${route.mountPath}', require('${route.requirePath}'));`));
  console.log(chalk.gray(`3. テストを実行: npm test`));
}

// コントローラー一覧表示
async function listControllers() {
  const controllersDir = path.join(process.cwd(), 'src/controllers');
  
  try {
    const files = await fs.readdir(controllersDir);
    const controllers = files.filter(f => f.endsWith('Controller.js'));
    
    if (controllers.length === 0) {
      console.log(chalk.yellow('コントローラーが見つかりません'));
      return;
    }
    
    controllers.forEach(controller => {
      console.log(chalk.green('  ✓'), controller.replace('.js', ''));
    });
    
    console.log(chalk.gray(`\n合計: ${controllers.length} コントローラー`));
  } catch (error) {
    console.log(chalk.yellow('コントローラーディレクトリが見つかりません'));
  }
}

// モデル一覧表示
async function listModels() {
  const modelsDir = path.join(process.cwd(), 'src/models');
  
  try {
    const files = await fs.readdir(modelsDir);
    const models = files.filter(f => f.endsWith('.js') && f !== 'index.js');
    
    if (models.length === 0) {
      console.log(chalk.yellow('モデルが見つかりません'));
      return;
    }
    
    models.forEach(model => {
      console.log(chalk.green('  ✓'), model.replace('.js', ''));
    });
    
    console.log(chalk.gray(`\n合計: ${models.length} モデル`));
  } catch (error) {
    console.log(chalk.yellow('モデルディレクトリが見つかりません'));
  }
}

// ルート一覧表示
async function listRoutes() {
  const routesDir = path.join(process.cwd(), 'src/routes');
  
  try {
    const files = await fs.readdir(routesDir);
    const routes = files.filter(f => f.endsWith('.js'));
    
    if (routes.length === 0) {
      console.log(chalk.yellow('ルートが見つかりません'));
      return;
    }
    
    routes.forEach(route => {
      console.log(chalk.green('  ✓'), route.replace('.js', ''));
    });
    
    console.log(chalk.gray(`\n合計: ${routes.length} ルート`));
  } catch (error) {
    console.log(chalk.yellow('ルートディレクトリが見つかりません'));
  }
}

// プログラムの実行
program.parse(process.argv);

// 引数がない場合はヘルプを表示
if (!process.argv.slice(2).length) {
  program.outputHelp();
}