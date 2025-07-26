const path = require('path');
const fs = require('fs');
const {
  toPascalCase,
  toCamelCase,
  toSnakeCase,
  pluralize,
  writeFile,
  getProjectRoot,
  logSuccess,
  logError,
  logInfo
} = require('../utils/helpers');
const { generateModel } = require('./model');
const { generateController } = require('./controller');
const { generateRoutes } = require('./routes');
const { generateViews } = require('./views');
const { generateApi } = require('./api');

/**
 * 完全なCRUDスキャフォールドを生成
 */
function generateScaffold(name, attributes = [], options = {}) {
  try {
    const modelName = toPascalCase(name);
    const resourceName = toCamelCase(modelName);
    const resourcePath = pluralize(toSnakeCase(name));
    
    logInfo(`スキャフォールド "${modelName}" を生成中...`);
    logInfo(`属性: ${attributes.join(', ')}`);
    
    console.log('\n🔨 生成プロセス開始...\n');
    
    // 1. モデル生成
    console.log('📦 1/6: モデルを生成中...');
    generateModel(name, attributes, { migration: true });
    
    // 2. コントローラー生成
    console.log('\n🎮 2/6: コントローラーを生成中...');
    generateController(name, { actions: 'index,show,create,update,destroy' });
    
    // 3. ルート生成
    console.log('\n🛣️  3/6: ルートを生成中...');
    generateRoutes(name, { rest: true });
    
    // 4. APIのみでない場合はビューも生成
    if (!options.apiOnly) {
      console.log('\n👁️  4/6: ビューを生成中...');
      generateViews(name, ['index', 'show', 'edit', 'new'], { engine: 'html' });
    } else {
      console.log('\n⏭️  4/6: ビュー生成をスキップ (--api-onlyモード)');
    }
    
    // 5. APIドキュメント生成
    console.log('\n📚 5/6: APIドキュメントを生成中...');
    generateApiDocumentationOnly(name, attributes);
    
    // 6. セットアップガイド生成
    console.log('\n📋 6/6: セットアップガイドを生成中...');
    generateSetupGuide(name, attributes, options);
    
    console.log('\n✨ スキャフォールド生成完了！');
    
    // 生成されたファイルの一覧表示
    displayGeneratedFiles(name, options);
    
    // 次のステップを表示
    displayNextSteps(name, attributes, options);
    
  } catch (error) {
    logError(`スキャフォールド生成中にエラーが発生しました: ${error.message}`);
  }
}

/**
 * APIドキュメントのみを生成
 */
function generateApiDocumentationOnly(name, attributes) {
  const { generateApi } = require('./api');
  
  try {
    // APIドキュメント部分のみ実行
    const modelName = toPascalCase(name);
    const resourceName = toCamelCase(modelName);
    const resourcePath = pluralize(toSnakeCase(name));
    
    const apiDocContent = generateScaffoldApiDoc(modelName, resourceName, resourcePath, attributes);
    const apiDocPath = path.join(getProjectRoot(), 'docs', 'api', `${resourcePath}.md`);
    
    if (writeFile(apiDocPath, apiDocContent)) {
      logSuccess(`APIドキュメントを生成しました: ${apiDocPath}`);
    }
  } catch (error) {
    logError(`APIドキュメント生成中にエラーが発生しました: ${error.message}`);
  }
}

/**
 * スキャフォールド用のAPIドキュメントを生成
 */
function generateScaffoldApiDoc(modelName, resourceName, resourcePath, attributes) {
  const { parseAttributes } = require('../utils/helpers');
  const parsedAttributes = parseAttributes(attributes);
  
  const sampleObject = {};
  parsedAttributes.forEach(attr => {
    switch (attr.type) {
      case 'string':
        sampleObject[attr.name] = `サンプル${attr.name}`;
        break;
      case 'integer':
        sampleObject[attr.name] = 123;
        break;
      case 'boolean':
        sampleObject[attr.name] = true;
        break;
      default:
        sampleObject[attr.name] = `サンプル${attr.name}`;
    }
  });
  
  return `# ${modelName} API Documentation

## 概要
${modelName}リソースのCRUD操作を提供するRESTful APIです。

## 属性
${parsedAttributes.map(attr => `- **${attr.name}** (${attr.type}): ${attr.options.includes('required') ? '必須' : '任意'}`).join('\n')}

## エンドポイント

### GET /${resourcePath}
${modelName}の一覧を取得します。

**レスポンス例:**
\`\`\`json
{
  "${resourceName}s": [
    ${JSON.stringify({ id: 1, ...sampleObject, createdAt: "2024-01-01T00:00:00.000Z", updatedAt: "2024-01-01T00:00:00.000Z" }, null, 4)}
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
\`\`\`

### GET /${resourcePath}/:id
指定されたIDの${modelName}詳細を取得します。

### POST /${resourcePath}
新しい${modelName}を作成します。

**リクエスト例:**
\`\`\`json
${JSON.stringify(sampleObject, null, 2)}
\`\`\`

### PUT /${resourcePath}/:id
指定されたIDの${modelName}を更新します。

### DELETE /${resourcePath}/:id
指定されたIDの${modelName}を削除します。
`;
}

/**
 * セットアップガイドを生成
 */
