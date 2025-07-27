const readline = require('readline');
const {
  toPascalCase,
  toCamelCase,
  toSnakeCase,
  pluralize,
  logSuccess,
  logError,
  logInfo
} = require('../utils/helpers');
const { generateModel } = require('./model');
const { generateController } = require('./controller');
const { generateRoutes } = require('./routes');
const { generateViews } = require('./views');
const { generateApi } = require('./api');
const { generateScaffold } = require('./scaffold');

// インタラクティブ用のreadlineインターフェース
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * インタラクティブモードのメイン関数
 */
async function interactiveMode() {
  try {
    console.log('\n🎨 CLIジェネレーター - インタラクティブモード');
    console.log('=======================================\n');
    
    const generatorType = await askGeneratorType();
    
    switch (generatorType) {
      case '1':
        await interactiveModel();
        break;
      case '2':
        await interactiveController();
        break;
      case '3':
        await interactiveRoutes();
        break;
      case '4':
        await interactiveViews();
        break;
      case '5':
        await interactiveApi();
        break;
      case '6':
        await interactiveScaffold();
        break;
      default:
        console.log('無効な選択です。');
    }
  } catch (error) {
    logError(`インタラクティブモード中にエラーが発生しました: ${error.message}`);
  } finally {
    rl.close();
  }\n}\n\n/**\n * ジェネレーターの種類を選択\n */\nfunction askGeneratorType() {\n  return new Promise((resolve) => {\n    console.log('生成したいものを選択してください:');\n    console.log('1. モデル (Model)');\n    console.log('2. コントローラー (Controller)');\n    console.log('3. ルート (Routes)');\n    console.log('4. ビュー (Views)');\n    console.log('5. API (RESTful API)');\n    console.log('6. スキャフォールド (Full CRUD)');\n    console.log('');\n    \n    rl.question('選択 (1-6): ', (answer) => {\n      resolve(answer.trim());\n    });\n  });\n}\n\n/**\n * インタラクティブなモデル生成\n */\nasync function interactiveModel() {\n  console.log('\\n📦 モデル生成');\n  console.log('=============');\n  \n  const name = await ask('モデル名を入力してください: ');\n  if (!name) {\n    logError('モデル名は必須です。');\n    return;\n  }\n  \n  const attributes = [];\n  console.log('\\n属性を追加してください (何も入力せずEnterで終了):');\n  \n  while (true) {\n    const attrName = await ask('属性名: ');\n    if (!attrName) break;\n    \n    const attrType = await askAttributeType();\n    const options = await askAttributeOptions();\n    \n    let attrString = `${attrName}:${attrType}`;\n    if (options.length > 0) {\n      attrString += `:${options.join(':')}`;\n    }\n    \n    attributes.push(attrString);\n    console.log(`✅ 追加されました: ${attrString}`);\n  }\n  \n  const withMigration = await askYesNo('マイグレーションファイルも生成しますか？', true);\n  \n  console.log('\\n生成中...');\n  generateModel(name, attributes, { migration: withMigration });\n}\n\n/**\n * インタラクティブなコントローラー生成\n */\nasync function interactiveController() {\n  console.log('\\n🎮 コントローラー生成');\n  console.log('===================');\n  \n  const name = await ask('コントローラー名を入力してください: ');\n  if (!name) {\n    logError('コントローラー名は必須です。');\n    return;\n  }\n  \n  const useDefault = await askYesNo('デフォルトのアクション (index,show,create,update,destroy) を使用しますか？', true);\n  \n  let actions = 'index,show,create,update,destroy';\n  if (!useDefault) {\n    actions = await ask('アクションをカンマ区切りで入力してください: ');\n  }\n  \n  console.log('\\n生成中...');\n  generateController(name, { actions });\n}\n\n/**\n * インタラクティブなルート生成\n */\nasync function interactiveRoutes() {\n  console.log('\\n🛣️  ルート生成');\n  console.log('==============');\n  \n  const name = await ask('リソース名を入力してください: ');\n  if (!name) {\n    logError('リソース名は必須です。');\n    return;\n  }\n  \n  const restful = await askYesNo('RESTfulルートを生成しますか？', true);\n  \n  console.log('\\n生成中...');\n  generateRoutes(name, { rest: restful });\n}\n\n/**\n * インタラクティブなビュー生成\n */\nasync function interactiveViews() {\n  console.log('\\n👁️  ビュー生成');\n  console.log('==============');\n  \n  const name = await ask('リソース名を入力してください: ');\n  if (!name) {\n    logError('リソース名は必須です。');\n    return;\n  }\n  \n  const useDefault = await askYesNo('デフォルトのビュー (index,show,edit,new) を生成しますか？', true);\n  \n  let actions = ['index', 'show', 'edit', 'new'];\n  if (!useDefault) {\n    const actionsStr = await ask('ビューアクションをカンマ区切りで入力してください: ');\n    actions = actionsStr.split(',').map(a => a.trim());\n  }\n  \n  const engine = await askTemplateEngine();\n  \n  console.log('\\n生成中...');\n  generateViews(name, actions, { engine });\n}\n\n/**\n * インタラクティブなAPI生成\n */\nasync function interactiveApi() {\n  console.log('\\n🔌 API生成');\n  console.log('===========');\n  \n  const name = await ask('リソース名を入力してください: ');\n  if (!name) {\n    logError('リソース名は必須です。');\n    return;\n  }\n  \n  const version = await ask('APIバージョンを入力してください (デフォルト: v1): ') || 'v1';\n  \n  console.log('\\n生成中...');\n  generateApi(name, { version });\n}\n\n/**\n * インタラクティブなスキャフォールド生成\n */\nasync function interactiveScaffold() {\n  console.log('\\n✨ スキャフォールド生成');\n  console.log('=====================');\n  \n  const name = await ask('リソース名を入力してください: ');\n  if (!name) {\n    logError('リソース名は必須です。');\n    return;\n  }\n  \n  const attributes = [];\n  console.log('\\n属性を追加してください (何も入力せずEnterで終了):');\n  \n  while (true) {\n    const attrName = await ask('属性名: ');\n    if (!attrName) break;\n    \n    const attrType = await askAttributeType();\n    const options = await askAttributeOptions();\n    \n    let attrString = `${attrName}:${attrType}`;\n    if (options.length > 0) {\n      attrString += `:${options.join(':')}`;\n    }\n    \n    attributes.push(attrString);\n    console.log(`✅ 追加されました: ${attrString}`);\n  }\n  \n  const apiOnly = await askYesNo('APIのみ生成しますか？（ビューファイルを生成しない）', false);\n  \n  console.log('\\n生成中...');\n  generateScaffold(name, attributes, { apiOnly });\n}\n\n/**\n * 属性の型を選択\n */\nfunction askAttributeType() {\n  return new Promise((resolve) => {\n    console.log('   型を選択してください:');\n    console.log('   1. string (文字列)');\n    console.log('   2. text (長いテキスト)');\n    console.log('   3. integer (整数)');\n    console.log('   4. float (浮動小数点)');\n    console.log('   5. boolean (真偽値)');\n    console.log('   6. date (日付)');\n    console.log('   7. reference (外部キー)');\n    \n    rl.question('   選択 (1-7, デフォルト: 1): ', (answer) => {\n      const typeMap = {\n        '1': 'string',\n        '2': 'text',\n        '3': 'integer',\n        '4': 'float',\n        '5': 'boolean',\n        '6': 'date',\n        '7': 'reference'\n      };\n      \n      resolve(typeMap[answer.trim()] || 'string');\n    });\n  });\n}\n\n/**\n * 属性のオプションを選択\n */\nasync function askAttributeOptions() {\n  const options = [];\n  \n  if (await askYesNo('   必須フィールドですか？', false)) {\n    options.push('required');\n  }\n  \n  if (await askYesNo('   ユニーク制約を追加しますか？', false)) {\n    options.push('unique');\n  }\n  \n  if (await askYesNo('   インデックスを追加しますか？', false)) {\n    options.push('index');\n  }\n  \n  return options;\n}\n\n/**\n * テンプレートエンジンを選択\n */\nfunction askTemplateEngine() {\n  return new Promise((resolve) => {\n    console.log('テンプレートエンジンを選択してください:');\n    console.log('1. HTML (デフォルト)');\n    console.log('2. EJS');\n    console.log('3. Pug');\n    \n    rl.question('選択 (1-3, デフォルト: 1): ', (answer) => {\n      const engineMap = {\n        '1': 'html',\n        '2': 'ejs',\n        '3': 'pug'\n      };\n      \n      resolve(engineMap[answer.trim()] || 'html');\n    });\n  });\n}\n\n/**\n * Yes/No質問\n */\nfunction askYesNo(question, defaultValue = true) {\n  return new Promise((resolve) => {\n    const defaultText = defaultValue ? ' (Y/n)' : ' (y/N)';\n    rl.question(question + defaultText + ': ', (answer) => {\n      const normalizedAnswer = answer.trim().toLowerCase();\n      \n      if (normalizedAnswer === '') {\n        resolve(defaultValue);\n      } else if (normalizedAnswer === 'y' || normalizedAnswer === 'yes') {\n        resolve(true);\n      } else if (normalizedAnswer === 'n' || normalizedAnswer === 'no') {\n        resolve(false);\n      } else {\n        resolve(defaultValue);\n      }\n    });\n  });\n}\n\n/**\n * 基本的な質問\n */\nfunction ask(question) {\n  return new Promise((resolve) => {\n    rl.question(question, (answer) => {\n      resolve(answer.trim());\n    });\n  });\n}\n\nmodule.exports = {\n  interactiveMode\n};