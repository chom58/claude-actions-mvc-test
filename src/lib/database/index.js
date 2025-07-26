const DatabaseManager = require('./DatabaseManager');
const QueryBuilder = require('./QueryBuilder');
const MigrationManager = require('./MigrationManager');
const config = require('../../config/database-abstraction');

// グローバルなデータベースマネージャーインスタンス
let dbManager = null;

/**
 * データベース抽象化レイヤーのメインエクスポート
 */
class Database {
  constructor() {
    if (!dbManager) {
      dbManager = new DatabaseManager(config);
    }
    this.manager = dbManager;
  }

  /**
   * データベース接続を初期化
   */
  async init() {
    return await this.manager.connect();
  }

  /**
   * 指定されたテーブルのクエリビルダーを取得
   * @param {string} tableName - テーブル名
   * @returns {QueryBuilder} クエリビルダーインスタンス
   */
  table(tableName) {
    return new QueryBuilder(this.manager, tableName);
  }

  /**
   * 生のクエリを実行
   * @param {string} query - 実行するクエリ
   * @param {Array} params - クエリパラメータ
   * @returns {Promise} クエリ結果
   */
  async raw(query, params = []) {
    return await this.manager.raw(query, params);
  }

  /**
   * トランザクションを開始
   * @param {Function} callback - トランザクション内で実行する処理
   * @returns {Promise} トランザクション結果
   */
  async transaction(callback) {
    return await this.manager.transaction(callback);
  }

  /**
   * データベース接続を閉じる
   */
  async close() {
    return await this.manager.close();
  }

  /**
   * マイグレーションマネージャーを取得
   * @returns {MigrationManager} マイグレーションマネージャー
   */
  get migrations() {
    return new MigrationManager(this.manager);
  }

  /**
   * 現在の接続情報を取得
   * @returns {Object} 接続情報
   */
  getConnectionInfo() {
    return this.manager.getConnectionInfo();
  }

  /**
   * データベースの種類を取得
   * @returns {string} データベースタイプ
   */
  getDriverType() {
    return this.manager.getDriverType();
  }
}

// シングルトンインスタンスを作成
const db = new Database();

module.exports = db;