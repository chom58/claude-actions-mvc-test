const SQLiteAdapter = require('./adapters/SQLiteAdapter');
const PostgreSQLAdapter = require('./adapters/PostgreSQLAdapter');
const MySQLAdapter = require('./adapters/MySQLAdapter');
const MongoDBAdapter = require('./adapters/MongoDBAdapter');
const RedisAdapter = require('./adapters/RedisAdapter');

/**
 * データベース接続を管理するクラス
 */
class DatabaseManager {
  constructor(config) {
    this.config = config;
    this.adapter = null;
    this.connectionInfo = null;
  }

  /**
   * 設定に基づいてデータベースに接続
   */
  async connect() {
    const connectionName = this.config.default;
    const connectionConfig = this.config.connections[connectionName];
    
    if (!connectionConfig) {
      throw new Error(`Database connection '${connectionName}' not found in configuration`);
    }

    this.connectionInfo = {
      name: connectionName,
      driver: connectionConfig.driver,
      config: connectionConfig
    };

    // 適切なアダプターを作成
    this.adapter = this.createAdapter(connectionConfig);
    
    // 接続を確立
    await this.adapter.connect();
    
    console.log(`Database connected: ${connectionName} (${connectionConfig.driver})`);
    return this.adapter;
  }

  /**
   * データベースタイプに応じたアダプターを作成
   * @param {Object} config - データベース設定
   * @returns {BaseAdapter} データベースアダプター
   */
  createAdapter(config) {
    switch (config.driver) {
      case 'sqlite3':
        return new SQLiteAdapter(config);
      case 'pg':
        return new PostgreSQLAdapter(config);
      case 'mysql2':
        return new MySQLAdapter(config);
      case 'mongodb':
        return new MongoDBAdapter(config);
      case 'redis':
        return new RedisAdapter(config);
      default:
        throw new Error(`Unsupported database driver: ${config.driver}`);
    }
  }

  /**
   * 生のクエリを実行
   * @param {string} query - 実行するクエリ
   * @param {Array} params - クエリパラメータ
   * @returns {Promise} クエリ結果
   */
  async raw(query, params = []) {
    this.ensureConnected();
    return await this.adapter.raw(query, params);
  }

  /**
   * SELECT文を実行
   * @param {string} table - テーブル名
   * @param {Object} options - クエリオプション
   * @returns {Promise} 検索結果
   */
  async select(table, options = {}) {
    this.ensureConnected();
    return await this.adapter.select(table, options);
  }

  /**
   * INSERT文を実行
   * @param {string} table - テーブル名
   * @param {Object|Array} data - 挿入するデータ
   * @returns {Promise} 挿入結果
   */
  async insert(table, data) {
    this.ensureConnected();
    return await this.adapter.insert(table, data);
  }

  /**
   * UPDATE文を実行
   * @param {string} table - テーブル名
   * @param {Object} data - 更新するデータ
   * @param {Object} where - 更新条件
   * @returns {Promise} 更新結果
   */
  async update(table, data, where) {
    this.ensureConnected();
    return await this.adapter.update(table, data, where);
  }

  /**
   * DELETE文を実行
   * @param {string} table - テーブル名
   * @param {Object} where - 削除条件
   * @returns {Promise} 削除結果
   */
  async delete(table, where) {
    this.ensureConnected();
    return await this.adapter.delete(table, where);
  }

  /**
   * トランザクションを実行
   * @param {Function} callback - トランザクション内で実行する処理
   * @returns {Promise} トランザクション結果
   */
  async transaction(callback) {
    this.ensureConnected();
    return await this.adapter.transaction(callback);
  }

  /**
   * テーブルを作成
   * @param {string} tableName - テーブル名
   * @param {Object} schema - テーブルスキーマ
   * @returns {Promise} 作成結果
   */
  async createTable(tableName, schema) {
    this.ensureConnected();
    return await this.adapter.createTable(tableName, schema);
  }

  /**
   * テーブルを削除
   * @param {string} tableName - テーブル名
   * @returns {Promise} 削除結果
   */
  async dropTable(tableName) {
    this.ensureConnected();
    return await this.adapter.dropTable(tableName);
  }

  /**
   * データベース接続を閉じる
   */
  async close() {
    if (this.adapter) {
      await this.adapter.close();
      this.adapter = null;
      this.connectionInfo = null;
      console.log('Database connection closed');
    }
  }

  /**
   * 接続が確立されているかチェック
   */
  ensureConnected() {
    if (!this.adapter) {
      throw new Error('Database not connected. Call connect() first.');
    }
  }

  /**
   * 接続情報を取得
   * @returns {Object} 接続情報
   */
  getConnectionInfo() {
    return this.connectionInfo;
  }

  /**
   * データベースドライバーのタイプを取得
   * @returns {string} ドライバータイプ
   */
  getDriverType() {
    return this.connectionInfo ? this.connectionInfo.driver : null;
  }

  /**
   * 現在のアダプターを取得
   * @returns {BaseAdapter} 現在のアダプター
   */
  getAdapter() {
    return this.adapter;
  }
}

module.exports = DatabaseManager;