/**
 * データベース抽象化レイヤーと既存Sequelizeモデルの橋渡し
 * 
 * 既存のSequelizeベースのアプリケーションを新しいデータベース抽象化レイヤーと統合
 */

const DatabaseManager = require('./DatabaseManager');
const SequelizeAdapter = require('./SequelizeAdapter');

/**
 * Sequelizeインスタンスを新しいデータベース抽象化レイヤーに統合
 * @param {Object} sequelize - Sequelizeインスタンス
 * @param {Object} models - モデルオブジェクト
 * @param {string} adapterName - アダプター名
 */
async function integrateLegacySequelize(sequelize, models, adapterName = 'legacy') {
  try {
    // SequelizeAdapterを作成
    const sequelizeAdapter = new SequelizeAdapter(sequelize);
    
    // データベースマネージャーに登録
    await DatabaseManager.registerAdapter(adapterName, {
      dialect: sequelize.getDialect(),
      instance: sequelize
    });
    
    // 実際のアダプターを置き換え
    DatabaseManager.adapters.set(adapterName, sequelizeAdapter);
    
    console.log(`✅ Sequelizeインスタンスを '${adapterName}' として統合しました`);
    
    return {
      adapter: sequelizeAdapter,
      models,
      sequelize
    };
  } catch (error) {
    console.error('❌ Sequelize統合エラー:', error.message);
    throw error;
  }
}

/**
 * モデルアクセスヘルパー
 */
class ModelHelper {
  constructor(adapter, models) {
    this.adapter = adapter;
    this.models = models;
  }

  /**
   * モデルを取得
   * @param {string} modelName - モデル名
   */
  getModel(modelName) {
    if (!this.models[modelName]) {
      throw new Error(`モデル ${modelName} が見つかりません`);
    }
    return this.models[modelName];
  }

  /**
   * 新しいクエリビルダーでモデルをクエリ
   * @param {string} modelName - モデル名
   */
  query(modelName) {
    const model = this.getModel(modelName);
    const qb = this.adapter.getQueryBuilder();
    
    // モデルのテーブル名を設定
    qb.from(model.getTableName());
    
    return qb;
  }

  /**
   * 統計情報を取得
   */
  async getStats() {
    const modelNames = Object.keys(this.models);
    const stats = {};
    
    for (const modelName of modelNames) {
      try {
        const model = this.models[modelName];
        const count = await model.count();
        stats[modelName] = { count };
      } catch (error) {
        stats[modelName] = { error: error.message };
      }
    }
    
    return {
      totalModels: modelNames.length,
      models: stats
    };
  }

  /**
   * データベースマイグレーション情報
   */
  async getMigrationStatus() {
    try {
      const sequelize = this.adapter.getSequelizeInstance();
      const queryInterface = sequelize.getQueryInterface();
      
      // マイグレーションテーブルが存在するかチェック
      const tables = await queryInterface.showAllTables();
      const hasMigrationTable = tables.includes('SequelizeMeta');
      
      if (!hasMigrationTable) {
        return {
          status: 'no_migration_table',
          message: 'マイグレーションテーブルが見つかりません'
        };
      }
      
      // 実行済みマイグレーション一覧
      const [results] = await sequelize.query('SELECT name FROM "SequelizeMeta" ORDER BY name');
      
      return {
        status: 'active',
        executedMigrations: results.map(r => r.name),
        count: results.length
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }
}

/**
 * 統合されたデータベースインターフェース
 */
class IntegratedDatabase {
  constructor() {
    this.adapters = new Map();
    this.helpers = new Map();
  }

  /**
   * レガシーSequelizeの統合
   */
  async integrateLegacy(sequelize, models, adapterName = 'legacy') {
    const integration = await integrateLegacySequelize(sequelize, models, adapterName);
    const helper = new ModelHelper(integration.adapter, integration.models);
    
    this.adapters.set(adapterName, integration.adapter);
    this.helpers.set(adapterName, helper);
    
    return {
      adapter: integration.adapter,
      helper,
      models: integration.models
    };
  }

  /**
   * 新しいアダプターの追加
   */
  async addAdapter(name, config) {
    const adapter = await DatabaseManager.registerAdapter(name, config);
    this.adapters.set(name, adapter);
    return adapter;
  }

  /**
   * アダプターを取得
   */
  getAdapter(name) {
    return this.adapters.get(name) || DatabaseManager.getAdapter(name);
  }

  /**
   * モデルヘルパーを取得
   */
  getHelper(adapterName) {
    return this.helpers.get(adapterName);
  }

  /**
   * 統一されたクエリインターフェース
   */
  async query(sql, params = [], adapterName = null) {
    const adapter = adapterName ? this.getAdapter(adapterName) : DatabaseManager.getAdapter();
    return await adapter.query(sql, params);
  }

  /**
   * 統一されたトランザクション
   */
  async transaction(callback, adapterName = null) {
    const adapter = adapterName ? this.getAdapter(adapterName) : DatabaseManager.getAdapter();
    const transaction = await adapter.beginTransaction();
    
    try {
      const result = await callback(transaction);
      await adapter.commitTransaction(transaction);
      return result;
    } catch (error) {
      await adapter.rollbackTransaction(transaction);
      throw error;
    }
  }

  /**
   * 全体のヘルスチェック
   */
  async healthCheck() {
    const results = {};
    
    // DatabaseManagerのヘルスチェック
    const dbManagerHealth = await DatabaseManager.healthCheck();
    results.databaseManager = dbManagerHealth;
    
    // 各アダプターのヘルスチェック
    for (const [name, adapter] of this.adapters) {
      try {
        results[name] = await adapter.healthCheck();
      } catch (error) {
        results[name] = {
          status: 'error',
          healthy: false,
          error: error.message
        };
      }
    }
    
    // 各ヘルパーの統計情報
    for (const [name, helper] of this.helpers) {
      try {
        results[`${name}_stats`] = await helper.getStats();
      } catch (error) {
        results[`${name}_stats`] = { error: error.message };
      }
    }
    
    return {
      timestamp: new Date().toISOString(),
      overallHealth: Object.values(results).every(r => 
        r.healthy !== false && !r.error
      ),
      details: results
    };
  }

  /**
   * 設定情報の表示
   */
  getConfiguration() {
    const config = {
      adapters: Array.from(this.adapters.keys()),
      helpers: Array.from(this.helpers.keys()),
      databaseManager: {
        adapters: DatabaseManager.getAdapterList(),
        defaultAdapter: DatabaseManager.defaultAdapter
      }
    };
    
    return config;
  }

  /**
   * グレースフルシャットダウン
   */
  async shutdown() {
    console.log('🔄 統合データベースシステムをシャットダウン中...');
    
    // 各アダプターを切断
    for (const [name, adapter] of this.adapters) {
      try {
        await adapter.disconnect();
        console.log(`✅ アダプター '${name}' を切断しました`);
      } catch (error) {
        console.error(`❌ アダプター '${name}' の切断エラー:`, error.message);
      }
    }
    
    // DatabaseManagerを切断
    await DatabaseManager.disconnect();
    
    console.log('✅ 統合データベースシステムのシャットダウン完了');
  }
}

// シングルトンインスタンス
const integratedDB = new IntegratedDatabase();

module.exports = {
  IntegratedDatabase,
  ModelHelper,
  integrateLegacySequelize,
  integratedDB
};