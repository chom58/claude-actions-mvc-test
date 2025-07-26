const fs = require('fs').promises;
const path = require('path');

/**
 * 環境変数ドキュメントを自動生成するスクリプト
 */

/**
 * 型を推論する
 * @param {string} value 値
 * @returns {string} 推論された型
 */
function inferType(value) {
  if (!value || value === '') return 'string';
  
  // Boolean値
  if (value.toLowerCase() === 'true' || value.toLowerCase() === 'false') {
    return 'boolean';
  }
  
  // 数値
  if (!isNaN(value) && !isNaN(parseFloat(value))) {
    return Number.isInteger(parseFloat(value)) ? 'number (integer)' : 'number (float)';
  }
  
  // URL
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return 'string (URL)';
  }
  
  // ポート番号
  if (/^\d{1,5}$/.test(value) && parseInt(value) <= 65535) {
    return 'number (port)';
  }
  
  // JWT シークレット風
  if (value.length > 32 && /^[A-Za-z0-9+/=]+$/.test(value)) {
    return 'string (secret)';
  }
  
  // メールアドレス
  if (/@/.test(value)) {
    return 'string (email)';
  }
  
  // パス風
  if (value.includes('/') || value.includes('\\')) {
    return 'string (path)';
  }
  
  return 'string';
}

/**
 * セキュリティレベルを判定
 * @param {string} key 環境変数名
 * @param {string} value 値
 * @returns {string} セキュリティレベル
 */
function getSecurityLevel(key, value) {
  const secretKeywords = ['password', 'secret', 'key', 'token', 'private'];
  const lowerKey = key.toLowerCase();
  
  if (secretKeywords.some(keyword => lowerKey.includes(keyword))) {
    return '🔴 機密';
  }
  
  if (lowerKey.includes('database') || lowerKey.includes('db')) {
    return '🟡 重要';
  }
  
  if (lowerKey.includes('url') || lowerKey.includes('host')) {
    return '🟡 重要';
  }
  
  return '🟢 一般';
}

/**
 * カテゴリを判定
 * @param {string} key 環境変数名
 * @returns {string} カテゴリ
 */
function getCategory(key) {
  const lowerKey = key.toLowerCase();
  
  if (lowerKey.includes('db') || lowerKey.includes('database')) {
    return 'データベース';
  }
  
  if (lowerKey.includes('jwt') || lowerKey.includes('auth') || lowerKey.includes('oauth')) {
    return '認証';
  }
  
  if (lowerKey.includes('redis') || lowerKey.includes('cache')) {
    return 'キャッシュ';
  }
  
  if (lowerKey.includes('email') || lowerKey.includes('mail')) {
    return 'メール';
  }
  
  if (lowerKey.includes('cors') || lowerKey.includes('frontend')) {
    return 'CORS/フロントエンド';
  }
  
  if (lowerKey.includes('session')) {
    return 'セッション';
  }
  
  if (lowerKey.includes('port') || lowerKey.includes('host')) {
    return 'サーバー設定';
  }
  
  if (lowerKey.includes('google') || lowerKey.includes('github')) {
    return 'OAuth';
  }
  
  return 'その他';
}

/**
 * .env.exampleファイルを解析
 */
async function parseEnvExample() {
  try {
    const envExamplePath = path.join(__dirname, '..', '.env.example');
    const content = await fs.readFile(envExamplePath, 'utf-8');
    const lines = content.split('\n');
    
    const envVars = [];
    let currentComment = '';
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine.startsWith('#')) {
        // コメント行
        currentComment = trimmedLine.substring(1).trim();
      } else if (trimmedLine.includes('=')) {
        // 環境変数定義
        const [key, ...valueParts] = trimmedLine.split('=');
        const value = valueParts.join('=').trim();
        
        envVars.push({
          name: key.trim(),
          value: value,
          description: currentComment || '説明なし',
          type: inferType(value),
          category: getCategory(key),
          securityLevel: getSecurityLevel(key, value),
          required: !value || value === '' ? 'はい' : 'いいえ（デフォルト値あり）'
        });
        
        currentComment = ''; // コメントをリセット
      } else if (trimmedLine === '') {
        // 空行でコメントをリセット
        currentComment = '';
      }
    }
    
    return envVars;
    
  } catch (error) {
    console.error('❌ .env.example ファイルの読み込みに失敗しました:', error);
    return [];
  }
}

/**
 * アプリケーションコードから使用されている環境変数を抽出
 */
async function extractUsedEnvVars() {
  try {
    const srcDir = path.join(__dirname, '..', 'src');
    const usedVars = new Set();
    
    async function scanDirectory(dir) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          await scanDirectory(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
          const content = await fs.readFile(fullPath, 'utf-8');
          
          // process.env.VARIABLE_NAME のパターンを検索
          const envVarRegex = /process\.env\.([A-Z_][A-Z0-9_]*)/g;
          let match;
          
          while ((match = envVarRegex.exec(content)) !== null) {
            usedVars.add(match[1]);
          }
        }
      }
    }
    
    await scanDirectory(srcDir);
    return Array.from(usedVars);
    
  } catch (error) {
    console.error('❌ 使用されている環境変数の抽出に失敗しました:', error);
    return [];
  }
}

/**
 * 環境変数ドキュメントを生成
 */