function generateSetupGuide(name, attributes, options) {
  const { getProjectRoot, writeFile } = require('../utils/helpers');
  
  const modelName = toPascalCase(name);
  const resourceName = toCamelCase(modelName);
  const resourcePath = pluralize(toSnakeCase(name));
  
  const setupContent = `# ${modelName} セットアップガイド

このファイルは \`npm run generate:scaffold ${name} ${attributes.join(' ')}\` によって自動生成されました。

## 生成されたファイル

### モデル
- \`src/models/${modelName}.js\` - Sequelizeモデル定義
- \`migrations/[timestamp]-create-${toSnakeCase(name)}.js\` - データベースマイグレーション

### コントローラー
- \`src/controllers/${resourceName}Controller.js\` - CRUD操作のコントローラー

### ルート
- \`src/routes/${resourcePath}Routes.js\` - RESTfulルート定義

${!options.apiOnly ? `### ビュー
- \`public/${resourcePath}/index.html\` - 一覧ページ
- \`public/${resourcePath}/show.html\` - 詳細ページ
- \`public/${resourcePath}/edit.html\` - 編集ページ
- \`public/${resourcePath}/new.html\` - 新規作成ページ` : ''}

### ドキュメント
- \`docs/api/${resourcePath}.md\` - API仕様書

## セットアップ手順

1. **ルートの登録**
   \`src/routes/index.js\` に以下を追加:
   \`\`\`javascript
   const ${resourcePath}Routes = require('./${resourcePath}Routes');
   app.use('/api/${resourcePath}', ${resourcePath}Routes);
   \`\`\`

2. **マイグレーション実行**
   \`\`\`bash
   # マイグレーション実行（データベーステーブル作成）
   npx sequelize-cli db:migrate
   \`\`\`

3. **バリデーション設定**
   \`src/routes/${resourcePath}Routes.js\` のバリデーションルールを実際の要件に合わせて修正

4. **認証の追加（必要な場合）**
   認証が必要なエンドポイントに \`authMiddleware\` を追加

## 利用可能なエンドポイント

- \`GET /api/${resourcePath}\` - 一覧取得
- \`GET /api/${resourcePath}/:id\` - 詳細取得
- \`POST /api/${resourcePath}\` - 新規作成
- \`PUT /api/${resourcePath}/:id\` - 更新
- \`DELETE /api/${resourcePath}/:id\` - 削除

${!options.apiOnly ? `## Webページ

- \`/${resourcePath}\` - 一覧ページ
- \`/${resourcePath}/:id\` - 詳細ページ
- \`/${resourcePath}/:id/edit\` - 編集ページ
- \`/${resourcePath}/new\` - 新規作成ページ` : ''}

## カスタマイズ

### 属性の追加
1. モデルファイルに新しい属性を追加
2. 新しいマイグレーションファイルを作成
3. バリデーションルールを更新
4. フォームとビューを更新

### ビジネスロジックの追加
コントローラーファイルにカスタムメソッドを追加してください。

## トラブルシューティング

### データベース接続エラー
- データベース設定（\`src/config/database.js\`）を確認
- データベースサーバーが起動していることを確認

### バリデーションエラー
- リクエストボディの形式を確認
- 必須フィールドが含まれているか確認

生成日時: ${new Date().toISOString()}
`;

  const setupPath = path.join(getProjectRoot(), 'docs', 'setup', `${resourcePath}-setup.md`);
  
  if (writeFile(setupPath, setupContent)) {
    logSuccess(`セットアップガイドを生成しました: ${setupPath}`);
  }
}

/**
 * 生成されたファイルの一覧を表示
 */
function displayGeneratedFiles(name, options) {
  const modelName = toPascalCase(name);
  const resourceName = toCamelCase(modelName);
  const resourcePath = pluralize(toSnakeCase(name));
  
  console.log('\n📂 生成されたファイル:');
  console.log(`   ✅ src/models/${modelName}.js`);
  console.log(`   ✅ src/controllers/${resourceName}Controller.js`);
  console.log(`   ✅ src/routes/${resourcePath}Routes.js`);
  console.log(`   ✅ migrations/[timestamp]-create-${toSnakeCase(name)}.js`);
  
  if (!options.apiOnly) {
    console.log(`   ✅ public/${resourcePath}/index.html`);
    console.log(`   ✅ public/${resourcePath}/show.html`);
    console.log(`   ✅ public/${resourcePath}/edit.html`);
    console.log(`   ✅ public/${resourcePath}/new.html`);
  }
  
  console.log(`   ✅ docs/api/${resourcePath}.md`);
  console.log(`   ✅ docs/setup/${resourcePath}-setup.md`);
}

/**
 * 次のステップを表示
 */
function displayNextSteps(name, attributes, options) {
  const resourcePath = pluralize(toSnakeCase(name));
  
  console.log('\n🚀 次のステップ:');
  console.log('   1. ルートを登録してください:');
  console.log(`      src/routes/index.js に以下を追加:`);
  console.log(`      app.use('/api/${resourcePath}', require('./${resourcePath}Routes'));`);
  console.log('');
  console.log('   2. マイグレーションを実行してください:');
  console.log(`      npx sequelize-cli db:migrate`);
  console.log('');
  console.log('   3. バリデーションルールをカスタマイズしてください:');
  console.log(`      src/routes/${resourcePath}Routes.js を編集`);
  console.log('');
  console.log('   4. サーバーを起動してテストしてください:');
  console.log(`      npm run dev`);
  console.log(`      http://localhost:3000/api/${resourcePath}`);
  
  if (!options.apiOnly) {
    console.log(`      http://localhost:3000/${resourcePath}`);
  }
  
  console.log('');
  console.log('📚 詳細な情報:');
  console.log(`   - API仕様: docs/api/${resourcePath}.md`);
  console.log(`   - セットアップガイド: docs/setup/${resourcePath}-setup.md`);
}

module.exports = {
  generateScaffold
};