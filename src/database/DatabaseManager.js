const PostgreSQLAdapter = require('./adapters/PostgreSQLAdapter');
const MySQLAdapter = require('./adapters/MySQLAdapter');
const SQLiteAdapter = require('./adapters/SQLiteAdapter');

/**
 * データベース管理システム
 * 
 * 複数のデータベースアダプターを管理し、統一されたインターフェースを提供
 */
class DatabaseManager {
  constructor() {
    this.adapters = new Map();
    this.defaultAdapter = null;
    this.connectionPoolStats = new Map();
  }

  /**
   * アダプターを登録
   * @param {string} name - アダプター名
   * @param {Object} config - データベース設定
   * @param {boolean} isDefault - デフォルトアダプターとして設定するか
   */
  async registerAdapter(name, config, isDefault = false) {
    const adapter = this._createAdapter(config);
    
    try {
      await adapter.connect();
      this.adapters.set(name, adapter);
      
      if (isDefault || this.adapters.size === 1) {
        this.defaultAdapter = name;
      }
      
      console.log(`✅ アダプター '${name}' を登録しました`);
      return adapter;
    } catch (error) {
      console.error(`❌ アダプター '${name}' の登録に失敗:`, error.message);
      throw error;
    }
  }

  /**
   * アダプターを取得
   * @param {string} name - アダプター名（省略時はデフォルト）
   * @returns {DatabaseAdapter}
   */
  getAdapter(name = null) {
    const adapterName = name || this.defaultAdapter;
    
    if (!adapterName) {
      throw new Error('アダプターが指定されておらず、デフォルトアダプターも設定されていません');
    }
    
    const adapter = this.adapters.get(adapterName);
    if (!adapter) {
      throw new Error(`アダプター '${adapterName}' が見つかりません`);
    }
    
    return adapter;
  }

  /**
   * 設定からアダプターを作成
   * @private
   */
  _createAdapter(config) {
    const dialect = config.dialect?.toLowerCase();
    
    switch (dialect) {
      case 'postgres':
      case 'postgresql':
        return new PostgreSQLAdapter(config);
      case 'mysql':
      case 'mariadb':
        return new MySQLAdapter(config);
      case 'sqlite':
      case 'sqlite3':
        return new SQLiteAdapter(config);
      default:
        throw new Error(`未対応のデータベース: ${dialect}`);
    }
  }

  /**
   * 環境設定からアダプターを初期化
   * @param {Object} environments - 環境設定
   * @param {string} currentEnv - 現在の環境
   */
  async initializeFromConfig(environments, currentEnv = 'development') {
    if (!environments || typeof environments !== 'object') {
      throw new Error('無効な環境設定です');
    }

    const envConfig = environments[currentEnv];
    if (!envConfig) {
      throw new Error(`環境 '${currentEnv}' の設定が見つかりません`);
    }

    // メインデータベースの初期化
    await this.registerAdapter('main', envConfig, true);

    // 読み取り専用レプリカがあれば追加
    if (envConfig.replica) {
      await this.registerAdapter('replica', envConfig.replica);
    }

    // テスト用データベースがあれば追加
    if (environments.test && currentEnv !== 'test') {
      try {
        await this.registerAdapter('test', environments.test);
      } catch (error) {
        console.warn('テストデータベースの初期化に失敗:', error.message);
      }
    }
  }

  /**
   * クエリを実行（デフォルトアダプター使用）
   * @param {string} query - SQLクエリ
   * @param {Array} params - パラメーター
   * @returns {Promise<Object>}
   */
  async query(query, params = []) {
    const adapter = this.getAdapter();
    return await adapter.query(query, params);
  }

