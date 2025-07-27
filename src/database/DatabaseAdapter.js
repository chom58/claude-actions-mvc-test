/**
 * データベース抽象化レイヤーの基底クラス
 * 
 * 異なるデータベース間で統一されたインターフェースを提供
 */
class DatabaseAdapter {
  constructor(config) {
    this.config = config;
    this.connection = null;
    this.isConnected = false;
    this.queryBuilder = null;
  }

  /**
   * データベースに接続
   * @returns {Promise<void>}
   */
  async connect() {
    throw new Error('connect() method must be implemented by subclass');
  }

  /**
   * データベース接続を切断
   * @returns {Promise<void>}
   */
  async disconnect() {
    throw new Error('disconnect() method must be implemented by subclass');
  }

  /**
   * クエリを実行
   * @param {string} query - SQL クエリ
   * @param {Array} params - パラメーター
   * @returns {Promise<Object>}
   */
  async query(query, params = []) {
    throw new Error('query() method must be implemented by subclass');
  }

  /**
   * トランザクションを開始
   * @returns {Promise<Object>}
   */
  async beginTransaction() {
    throw new Error('beginTransaction() method must be implemented by subclass');
  }

  /**
   * トランザクションをコミット
   * @param {Object} transaction - トランザクションオブジェクト
   * @returns {Promise<void>}
   */
  async commitTransaction(transaction) {
    throw new Error('commitTransaction() method must be implemented by subclass');
  }

  /**
   * トランザクションをロールバック
   * @param {Object} transaction - トランザクションオブジェクト
   * @returns {Promise<void>}
   */
  async rollbackTransaction(transaction) {
    throw new Error('rollbackTransaction() method must be implemented by subclass');
  }

  /**
   * テーブルが存在するかチェック
   * @param {string} tableName - テーブル名
   * @returns {Promise<boolean>}
   */
  async tableExists(tableName) {
    throw new Error('tableExists() method must be implemented by subclass');
  }

  /**
   * テーブルを作成
   * @param {string} tableName - テーブル名
   * @param {Object} schema - テーブルスキーマ
   * @returns {Promise<void>}
   */
  async createTable(tableName, schema) {
    throw new Error('createTable() method must be implemented by subclass');
  }

  /**
   * テーブルを削除
   * @param {string} tableName - テーブル名
   * @returns {Promise<void>}
   */
  async dropTable(tableName) {
    throw new Error('dropTable() method must be implemented by subclass');
  }

  /**
   * インデックスを作成
   * @param {string} tableName - テーブル名
   * @param {string} indexName - インデックス名
   * @param {Array} columns - カラム配列
   * @param {Object} options - オプション
   * @returns {Promise<void>}
   */
  async createIndex(tableName, indexName, columns, options = {}) {
    throw new Error('createIndex() method must be implemented by subclass');
  }

  /**
   * ヘルスチェック
   * @returns {Promise<Object>}
   */
  async healthCheck() {
    try {
      if (!this.isConnected) {
        return { status: 'disconnected', healthy: false };
      }

      const startTime = Date.now();
      await this.query('SELECT 1 as health_check');
      const responseTime = Date.now() - startTime;

      return {
        status: 'connected',
        healthy: true,
        responseTime,
        adapter: this.constructor.name
      };
    } catch (error) {
      return {
        status: 'error',
        healthy: false,
        error: error.message,
        adapter: this.constructor.name
      };
    }
  }

  /**
   * 接続統計情報を取得
   * @returns {Promise<Object>}
   */
  async getConnectionStats() {
    throw new Error('getConnectionStats() method must be implemented by subclass');
  }

  /**
   * データベース固有の最適化されたクエリを実行
   * @param {string} operation - 操作名
   * @param {Object} params - パラメーター
   * @returns {Promise<Object>}
   */
  async optimizedQuery(operation, params) {
    throw new Error('optimizedQuery() method must be implemented by subclass');
  }

  /**
   * スキーマ情報を取得
   * @param {string} tableName - テーブル名
   * @returns {Promise<Object>}
   */
  async getSchema(tableName) {
    throw new Error('getSchema() method must be implemented by subclass');
  }

  /**
   * データベース情報を取得
   * @returns {Promise<Object>}
   */
  async getDatabaseInfo() {
    throw new Error('getDatabaseInfo() method must be implemented by subclass');
  }
}

module.exports = DatabaseAdapter;