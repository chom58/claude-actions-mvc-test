const fs = require('fs').promises;
const path = require('path');
const { pascalCase, camelCase } = require('change-case');

/**
 * コントローラージェネレーター
 */
class ControllerGenerator {
  constructor() {
    this.templatesDir = path.join(__dirname, '../templates');
    this.srcDir = path.join(process.cwd(), 'src');
  }

  /**
   * コントローラーを生成
   */
  async generate(name, options = {}) {
    const controllerName = pascalCase(name) + 'Controller';
    const modelName = pascalCase(name);
    const routeName = camelCase(name);
    
    // ディレクトリの確認・作成
    const controllersDir = path.join(this.srcDir, 'controllers');
    await this.ensureDirectory(controllersDir);
    
    // コントローラーファイルのパス
    const controllerPath = path.join(controllersDir, `${controllerName}.js`);
    
    // ファイルが既に存在するかチェック
    if (await this.fileExists(controllerPath)) {
      throw new Error(`コントローラー ${controllerName} は既に存在します`);
    }
    
    // テンプレートの選択
    let template;
    if (options.resource) {
      template = await this.getResourceControllerTemplate(modelName, options);
    } else {
      template = await this.getBasicControllerTemplate(controllerName, options);
    }
    
    // ファイルの生成
    await fs.writeFile(controllerPath, template);
    
    const result = {
      controllerPath: this.getRelativePath(controllerPath),
      controllerName
    };
    
    // ルートの生成（オプション）
    if (options.resource || options.actions?.length > 0) {
      const routeResult = await this.generateRoute(name, controllerName, options);
      result.routePath = routeResult.routePath;
    }
    
    // テストの生成（オプション）
    if (options.generateTest !== false) {
      const testResult = await this.generateTest(controllerName, options);
      result.testPath = testResult.testPath;
    }
    
    return result;
  }

