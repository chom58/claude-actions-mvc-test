const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const DatabaseAdapter = require('../DatabaseAdapter');
const QueryBuilder = require('../QueryBuilder');

/**
 * SQLite データベースアダプター
 */
class SQLiteAdapter extends DatabaseAdapter {
  constructor(config) {
    super(config);
    this.db = null;
    this.queryBuilder = new QueryBuilder(this);
  }

  /**
   * データベースに接続
   */
  async connect() {
    try {
      const dbPath = this.config.storage || ':memory:';
      
      this.db = await open({
        filename: dbPath,
        driver: sqlite3.Database
      });

      // SQLiteの設定
      await this.db.exec('PRAGMA foreign_keys = ON');
      await this.db.exec('PRAGMA journal_mode = WAL');
      await this.db.exec('PRAGMA synchronous = NORMAL');
      await this.db.exec('PRAGMA cache_size = 1000');
      await this.db.exec('PRAGMA temp_store = MEMORY');

      // 接続テスト
      await this.db.get('SELECT 1');
      
      this.isConnected = true;
      console.log('✅ SQLite接続成功');
    } catch (error) {
      console.error('❌ SQLite接続エラー:', error.message);
      throw error;
    }
  }

  /**
   * データベース接続を切断
   */
  async disconnect() {
    try {
      if (this.db) {
        await this.db.close();
        this.db = null;
      }
      this.isConnected = false;
      console.log('✅ SQLite接続切断');
    } catch (error) {
      console.error('❌ SQLite切断エラー:', error.message);
      throw error;
    }
  }

  /**
   * クエリを実行
   */
  async query(query, params = []) {
    if (!this.db) {
      throw new Error('データベースに接続されていません');
    }

    try {
      const start = Date.now();
      const normalizedQuery = query.trim().toUpperCase();
      let result;

      if (normalizedQuery.startsWith('SELECT') || normalizedQuery.startsWith('WITH')) {
        result = await this.db.all(query, params);
        const duration = Date.now() - start;

        // ログ出力（開発環境のみ）
        if (process.env.NODE_ENV === 'development') {
          console.log(`🔍 SQL実行: ${duration}ms`, { query, params });
        }

        return {
          rows: result,
          rowCount: result.length,
          fields: Object.keys(result[0] || {}).map(name => ({ name }))
        };
      } else {
        result = await this.db.run(query, params);
        const duration = Date.now() - start;

        // ログ出力（開発環境のみ）
        if (process.env.NODE_ENV === 'development') {
          console.log(`🔍 SQL実行: ${duration}ms`, { query, params });
        }

        return {
          rows: [],
          rowCount: result.changes || 0,
          lastID: result.lastID,
          changes: result.changes
        };
      }
    } catch (error) {
      console.error('❌ SQLiteクエリエラー:', error.message);
      throw error;
    }
  }

  /**
   * トランザクションを開始
   */
  async beginTransaction() {
    await this.db.exec('BEGIN TRANSACTION');
    
    return {
      db: this.db,
      async commit() {
        await this.db.exec('COMMIT');
      },
      async rollback() {
        await this.db.exec('ROLLBACK');
      },
      async query(sql, params) {
        const normalizedQuery = sql.trim().toUpperCase();
        
        if (normalizedQuery.startsWith('SELECT') || normalizedQuery.startsWith('WITH')) {
          const result = await this.db.all(sql, params);
          return {
            rows: result,
            rowCount: result.length
          };
        } else {
          const result = await this.db.run(sql, params);
          return {
            rows: [],
            rowCount: result.changes || 0,
            lastID: result.lastID,
            changes: result.changes
          };
        }
      }
    };
  }

  /**
   * トランザクションをコミット
   */
  async commitTransaction(transaction) {
    await transaction.commit();
  }

  /**
   * トランザクションをロールバック
   */
  async rollbackTransaction(transaction) {
    await transaction.rollback();
  }

  /**
   * テーブルが存在するかチェック
   */
  async tableExists(tableName) {
    const query = `
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name=?
    `;
    
    const result = await this.query(query, [tableName]);
    return result.rows.length > 0;
  }

