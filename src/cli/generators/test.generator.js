const fs = require('fs').promises;
const path = require('path');
const { pascalCase, camelCase } = require('change-case');

/**
 * テストジェネレーター
 */
class TestGenerator {
  constructor() {
    this.testsDir = path.join(process.cwd(), 'tests');
  }

  /**
   * テストを生成
   */
  async generate(type, name, options = {}) {
    const testType = options.testType || 'unit';
    const testName = this.formatTestName(type, name);
    
    // テストディレクトリの確認・作成
    const testDir = path.join(this.testsDir, testType);
    await this.ensureDirectory(testDir);
    
    // テストファイルのパス
    const testPath = path.join(testDir, `${testName}.test.js`);
    
    // ファイルが既に存在するかチェック
    if (await this.fileExists(testPath)) {
      throw new Error(`テスト ${testName} は既に存在します`);
    }
    
    // テストテンプレートの生成
    const testTemplate = this.getTestTemplate(type, name, options);
    
    // ファイルの生成
    await fs.writeFile(testPath, testTemplate);
    
    return {
      testPath: this.getRelativePath(testPath),
      testName
    };
  }

  /**
   * テスト名のフォーマット
   */
  formatTestName(type, name) {
    switch (type) {
      case 'controller':
        return pascalCase(name) + 'Controller';
      case 'model':
        return pascalCase(name);
      case 'middleware':
        return camelCase(name);
      case 'service':
        return pascalCase(name) + 'Service';
      case 'util':
        return camelCase(name);
      default:
        return camelCase(name);
    }
  }

  /**
   * テストテンプレートの取得
   */
  getTestTemplate(type, name, options) {
    switch (type) {
      case 'controller':
        return this.getControllerTestTemplate(name, options);
      case 'model':
        return this.getModelTestTemplate(name, options);
      case 'middleware':
        return this.getMiddlewareTestTemplate(name, options);
      case 'service':
        return this.getServiceTestTemplate(name, options);
      case 'util':
        return this.getUtilTestTemplate(name, options);
      default:
        return this.getGenericTestTemplate(name, options);
    }
  }

