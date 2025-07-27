const { sequelize } = require('../../src/models');
const fs = require('fs').promises;
const path = require('path');

class DbTestHelper {
  constructor() {
    this.sequelize = sequelize;
    this.models = sequelize.models;
  }

  /**
   * データベースのリセット（全テーブル削除・再作成）
   */
  async resetDatabase() {
    try {
      await this.sequelize.sync({ force: true });
      console.log('Database reset completed');
    } catch (error) {
      console.error('Database reset failed:', error);
      throw error;
    }
  }

  /**
   * トランザクションを使用したテスト実行
   */
  async withTransaction(callback) {
    const transaction = await this.sequelize.transaction();
    
    try {
      const result = await callback(transaction);
      await transaction.rollback(); // テスト後は必ずロールバック
      return result;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * シードデータの投入
   */
  async seedDatabase(seedFile = 'test-seed.js') {
    const seedPath = path.join(__dirname, '..', 'fixtures', seedFile);
    
    try {
      const seedData = require(seedPath);
      
      for (const [modelName, records] of Object.entries(seedData)) {
        const model = this.models[modelName];
        if (model) {
          await model.bulkCreate(records, { 
            individualHooks: true,
            validate: true 
          });
          console.log(`Seeded ${records.length} ${modelName} records`);
        }
      }
    } catch (error) {
      console.error('Seeding failed:', error);
      throw error;
    }
  }

  /**
   * 特定のテーブルをクリア
   */
  async clearTable(modelName) {
    const model = this.models[modelName];
    if (!model) {
      throw new Error(`Model ${modelName} not found`);
    }
    
    await model.destroy({ where: {}, truncate: true, force: true });
  }

  /**
   * 全テーブルをクリア
   */
  async clearAllTables() {
    const modelNames = Object.keys(this.models);
    
    // 外部キー制約を一時的に無効化
    await this.sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    
    try {
      for (const modelName of modelNames) {
        await this.clearTable(modelName);
      }
    } finally {
      // 外部キー制約を再度有効化
      await this.sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    }
  }

  /**
   * テストデータのファクトリー
   */
  async createTestData(modelName, data = {}, options = {}) {
    const model = this.models[modelName];
    if (!model) {
      throw new Error(`Model ${modelName} not found`);
    }

    const defaults = this.getDefaultsForModel(modelName);
    const mergedData = { ...defaults, ...data };
    
    return await model.create(mergedData, options);
  }

  /**
   * 複数のテストデータを作成
   */
  async createManyTestData(modelName, count, dataGenerator = () => ({})) {
    const records = [];
    
    for (let i = 0; i < count; i++) {
      const data = typeof dataGenerator === 'function' 
        ? dataGenerator(i) 
        : dataGenerator;
      
      const record = await this.createTestData(modelName, data);
      records.push(record);
    }
    
    return records;
  }

  /**
   * モデルごとのデフォルト値
   */
  getDefaultsForModel(modelName) {
    const defaults = {
      User: {
        username: `test_user_${Date.now()}`,
        email: `test_${Date.now()}@example.com`,
        password: 'Test123!@#',
        isActive: true,
        role: 'user'
      },
      Post: {
        title: 'Test Post',
        content: 'Test content',
        status: 'published'
      },
      DesignCompany: {
        name: 'Test Design Company',
        description: 'Test description',
        location: 'Tokyo',
        website: 'https://example.com'
      },
      ApparelBrand: {
        name: 'Test Brand',
        description: 'Test brand description',
        category: 'streetwear'
      }
    };

    return defaults[modelName] || {};
  }

  /**
   * アソシエーションを含むデータ作成
   */
  async createWithAssociations(modelName, data, associations = {}) {
    const record = await this.createTestData(modelName, data);
    
    for (const [associationName, associationData] of Object.entries(associations)) {
      if (Array.isArray(associationData)) {
        // HasMany関係
        for (const item of associationData) {
          await record[`create${associationName}`](item);
        }
      } else {
        // BelongsTo/HasOne関係
        await record[`set${associationName}`](associationData);
      }
    }
    
    return await record.reload({
      include: Object.keys(associations).map(name => ({
        association: name
      }))
    });
  }

  /**
   * データベースの状態を検証
   */
  async assertDatabaseState(expectations) {
    for (const [modelName, expectedCount] of Object.entries(expectations)) {
      const model = this.models[modelName];
      if (model) {
        const count = await model.count();
        expect(count).toBe(expectedCount);
      }
    }
  }

  /**
   * SQLクエリの実行
   */
  async executeQuery(query, options = {}) {
    return await this.sequelize.query(query, {
      type: this.sequelize.QueryTypes.SELECT,
      ...options
    });
  }

  /**
   * データベース接続のテスト
   */
  async testConnection() {
    try {
      await this.sequelize.authenticate();
      return true;
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }

  /**
   * マイグレーションの実行状態を確認
   */
  async checkMigrations() {
    try {
      const [migrations] = await this.sequelize.query(
        'SELECT * FROM SequelizeMeta ORDER BY name',
        { type: this.sequelize.QueryTypes.SELECT }
      );
      return migrations;
    } catch (error) {
      // SequelizeMetaテーブルが存在しない場合
      return [];
    }
  }
}

module.exports = new DbTestHelper();