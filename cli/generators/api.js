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

/**
 * RESTful APIを生成
 */
function generateApi(name, options = {}) {
  try {
    const projectRoot = getProjectRoot();
    const modelName = toPascalCase(name);
    const resourceName = toCamelCase(modelName);
    const resourcePath = pluralize(toSnakeCase(name));
    const version = options.version || 'v1';
    
    logInfo(`RESTful API "${resourcePath}" (${version}) を生成中...`);
    
    // モデル、コントローラー、ルートを生成
    logInfo('モデルを生成中...');
    generateModel(name, [], { migration: true });
    
    logInfo('コントローラーを生成中...');
    generateController(name, { actions: 'index,show,create,update,destroy' });
    
    logInfo('ルートを生成中...');
    generateRoutes(name, { rest: true });
    
    // API ドキュメントを生成
    const apiDocContent = generateApiDocumentation(modelName, resourceName, resourcePath, version);
    const apiDocPath = path.join(projectRoot, 'docs', 'api', `${resourcePath}.md`);
    
    if (writeFile(apiDocPath, apiDocContent)) {
      logSuccess(`API ドキュメントを生成しました: ${apiDocPath}`);
    }
    
    // Postman コレクションを生成
    const postmanCollection = generatePostmanCollection(modelName, resourceName, resourcePath, version);
    const postmanPath = path.join(projectRoot, 'docs', 'postman', `${resourcePath}.json`);
    
    if (writeFile(postmanPath, JSON.stringify(postmanCollection, null, 2))) {
      logSuccess(`Postman コレクションを生成しました: ${postmanPath}`);
    }
    
    logSuccess(`RESTful API "${resourcePath}" の生成が完了しました！`);
    
    // 使用方法の表示
    console.log('\n📝 生成されたAPI エンドポイント:');
    console.log(`   GET    /api/${version}/${resourcePath}     - 一覧取得`);
    console.log(`   GET    /api/${version}/${resourcePath}/:id - 詳細取得`);
    console.log(`   POST   /api/${version}/${resourcePath}     - 新規作成`);
    console.log(`   PUT    /api/${version}/${resourcePath}/:id - 更新`);
    console.log(`   DELETE /api/${version}/${resourcePath}/:id - 削除`);
    
    console.log('\n📝 次のステップ:');
    console.log(`   1. src/routes/index.js に以下を追加:`);
    console.log(`      app.use('/api/${version}/${resourcePath}', require('./${resourcePath}Routes'));`);
    console.log(`   2. バリデーションルールをルートファイルに追加`);
    console.log(`   3. 認証が必要な場合は authMiddleware を追加`);
    console.log(`   4. APIをテストして動作確認`);
    
  } catch (error) {
    logError(`API生成中にエラーが発生しました: ${error.message}`);
  }
}

/**
 * API ドキュメントを生成
 */
