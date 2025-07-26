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

/**
 * コントローラーを生成
 */
function generateController(name, options = {}) {
  try {
    const projectRoot = getProjectRoot();
    const controllerName = name.endsWith('Controller') ? name : `${name}Controller`;
    const modelName = toPascalCase(name.replace(/Controller$/, ''));
    const resourceName = toCamelCase(modelName);
    
    // アクションリストの解析
    const actions = options.actions ? options.actions.split(',').map(a => a.trim()) : ['index', 'show', 'create', 'update', 'destroy'];
    
    logInfo(`コントローラー "${controllerName}" を生成中...`);
    
    // コントローラーファイルの生成
    const controllerContent = generateControllerContent(controllerName, modelName, resourceName, actions);
    const controllerPath = path.join(projectRoot, 'src', 'controllers', `${toCamelCase(controllerName)}.js`);
    
    if (writeFile(controllerPath, controllerContent)) {
      logSuccess(`コントローラーファイルを生成しました: ${controllerPath}`);
    }
    
    logSuccess(`コントローラー "${controllerName}" の生成が完了しました！`);
    
    // 使用方法の表示
    console.log('\n📝 使用方法:');
    console.log(`   const ${toCamelCase(controllerName)} = require('./controllers/${toCamelCase(controllerName)}');`);
    console.log(`   app.use('/api/${pluralize(toSnakeCase(modelName))}', ${toCamelCase(controllerName)});`);
    
  } catch (error) {
    logError(`コントローラー生成中にエラーが発生しました: ${error.message}`);
  }
}

/**
 * コントローラーファイルの内容を生成
 */
function generateControllerContent(controllerName, modelName, resourceName, actions) {
  const actionsCode = actions.map(action => generateAction(action, modelName, resourceName)).join('\n\n');
  const exportsCode = actions.map(action => `  ${action}`).join(',\n');
  
  const templatePath = path.join(__dirname, '../templates/controller/rest.js.ejs');
  let content = fs.readFileSync(templatePath, 'utf8');
  
  content = content.replace(/{{modelName}}/g, modelName);
  content = content.replace(/{{actions}}/g, actionsCode);
  content = content.replace(/{{exports}}/g, exportsCode);
  
  return content;
}

/**
 * 個別のアクションコードを生成
 */
function generateAction(action, modelName, resourceName) {
  switch (action) {
    case 'index':
      return generateIndexAction(modelName, resourceName);
    case 'show':
      return generateShowAction(modelName, resourceName);
    case 'create':
      return generateCreateAction(modelName, resourceName);
    case 'update':
      return generateUpdateAction(modelName, resourceName);
    case 'destroy':
      return generateDestroyAction(modelName, resourceName);
    default:
      return generateCustomAction(action, modelName, resourceName);
  }
}

/**
 * indexアクション（一覧取得）
 */
function generateIndexAction(modelName, resourceName) {
  return `// ${modelName}一覧を取得
exports.index = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    const { count, rows: ${resourceName}s } = await ${modelName}.findAndCountAll({
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });
    
    res.json({
      ${resourceName}s,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('${modelName} index error:', error);
    res.status(500).json({
      error: '${modelName}一覧の取得中にエラーが発生しました'
    });
  }
};`;
}

/**
 * showアクション（詳細取得）
 */
function generateShowAction(modelName, resourceName) {
  return `// ${modelName}詳細を取得
exports.show = async (req, res) => {
  try {
    const { id } = req.params;
    
    const ${resourceName} = await ${modelName}.findByPk(id);
    
    if (!${resourceName}) {
      return res.status(404).json({
        error: '${modelName}が見つかりません'
      });
    }
    
    res.json(${resourceName});
  } catch (error) {
    console.error('${modelName} show error:', error);
    res.status(500).json({
      error: '${modelName}詳細の取得中にエラーが発生しました'
    });
  }
};`;
}

/**
 * createアクション（新規作成）
 */
function generateCreateAction(modelName, resourceName) {
  return `// ${modelName}を新規作成
exports.create = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const ${resourceName} = await ${modelName}.create(req.body);
    
    res.status(201).json({
      message: '${modelName}を作成しました',
      ${resourceName}
    });
  } catch (error) {
    console.error('${modelName} create error:', error);
    
    // Sequelizeバリデーションエラー
    if (error.name === 'SequelizeValidationError') {
      const errors = error.errors.map(err => ({
        field: err.path,
        message: err.message
      }));
      return res.status(400).json({ errors });
    }
    
    // ユニーク制約違反
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        error: '既に存在するデータです'
      });
    }
    
    res.status(500).json({
      error: '${modelName}作成中にエラーが発生しました'
    });
  }
};`;
}

/**
 * updateアクション（更新）
 */
function generateUpdateAction(modelName, resourceName) {
  return `// ${modelName}を更新
exports.update = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { id } = req.params;
    
    const ${resourceName} = await ${modelName}.findByPk(id);
    
    if (!${resourceName}) {
      return res.status(404).json({
        error: '${modelName}が見つかりません'
      });
    }
    
    await ${resourceName}.update(req.body);
    
    res.json({
      message: '${modelName}を更新しました',
      ${resourceName}
    });
  } catch (error) {
    console.error('${modelName} update error:', error);
    
    // Sequelizeバリデーションエラー
    if (error.name === 'SequelizeValidationError') {
      const errors = error.errors.map(err => ({
        field: err.path,
        message: err.message
      }));
      return res.status(400).json({ errors });
    }
    
    // ユニーク制約違反
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        error: '既に存在するデータです'
      });
    }
    
    res.status(500).json({
      error: '${modelName}更新中にエラーが発生しました'
    });
  }
};`;
}

/**
 * destroyアクション（削除）
 */
function generateDestroyAction(modelName, resourceName) {
  return `// ${modelName}を削除
exports.destroy = async (req, res) => {
  try {
    const { id } = req.params;
    
    const ${resourceName} = await ${modelName}.findByPk(id);
    
    if (!${resourceName}) {
      return res.status(404).json({
        error: '${modelName}が見つかりません'
      });
    }
    
    await ${resourceName}.destroy();
    
    res.json({
      message: '${modelName}を削除しました'
    });
  } catch (error) {
    console.error('${modelName} destroy error:', error);
    res.status(500).json({
      error: '${modelName}削除中にエラーが発生しました'
    });
  }
};`;
}

/**
 * カスタムアクション
 */
function generateCustomAction(action, modelName, resourceName) {
  return `// カスタムアクション: ${action}
exports.${action} = async (req, res) => {
  try {
    // TODO: ${action}の実装を追加してください
    res.json({
      message: '${action}アクションが実行されました'
    });
  } catch (error) {
    console.error('${modelName} ${action} error:', error);
    res.status(500).json({
      error: '${action}実行中にエラーが発生しました'
    });
  }
};`;
}

module.exports = {
  generateController
};