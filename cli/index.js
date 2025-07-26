#!/usr/bin/env node

const { program } = require('commander');
const { generateModel } = require('./generators/model');
const { generateController } = require('./generators/controller');
const { generateRoutes } = require('./generators/routes');
const { generateViews } = require('./generators/views');
const { generateApi } = require('./generators/api');
const { generateScaffold } = require('./generators/scaffold');
const { interactiveMode } = require('./generators/interactive');

program
  .name('generate')
  .description('MVCアプリケーション用CLIジェネレーター')
  .version('1.0.0');

// モデル生成
program
  .command('model <name> [attributes...]')
  .description('Sequelizeモデルを生成')
  .option('-m, --migration', 'マイグレーションファイルも同時に生成', true)
  .action((name, attributes, options) => {
    generateModel(name, attributes, options);
  });

// コントローラー生成
program
  .command('controller <name>')
  .description('コントローラーを生成')
  .option('-a, --actions <actions>', 'アクションをカンマ区切りで指定', 'index,show,create,update,destroy')
  .action((name, options) => {
    generateController(name, options);
  });

// ルート生成
program
  .command('routes <name>')
  .description('ルートファイルを生成')
  .option('-r, --rest', 'RESTfulルートを生成', true)
  .action((name, options) => {
    generateRoutes(name, options);
  });

// ビュー生成
program
  .command('views <name> [actions...]')
  .description('ビューファイルを生成')
  .option('-e, --engine <engine>', 'テンプレートエンジン', 'html')
  .action((name, actions, options) => {
    generateViews(name, actions, options);
  });

// API生成
program
  .command('api <name>')
  .description('RESTful APIを生成')
  .option('-v, --version <version>', 'APIバージョン', 'v1')
  .action((name, options) => {
    generateApi(name, options);
  });

// スキャフォールド生成
program
  .command('scaffold <name> [attributes...]')
  .description('完全なCRUDリソースを生成')
  .option('-a, --api-only', 'APIのみ生成（ビューなし)')
  .action((name, attributes, options) => {
    generateScaffold(name, attributes, options);
  });

// インタラクティブモード
program
  .command('interactive')
  .alias('i')
  .description('インタラクティブモードで生成')
  .action(() => {
    interactiveMode();
  });

// デフォルトでインタラクティブモードを起動
if (process.argv.length === 2) {
  interactiveMode();
} else {
  program.parse();
}

module.exports = program;