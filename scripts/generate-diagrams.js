const fs = require('fs').promises;
const path = require('path');
const plantumlEncoder = require('plantuml-encoder');

/**
 * アーキテクチャ図とデータベース図を自動生成するスクリプト
 */

/**
 * モデルファイルを解析してクラス図用の情報を抽出
 */
async function analyzeModels() {
  const modelsDir = path.join(__dirname, '..', 'src', 'models');
  const files = await fs.readdir(modelsDir);
  const modelFiles = files.filter(file => file.endsWith('.js') && file !== 'index.js');
  
  const models = [];
  
  for (const file of modelFiles) {
    try {
      const filePath = path.join(modelsDir, file);
      const content = await fs.readFile(filePath, 'utf8');
      
      const modelName = file.replace('.js', '');
      const model = {
        name: modelName,
        attributes: extractAttributes(content),
        associations: extractAssociations(content)
      };
      
      models.push(model);
    } catch (error) {
      console.warn(`警告: ${file} の解析をスキップしました:`, error.message);
    }
  }
  
  return models;
}

/**
 * Sequelizeモデルファイルから属性を抽出
 */
function extractAttributes(content) {
  const attributes = [];
  
  // DataTypes の定義を検索
  const attributeRegex = /(\w+):\s*{[^}]*type:\s*DataTypes\.(\w+)/g;
  let match;
  
  while ((match = attributeRegex.exec(content)) !== null) {
    attributes.push({
      name: match[1],
      type: match[2]
    });
  }
  
  // より簡単な属性定義も検索
  const simpleAttributeRegex = /(\w+):\s*DataTypes\.(\w+)/g;
  while ((match = simpleAttributeRegex.exec(content)) !== null) {
    // 重複を避ける
    if (!attributes.find(attr => attr.name === match[1])) {
      attributes.push({
        name: match[1],
        type: match[2]
      });
    }
  }
  
  return attributes;
}

/**
 * Sequelizeモデルファイルからアソシエーションを抽出
 */
