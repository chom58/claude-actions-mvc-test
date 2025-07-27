const request = require('supertest');
const app = require('../../src/app');
const { User } = require('../../src/models');
const jwt = require('jsonwebtoken');

class ApiTestHelper {
  constructor() {
    this.app = app;
    this.request = request(app);
  }

  /**
   * ユーザーを作成してトークンを取得
   */
  async createAuthenticatedUser(userData = {}) {
    const defaultData = {
      username: `testuser_${Date.now()}`,
      email: `test_${Date.now()}@example.com`,
      password: 'Test123!@#',
      role: 'user'
    };

    const user = await User.create({ ...defaultData, ...userData });
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    return { user, token };
  }

  /**
   * 認証付きGETリクエスト
   */
  async authGet(path, token) {
    return this.request
      .get(path)
      .set('Authorization', `Bearer ${token}`)
      .set('Accept', 'application/json');
  }

  /**
   * 認証付きPOSTリクエスト
   */
  async authPost(path, data, token) {
    return this.request
      .post(path)
      .set('Authorization', `Bearer ${token}`)
      .set('Accept', 'application/json')
      .send(data);
  }

  /**
   * 認証付きPUTリクエスト
   */
  async authPut(path, data, token) {
    return this.request
      .put(path)
      .set('Authorization', `Bearer ${token}`)
      .set('Accept', 'application/json')
      .send(data);
  }

  /**
   * 認証付きDELETEリクエスト
   */
  async authDelete(path, token) {
    return this.request
      .delete(path)
      .set('Authorization', `Bearer ${token}`)
      .set('Accept', 'application/json');
  }

  /**
   * マルチパートフォームデータのアップロード
   */
  async uploadFile(path, fieldName, filePath, token, additionalFields = {}) {
    const req = this.request
      .post(path)
      .set('Authorization', `Bearer ${token}`)
      .attach(fieldName, filePath);

    Object.entries(additionalFields).forEach(([key, value]) => {
      req.field(key, value);
    });

    return req;
  }

  /**
   * レスポンスの基本的な検証
   */
  expectSuccess(response, statusCode = 200) {
    expect(response.status).toBe(statusCode);
    expect(response.body).toBeDefined();
    return response.body;
  }

  /**
   * エラーレスポンスの検証
   */
  expectError(response, statusCode, errorMessage) {
    expect(response.status).toBe(statusCode);
    expect(response.body.error).toBeDefined();
    if (errorMessage) {
      expect(response.body.error).toContain(errorMessage);
    }
    return response.body;
  }

  /**
   * ページネーションレスポンスの検証
   */
  expectPagination(response, expectedFields = ['data', 'pagination']) {
    this.expectSuccess(response);
    expectedFields.forEach(field => {
      expect(response.body[field]).toBeDefined();
    });
    
    if (response.body.pagination) {
      expect(response.body.pagination).toHaveProperty('page');
      expect(response.body.pagination).toHaveProperty('limit');
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('totalPages');
    }
    
    return response.body;
  }

  /**
   * 非同期処理の待機
   */
  async waitFor(condition, timeout = 5000, interval = 100) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    throw new Error('Timeout waiting for condition');
  }

  /**
   * データベースのクリーンアップ
   */
  async cleanDatabase(models = ['User', 'Post']) {
    const db = require('../../src/models');
    
    for (const modelName of models) {
      if (db[modelName]) {
        await db[modelName].destroy({ where: {}, force: true });
      }
    }
  }

  /**
   * モックデータの生成
   */
  generateMockData(type, count = 1) {
    const generators = {
      user: (index) => ({
        username: `user_${index}_${Date.now()}`,
        email: `user${index}_${Date.now()}@example.com`,
        password: 'Test123!@#',
        role: 'user'
      }),
      post: (index) => ({
        title: `Test Post ${index}`,
        content: `This is test content for post ${index}`,
        status: 'published'
      }),
      comment: (index) => ({
        content: `Test comment ${index}`,
        status: 'approved'
      })
    };

    const generator = generators[type];
    if (!generator) {
      throw new Error(`Unknown mock data type: ${type}`);
    }

    if (count === 1) {
      return generator(1);
    }

    return Array.from({ length: count }, (_, i) => generator(i + 1));
  }

  /**
   * CSRFトークンの取得
   */
  async getCsrfToken() {
    const response = await this.request.get('/api/csrf/token');
    return response.body.csrfToken;
  }

  /**
   * セッションクッキーの取得
   */
  async getSessionCookie() {
    const response = await this.request.get('/api/auth/session');
    const cookies = response.headers['set-cookie'];
    return cookies ? cookies.find(cookie => cookie.startsWith('connect.sid')) : null;
  }
}

module.exports = new ApiTestHelper();