  /**
   * RESTfulリソースコントローラーテンプレート
   */
  async getResourceControllerTemplate(modelName, options) {
    const isApi = options.api || false;
    const requireAuth = options.auth || false;
    
    return `const { ${modelName} } = require('../models');
const { validationResult } = require('express-validator');

/**
 * ${modelName}コントローラー
 * 
 * RESTfulリソースコントローラー
 */
class ${modelName}Controller {
  /**
   * 一覧取得
   * GET /${modelName.toLowerCase()}s
   */
  async index(req, res, next) {
    try {
      const { page = 1, limit = 10, sort = 'createdAt', order = 'DESC' } = req.query;
      
      const offset = (page - 1) * limit;
      
      const { count, rows } = await ${modelName}.findAndCountAll({
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [[sort, order]]${requireAuth ? ',\n        where: { userId: req.user.id }' : ''}
      });
      
      ${isApi ? `res.json({
        success: true,
        data: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      });` : `res.render('${modelName.toLowerCase()}/index', {
        ${modelName.toLowerCase()}s: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      });`}
    } catch (error) {
      next(error);
    }
  }

  /**
   * 詳細表示
   * GET /${modelName.toLowerCase()}s/:id
   */
  async show(req, res, next) {
    try {
      const { id } = req.params;
      
      const ${camelCase(modelName)} = await ${modelName}.findByPk(id);
      
      if (!${camelCase(modelName)}) {
        ${isApi ? `return res.status(404).json({
          success: false,
          error: { message: '${modelName}が見つかりません' }
        });` : `return res.status(404).render('error', {
          message: '${modelName}が見つかりません',
          error: { status: 404 }
        });`}
      }
      
      ${requireAuth ? `// 権限チェック
      if (${camelCase(modelName)}.userId !== req.user.id) {
        ${isApi ? `return res.status(403).json({
          success: false,
          error: { message: 'アクセス権限がありません' }
        });` : `return res.status(403).render('error', {
          message: 'アクセス権限がありません',
          error: { status: 403 }
        });`}
      }
      
      ` : ''}${isApi ? `res.json({
        success: true,
        data: ${camelCase(modelName)}
      });` : `res.render('${modelName.toLowerCase()}/show', {
        ${camelCase(modelName)}
      });`}
    } catch (error) {
      next(error);
    }
  }

  /**
   * 作成フォーム表示
   * GET /${modelName.toLowerCase()}s/new
   */
  ${!isApi ? `async new(req, res, next) {
    try {
      res.render('${modelName.toLowerCase()}/new');
    } catch (error) {
      next(error);
    }
  }` : '// API mode - no form needed'}

  /**
   * 作成処理
   * POST /${modelName.toLowerCase()}s
   */
  async create(req, res, next) {
    try {
      // バリデーションエラーチェック
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        ${isApi ? `return res.status(400).json({
          success: false,
          errors: errors.array()
        });` : `return res.status(400).render('${modelName.toLowerCase()}/new', {
          errors: errors.array(),
          formData: req.body
        });`}
      }
      
      const ${camelCase(modelName)} = await ${modelName}.create({
        ...req.body${requireAuth ? ',\n        userId: req.user.id' : ''}
      });
      
      ${isApi ? `res.status(201).json({
        success: true,
        data: ${camelCase(modelName)},
        message: '${modelName}が作成されました'
      });` : `req.flash('success', '${modelName}が作成されました');
      res.redirect('/${modelName.toLowerCase()}s/' + ${camelCase(modelName)}.id);`}
    } catch (error) {
      next(error);
    }
  }

  /**
   * 編集フォーム表示
   * GET /${modelName.toLowerCase()}s/:id/edit
   */
  ${!isApi ? `async edit(req, res, next) {
    try {
      const { id } = req.params;
      
      const ${camelCase(modelName)} = await ${modelName}.findByPk(id);
      
      if (!${camelCase(modelName)}) {
        return res.status(404).render('error', {
          message: '${modelName}が見つかりません',
          error: { status: 404 }
        });
      }
      
      ${requireAuth ? `// 権限チェック
      if (${camelCase(modelName)}.userId !== req.user.id) {
        return res.status(403).render('error', {
          message: 'アクセス権限がありません',
          error: { status: 403 }
        });
      }
      
      ` : ''}res.render('${modelName.toLowerCase()}/edit', {
        ${camelCase(modelName)}
      });
    } catch (error) {
      next(error);
    }
  }` : '// API mode - no form needed'}

  /**
   * 更新処理
   * PUT /${modelName.toLowerCase()}s/:id
   */
  async update(req, res, next) {
    try {
      const { id } = req.params;
      
      // バリデーションエラーチェック
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        ${isApi ? `return res.status(400).json({
          success: false,
          errors: errors.array()
        });` : `const ${camelCase(modelName)} = await ${modelName}.findByPk(id);
        return res.status(400).render('${modelName.toLowerCase()}/edit', {
          errors: errors.array(),
          ${camelCase(modelName)},
          formData: req.body
        });`}
      }
      
      const ${camelCase(modelName)} = await ${modelName}.findByPk(id);
      
      if (!${camelCase(modelName)}) {
        ${isApi ? `return res.status(404).json({
          success: false,
          error: { message: '${modelName}が見つかりません' }
        });` : `return res.status(404).render('error', {
          message: '${modelName}が見つかりません',
          error: { status: 404 }
        });`}
      }
      
      ${requireAuth ? `// 権限チェック
      if (${camelCase(modelName)}.userId !== req.user.id) {
        ${isApi ? `return res.status(403).json({
          success: false,
          error: { message: 'アクセス権限がありません' }
        });` : `return res.status(403).render('error', {
          message: 'アクセス権限がありません',
          error: { status: 403 }
        });`}
      }
      
      ` : ''}await ${camelCase(modelName)}.update(req.body);
      
      ${isApi ? `res.json({
        success: true,
        data: ${camelCase(modelName)},
        message: '${modelName}が更新されました'
      });` : `req.flash('success', '${modelName}が更新されました');
      res.redirect('/${modelName.toLowerCase()}s/' + ${camelCase(modelName)}.id);`}
    } catch (error) {
      next(error);
    }
  }

  /**
   * 削除処理
   * DELETE /${modelName.toLowerCase()}s/:id
   */
  async destroy(req, res, next) {
    try {
      const { id } = req.params;
      
      const ${camelCase(modelName)} = await ${modelName}.findByPk(id);
      
      if (!${camelCase(modelName)}) {
        ${isApi ? `return res.status(404).json({
          success: false,
          error: { message: '${modelName}が見つかりません' }
        });` : `return res.status(404).render('error', {
          message: '${modelName}が見つかりません',
          error: { status: 404 }
        });`}
      }
      
      ${requireAuth ? `// 権限チェック
      if (${camelCase(modelName)}.userId !== req.user.id) {
        ${isApi ? `return res.status(403).json({
          success: false,
          error: { message: 'アクセス権限がありません' }
        });` : `return res.status(403).render('error', {
          message: 'アクセス権限がありません',
          error: { status: 403 }
        });`}
      }
      
      ` : ''}await ${camelCase(modelName)}.destroy();
      
      ${isApi ? `res.json({
        success: true,
        message: '${modelName}が削除されました'
      });` : `req.flash('success', '${modelName}が削除されました');
      res.redirect('/${modelName.toLowerCase()}s');`}
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ${modelName}Controller();`;
  }