async function generateEnvDocumentation() {
  try {
    console.log('📋 環境変数ドキュメントの生成を開始します...');
    
    const envVars = await parseEnvExample();
    const usedVars = await extractUsedEnvVars();
    
    // カテゴリ別にグループ化
    const categories = {};
    envVars.forEach(envVar => {
      if (!categories[envVar.category]) {
        categories[envVar.category] = [];
      }
      categories[envVar.category].push(envVar);
    });
    
    let markdown = `# 環境変数設定

このドキュメントは自動生成されています。

## 概要

このアプリケーションでは以下の環境変数を使用してアプリケーションの動作を制御します。
\`.env\` ファイルを作成し、必要な値を設定してください。

## 設定方法

1. \`.env.example\` ファイルをコピーして \`.env\` ファイルを作成
   \`\`\`bash
   cp .env.example .env
   \`\`\`

2. 各環境変数に適切な値を設定

## 環境変数一覧

### 全体一覧表

| 変数名 | カテゴリ | 型 | 必須 | セキュリティ | 説明 |
|--------|----------|-----|------|-------------|------|
`;

    // 全体一覧表を生成
    envVars.forEach(envVar => {
      markdown += `| \`${envVar.name}\` | ${envVar.category} | ${envVar.type} | ${envVar.required} | ${envVar.securityLevel} | ${envVar.description} |\n`;
    });

    markdown += '\n';

    // カテゴリ別詳細
    for (const [category, vars] of Object.entries(categories)) {
      markdown += `### ${category}\n\n`;
      
      vars.forEach(envVar => {
        markdown += `#### \`${envVar.name}\`\n\n`;
        markdown += `- **説明**: ${envVar.description}\n`;
        markdown += `- **型**: ${envVar.type}\n`;
        markdown += `- **必須**: ${envVar.required}\n`;
        markdown += `- **セキュリティレベル**: ${envVar.securityLevel}\n`;
        
        if (envVar.value && envVar.value !== '') {
          if (envVar.securityLevel.includes('機密')) {
            markdown += `- **デフォルト値**: \`[機密情報のため非表示]\`\n`;
          } else {
            markdown += `- **デフォルト値**: \`${envVar.value}\`\n`;
          }
        }
        
        markdown += `- **コードで使用**: ${usedVars.includes(envVar.name) ? '✅ はい' : '❌ いいえ'}\n\n`;
      });
    }

    // 使用されているが.env.exampleにない変数をチェック
    const missingVars = usedVars.filter(usedVar => 
      !envVars.some(envVar => envVar.name === usedVar)
    );

    if (missingVars.length > 0) {
      markdown += `## ⚠️ 注意: .env.example に定義されていない変数

以下の環境変数がコードで使用されていますが、\`.env.example\` ファイルに定義されていません：

`;
      missingVars.forEach(varName => {
        markdown += `- \`${varName}\`\n`;
      });
      markdown += '\n';
    }

    // 未使用の変数をチェック
    const unusedVars = envVars.filter(envVar => 
      !usedVars.includes(envVar.name)
    );

    if (unusedVars.length > 0) {
      markdown += `## 📝 参考: 未使用の環境変数

以下の環境変数は \`.env.example\` に定義されていますが、現在のコードでは使用されていません：

`;
      unusedVars.forEach(envVar => {
        markdown += `- \`${envVar.name}\` - ${envVar.description}\n`;
      });
      markdown += '\n';
    }

    // セキュリティ注意事項
    markdown += `## 🔒 セキュリティ注意事項

### 機密情報の取り扱い

🔴 **機密** レベルの環境変数は以下の点に注意してください：

- 本番環境では強力でランダムな値を設定
- Gitにコミットしない
- ログに出力しない
- 定期的にローテーション

### 開発環境での注意点

- \`.env\` ファイルは \`.gitignore\` に含まれています
- 開発用の値も本番に近い設定を推奨
- テスト用のダミー値は安全なものを使用

## 環境別設定例

### 開発環境
\`\`\`bash
NODE_ENV=development
PORT=3000
DATABASE_URL=sqlite:./dev.db
\`\`\`

### 本番環境
\`\`\`bash
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
\`\`\`

---

*生成日時: ${new Date().toISOString()}*
*総環境変数数: ${envVars.length}*
*コードで使用中: ${usedVars.length}*
`;

    // ドキュメントを保存
    const docsDir = path.join(__dirname, '..', 'docs');
    await fs.mkdir(docsDir, { recursive: true });
    
    const outputPath = path.join(docsDir, 'ENVIRONMENT.md');
    await fs.writeFile(outputPath, markdown, 'utf8');
    
    console.log('✅ 環境変数ドキュメントを生成しました:', outputPath);
    console.log(`📊 統計: ${envVars.length}個の環境変数を文書化`);
    console.log(`🔍 コードで使用中: ${usedVars.length}個`);
    
    if (missingVars.length > 0) {
      console.log(`⚠️  .env.exampleに未定義: ${missingVars.length}個`);
    }
    
    if (unusedVars.length > 0) {
      console.log(`📝 未使用: ${unusedVars.length}個`);
    }
    
  } catch (error) {
    console.error('❌ 環境変数ドキュメントの生成に失敗しました:', error);
    process.exit(1);
  }
}

// スクリプトが直接実行された場合
if (require.main === module) {
  generateEnvDocumentation();
}

module.exports = {
  generateEnvDocumentation,
  parseEnvExample,
  extractUsedEnvVars,
};