function generateApiDocumentation(modelName, resourceName, resourcePath, version) {
  return `# ${modelName} API Documentation

## 概要
${modelName}リソースのRESTful APIドキュメントです。

## Base URL
\`\`\`
/api/${version}/${resourcePath}
\`\`\`

## エンドポイント

### 1. ${modelName}一覧取得
**GET** \`/${resourcePath}\`

#### パラメータ
| 名前 | 型 | 必須 | 説明 |
|------|----|----|------|
| page | integer | No | ページ番号 (デフォルト: 1) |
| limit | integer | No | 取得件数 (デフォルト: 10) |

#### レスポンス例
\`\`\`json
{
  "${resourceName}s": [
    {
      "id": 1,
      "name": "サンプル名",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
\`\`\`

### 2. ${modelName}詳細取得
**GET** \`/${resourcePath}/:id\`

#### パラメータ
| 名前 | 型 | 必須 | 説明 |
|------|----|----|------|
| id | integer | Yes | ${modelName}ID |

#### レスポンス例
\`\`\`json
{
  "id": 1,
  "name": "サンプル名",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
\`\`\`

### 3. ${modelName}新規作成
**POST** \`/${resourcePath}\`

#### リクエストボディ
\`\`\`json
{
  "name": "新しい${modelName}"
}
\`\`\`

#### レスポンス例
\`\`\`json
{
  "message": "${modelName}を作成しました",
  "${resourceName}": {
    "id": 2,
    "name": "新しい${modelName}",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
\`\`\`

### 4. ${modelName}更新
**PUT** \`/${resourcePath}/:id\`

#### パラメータ
| 名前 | 型 | 必須 | 説明 |
|------|----|----|------|
| id | integer | Yes | ${modelName}ID |

#### リクエストボディ
\`\`\`json
{
  "name": "更新された${modelName}"
}
\`\`\`

#### レスポンス例
\`\`\`json
{
  "message": "${modelName}を更新しました",
  "${resourceName}": {
    "id": 1,
    "name": "更新された${modelName}",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:10:00.000Z"
  }
}
\`\`\`

### 5. ${modelName}削除
**DELETE** \`/${resourcePath}/:id\`

#### パラメータ
| 名前 | 型 | 必須 | 説明 |
|------|----|----|------|
| id | integer | Yes | ${modelName}ID |

#### レスポンス例
\`\`\`json
{
  "message": "${modelName}を削除しました"
}
\`\`\`

## エラーレスポンス

### バリデーションエラー (400)
\`\`\`json
{
  "errors": [
    {
      "field": "name",
      "message": "名前は必須です"
    }
  ]
}
\`\`\`

### リソースが見つからない (404)
\`\`\`json
{
  "error": "${modelName}が見つかりません"
}
\`\`\`

### サーバーエラー (500)
\`\`\`json
{
  "error": "サーバー内部エラーが発生しました"
}
\`\`\`

## 認証
※必要に応じて認証情報を追加してください

## レート制限
※必要に応じてレート制限情報を追加してください
`;
}

/**
 * Postman コレクションを生成
 */
function generatePostmanCollection(modelName, resourceName, resourcePath, version) {
  return {
    "info": {
      "name": `${modelName} API`,
      "description": `${modelName}リソースのRESTful API`,
      "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
    },
    "variable": [
      {
        "key": "baseUrl",
        "value": "http://localhost:3000",
        "type": "string"
      }
    ],
    "item": [
      {
        "name": `Get All ${modelName}s`,
        "request": {
          "method": "GET",
          "header": [],
          "url": {
            "raw": "{{baseUrl}}/api/${version}/${resourcePath}?page=1&limit=10",
            "host": ["{{baseUrl}}"],
            "path": ["api", version, resourcePath],
            "query": [
              {
                "key": "page",
                "value": "1"
              },
              {
                "key": "limit",
                "value": "10"
              }
            ]
          }
        }
      },
      {
        "name": `Get ${modelName} by ID`,
        "request": {
          "method": "GET",
          "header": [],
          "url": {
            "raw": "{{baseUrl}}/api/${version}/${resourcePath}/1",
            "host": ["{{baseUrl}}"],
            "path": ["api", version, resourcePath, "1"]
          }
        }
      },
      {
        "name": `Create ${modelName}`,
        "request": {
          "method": "POST",
          "header": [
            {
              "key": "Content-Type",
              "value": "application/json"
            }
          ],
          "body": {
            "mode": "raw",
            "raw": JSON.stringify({
              "name": `新しい${modelName}`
            }, null, 2)
          },
          "url": {
            "raw": "{{baseUrl}}/api/${version}/${resourcePath}",
            "host": ["{{baseUrl}}"],
            "path": ["api", version, resourcePath]
          }
        }
      },
      {
        "name": `Update ${modelName}`,
        "request": {
          "method": "PUT",
          "header": [
            {
              "key": "Content-Type",
              "value": "application/json"
            }
          ],
          "body": {
            "mode": "raw",
            "raw": JSON.stringify({
              "name": `更新された${modelName}`
            }, null, 2)
          },
          "url": {
            "raw": "{{baseUrl}}/api/${version}/${resourcePath}/1",
            "host": ["{{baseUrl}}"],
            "path": ["api", version, resourcePath, "1"]
          }
        }
      },
      {
        "name": `Delete ${modelName}`,
        "request": {
          "method": "DELETE",
          "header": [],
          "url": {
            "raw": "{{baseUrl}}/api/${version}/${resourcePath}/1",
            "host": ["{{baseUrl}}"],
            "path": ["api", version, resourcePath, "1"]
          }
        }
      }
    ]
  };
}

module.exports = {
  generateApi
};