  /**
   * 基本的なコントローラーテンプレート
   */
  async getBasicControllerTemplate(controllerName, options) {
    const actions = options.actions || ['index'];
    const isApi = options.api || false;
    
    const actionMethods = actions.map(action => {
      return `
  /**
   * ${action}アクション
   */
  async ${action}(req, res, next) {
    try {
      // TODO: ${action}の実装
      ${isApi ? `res.json({
        success: true,
        message: '${action} action',
        data: {}
      });` : `res.render('${controllerName.toLowerCase().replace('controller', '')}/${action}', {
        title: '${action}'
      });`}
    } catch (error) {
      next(error);
    }
  }`;
    }).join('\n');
    
    return `/**
 * ${controllerName}
 * 
 * Generated by MVC CLI
 */
class ${controllerName} {${actionMethods}
}

module.exports = new ${controllerName}();`;
  }

  /**
   * ルートファイルを生成
   */
  async generateRoute(name, controllerName, options) {
    const routesDir = path.join(this.srcDir, 'routes');
    await this.ensureDirectory(routesDir);
    
    const routeName = `${camelCase(name)}Routes.js`;
    const routePath = path.join(routesDir, routeName);
    
    let routeTemplate;
    if (options.resource) {
      routeTemplate = this.getResourceRouteTemplate(name, controllerName, options);
    } else {
      routeTemplate = this.getBasicRouteTemplate(name, controllerName, options);
    }
    
    await fs.writeFile(routePath, routeTemplate);
    
    return {
      routePath: this.getRelativePath(routePath),
      mountPath: `/${name}s`,
      requirePath: `./src/routes/${routeName}`
    };
  }

  /**
   * RESTfulルートテンプレート
   */
  getResourceRouteTemplate(name, controllerName, options) {
    const middleware = options.auth ? "const { authenticate } = require('../middleware/auth');\n" : '';
    const authMiddleware = options.auth ? ', authenticate' : '';
    const modelName = pascalCase(name);
    
    return `const express = require('express');
const router = express.Router();
const ${camelCase(controllerName)} = require('../controllers/${controllerName}');
${middleware}
// バリデーション
const { body, param, query } = require('express-validator');

// バリデーションルール
const create${modelName}Validation = [
  body('name').notEmpty().withMessage('名前は必須です'),
  // TODO: 追加のバリデーションルール
];

const update${modelName}Validation = [
  body('name').optional().notEmpty().withMessage('名前は必須です'),
  // TODO: 追加のバリデーションルール
];

const idValidation = [
  param('id').isInt().withMessage('無効なIDです')
];

// ルート定義
router.get('/'${authMiddleware}, ${camelCase(controllerName)}.index);
router.get('/new'${authMiddleware}, ${camelCase(controllerName)}.new);
router.post('/'${authMiddleware}, create${modelName}Validation, ${camelCase(controllerName)}.create);
router.get('/:id'${authMiddleware}, idValidation, ${camelCase(controllerName)}.show);
router.get('/:id/edit'${authMiddleware}, idValidation, ${camelCase(controllerName)}.edit);
router.put('/:id'${authMiddleware}, idValidation, update${modelName}Validation, ${camelCase(controllerName)}.update);
router.delete('/:id'${authMiddleware}, idValidation, ${camelCase(controllerName)}.destroy);

module.exports = router;`;
  }