  /**
   * テーブルを作成
   */
  async createTable(tableName, schema) {
    const columns = Object.entries(schema).map(([name, definition]) => {
      return `${name} ${this._convertDataType(definition)}`;
    }).join(', ');

    const query = `CREATE TABLE IF NOT EXISTS "${tableName}" (${columns})`;
    await this.query(query);
  }

  /**
   * テーブルを削除
   */
  async dropTable(tableName) {
    const query = `DROP TABLE IF EXISTS "${tableName}"`;
    await this.query(query);
  }

  /**
   * インデックスを作成
   */
  async createIndex(tableName, indexName, columns, options = {}) {
    const columnList = Array.isArray(columns) ? columns.map(col => `"${col}"`).join(', ') : `"${columns}"`;
    const unique = options.unique ? 'UNIQUE' : '';
    
    const query = `
      CREATE ${unique} INDEX IF NOT EXISTS "${indexName}" 
      ON "${tableName}" (${columnList})
    `;
    
    await this.query(query);
  }

  /**
   * 接続統計情報を取得
   */
  async getConnectionStats() {
    if (!this.db) {
      return { connected: false };
    }

    // SQLiteは単一接続なので基本的な情報のみ
    return {
      connected: true,
      adapter: 'SQLite',
      database: this.config.storage || ':memory:'
    };
  }

  /**
   * SQLite固有の最適化されたクエリを実行
   */
  async optimizedQuery(operation, params) {
    switch (operation) {
      case 'fullTextSearch':
        return await this._fullTextSearch(params);
      case 'jsonQuery':
        return await this._jsonQuery(params);
      case 'explain':
        return await this._explainQuery(params);
      case 'vacuum':
        return await this._vacuum();
      case 'analyze':
        return await this._analyze(params);
      default:
        throw new Error(`未対応の操作: ${operation}`);
    }
  }

  /**
   * 全文検索 (FTS5を使用)
   * @private
   */
  async _fullTextSearch({ table, columns, searchTerm, ftsTable }) {
    // FTSテーブルが指定されている場合
    if (ftsTable) {
      const query = `
        SELECT ${table}.*, rank
        FROM ${ftsTable}
        JOIN ${table} ON ${table}.id = ${ftsTable}.rowid
        WHERE ${ftsTable} MATCH ?
        ORDER BY rank
      `;
      return await this.query(query, [searchTerm]);
    }

    // 通常のLIKE検索
    const columnList = Array.isArray(columns) ? columns : [columns];
    const conditions = columnList.map(col => `"${col}" LIKE ?`).join(' OR ');
    const likeParams = columnList.map(() => `%${searchTerm}%`);
    
    const query = `SELECT * FROM "${table}" WHERE ${conditions}`;
    return await this.query(query, likeParams);
  }

  /**
   * JSON クエリ (SQLite 3.38+)
   * @private
   */
  async _jsonQuery({ table, column, path, value, operator = 'json_extract' }) {
    let query;
    let params;

    switch (operator) {
      case 'json_extract':
        query = `SELECT * FROM "${table}" WHERE json_extract("${column}", ?) = ?`;
        params = [path, value];
        break;
      case 'json_type':
        query = `SELECT * FROM "${table}" WHERE json_type("${column}", ?) = ?`;
        params = [path, value];
        break;
      case 'json_valid':
        query = `SELECT * FROM "${table}" WHERE json_valid("${column}") = 1`;
        params = [];
        break;
      default:
        throw new Error(`未対応のJSON演算子: ${operator}`);
    }
    
    return await this.query(query, params);
  }

  /**
   * クエリ実行計画の取得
   * @private
   */
  async _explainQuery({ query, params = [] }) {
    const explainQuery = `EXPLAIN QUERY PLAN ${query}`;
    return await this.query(explainQuery, params);
  }

  /**
   * VACUUM実行
   * @private
   */
  async _vacuum() {
    return await this.query('VACUUM');
  }

  /**
   * ANALYZE実行
   * @private
   */
  async _analyze(params = {}) {
    const table = params.table;
    const query = table ? `ANALYZE "${table}"` : 'ANALYZE';
    return await this.query(query);
  }