  /**
   * トランザクションを実行
   * @param {Function} callback - トランザクション内で実行する関数
   * @param {string} adapterName - 使用するアダプター名
   * @returns {Promise<*>}
   */
  async transaction(callback, adapterName = null) {
    const adapter = this.getAdapter(adapterName);
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
   * 複数データベースでの分散クエリを実行
   * @param {Array} queries - [{adapter, query, params}]の配列
   * @returns {Promise<Array>}
   */
  async distributedQuery(queries) {
    const promises = queries.map(async ({ adapter: adapterName, query, params = [] }) => {
      const adapter = this.getAdapter(adapterName);
      return await adapter.query(query, params);
    });
    
    return await Promise.all(promises);
  }

  /**
   * 読み書き分離でクエリを実行
   * @param {string} query - SQLクエリ
   * @param {Array} params - パラメーター
   * @param {boolean} forceMain - メインDBを強制使用
   * @returns {Promise<Object>}
   */
  async smartQuery(query, params = [], forceMain = false) {
    const isWriteQuery = /^\s*(INSERT|UPDATE|DELETE|CREATE|DROP|ALTER)/i.test(query);
    
    if (isWriteQuery || forceMain) {
      return await this.query(query, params);
    }
    
    // 読み取り専用クエリはレプリカを優先
    try {
      const replicaAdapter = this.getAdapter('replica');
      return await replicaAdapter.query(query, params);
    } catch (error) {
      // レプリカが利用できない場合はメインを使用
      console.warn('レプリカでのクエリ実行に失敗、メインDBを使用:', error.message);
      return await this.query(query, params);
    }
  }

  /**
   * 全アダプターのヘルスチェック
   * @returns {Promise<Object>}
   */
  async healthCheck() {
    const results = {};
    
    for (const [name, adapter] of this.adapters) {
      try {
        results[name] = await adapter.healthCheck();
      } catch (error) {
        results[name] = {
          status: 'error',
          healthy: false,
          error: error.message,
          adapter: adapter.constructor.name
        };
      }
    }
    
    return {
      timestamp: new Date().toISOString(),
      adapters: results,
      overallHealth: Object.values(results).every(r => r.healthy)
    };
  }

  /**
   * 接続統計情報を取得
   * @returns {Promise<Object>}
   */
  async getConnectionStats() {
    const stats = {};
    
    for (const [name, adapter] of this.adapters) {
      try {
        stats[name] = await adapter.getConnectionStats();
      } catch (error) {
        stats[name] = { error: error.message };
      }
    }
    
    return stats;
  }

  /**
   * データベース情報を取得
   * @param {string} adapterName - アダプター名
   * @returns {Promise<Object>}
   */
  async getDatabaseInfo(adapterName = null) {
    const adapter = this.getAdapter(adapterName);
    return await adapter.getDatabaseInfo();
  }

  /**
   * マイグレーション実行
   * @param {string} direction - 'up' または 'down'
   * @param {Array} migrations - マイグレーションファイル
   * @param {string} adapterName - 対象アダプター
   * @returns {Promise<void>}
   */
  async runMigrations(direction = 'up', migrations = [], adapterName = null) {
    const adapter = this.getAdapter(adapterName);
    
    // マイグレーション履歴テーブルの作成
    await this._ensureMigrationsTable(adapter);
    
    for (const migration of migrations) {
      try {
        if (direction === 'up') {
          await this._runMigrationUp(adapter, migration);
        } else {
          await this._runMigrationDown(adapter, migration);
        }
      } catch (error) {
        console.error(`マイグレーション ${migration.name} でエラー:`, error.message);
        throw error;
      }
    }
  }

  /**
   * マイグレーション履歴テーブルを作成
   * @private
   */
  async _ensureMigrationsTable(adapter) {
    const schema = {
      id: {
        type: 'INTEGER',
        constraints: { primaryKey: true, autoIncrement: true }
      },
      name: {
        type: 'STRING',
        constraints: { allowNull: false, unique: true }
      },
      executed_at: {
        type: 'DATE',
        constraints: { allowNull: false }
      }
    };
    
    await adapter.createTable('migrations', schema);
  }

  /**
   * マイグレーションを実行（UP）
   * @private
   */
  async _runMigrationUp(adapter, migration) {
    // 既に実行済みかチェック
    const existingQuery = 'SELECT name FROM migrations WHERE name = ?';
    const existing = await adapter.query(existingQuery, [migration.name]);
    
    if (existing.rows.length > 0) {
      console.log(`⏭️  マイグレーション ${migration.name} は既に実行済み`);
      return;
    }
    
    // マイグレーション実行
    await migration.up(adapter);
    
    // 履歴に記録
    const insertQuery = 'INSERT INTO migrations (name, executed_at) VALUES (?, ?)';
    await adapter.query(insertQuery, [migration.name, new Date()]);
    
    console.log(`✅ マイグレーション ${migration.name} を実行しました`);
  }

  /**
   * マイグレーションを実行（DOWN）
   * @private
   */
  async _runMigrationDown(adapter, migration) {
    // 実行済みかチェック
    const existingQuery = 'SELECT name FROM migrations WHERE name = ?';
    const existing = await adapter.query(existingQuery, [migration.name]);
    
    if (existing.rows.length === 0) {
      console.log(`⏭️  マイグレーション ${migration.name} は未実行`);
      return;
    }
    
    // マイグレーション実行
    await migration.down(adapter);
    
    // 履歴から削除
    const deleteQuery = 'DELETE FROM migrations WHERE name = ?';
    await adapter.query(deleteQuery, [migration.name]);
    
    console.log(`✅ マイグレーション ${migration.name} をロールバックしました`);
  }

  /**
   * クエリビルダーを取得
   * @param {string} adapterName - アダプター名
   * @returns {QueryBuilder}
   */
  getQueryBuilder(adapterName = null) {
    const adapter = this.getAdapter(adapterName);
    return adapter.getQueryBuilder();
  }

  /**
   * 全アダプターを切断
   * @returns {Promise<void>}
   */
  async disconnect() {
    const promises = Array.from(this.adapters.values()).map(adapter => 
      adapter.disconnect().catch(error => 
        console.error('アダプター切断エラー:', error.message)
      )
    );
    
    await Promise.all(promises);
    this.adapters.clear();
    this.defaultAdapter = null;
    
    console.log('✅ 全データベース接続を切断しました');
  }

  /**
   * 登録されているアダプター一覧を取得
   * @returns {Array}
   */
  getAdapterList() {
    return Array.from(this.adapters.keys());
  }

  /**
   * デフォルトアダプターを変更
   * @param {string} name - アダプター名
   */
  setDefaultAdapter(name) {
    if (!this.adapters.has(name)) {
      throw new Error(`アダプター '${name}' が見つかりません`);
    }
    
    this.defaultAdapter = name;
    console.log(`✅ デフォルトアダプターを '${name}' に変更しました`);
  }
}

// シングルトンインスタンス
const dbManager = new DatabaseManager();

module.exports = dbManager;