  /**
   * コントローラーテストテンプレート
   */
  getControllerTestTemplate(name, options) {
    const controllerName = pascalCase(name) + 'Controller';
    const modelName = pascalCase(name);
    const routePath = `/${name}s`;
    const isIntegration = options.testType === 'integration';
    
    if (isIntegration) {
      return `const request = require('supertest');
const app = require('../../src/app');
const { ${modelName} } = require('../../src/models');
const { sequelize } = require('../../src/models');

describe('${controllerName} Integration Tests', () => {
  let authToken;
  let testUser;

  beforeAll(async () => {
    // データベースの初期化
    await sequelize.sync({ force: true });
  });

  beforeEach(async () => {
    // テストユーザーの作成と認証
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Test123!@#'
      });
    
    authToken = response.body.token;
    testUser = response.body.user;
  });

  afterEach(async () => {
    // データのクリーンアップ
    await ${modelName}.destroy({ where: {}, truncate: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('GET ${routePath}', () => {
    it('should return all ${name}s', async () => {
      // テストデータの作成
      await ${modelName}.create({
        name: 'Test ${modelName}',
        userId: testUser.id
      });

      const response = await request(app)
        .get('${routePath}')
        .set('Authorization', \`Bearer \${authToken}\`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Test ${modelName}');
    });

    it('should handle pagination', async () => {
      // 複数のテストデータを作成
      for (let i = 0; i < 15; i++) {
        await ${modelName}.create({
          name: \`Test ${modelName} \${i}\`,
          userId: testUser.id
        });
      }

      const response = await request(app)
        .get('${routePath}?page=2&limit=10')
        .set('Authorization', \`Bearer \${authToken}\`)
        .expect(200);

      expect(response.body.pagination.page).toBe(2);
      expect(response.body.pagination.total).toBe(15);
      expect(response.body.data).toHaveLength(5);
    });
  });

  describe('GET ${routePath}/:id', () => {
    it('should return a specific ${name}', async () => {
      const ${camelCase(name)} = await ${modelName}.create({
        name: 'Test ${modelName}',
        userId: testUser.id
      });

      const response = await request(app)
        .get(\`${routePath}/\${${camelCase(name)}.id}\`)
        .set('Authorization', \`Bearer \${authToken}\`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(${camelCase(name)}.id);
      expect(response.body.data.name).toBe('Test ${modelName}');
    });

    it('should return 404 for non-existent ${name}', async () => {
      const response = await request(app)
        .get('${routePath}/99999')
        .set('Authorization', \`Bearer \${authToken}\`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('見つかりません');
    });
  });

  describe('POST ${routePath}', () => {
    it('should create a new ${name}', async () => {
      const ${camelCase(name)}Data = {
        name: 'New ${modelName}',
        description: 'Test description'
      };

      const response = await request(app)
        .post('${routePath}')
        .set('Authorization', \`Bearer \${authToken}\`)
        .send(${camelCase(name)}Data)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('New ${modelName}');
      expect(response.body.data.userId).toBe(testUser.id);

      // データベースで確認
      const created = await ${modelName}.findByPk(response.body.data.id);
      expect(created).toBeTruthy();
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('${routePath}')
        .set('Authorization', \`Bearer \${authToken}\`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('PUT ${routePath}/:id', () => {
    it('should update an existing ${name}', async () => {
      const ${camelCase(name)} = await ${modelName}.create({
        name: 'Original Name',
        userId: testUser.id
      });

      const updateData = {
        name: 'Updated Name',
        description: 'Updated description'
      };

      const response = await request(app)
        .put(\`${routePath}/\${${camelCase(name)}.id}\`)
        .set('Authorization', \`Bearer \${authToken}\`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Name');

      // データベースで確認
      await ${camelCase(name)}.reload();
      expect(${camelCase(name)}.name).toBe('Updated Name');
    });

    it('should not allow updating other user\\'s ${name}', async () => {
      // 別のユーザーのデータを作成
      const other${modelName} = await ${modelName}.create({
        name: 'Other User ${modelName}',
        userId: 99999
      });

      const response = await request(app)
        .put(\`${routePath}/\${other${modelName}.id}\`)
        .set('Authorization', \`Bearer \${authToken}\`)
        .send({ name: 'Hacked' })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('権限がありません');
    });
  });

  describe('DELETE ${routePath}/:id', () => {
    it('should delete an existing ${name}', async () => {
      const ${camelCase(name)} = await ${modelName}.create({
        name: 'To Be Deleted',
        userId: testUser.id
      });

      const response = await request(app)
        .delete(\`${routePath}/\${${camelCase(name)}.id}\`)
        .set('Authorization', \`Bearer \${authToken}\`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // データベースで確認
      const deleted = await ${modelName}.findByPk(${camelCase(name)}.id);
      expect(deleted).toBeNull();
    });
  });
});`;
    }
    
    // 単体テストの場合
    return `const ${controllerName} = require('../../src/controllers/${controllerName}');
const { ${modelName} } = require('../../src/models');

// モックの設定
jest.mock('../../src/models');

describe('${controllerName} Unit Tests', () => {
  let req, res, next;

  beforeEach(() => {
    // リクエスト・レスポンスのモック
    req = {
      params: {},
      query: {},
      body: {},
      user: { id: 1, role: 'user' }
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      render: jest.fn().mockReturnThis()
    };
    
    next = jest.fn();
    
    // モックのリセット
    jest.clearAllMocks();
  });

  describe('index', () => {
    it('should return paginated ${name}s', async () => {
      const mock${modelName}s = [
        { id: 1, name: 'Test 1' },
        { id: 2, name: 'Test 2' }
      ];

      ${modelName}.findAndCountAll.mockResolvedValue({
        count: 2,
        rows: mock${modelName}s
      });

      await ${controllerName}.index(req, res, next);

      expect(${modelName}.findAndCountAll).toHaveBeenCalledWith({
        limit: 10,
        offset: 0,
        order: [['createdAt', 'DESC']]
      });

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mock${modelName}s,
        pagination: {
          total: 2,
          page: 1,
          limit: 10,
          totalPages: 1
        }
      });
    });

    it('should handle errors', async () => {
      const error = new Error('Database error');
      ${modelName}.findAndCountAll.mockRejectedValue(error);

      await ${controllerName}.index(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('show', () => {
    it('should return a specific ${name}', async () => {
      const mock${modelName} = { id: 1, name: 'Test ${modelName}' };
      req.params.id = '1';

      ${modelName}.findByPk.mockResolvedValue(mock${modelName});

      await ${controllerName}.show(req, res, next);

      expect(${modelName}.findByPk).toHaveBeenCalledWith('1');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mock${modelName}
      });
    });

    it('should return 404 for non-existent ${name}', async () => {
      req.params.id = '999';
      ${modelName}.findByPk.mockResolvedValue(null);

      await ${controllerName}.show(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: { message: '${modelName}が見つかりません' }
      });
    });
  });

  describe('create', () => {
    it('should create a new ${name}', async () => {
      const ${camelCase(name)}Data = { name: 'New ${modelName}' };
      req.body = ${camelCase(name)}Data;

      const created${modelName} = { id: 1, ...${camelCase(name)}Data, userId: req.user.id };
      ${modelName}.create.mockResolvedValue(created${modelName});

      await ${controllerName}.create(req, res, next);

      expect(${modelName}.create).toHaveBeenCalledWith({
        ...${camelCase(name)}Data,
        userId: req.user.id
      });

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: created${modelName},
        message: '${modelName}が作成されました'
      });
    });
  });

  // TODO: update, destroyのテストを追加
});`;
  }