  /**
   * 基本的なルートテンプレート
   */
  getBasicRouteTemplate(name, controllerName, options) {
    const actions = options.actions || ['index'];
    const middleware = options.auth ? "const { authenticate } = require('../middleware/auth');\n" : '';
    const authMiddleware = options.auth ? ', authenticate' : '';
    
    const routes = actions.map(action => {
      const method = this.getHttpMethod(action);
      const path = action === 'index' ? '/' : `/${action}`;
      return `router.${method}('${path}'${authMiddleware}, ${camelCase(controllerName)}.${action});`;
    }).join('\n');
    
    return `const express = require('express');
const router = express.Router();
const ${camelCase(controllerName)} = require('../controllers/${controllerName}');
${middleware}
${routes}

module.exports = router;`;
  }

  /**
   * テストファイルを生成
   */
  async generateTest(controllerName, options) {
    const testsDir = path.join(process.cwd(), 'tests/integration');
    await this.ensureDirectory(testsDir);
    
    const testName = `${controllerName}.test.js`;
    const testPath = path.join(testsDir, testName);
    
    const testTemplate = this.getTestTemplate(controllerName, options);
    await fs.writeFile(testPath, testTemplate);
    
    return {
      testPath: this.getRelativePath(testPath)
    };
  }

  /**
   * テストテンプレート
   */
  getTestTemplate(controllerName, options) {
    const modelName = controllerName.replace('Controller', '');
    const routePath = `/${modelName.toLowerCase()}s`;
    
    return `const request = require('supertest');
const app = require('../../src/app');
const { ${modelName} } = require('../../src/models');

describe('${controllerName}', () => {
  beforeEach(async () => {
    // データベースのクリーンアップ
    await ${modelName}.destroy({ where: {}, truncate: true });
  });

  describe('GET ${routePath}', () => {
    it('should return all ${modelName.toLowerCase()}s', async () => {
      // テストデータの作成
      await ${modelName}.create({ name: 'Test ${modelName}' });
      
      const response = await request(app)
        .get('${routePath}')
        .expect(200);
      
      ${options.api ? `expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);` : `expect(response.text).toContain('Test ${modelName}');`}
    });
  });

  describe('POST ${routePath}', () => {
    it('should create a new ${modelName.toLowerCase()}', async () => {
      const ${camelCase(modelName)}Data = {
        name: 'New ${modelName}'
      };
      
      const response = await request(app)
        .post('${routePath}')
        .send(${camelCase(modelName)}Data)
        .expect(${options.api ? '201' : '302'});
      
      ${options.api ? `expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('New ${modelName}');` : `const created = await ${modelName}.findOne({ where: { name: 'New ${modelName}' } });
      expect(created).toBeTruthy();`}
    });
    
    it('should return validation errors', async () => {
      const response = await request(app)
        .post('${routePath}')
        .send({})
        .expect(400);
      
      ${options.api ? `expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();` : `expect(response.text).toContain('名前は必須です');`}
    });
  });
  
  // TODO: 追加のテストケース
});`;
  }

  /**
   * HTTPメソッドの判定
   */
  getHttpMethod(action) {
    const methodMap = {
      index: 'get',
      show: 'get',
      new: 'get',
      create: 'post',
      edit: 'get',
      update: 'put',
      destroy: 'delete'
    };
    
    return methodMap[action] || 'get';
  }

  /**
   * ディレクトリの存在確認と作成
   */
  async ensureDirectory(dirPath) {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  /**
   * ファイルの存在確認
   */
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 相対パスの取得
   */
  getRelativePath(absolutePath) {
    return path.relative(process.cwd(), absolutePath);
  }
}

module.exports = ControllerGenerator;