  /**
   * スキーマ情報を取得
   */
  async getSchema(tableName) {
    const query = `PRAGMA table_info("${tableName}")`;
    const result = await this.query(query);
    
    return result.rows.map(row => ({
      column_name: row.name,
      data_type: row.type,
      is_nullable: row.notnull === 0 ? 'YES' : 'NO',
      column_default: row.dflt_value,
      primary_key: row.pk === 1
    }));
  }

  /**
   * データベース情報を取得
   */
  async getDatabaseInfo() {
    const versionQuery = 'SELECT sqlite_version() as version';
    const sizeQuery = 'PRAGMA page_count';
    const pageSizeQuery = 'PRAGMA page_size';
    const tablesQuery = `
      SELECT COUNT(*) as table_count
      FROM sqlite_master
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `;

    const [version, pageCount, pageSize, tables] = await Promise.all([
      this.query(versionQuery),
      this.query(sizeQuery),
      this.query(pageSizeQuery),
      this.query(tablesQuery)
    ]);

    const totalSize = (pageCount.rows[0].page_count * pageSize.rows[0].page_size) / 1024 / 1024;

    return {
      version: version.rows[0].version,
      size: `${totalSize.toFixed(2)} MB`,
      tableCount: parseInt(tables.rows[0].table_count),
      adapter: 'SQLite',
      database: this.config.storage || ':memory:'
    };
  }

  /**
   * データ型をSQLite形式に変換
   * @private
   */
  _convertDataType(definition) {
    const type = definition.type?.toUpperCase() || 'TEXT';
    const constraints = definition.constraints || {};
    
    let sqliteType;
    switch (type) {
      case 'STRING':
      case 'TEXT':
        sqliteType = 'TEXT';
        break;
      case 'INTEGER':
      case 'BIGINT':
        sqliteType = 'INTEGER';
        break;
      case 'FLOAT':
      case 'DOUBLE':
      case 'DECIMAL':
        sqliteType = 'REAL';
        break;
      case 'BOOLEAN':
        sqliteType = 'INTEGER'; // SQLiteはBOOLEANをINTEGERとして保存
        break;
      case 'DATE':
      case 'DATEONLY':
        sqliteType = 'TEXT'; // SQLiteは日付をTEXTまたはINTEGERで保存
        break;
      case 'JSON':
        sqliteType = 'TEXT'; // SQLiteはJSONをTEXTとして保存
        break;
      case 'UUID':
        sqliteType = 'TEXT';
        break;
      default:
        sqliteType = 'TEXT';
    }

    // 制約の追加
    const constraintList = [];
    if (constraints.primaryKey) constraintList.push('PRIMARY KEY');
    if (constraints.autoIncrement) constraintList.push('AUTOINCREMENT');
    if (constraints.unique) constraintList.push('UNIQUE');
    if (constraints.allowNull === false) constraintList.push('NOT NULL');
    if (constraints.defaultValue !== undefined) {
      constraintList.push(`DEFAULT ${this._formatDefaultValue(constraints.defaultValue)}`);
    }

    return `${sqliteType} ${constraintList.join(' ')}`.trim();
  }

  /**
   * デフォルト値をフォーマット
   * @private
   */
  _formatDefaultValue(value) {
    if (value === null) return 'NULL';
    if (typeof value === 'string') return `'${value}'`;
    if (typeof value === 'boolean') return value ? '1' : '0';
    if (typeof value === 'number') return value.toString();
    return `'${value}'`;
  }

  /**
   * FTSテーブルを作成
   */
  async createFTSTable(tableName, columns, ftsVersion = 5) {
    const ftsTableName = `${tableName}_fts`;
    const columnList = Array.isArray(columns) ? columns.join(', ') : columns;
    
    const query = `
      CREATE VIRTUAL TABLE IF NOT EXISTS "${ftsTableName}" 
      USING fts${ftsVersion}(${columnList})
    `;
    
    await this.query(query);
    return ftsTableName;
  }

  /**
   * クエリビルダーを取得
   */
  getQueryBuilder() {
    return new QueryBuilder(this);
  }
}

module.exports = SQLiteAdapter;