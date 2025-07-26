const fs = require('fs').promises;
const path = require('path');
const { specs } = require('../src/config/swagger');

/**
 * Swagger仕様をJSONファイルとして生成するスクリプト
 */
async function generateSwaggerSpec() {
  try {
    // docsディレクトリが存在しない場合は作成
    const docsDir = path.join(__dirname, '..', 'docs');
    try {
      await fs.access(docsDir);
    } catch (error) {
      await fs.mkdir(docsDir, { recursive: true });
    }

    // api ディレクトリを作成
    const apiDir = path.join(docsDir, 'api');
    try {
      await fs.access(apiDir);
    } catch (error) {
      await fs.mkdir(apiDir, { recursive: true });
    }

    // Swagger仕様をJSONファイルに書き込み
    const outputPath = path.join(apiDir, 'swagger.json');
    await fs.writeFile(outputPath, JSON.stringify(specs, null, 2), 'utf8');

    console.log('✅ Swagger仕様を生成しました:', outputPath);

    // OpenAPI YAML形式でも出力
    const yaml = require('js-yaml');
    const yamlOutput = path.join(apiDir, 'swagger.yaml');
    const yamlContent = yaml.dump(specs, {
      indent: 2,
      noRefs: true,
      sortKeys: true,
    });
    await fs.writeFile(yamlOutput, yamlContent, 'utf8');

    console.log('✅ OpenAPI YAML仕様を生成しました:', yamlOutput);

    // API一覧のマークダウンファイルを生成
    await generateApiDocumentation(specs);

  } catch (error) {
    console.error('❌ Swagger仕様の生成に失敗しました:', error);
    process.exit(1);
  }
}

/**
 * API一覧のマークダウンドキュメントを生成
 * @param {Object} specs Swagger仕様オブジェクト
 */
async function generateApiDocumentation(specs) {
  try {
    const docsDir = path.join(__dirname, '..', 'docs', 'api');
    
    let markdown = `# API リファレンス

このドキュメントは自動生成されています。最新の情報については \`npm run docs:api\` を実行して更新してください。

## 概要

- **バージョン**: ${specs.info.version}
- **タイトル**: ${specs.info.title}
- **説明**: ${specs.info.description}

## サーバー

`;

    // サーバー情報を追加
    specs.servers.forEach(server => {
      markdown += `- **${server.description}**: \`${server.url}\`\n`;
    });

    markdown += `
## 認証

このAPIは以下の認証方式をサポートしています：

- **Bearer Token**: JWT トークンを使用した認証
- **Session Cookie**: セッションクッキーを使用した認証

## エンドポイント一覧

`;

    // パスごとにエンドポイントを生成
    if (specs.paths) {
      Object.entries(specs.paths).forEach(([path, methods]) => {
        markdown += `### ${path}\n\n`;
        
        Object.entries(methods).forEach(([method, operation]) => {
          const upperMethod = method.toUpperCase();
          markdown += `#### ${upperMethod} ${path}\n\n`;
          
          if (operation.summary) {
            markdown += `**概要**: ${operation.summary}\n\n`;
          }
          
          if (operation.description) {
            markdown += `**説明**: ${operation.description}\n\n`;
          }
          
          if (operation.tags) {
            markdown += `**タグ**: ${operation.tags.join(', ')}\n\n`;
          }
          
          if (operation.security) {
            markdown += `**認証**: 必要\n\n`;
          }
          
          // パラメータ情報
          if (operation.parameters) {
            markdown += `**パラメータ**:\n\n`;
            operation.parameters.forEach(param => {
              markdown += `- \`${param.name}\` (${param.in}): ${param.description || 'No description'}\n`;
            });
            markdown += '\n';
          }
          
          // レスポンス情報
          if (operation.responses) {
            markdown += `**レスポンス**:\n\n`;
            Object.entries(operation.responses).forEach(([code, response]) => {
              markdown += `- **${code}**: ${response.description || 'No description'}\n`;
            });
            markdown += '\n';
          }
          
          markdown += '---\n\n';
        });
      });
    }

    // エラーレスポンス一覧
    markdown += `
## エラーレスポンス

APIは以下の標準的なHTTPステータスコードを返します：

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

## サンプルコード

### JavaScript (fetch)

\`\`\`javascript
// 認証付きリクエストの例
const response = await fetch('/api/users', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer your-jwt-token',
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
\`\`\`

### cURL

\`\`\`bash
# 認証付きリクエストの例
curl -H "Authorization: Bearer your-jwt-token" \\
     -H "Content-Type: application/json" \\
     http://localhost:3000/api/users
\`\`\`

---

*このドキュメントは自動生成されています。更新日時: ${new Date().toISOString()}*
`;

    const outputPath = path.join(docsDir, 'README.md');
    await fs.writeFile(outputPath, markdown, 'utf8');
    
    console.log('✅ API ドキュメント (Markdown) を生成しました:', outputPath);

  } catch (error) {
    console.error('❌ API ドキュメント生成に失敗しました:', error);
    throw error;
  }
}

// スクリプトが直接実行された場合
if (require.main === module) {
  generateSwaggerSpec();
}

module.exports = {
  generateSwaggerSpec,
  generateApiDocumentation,
};