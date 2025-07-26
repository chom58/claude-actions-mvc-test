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
 * ルートファイルを生成
 */
function generateRoutes(name, options = {}) {
  try {
    const projectRoot = getProjectRoot();
    const modelName = toPascalCase(name);
    const resourceName = toCamelCase(modelName);
    const resourcePath = pluralize(toSnakeCase(name));
    const controllerName = `${resourceName}Controller`;
    const controllerFileName = `${resourceName}Controller`;
    
    logInfo(`ルート "${resourcePath}" を生成中...`);
    
    // ルートファイルの生成
    const routesContent = generateRoutesContent(modelName, resourceName, resourcePath, controllerName, controllerFileName, options);
    const routesPath = path.join(projectRoot, 'src', 'routes', `${resourcePath}Routes.js`);
    
    if (writeFile(routesPath, routesContent)) {
      logSuccess(`ルートファイルを生成しました: ${routesPath}`);
    }
    
    logSuccess(`ルート "${resourcePath}" の生成が完了しました！`);
    
    // 使用方法の表示
    console.log('\n📝 使用方法:');
    console.log(`   const ${resourcePath}Routes = require('./routes/${resourcePath}Routes');`);
    console.log(`   app.use('/api/${resourcePath}', ${resourcePath}Routes);`);
    console.log('\n📝 利用可能なエンドポイント:');
    console.log(`   GET    /api/${resourcePath}     - 一覧取得`);
    console.log(`   GET    /api/${resourcePath}/:id - 詳細取得`);
    console.log(`   POST   /api/${resourcePath}     - 新規作成`);
    console.log(`   PUT    /api/${resourcePath}/:id - 更新`);
    console.log(`   DELETE /api/${resourcePath}/:id - 削除`);
    
  } catch (error) {
    logError(`ルート生成中にエラーが発生しました: ${error.message}`);
  }
}

/**
 * ルートファイルの内容を生成
 */
function generateRoutesContent(modelName, resourceName, resourcePath, controllerName, controllerFileName, options) {
  const routesCode = generateRESTfulRoutes(resourceName);
  
  const templatePath = path.join(__dirname, '../templates/routes/rest.js.ejs');
  let content = fs.readFileSync(templatePath, 'utf8');
  
  content = content.replace(/{{controllerName}}/g, controllerName);
  content = content.replace(/{{controllerFileName}}/g, controllerFileName);
  content = content.replace(/{{routes}}/g, routesCode);
  
  return content;
}

/**
 * RESTfulルートを生成
 */
function generateRESTfulRoutes(resourceName) {
  return `// GET /api/${pluralize(toSnakeCase(resourceName))} - 一覧取得
router.get('/', 
  generalRateLimit,
  ${resourceName}Controller.index
);

// GET /api/${pluralize(toSnakeCase(resourceName))}/:id - 詳細取得
router.get('/:id',
  generalRateLimit,
  ${resourceName}Controller.show
);

// POST /api/${pluralize(toSnakeCase(resourceName))} - 新規作成
router.post('/',
  generalRateLimit,
  sanitizeInput,
  preventSqlInjection,
  [
    // バリデーションルールを追加してください
    // 例: body('name').notEmpty().withMessage('名前は必須です'),
    //     body('email').isEmail().withMessage('有効なメールアドレスを入力してください')
  ],
  ${resourceName}Controller.create
);

// PUT /api/${pluralize(toSnakeCase(resourceName))}/:id - 更新
router.put('/:id',
  generalRateLimit,
  sanitizeInput,
  preventSqlInjection,
  [
    // バリデーションルールを追加してください
    // 例: body('name').optional().notEmpty().withMessage('名前は必須です'),
    //     body('email').optional().isEmail().withMessage('有効なメールアドレスを入力してください')
  ],
  ${resourceName}Controller.update
);

// DELETE /api/${pluralize(toSnakeCase(resourceName))}/:id - 削除
router.delete('/:id',
  generalRateLimit,
  ${resourceName}Controller.destroy
);`;
}

module.exports = {
  generateRoutes
};