function extractAssociations(content) {
  const associations = [];
  
  // hasMany, belongsTo, hasOne, belongsToMany の検索
  const associationRegex = /(hasMany|belongsTo|hasOne|belongsToMany)\(['"`]?(\w+)['"`]?/g;
  let match;
  
  while ((match = associationRegex.exec(content)) !== null) {
    associations.push({
      type: getAssociationType(match[1]),
      target: match[2]
    });
  }
  
  return associations;
}

/**
 * Sequelizeのアソシエーションタイプを PlantUML 記法に変換
 */
function getAssociationType(sequelizeType) {
  switch (sequelizeType) {
    case 'hasMany':
      return '||--o{';
    case 'belongsTo':
      return '}o--||';
    case 'hasOne':
      return '||--||';
    case 'belongsToMany':
      return '}o--o{';
    default:
      return '--';
  }
}

/**
 * PlantUMLクラス図を生成
 */
async function generateClassDiagram() {
  try {
    const models = await analyzeModels();
    
    let uml = '@startuml\n';
    uml += '!theme plain\n';
    uml += 'title MVC Template - データモデル図\n\n';
    
    // クラス定義
    models.forEach(model => {
      uml += `class ${model.name} {\n`;
      model.attributes.forEach(attr => {
        uml += `  +${attr.name}: ${attr.type}\n`;
      });
      uml += '}\n\n';
    });
    
    // リレーションシップ
    models.forEach(model => {
      model.associations.forEach(assoc => {
        uml += `${model.name} ${assoc.type} ${assoc.target}\n`;
      });
    });
    
    uml += '@enduml';
    
    // ディレクトリ作成
    const diagramsDir = path.join(__dirname, '..', 'docs', 'diagrams');
    await fs.mkdir(diagramsDir, { recursive: true });
    
    // PlantUML ファイル保存
    const plantumlPath = path.join(diagramsDir, 'class-diagram.puml');
    await fs.writeFile(plantumlPath, uml, 'utf8');
    
    // PlantUML エンコード URL 生成
    const encoded = plantumlEncoder.encode(uml);
    const plantumlUrl = `http://www.plantuml.com/plantuml/png/${encoded}`;
    
    // Markdown ファイル生成
    const markdownContent = `# データモデル図

このドキュメントは自動生成されています。

## クラス図

![データモデル図](${plantumlUrl})

### PlantUML ソース

\`\`\`plantuml
${uml}
\`\`\`

## モデル一覧

${models.map(model => `### ${model.name}

**属性:**
${model.attributes.map(attr => `- ${attr.name}: ${attr.type}`).join('\n')}

**関連:**
${model.associations.map(assoc => `- ${assoc.type} ${assoc.target}`).join('\n') || '- なし'}
`).join('\n')}

---

*生成日時: ${new Date().toISOString()}*
`;
    
    const markdownPath = path.join(diagramsDir, 'class-diagram.md');
    await fs.writeFile(markdownPath, markdownContent, 'utf8');
    
    console.log('✅ クラス図を生成しました:', plantumlPath);
    console.log('✅ クラス図ドキュメントを生成しました:', markdownPath);
    console.log('📊 PlantUML URL:', plantumlUrl);
    
  } catch (error) {
    console.error('❌ クラス図の生成に失敗しました:', error);
    throw error;
  }
}

/**
 * Mermaid形式でデータベーススキーマ図（ER図）を生成
 */
async function generateERD() {
  try {
    const models = await analyzeModels();
    
    let mermaid = 'erDiagram\n';
    
    // エンティティ定義
    models.forEach(model => {
      mermaid += `  ${model.name} {\n`;
      model.attributes.forEach(attr => {
        mermaid += `    ${mapSequelizeToERType(attr.type)} ${attr.name}\n`;
      });
      mermaid += '  }\n\n';
    });
    
    // リレーションシップ（簡略化）
    models.forEach(model => {
      model.associations.forEach(assoc => {
        // Mermaid ER図の記法に変換
        const relation = getMermaidRelation(assoc.type);
        mermaid += `  ${model.name} ${relation} ${assoc.target} : ""\n`;
      });
    });
    
    // ディレクトリ作成
    const diagramsDir = path.join(__dirname, '..', 'docs', 'diagrams');
    await fs.mkdir(diagramsDir, { recursive: true });
    
    // Mermaid ファイル保存
    const mermaidPath = path.join(diagramsDir, 'database.mmd');
    await fs.writeFile(mermaidPath, mermaid, 'utf8');
    
    // Markdown ファイル生成
    const markdownContent = `# データベース ER 図

このドキュメントは自動生成されています。

## ER図

\`\`\`mermaid
${mermaid}
\`\`\`

## テーブル詳細

${models.map(model => `### ${model.name}

| カラム名 | データ型 | 説明 |
|----------|----------|------|
${model.attributes.map(attr => `| ${attr.name} | ${attr.type} | - |`).join('\n')}
`).join('\n')}

---

*生成日時: ${new Date().toISOString()}*
`;
    
    const markdownPath = path.join(diagramsDir, 'database.md');
    await fs.writeFile(markdownPath, markdownContent, 'utf8');
    
    console.log('✅ ER図を生成しました:', mermaidPath);
    console.log('✅ ER図ドキュメントを生成しました:', markdownPath);
    
  } catch (error) {
    console.error('❌ ER図の生成に失敗しました:', error);
    throw error;
  }
}

/**
 * SequelizeのDataTypeをER図用の型に変換
 */
function mapSequelizeToERType(sequelizeType) {
  const typeMap = {
    'STRING': 'varchar',
    'TEXT': 'text',
    'INTEGER': 'int',
    'BIGINT': 'bigint',
    'FLOAT': 'float',
    'DOUBLE': 'double',
    'DECIMAL': 'decimal',
    'BOOLEAN': 'boolean',
    'DATE': 'datetime',
    'DATEONLY': 'date',
    'TIME': 'time',
    'UUID': 'uuid',
    'JSON': 'json',
    'JSONB': 'jsonb'
  };
  
  return typeMap[sequelizeType] || sequelizeType.toLowerCase();
}

/**
 * PlantUMLのアソシエーションタイプをMermaid記法に変換
 */
function getMermaidRelation(plantumlType) {
  switch (plantumlType) {
    case '||--o{':
      return '||--o{';
    case '}o--||':
      return '}o--||';
    case '||--||':
      return '||--||';
    case '}o--o{':
      return '}o--o{';
    default:
      return '||--||';
  }
}

/**
 * アーキテクチャ図を生成
 */
async function generateArchitectureDiagram() {
  try {
    let uml = '@startuml\n';
    uml += '!theme plain\n';
    uml += 'title MVC Template - システムアーキテクチャ図\n\n';
    
    // レイヤー定義
    uml += 'package "Presentation Layer" {\n';
    uml += '  [Frontend (HTML/CSS/JS)]\n';
    uml += '  [Public Assets]\n';
    uml += '}\n\n';
    
    uml += 'package "Application Layer" {\n';
    uml += '  [Express.js Server]\n';
    uml += '  [Routes]\n';
    uml += '  [Middleware]\n';
    uml += '}\n\n';
    
    uml += 'package "Business Logic Layer" {\n';
    uml += '  [Controllers]\n';
    uml += '  [Services]\n';
    uml += '  [Utilities]\n';
    uml += '}\n\n';
    
    uml += 'package "Data Access Layer" {\n';
    uml += '  [Models (Sequelize)]\n';
    uml += '  [Database]\n';
    uml += '}\n\n';
    
    uml += 'package "External Services" {\n';
    uml += '  [Redis Cache]\n';
    uml += '  [File Storage]\n';
    uml += '  [Email Service]\n';
    uml += '  [OAuth Providers]\n';
    uml += '}\n\n';
    
    // 関連定義
    uml += '[Frontend (HTML/CSS/JS)] --> [Express.js Server]\n';
    uml += '[Express.js Server] --> [Routes]\n';
    uml += '[Routes] --> [Middleware]\n';
    uml += '[Routes] --> [Controllers]\n';
    uml += '[Controllers] --> [Services]\n';
    uml += '[Services] --> [Models (Sequelize)]\n';
    uml += '[Models (Sequelize)] --> [Database]\n';
    uml += '[Services] --> [Redis Cache]\n';
    uml += '[Services] --> [File Storage]\n';
    uml += '[Services] --> [Email Service]\n';
    uml += '[Services] --> [OAuth Providers]\n';
    
    uml += '@enduml';
    
    // ディレクトリ作成
    const diagramsDir = path.join(__dirname, '..', 'docs', 'diagrams');
    await fs.mkdir(diagramsDir, { recursive: true });
    
    // PlantUML ファイル保存
    const plantumlPath = path.join(diagramsDir, 'architecture.puml');
    await fs.writeFile(plantumlPath, uml, 'utf8');
    
    // PlantUML エンコード URL 生成
    const encoded = plantumlEncoder.encode(uml);
    const plantumlUrl = `http://www.plantuml.com/plantuml/png/${encoded}`;
    
    // Markdown ファイル生成
    const markdownContent = `# システムアーキテクチャ図

このドキュメントは自動生成されています。

## アーキテクチャ概要

![システムアーキテクチャ図](${plantumlUrl})

### レイヤー構成

1. **プレゼンテーション層**
   - フロントエンド (HTML/CSS/JavaScript)
   - 静的アセット

2. **アプリケーション層**
   - Express.js サーバー
   - ルーティング
   - ミドルウェア

3. **ビジネスロジック層**
   - コントローラー
   - サービス
   - ユーティリティ

4. **データアクセス層**
   - モデル (Sequelize ORM)
   - データベース

5. **外部サービス**
   - Redis キャッシュ
   - ファイルストレージ
   - メールサービス
   - OAuth プロバイダー

### PlantUML ソース

\`\`\`plantuml
${uml}
\`\`\`

---

*生成日時: ${new Date().toISOString()}*
`;
    
    const markdownPath = path.join(diagramsDir, 'architecture.md');
    await fs.writeFile(markdownPath, markdownContent, 'utf8');
    
    console.log('✅ アーキテクチャ図を生成しました:', plantumlPath);
    console.log('✅ アーキテクチャ図ドキュメントを生成しました:', markdownPath);
    console.log('📊 PlantUML URL:', plantumlUrl);
    
  } catch (error) {
    console.error('❌ アーキテクチャ図の生成に失敗しました:', error);
    throw error;
  }
}

/**
 * 全ての図を生成するメイン関数
 */
async function generateAllDiagrams() {
  console.log('🎨 図表の生成を開始します...\n');
  
  try {
    await generateClassDiagram();
    console.log('');
    
    await generateERD();
    console.log('');
    
    await generateArchitectureDiagram();
    console.log('');
    
    console.log('✅ 全ての図表の生成が完了しました！');
    
  } catch (error) {
    console.error('❌ 図表の生成に失敗しました:', error);
    process.exit(1);
  }
}

// スクリプトが直接実行された場合
if (require.main === module) {
  generateAllDiagrams();
}

module.exports = {
  generateClassDiagram,
  generateERD,
  generateArchitectureDiagram,
  generateAllDiagrams,
};