  /**
   * モデルテストテンプレート
   */
  getModelTestTemplate(name, options) {
    const modelName = pascalCase(name);
    
    return `const { ${modelName} } = require('../../src/models');
const { sequelize } = require('../../src/models');

describe('${modelName} Model', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('モデル定義', () => {
    it('should have correct attributes', () => {
      const attributes = ${modelName}.rawAttributes;
      
      expect(attributes.id).toBeDefined();
      expect(attributes.id.type.constructor.name).toBe('INTEGER');
      expect(attributes.id.primaryKey).toBe(true);
      
      // TODO: 他の属性のテスト
      expect(attributes.name).toBeDefined();
      expect(attributes.createdAt).toBeDefined();
      expect(attributes.updatedAt).toBeDefined();
    });

    it('should have correct associations', () => {
      const associations = ${modelName}.associations;
      
      // TODO: アソシエーションのテスト
      // expect(associations.user).toBeDefined();
      // expect(associations.user.associationType).toBe('BelongsTo');
    });
  });

  describe('バリデーション', () => {
    it('should validate required fields', async () => {
      try {
        await ${modelName}.create({});
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error.name).toBe('SequelizeValidationError');
        // TODO: 具体的なバリデーションエラーのテスト
      }
    });

    it('should create valid ${name}', async () => {
      const ${camelCase(name)} = await ${modelName}.create({
        name: 'Valid ${modelName}',
        // TODO: 他の必須フィールド
      });

      expect(${camelCase(name)}).toBeDefined();
      expect(${camelCase(name)}.id).toBeDefined();
      expect(${camelCase(name)}.name).toBe('Valid ${modelName}');
    });
  });

  describe('スコープ', () => {
    beforeEach(async () => {
      await ${modelName}.destroy({ where: {}, truncate: true });
    });

    it('should have active scope', async () => {
      await ${modelName}.create({ name: 'Active', isActive: true });
      await ${modelName}.create({ name: 'Inactive', isActive: false });

      const active${modelName}s = await ${modelName}.scope('active').findAll();
      
      expect(active${modelName}s).toHaveLength(1);
      expect(active${modelName}s[0].name).toBe('Active');
    });

    it('should have recent scope', async () => {
      const old = await ${modelName}.create({ name: 'Old' });
      await new Promise(resolve => setTimeout(resolve, 10));
      const recent = await ${modelName}.create({ name: 'Recent' });

      const recent${modelName}s = await ${modelName}.scope('recent').findAll();
      
      expect(recent${modelName}s[0].id).toBe(recent.id);
      expect(recent${modelName}s[1].id).toBe(old.id);
    });
  });

  describe('インスタンスメソッド', () => {
    it('should format JSON response correctly', async () => {
      const ${camelCase(name)} = await ${modelName}.create({
        name: 'Test ${modelName}',
        password: 'secret123'
      });

      const json = ${camelCase(name)}.toJSON();
      
      expect(json.name).toBe('Test ${modelName}');
      expect(json.password).toBeUndefined();
      expect(json.deletedAt).toBeUndefined();
    });
  });

  describe('クラスメソッド', () => {
    it('should search ${name}s', async () => {
      await ${modelName}.create({ name: 'Searchable ${modelName}' });
      await ${modelName}.create({ name: 'Another ${modelName}' });

      const result = await ${modelName}.search('Searchable');
      
      expect(result.count).toBe(1);
      expect(result.rows[0].name).toContain('Searchable');
    });
  });
});`;
  }

