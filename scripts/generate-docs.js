const fs = require('fs').promises;
const path = require('path');
const ejs = require('ejs');

/**
 * マークダウンドキュメント生成スクリプト
 * 
 * このスクリプトは以下の機能を提供します：
 * - README.mdの自動更新
 * - APIエンドポイント一覧生成
 * - プロジェクト構造ドキュメント生成
 * - 各種ガイドドキュメント生成
 */

/**
 * ルートファイルを解析してエンドポイント情報を抽出
 */
async function analyzeRoutes() {
  try {
    const routesDir = path.join(__dirname, '..', 'src', 'routes');
    const files = await fs.readdir(routesDir);
    const routeFiles = files.filter(file => file.endsWith('.js') && file !== 'index.js');
    
    const routes = [];
    
    for (const file of routeFiles) {
      try {
        const filePath = path.join(routesDir, file);
        const content = await fs.readFile(filePath, 'utf8');
        
        // ルート定義を抽出（router.get, router.post など）
        const routeRegex = /router\.(get|post|put|delete|patch)\(['"`]([^'"`]+)['"`]/g;
        let match;
        
        while ((match = routeRegex.exec(content)) !== null) {
          const method = match[1].toUpperCase();
          const path = match[2];
          
          // 認証が必要かチェック
          const authRequired = content.includes('authenticateToken') || content.includes('auth.authenticateToken');
          
          routes.push({
            method,
            path: `/api${path}`,
            file: file.replace('.js', ''),
            requiresAuth: authRequired,
            description: extractRouteDescription(content, path) || `${method} ${path}`
          });
        }
      } catch (error) {
        console.warn(`警告: ${file} の解析をスキップしました:`, error.message);
      }
    }
    
    return routes.sort((a, b) => a.path.localeCompare(b.path));
    
  } catch (error) {
    console.error('❌ ルート解析に失敗しました:', error);
    return [];
  }
}

/**
 * ルートファイルから説明を抽出
 */
function extractRouteDescription(content, routePath) {
  // コメントから説明を抽出する簡単な実装
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes(routePath)) {
      // 前の行にコメントがあるかチェック
      if (i > 0) {
        const prevLine = lines[i - 1].trim();
        if (prevLine.startsWith('//') || prevLine.startsWith('*')) {
          return prevLine.replace(/^\/\/\s*|\*\s*/g, '').trim();
        }
      }
    }
  }
  return null;
}

/**
 * モデルファイルを解析
 */
async function analyzeModels() {
  try {
    const modelsDir = path.join(__dirname, '..', 'src', 'models');
    const files = await fs.readdir(modelsDir);
    const modelFiles = files.filter(file => file.endsWith('.js') && file !== 'index.js' && !file.includes('hooks'));
    
    const models = [];
    
    for (const file of modelFiles) {
      try {
        const modelName = file.replace('.js', '');
        models.push({
          name: modelName,
          file: file,
          description: `${modelName} データモデル`
        });
      } catch (error) {
        console.warn(`警告: ${file} の解析をスキップしました:`, error.message);
      }
    }
    
    return models;
    
  } catch (error) {
    console.error('❌ モデル解析に失敗しました:', error);
    return [];
  }
}

/**
 * package.jsonからスクリプト情報を抽出
 */
async function analyzePackageScripts() {
  try {
    const packagePath = path.join(__dirname, '..', 'package.json');
    const packageContent = await fs.readFile(packagePath, 'utf8');
    const packageJson = JSON.parse(packageContent);
    
    return packageJson.scripts || {};
    
  } catch (error) {
    console.error('❌ package.json解析に失敗しました:', error);
    return {};
  }
}

/**
 * 環境変数の分析
 */
async function analyzeEnvVars() {
  try {
    const envExamplePath = path.join(__dirname, '..', '.env.example');
    const content = await fs.readFile(envExamplePath, 'utf-8');
    const lines = content.split('\n');
    
    const envVars = [];
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.includes('=') && !trimmedLine.startsWith('#')) {
        const [key] = trimmedLine.split('=');
        envVars.push(key.trim());
      }
    }
    
    return envVars;
    
  } catch (error) {
    console.error('❌ 環境変数解析に失敗しました:', error);
    return [];
  }
}

/**
 * README.mdを自動更新
 */
async function updateReadme() {
  try {
    console.log('📝 README.md を更新中...');
    
    const data = {
      routes: await analyzeRoutes(),
      models: await analyzeModels(),
      envVars: await analyzeEnvVars(),
      scripts: await analyzePackageScripts(),
      projectName: 'MVC Template',
      description: 'Express.jsを使った原宿クリエイティブコミュニティプラットフォーム',
      generatedAt: new Date().toISOString()
    };
    
    const readmeTemplate = `# ${data.projectName}

${data.description}

## 🎯 プロジェクト概要

このプロジェクトは原宿クリエイティブコミュニティプラットフォームとして以下の機能を提供します：

- **クリエイティブコミュニティ**: デザイン会社、アパレルブランド、イベント、コラボレーション
- **デザイナー求人板**: 専門的な求人情報集約システム  
- **ユーザー管理**: JWT + OAuth を使用した認証システム

## 🚀 クイックスタート

### インストール

\`\`\`bash
# リポジトリをクローン
git clone https://github.com/chom58/claude-actions-mvc-test.git
cd claude-actions-mvc-test

# 依存関係をインストール
npm install

# 環境変数を設定
cp .env.example .env
# .envファイルを編集

# データベースをセットアップ
npm run seed

# 開発サーバーを起動
npm run dev
\`\`\`

## 📚 ドキュメント

- [詳細ドキュメント](./docs/)
- [API ドキュメント](./docs/api/)
- [セットアップガイド](./SETUP.md)

## 🏗️ プロジェクト構造

### データモデル (${data.models.length}個)

${data.models.map(model => `- **${model.name}**: ${model.description}`).join('\n')}

### API エンドポイント (${data.routes.length}個)

| メソッド | パス | 認証 | 説明 |
|----------|------|------|------|
${data.routes.slice(0, 10).map(route => 
  `| ${route.method} | \`${route.path}\` | ${route.requiresAuth ? '🔒' : '🔓'} | ${route.description} |`
).join('\n')}
${data.routes.length > 10 ? `\n*他 ${data.routes.length - 10} 個のエンドポイント...*` : ''}

詳細な API ドキュメントは [こちら](./docs/api/) をご覧ください。

## 🔧 利用可能なスクリプト

${Object.entries(data.scripts).map(([script, command]) => 
  `- \`npm run ${script}\`: ${command}`
).join('\n')}

## 🌍 環境変数

設定が必要な環境変数（${data.envVars.length}個）:

${data.envVars.slice(0, 8).map(envVar => `- \`${envVar}\``).join('\n')}
${data.envVars.length > 8 ? `\n*他 ${data.envVars.length - 8} 個...*` : ''}

詳細は [ENVIRONMENT.md](./docs/ENVIRONMENT.md) をご覧ください。

## 🧪 テスト

\`\`\`bash
# ユニットテスト
npm test

# E2Eテスト  
npm run test:e2e

# カバレッジ付きテスト
npm run test:coverage
\`\`\`

## 📖 ドキュメント生成

\`\`\`bash
# 全ドキュメント生成
npm run docs:generate

# ドキュメントサイト起動
npm run docs:serve
\`\`\`

## 🤝 コントリビューション

1. このリポジトリをフォーク
2. フィーチャーブランチを作成 (\`git checkout -b feature/AmazingFeature\`)
3. 変更をコミット (\`git commit -m 'Add some AmazingFeature'\`)
4. ブランチにプッシュ (\`git push origin feature/AmazingFeature\`)
5. プルリクエストを作成

## 📄 ライセンス

MIT ライセンスの下で配布されています。詳細は \`LICENSE\` ファイルをご覧ください。

---

*このREADMEは自動生成されています。最終更新: ${data.generatedAt}*
`;

    const readmePath = path.join(__dirname, '..', 'README.md');
    await fs.writeFile(readmePath, readmeTemplate, 'utf8');
    
    console.log('✅ README.md を更新しました');
    
  } catch (error) {
    console.error('❌ README.md更新に失敗しました:', error);
    throw error;
  }
}

/**
 * APIエンドポイント一覧を生成
 */
async function generateEndpointList() {
  try {
    console.log('📝 APIエンドポイント一覧を生成中...');
    
    const routes = await analyzeRoutes();
    
    // メソッド別にグループ化
    const groupedRoutes = {};
    routes.forEach(route => {
      const category = route.file;
      if (!groupedRoutes[category]) {
        groupedRoutes[category] = [];
      }
      groupedRoutes[category].push(route);
    });
    
    let markdown = `# API エンドポイント一覧

このドキュメントは自動生成されています。

## 概要

- **総エンドポイント数**: ${routes.length}
- **認証が必要**: ${routes.filter(r => r.requiresAuth).length}
- **認証不要**: ${routes.filter(r => !r.requiresAuth).length}

## エンドポイント一覧

`;

    // カテゴリ別にエンドポイントを表示
    for (const [category, categoryRoutes] of Object.entries(groupedRoutes)) {
      markdown += `### ${category}\n\n`;
      
      categoryRoutes.forEach(route => {
        const methodBadge = getMethodBadge(route.method);
        const authBadge = route.requiresAuth ? '🔒 **認証必要**' : '🔓 認証不要';
        
        markdown += `#### ${methodBadge} ${route.path}\n\n`;
        markdown += `- **説明**: ${route.description}\n`;
        markdown += `- **認証**: ${authBadge}\n`;
        markdown += `- **ファイル**: \`src/routes/${route.file}.js\`\n\n`;
      });
    }
    
    markdown += `
## 認証について

🔒 **認証が必要**なエンドポイントを呼び出すには、以下のいずれかが必要です：

1. **JWT Bearer Token**
   \`\`\`
   Authorization: Bearer <your-jwt-token>
   \`\`\`

2. **セッションクッキー**
   ログイン済みのセッションクッキーが有効

## エラーレスポンス

| ステータスコード | 説明 |
|-----------------|------|
| 200 | 成功 |
| 201 | 作成成功 |
| 400 | 不正なリクエスト |
| 401 | 認証エラー |
| 403 | 権限エラー |
| 404 | リソースが見つからない |
| 422 | バリデーションエラー |
| 429 | レート制限 |
| 500 | サーバーエラー |

---

*生成日時: ${new Date().toISOString()}*
`;

    const outputPath = path.join(__dirname, '..', 'docs', 'API_ENDPOINTS.md');
    await fs.writeFile(outputPath, markdown, 'utf8');
    
    console.log('✅ APIエンドポイント一覧を生成しました:', outputPath);
    
  } catch (error) {
    console.error('❌ APIエンドポイント一覧生成に失敗しました:', error);
    throw error;
  }
}

/**
 * HTTPメソッドのバッジを生成
 */
function getMethodBadge(method) {
  const badges = {
    'GET': '🟢 **GET**',
    'POST': '🔵 **POST**',
    'PUT': '🟡 **PUT**',
    'DELETE': '🔴 **DELETE**',
    'PATCH': '🟣 **PATCH**'
  };
  
  return badges[method] || `**${method}**`;
}

/**
 * プロジェクト構造ドキュメントを生成
 */
async function generateProjectStructure() {
  try {
    console.log('📝 プロジェクト構造ドキュメントを生成中...');
    
    const srcDir = path.join(__dirname, '..', 'src');
    const structure = await analyzeDirectoryStructure(srcDir, 'src');
    
    const markdown = `# プロジェクト構造

このドキュメントは自動生成されています。

## ディレクトリ構造

\`\`\`
${structure}
\`\`\`

## 主要ディレクトリの説明

### \`src/\`
アプリケーションのメインソースコード

- **\`app.js\`**: アプリケーションのエントリーポイント
- **\`config/\`**: 設定ファイル（データベース、Redis、セッション等）
- **\`controllers/\`**: ビジネスロジックを処理するコントローラー
- **\`middleware/\`**: Express ミドルウェア
- **\`models/\`**: Sequelize データモデル
- **\`routes/\`**: API ルーティング定義
- **\`services/\`**: 外部サービス統合
- **\`utils/\`**: ユーティリティ関数
- **\`websocket/\`**: WebSocket サーバー実装

### \`tests/\`
テストファイル

- **\`unit/\`**: ユニットテスト
- **\`integration/\`**: 統合テスト
- **\`e2e/\`**: End-to-End テスト

### \`docs/\`
プロジェクトドキュメント

- **\`api/\`**: API ドキュメント
- **\`diagrams/\`**: アーキテクチャ図
- **\`ENVIRONMENT.md\`**: 環境変数ドキュメント

### \`scripts/\`
ドキュメント生成スクリプト

### \`public/\`
静的ファイル（HTML、CSS、JavaScript、画像等）

---

*生成日時: ${new Date().toISOString()}*
`;

    const outputPath = path.join(__dirname, '..', 'docs', 'PROJECT_STRUCTURE.md');
    await fs.writeFile(outputPath, markdown, 'utf8');
    
    console.log('✅ プロジェクト構造ドキュメントを生成しました:', outputPath);
    
  } catch (error) {
    console.error('❌ プロジェクト構造ドキュメント生成に失敗しました:', error);
    throw error;
  }
}

/**
 * ディレクトリ構造を解析
 */
async function analyzeDirectoryStructure(dir, prefix = '', depth = 0, maxDepth = 3) {
  if (depth > maxDepth) return '';
  
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    let structure = '';
    
    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') {
        continue;
      }
      
      const indent = '  '.repeat(depth);
      
      if (entry.isDirectory()) {
        structure += `${indent}${entry.name}/\n`;
        const subDir = path.join(dir, entry.name);
        structure += await analyzeDirectoryStructure(subDir, `${prefix}/${entry.name}`, depth + 1, maxDepth);
      } else {
        structure += `${indent}${entry.name}\n`;
      }
    }
    
    return structure;
    
  } catch (error) {
    return `${prefix}: [アクセスエラー]\n`;
  }
}

/**
 * 全てのマークダウンドキュメントを生成
 */
async function generateAllDocs() {
  console.log('📚 マークダウンドキュメントの生成を開始します...\n');
  
  try {
    await updateReadme();
    console.log('');
    
    await generateEndpointList();
    console.log('');
    
    await generateProjectStructure();
    console.log('');
    
    console.log('✅ 全てのマークダウンドキュメントの生成が完了しました！');
    
  } catch (error) {
    console.error('❌ ドキュメント生成に失敗しました:', error);
    process.exit(1);
  }
}

// スクリプトが直接実行された場合
if (require.main === module) {
  generateAllDocs();
}

module.exports = {
  updateReadme,
  generateEndpointList,
  generateProjectStructure,
  generateAllDocs,
  analyzeRoutes,
  analyzeModels,
};