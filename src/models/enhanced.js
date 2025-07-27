/**
 * 拡張されたモデルインデックス
 * 
 * 既存のSequelizeモデルと新しいデータベース抽象化レイヤーの統合
 */

// 既存のモデルとSequelizeインスタンス
const originalModels = require('./index');
const { integratedDB } = require('../database/bridge');

/**
 * 統合されたモデルシステムの初期化
 */
class EnhancedModels {
  constructor() {
    this.initialized = false;
    this.models = {};
    this.sequelize = null;
    this.adapter = null;
    this.helper = null;
  }

  /**
   * システムの初期化
   */
  async initialize() {
    if (this.initialized) {
      return this;
    }

    try {
      // 既存のSequelizeインスタンスとモデルを取得
      this.sequelize = originalModels.sequelize;
      this.models = { ...originalModels };
      delete this.models.sequelize;
      delete this.models.syncDatabase;

      // 新しいデータベース抽象化レイヤーと統合
      const integration = await integratedDB.integrateLegacy(
        this.sequelize, 
        this.models, 
        'main'
      );

      this.adapter = integration.adapter;
      this.helper = integration.helper;
      this.initialized = true;

      console.log('✅ 拡張モデルシステムが初期化されました');
      return this;
    } catch (error) {
      console.error('❌ 拡張モデルシステム初期化エラー:', error.message);
      throw error;
    }
  }

  /**
   * モデルを取得（従来の方法と互換性あり）
   */
  getModel(modelName) {
    if (!this.initialized) {
      throw new Error('システムが初期化されていません。initialize()を呼び出してください。');
    }
    return this.helper.getModel(modelName);
  }

  /**
   * 新しいクエリビルダーでモデルをクエリ
   */
  query(modelName) {
    if (!this.initialized) {
      throw new Error('システムが初期化されていません。initialize()を呼び出してください。');
    }
    return this.helper.query(modelName);
  }

  /**
   * 直接SQLクエリを実行
   */
  async sql(query, params = []) {
    if (!this.initialized) {
      throw new Error('システムが初期化されていません。initialize()を呼び出してください。');
    }
    return await this.adapter.query(query, params);
  }

  /**
   * トランザクションを実行
   */
  async transaction(callback) {
    if (!this.initialized) {
      throw new Error('システムが初期化されていません。initialize()を呼び出してください。');
    }

    const transaction = await this.adapter.beginTransaction();
    
    try {
      const result = await callback(transaction, this.models);
      await transaction.commit();
      return result;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * データベース統計情報を取得
   */
  async getStats() {
    if (!this.initialized) {
      throw new Error('システムが初期化されていません。initialize()を呼び出してください。');
    }
    return await this.helper.getStats();
  }

  /**
   * マイグレーション状況を取得
   */
  async getMigrationStatus() {
    if (!this.initialized) {
      throw new Error('システムが初期化されていません。initialize()を呼び出してください。');
    }
    return await this.helper.getMigrationStatus();
  }

  /**
   * ヘルスチェック
   */
  async healthCheck() {
    if (!this.initialized) {
      return {
        status: 'not_initialized',
        healthy: false,
        message: 'システムが初期化されていません'
      };
    }

    try {
      const adapterHealth = await this.adapter.healthCheck();
      const stats = await this.getStats();
      
      return {
        status: 'operational',
        healthy: adapterHealth.healthy,
        adapter: adapterHealth,
        models: stats,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'error',
        healthy: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * データベースを同期（従来のsyncDatabase互換）
   */
  async syncDatabase() {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      await this.sequelize.authenticate();
      console.log('データベース接続が確立されました');
      
      if (process.env.NODE_ENV !== 'production') {
        await this.sequelize.sync({ alter: true });
        console.log('データベーススキーマが同期されました');
      }
      
      return true;
    } catch (error) {
      console.error('データベース同期エラー:', error);
      throw error;
    }
  }

  /**
   * 全てのモデルを取得
   */
  getAllModels() {
    if (!this.initialized) {
      throw new Error('システムが初期化されていません。initialize()を呼び出してください。');
    }
    return this.models;
  }

  /**
   * Sequelizeインスタンスを取得
   */
  getSequelize() {
    return this.sequelize;
  }

  /**
   * データベースアダプターを取得
   */
  getAdapter() {
    return this.adapter;
  }

  /**
   * システム情報を取得
   */
  getSystemInfo() {
    return {
      initialized: this.initialized,
      modelCount: Object.keys(this.models).length,
      adapterType: this.adapter?.constructor?.name,
      sequelizeDialect: this.sequelize?.getDialect()
    };
  }
}

// シングルトンインスタンス
const enhancedModels = new EnhancedModels();

// 従来のインターフェースとの互換性のためのプロキシ
const compatibilityProxy = new Proxy(enhancedModels, {
  get(target, prop) {
    // システムが初期化されていない場合は自動初期化を試行
    if (!target.initialized && typeof target[prop] === 'function') {
      console.warn('⚠️  拡張モデルシステムが初期化されていません。自動初期化を実行します。');
      target.initialize().catch(error => {
        console.error('❌ 自動初期化エラー:', error.message);
      });
    }

    // メソッドの場合はそのまま返す
    if (typeof target[prop] === 'function') {
      return target[prop].bind(target);
    }

    // 既存のモデルアクセス（User, Post等）
    if (target.models && target.models[prop]) {
      return target.models[prop];
    }

    // sequelizeプロパティ
    if (prop === 'sequelize') {
      return target.sequelize;
    }

    // syncDatabaseプロパティ（従来互換性）
    if (prop === 'syncDatabase') {
      return target.syncDatabase.bind(target);
    }

    // その他のプロパティ
    return target[prop];
  }
});

module.exports = compatibilityProxy;