  /**
   * ミドルウェアテストテンプレート
   */
  getMiddlewareTestTemplate(name, options) {
    const middlewareName = camelCase(name);
    
    return `const ${middlewareName} = require('../../src/middleware/${middlewareName}');

describe('${middlewareName} Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {},
      body: {},
      query: {},
      params: {}
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn()
    };
    
    next = jest.fn();
  });

  it('should call next() on valid request', () => {
    ${middlewareName}(req, res, next);
    
    expect(next).toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith();
  });

  it('should handle invalid request', () => {
    // TODO: 無効なリクエストのテストケース
    req.body = { invalid: 'data' };
    
    ${middlewareName}(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  // TODO: 追加のテストケース
});`;
  }

  /**
   * サービステストテンプレート
   */
  getServiceTestTemplate(name, options) {
    const serviceName = pascalCase(name) + 'Service';
    
    return `const ${serviceName} = require('../../src/services/${serviceName}');

describe('${serviceName}', () => {
  beforeEach(() => {
    // モックやテストデータのセットアップ
  });

  describe('メソッド名', () => {
    it('should perform expected operation', async () => {
      // TODO: テストの実装
      const result = await ${serviceName}.someMethod();
      
      expect(result).toBeDefined();
    });

    it('should handle errors gracefully', async () => {
      // TODO: エラーハンドリングのテスト
      try {
        await ${serviceName}.methodThatThrows();
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toContain('Expected error');
      }
    });
  });

  // TODO: 他のメソッドのテスト
});`;
  }

  /**
   * ユーティリティテストテンプレート
   */
  getUtilTestTemplate(name, options) {
    const utilName = camelCase(name);
    
    return `const ${utilName} = require('../../src/utils/${utilName}');

describe('${utilName} Utility', () => {
  describe('関数名', () => {
    it('should return expected result', () => {
      const input = 'test input';
      const result = ${utilName}.someFunction(input);
      
      expect(result).toBe('expected output');
    });

    it('should handle edge cases', () => {
      expect(${utilName}.someFunction(null)).toBeNull();
      expect(${utilName}.someFunction(undefined)).toBeUndefined();
      expect(${utilName}.someFunction('')).toBe('');
    });

    it('should throw error on invalid input', () => {
      expect(() => ${utilName}.someFunction(123)).toThrow('Invalid input');
    });
  });

  // TODO: 他の関数のテスト
});`;
  }

  /**
   * 汎用テストテンプレート
   */
  getGenericTestTemplate(name, options) {
    return `describe('${name}', () => {
  beforeEach(() => {
    // テストのセットアップ
  });

  afterEach(() => {
    // テストのクリーンアップ
  });

  it('should work correctly', () => {
    // TODO: テストの実装
    expect(true).toBe(true);
  });

  // TODO: 追加のテストケース
});`;
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

module.exports = TestGenerator;