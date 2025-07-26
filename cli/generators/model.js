const path = require('path');
const fs = require('fs');
const {
  toPascalCase,
  toCamelCase,
  toSnakeCase,
  pluralize,
  parseAttributes,
  getSequelizeType,
  generateValidation,
  ensureDirectoryExists,
  writeFile,
  getProjectRoot,
  getTimestamp,
  logSuccess,
  logError,
  logInfo
} = require('../utils/helpers');

/**
 * Sequelizeモデルを生成
 */
function generateModel(name, attributes = [], options = {}) {
  try {
    const projectRoot = getProjectRoot();
    const modelName = toPascalCase(name);
    const tableName = pluralize(toSnakeCase(name));
    const parsedAttributes = parseAttributes(attributes);
    
    logInfo(`モデル "${modelName}" を生成中...`);
    
    // モデルファイルの生成
    const modelContent = generateModelContent(modelName, parsedAttributes);
    const modelPath = path.join(projectRoot, 'src', 'models', `${modelName}.js`);
    
    if (writeFile(modelPath, modelContent)) {
      logSuccess(`モデルファイルを生成しました: ${modelPath}`);
    }
    
    // マイグレーションファイルの生成
    if (options.migration !== false) {
      const migrationContent = generateMigrationContent(tableName, parsedAttributes);
      const timestamp = getTimestamp();
      const migrationPath = path.join(projectRoot, 'migrations', `${timestamp}-create-${toSnakeCase(name)}.js`);
      
      ensureDirectoryExists(path.dirname(migrationPath));
      
      if (writeFile(migrationPath, migrationContent)) {
        logSuccess(`マイグレーションファイルを生成しました: ${migrationPath}`);
      }
    }
    
    logSuccess(`モデル "${modelName}" の生成が完了しました！`);
    
    // 使用方法の表示
    console.log('\n📝 使用方法:');
    console.log(`   const { ${modelName} } = require('./models');`);
    console.log(`   const ${toCamelCase(name)} = await ${modelName}.create({...});`);
    
  } catch (error) {
    logError(`モデル生成中にエラーが発生しました: ${error.message}`);
  }
}

/**
 * モデルファイルの内容を生成
 */
function generateModelContent(modelName, attributes) {
  const attributesCode = attributes.map(attr => {
    const validation = generateValidation(attr);
    
    let code = `  ${attr.name}: {\n`;
    code += `    type: ${getSequelizeType(attr.type)},\n`;
    
    // 必須フィールドかどうか
    if (attr.options.includes('required')) {
      code += `    allowNull: false,\n`;
    }
    
    // ユニーク制約
    if (attr.options.includes('unique')) {
      code += `    unique: true,\n`;
    }
    
    // バリデーション
    if (validation) {
      code += `    ${validation},\n`;
    }
    
    // 外部キー
    if (attr.reference) {
      code += `    references: {\n`;
      code += `      model: '${pluralize(toPascalCase(attr.name.replace(/Id$/, '')))}',\n`;
      code += `      key: 'id'\n`;
      code += `    },\n`;
    }
    
    code += `  }`;
    return code;
  }).join(',\n');
  
  // アソシエーションの生成
  const associations = generateAssociations(modelName, attributes);
  
  // インスタンスメソッドの生成
  const methods = generateInstanceMethods(modelName, attributes);
  
  // テンプレートの読み込みと置換
  const templatePath = path.join(__dirname, '../templates/model/sequelize.js.ejs');
  let content = fs.readFileSync(templatePath, 'utf8');
  
  content = content.replace(/{{modelName}}/g, modelName);
  content = content.replace(/{{attributes}}/g, attributesCode);
  content = content.replace(/{{associations}}/g, associations);
  content = content.replace(/{{methods}}/g, methods);
  
  return content;
}

/**
 * マイグレーションファイルの内容を生成
 */
function generateMigrationContent(tableName, attributes) {
  const migrationAttributes = attributes.map(attr => {
    let code = `      ${attr.name}: {\n`;
    code += `        type: Sequelize.${getSequelizeType(attr.type).replace('DataTypes.', '')},\n`;
    
    if (attr.options.includes('required')) {
      code += `        allowNull: false,\n`;
    }
    
    if (attr.options.includes('unique')) {
      code += `        unique: true,\n`;
    }
    
    if (attr.reference) {
      const referencedTable = pluralize(toSnakeCase(attr.name.replace(/Id$/, '')));
      code += `        references: {\n`;
      code += `          model: '${referencedTable}',\n`;
      code += `          key: 'id'\n`;
      code += `        },\n`;
    }
    
    code += `      }`;
    return code;
  }).join(',\n');
  
  // インデックスの生成
  const indexes = generateIndexes(tableName, attributes);
  
  const templatePath = path.join(__dirname, '../templates/migration/create-table.js.ejs');
  let content = fs.readFileSync(templatePath, 'utf8');
  
  content = content.replace(/{{tableName}}/g, tableName);
  content = content.replace(/{{migrationAttributes}}/g, migrationAttributes);
  content = content.replace(/{{indexes}}/g, indexes);
  
  return content;
}

/**
 * アソシエーションの生成
 */
function generateAssociations(modelName, attributes) {
  const associations = [];
  
  attributes.forEach(attr => {
    if (attr.reference) {
      const referencedModel = toPascalCase(attr.name.replace(/Id$/, ''));
      associations.push(`// ${modelName}.belongsTo(${referencedModel}, { foreignKey: '${attr.name}' });`);
    }
  });
  
  return associations.length > 0 ? associations.join('\n') : '// アソシエーションなし';
}

/**
 * インスタンスメソッドの生成
 */
function generateInstanceMethods(modelName, attributes) {
  const methods = [];
  
  // パスワードフィールドがある場合
  const hasPassword = attributes.some(attr => attr.name.toLowerCase().includes('password'));
  if (hasPassword) {
    methods.push(`
// パスワード比較メソッド
${modelName}.prototype.comparePassword = async function(candidatePassword) {
  const bcrypt = require('bcryptjs');
  return await bcrypt.compare(candidatePassword, this.password);
};`);
  }
  
  // JSON出力メソッド
  methods.push(`
// JSON出力時の処理
${modelName}.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  ${hasPassword ? 'delete values.password;' : ''}
  return values;
};`);
  
  return methods.join('\n');
}

/**
 * インデックスの生成
 */
function generateIndexes(tableName, attributes) {
  const indexes = [];
  
  attributes.forEach(attr => {
    if (attr.options.includes('index')) {
      indexes.push(`    await queryInterface.addIndex('${tableName}', ['${attr.name}']);`);
    }
  });
  
  return indexes.length > 0 ? '\n    // インデックスの作成\n' + indexes.join('\n') : '';
}

module.exports = {
  generateModel
};