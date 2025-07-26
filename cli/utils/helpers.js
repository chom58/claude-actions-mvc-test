const fs = require('fs');
const path = require('path');

/**
 * 文字列をPascalCaseに変換
 */
function toPascalCase(str) {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => word.toUpperCase())
    .replace(/\s+/g, '');
}

/**
 * 文字列をcamelCaseに変換
 */
function toCamelCase(str) {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/**
 * 文字列をkebab-caseに変換
 */
function toKebabCase(str) {
  return str
    .replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2')
    .toLowerCase();
}

/**
 * 文字列をsnake_caseに変換
 */
function toSnakeCase(str) {
  return str
    .replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1_$2')
    .toLowerCase();
}

/**
 * 単数形を複数形に変換（簡易版）
 */
function pluralize(str) {
  if (str.endsWith('y')) {
    return str.slice(0, -1) + 'ies';
  }
  if (str.endsWith('s') || str.endsWith('sh') || str.endsWith('ch') || str.endsWith('x') || str.endsWith('z')) {
    return str + 'es';
  }
  return str + 's';
}

/**
 * 複数形を単数形に変換（簡易版）
 */
function singularize(str) {
  if (str.endsWith('ies')) {
    return str.slice(0, -3) + 'y';
  }
  if (str.endsWith('es') && str.length > 3) {
    const withoutEs = str.slice(0, -2);
    if (withoutEs.endsWith('s') || withoutEs.endsWith('sh') || withoutEs.endsWith('ch') || withoutEs.endsWith('x') || withoutEs.endsWith('z')) {
      return withoutEs;
    }
  }
  if (str.endsWith('s') && str.length > 1) {
    return str.slice(0, -1);
  }
  return str;
}

/**
 * 属性文字列をパース（例: "name:string" → {name: "name", type: "string"}）
 */
function parseAttributes(attributes) {
  return attributes.map(attr => {
    const [name, type = 'string', ...options] = attr.split(':');
    return {
      name: toCamelCase(name),
      type: type.toLowerCase(),
      options: options,
      reference: type.toLowerCase() === 'reference'
    };
  });
}

/**
 * Sequelizeのデータタイプに変換
 */
function getSequelizeType(type) {
  const typeMap = {
    string: 'DataTypes.STRING',
    text: 'DataTypes.TEXT',
    integer: 'DataTypes.INTEGER',
    int: 'DataTypes.INTEGER',
    float: 'DataTypes.FLOAT',
    decimal: 'DataTypes.DECIMAL',
    boolean: 'DataTypes.BOOLEAN',
    bool: 'DataTypes.BOOLEAN',
    date: 'DataTypes.DATE',
    datetime: 'DataTypes.DATE',
    timestamp: 'DataTypes.DATE',
    json: 'DataTypes.JSON',
    reference: 'DataTypes.INTEGER'
  };
  
  return typeMap[type] || 'DataTypes.STRING';
}

/**
 * バリデーションルールを生成
 */
function generateValidation(attribute) {
  const validations = [];
  
  if (attribute.type === 'string') {
    if (attribute.name.includes('email')) {
      validations.push('isEmail: true');
    }
    if (attribute.name.includes('url') || attribute.name.includes('website')) {
      validations.push('isUrl: true');
    }
  }
  
  if (attribute.options.includes('required')) {
    // allowNull: false は外側で設定
  }
  
  if (attribute.options.includes('unique')) {
    // unique: true は外側で設定
  }
  
  return validations.length > 0 ? `validate: {\n      ${validations.join(',\n      ')}\n    }` : '';
}

/**
 * ディレクトリが存在しない場合は作成
 */
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`📁 ディレクトリを作成しました: ${dirPath}`);
  }
}

/**
 * ファイルが存在するかチェック
 */
function fileExists(filePath) {
  return fs.existsSync(filePath);
}

/**
 * テンプレートファイルを読み込み、変数を置換
 */
function processTemplate(templatePath, variables) {
  if (!fs.existsSync(templatePath)) {
    throw new Error(`テンプレートファイルが見つかりません: ${templatePath}`);
  }
  
  let content = fs.readFileSync(templatePath, 'utf8');
  
  // 変数置換 ({{variable}} 形式)
  Object.keys(variables).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    content = content.replace(regex, variables[key]);
  });
  
  return content;
}

/**
 * ファイルに内容を書き込み（上書き確認付き）
 */
function writeFile(filePath, content, force = false) {
  if (fs.existsSync(filePath) && !force) {
    console.log(`⚠️  ファイルが既に存在します: ${filePath}`);
    console.log('   --force オプションを使用するか、既存ファイルを削除してから再実行してください。');
    return false;
  }
  
  ensureDirectoryExists(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✅ ファイルを生成しました: ${filePath}`);
  return true;
}

/**
 * プロジェクトルートディレクトリを取得
 */
function getProjectRoot() {
  let currentDir = process.cwd();
  
  while (currentDir !== path.dirname(currentDir)) {
    if (fs.existsSync(path.join(currentDir, 'package.json'))) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }
  
  throw new Error('package.jsonが見つかりません。プロジェクトルートから実行してください。');
}

/**
 * 現在の日時をフォーマット（マイグレーション用）
 */
function getTimestamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

/**
 * 成功メッセージを表示
 */
function logSuccess(message) {
  console.log(`✅ ${message}`);
}

/**
 * エラーメッセージを表示
 */
function logError(message) {
  console.error(`❌ ${message}`);
}

/**
 * 警告メッセージを表示
 */
function logWarning(message) {
  console.warn(`⚠️  ${message}`);
}

/**
 * 情報メッセージを表示
 */
function logInfo(message) {
  console.log(`ℹ️  ${message}`);
}

module.exports = {
  toPascalCase,
  toCamelCase,
  toKebabCase,
  toSnakeCase,
  pluralize,
  singularize,
  parseAttributes,
  getSequelizeType,
  generateValidation,
  ensureDirectoryExists,
  fileExists,
  processTemplate,
  writeFile,
  getProjectRoot,
  getTimestamp,
  logSuccess,
  logError,
  logWarning,
  logInfo
};