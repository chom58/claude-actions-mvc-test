const { Pool, Client } = require('pg');
const DatabaseAdapter = require('../DatabaseAdapter');
const QueryBuilder = require('../QueryBuilder');

/**
 * PostgreSQL データベースアダプター
 */
class PostgreSQLAdapter extends DatabaseAdapter {
  constructor(config) {
    super(config);
    this.pool = null;
    this.client = null;
    this.queryBuilder = new QueryBuilder(this);
  }

  /**
   * データベースに接続
   */
  async connect() {
    try {
      // 接続プールの設定
      const poolConfig = {
        host: this.config.host || 'localhost',
        port: this.config.port || 5432,
        database: this.config.database,
        user: this.config.username,
        password: this.config.password,
        max: this.config.pool?.max || 20,
        min: this.config.pool?.min || 5,
        idle: this.config.pool?.idle || 10000,
        acquire: this.config.pool?.acquire || 60000,
        evict: this.config.pool?.evict || 1000,
        ssl: this.config.ssl || false
      };

      this.pool = new Pool(poolConfig);
      
      // 接続テスト
      this.client = await this.pool.connect();
      await this.client.query('SELECT NOW()');
      this.client.release();
      
      this.isConnected = true;
      console.log('✅ PostgreSQL接続成功');
    } catch (error) {
      console.error('❌ PostgreSQL接続エラー:', error.message);
      throw error;
    }
  }

  /**
   * データベース接続を切断
   */
  async disconnect() {
    try {
      if (this.pool) {
        await this.pool.end();
        this.pool = null;
      }
      this.isConnected = false;
      console.log('✅ PostgreSQL接続切断');
    } catch (error) {
      console.error('❌ PostgreSQL切断エラー:', error.message);
      throw error;
    }
  }

  /**
   * クエリを実行
   */
  async query(query, params = []) {
    if (!this.pool) {
      throw new Error('データベースに接続されていません');
    }

    try {
      const start = Date.now();
      const result = await this.pool.query(query, params);
      const duration = Date.now() - start;

      // ログ出力（開発環境のみ）
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔍 SQL実行: ${duration}ms`, { query, params });
      }

      return {
        rows: result.rows,
        rowCount: result.rowCount,
        fields: result.fields,
        command: result.command
      };
    } catch (error) {
      console.error('❌ PostgreSQLクエリエラー:', error.message);
      throw error;
    }
  }

  /**
   * トランザクションを開始
   */
  async beginTransaction() {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      return {
        client,
        async commit() {
          try {
            await client.query('COMMIT');
          } finally {
            client.release();
          }
        },
        async rollback() {
          try {
            await client.query('ROLLBACK');
          } finally {
            client.release();
          }
        },
        async query(sql, params) {
          return await client.query(sql, params);
        }
      };
    } catch (error) {
      client.release();
      throw error;
    }
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
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      )
    `;
    
    const result = await this.query(query, [tableName]);
    return result.rows[0].exists;
  }

  /**
   * テーブルを作成
   */
  async createTable(tableName, schema) {
    const columns = Object.entries(schema).map(([name, definition]) => {
      return `${name} ${this._convertDataType(definition)}`;
    }).join(', ');

    const query = `CREATE TABLE IF NOT EXISTS ${tableName} (${columns})`;
    await this.query(query);
  }

  /**
   * テーブルを削除
   */
  async dropTable(tableName) {
    const query = `DROP TABLE IF EXISTS ${tableName} CASCADE`;
    await this.query(query);
  }

  /**
   * インデックスを作成
   */
  async createIndex(tableName, indexName, columns, options = {}) {
    const columnList = Array.isArray(columns) ? columns.join(', ') : columns;
    const unique = options.unique ? 'UNIQUE' : '';
    const method = options.method ? `USING ${options.method}` : '';
    
    const query = `
      CREATE ${unique} INDEX IF NOT EXISTS ${indexName} 
      ON ${tableName} ${method} (${columnList})
    `;
    
    await this.query(query);
  }

  /**
   * 接続統計情報を取得
   */
  async getConnectionStats() {
    if (!this.pool) {
      return { connected: false };
    }

    return {
      connected: true,
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount
    };
  }

  /**
   * PostgreSQL固有の最適化されたクエリを実行
   */
  async optimizedQuery(operation, params) {
    switch (operation) {
      case 'fullTextSearch':
        return await this._fullTextSearch(params);
      case 'jsonQuery':
        return await this._jsonQuery(params);
      case 'arrayQuery':
        return await this._arrayQuery(params);
      case 'explain':
        return await this._explainQuery(params);
      default:
        throw new Error(`未対応の操作: ${operation}`);
    }
  }

  /**
   * 全文検索
   * @private
   */
  async _fullTextSearch({ table, columns, searchTerm, language = 'english' }) {
    const columnList = Array.isArray(columns) ? columns.join(' || \' \' || ') : columns;
    const query = `
      SELECT *, ts_rank(to_tsvector($1, ${columnList}), plainto_tsquery($1, $2)) as rank
      FROM ${table}
      WHERE to_tsvector($1, ${columnList}) @@ plainto_tsquery($1, $2)
      ORDER BY rank DESC
    `;
    
    return await this.query(query, [language, searchTerm]);
  }

  /**
   * JSON クエリ
   * @private
   */
  async _jsonQuery({ table, column, path, value, operator = '@>' }) {
    const query = `
      SELECT * FROM ${table}
      WHERE ${column} ${operator} $1
    `;
    
    const jsonValue = typeof value === 'string' ? value : JSON.stringify(value);
    return await this.query(query, [jsonValue]);
  }

  /**
   * 配列クエリ
   * @private
   */
  async _arrayQuery({ table, column, values, operator = '&&' }) {
    const query = `
      SELECT * FROM ${table}
      WHERE ${column} ${operator} $1
    `;
    
    return await this.query(query, [values]);
  }

  /**
   * クエリ実行計画の取得
   * @private
   */
  async _explainQuery({ query, params = [], analyze = false }) {
    const explainQuery = `EXPLAIN ${analyze ? 'ANALYZE' : ''} ${query}`;
    return await this.query(explainQuery, params);
  }

  /**
   * スキーマ情報を取得
   */
  async getSchema(tableName) {
    const query = `
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length
      FROM information_schema.columns
      WHERE table_name = $1
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `;
    
    const result = await this.query(query, [tableName]);
    return result.rows;
  }

  /**
   * データベース情報を取得
   */
  async getDatabaseInfo() {
    const versionQuery = 'SELECT version()';
    const sizeQuery = `
      SELECT pg_size_pretty(pg_database_size(current_database())) as size
    `;
    const tablesQuery = `
      SELECT COUNT(*) as table_count
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `;

    const [version, size, tables] = await Promise.all([
      this.query(versionQuery),
      this.query(sizeQuery),
      this.query(tablesQuery)
    ]);

    return {
      version: version.rows[0].version,
      size: size.rows[0].size,
      tableCount: parseInt(tables.rows[0].table_count),
      adapter: 'PostgreSQL'
    };
  }

  /**
   * データ型をPostgreSQL形式に変換
   * @private
   */
  _convertDataType(definition) {
    const type = definition.type?.toUpperCase() || 'TEXT';
    const constraints = definition.constraints || {};
    
    let pgType;
    switch (type) {
      case 'STRING':
        pgType = definition.length ? `VARCHAR(${definition.length})` : 'TEXT';
        break;
      case 'INTEGER':
        pgType = constraints.autoIncrement ? 'SERIAL' : 'INTEGER';
        break;
      case 'BIGINT':
        pgType = constraints.autoIncrement ? 'BIGSERIAL' : 'BIGINT';
        break;
      case 'FLOAT':
        pgType = 'REAL';
        break;
      case 'DOUBLE':
        pgType = 'DOUBLE PRECISION';
        break;
      case 'DECIMAL':
        pgType = definition.precision ? 
          `DECIMAL(${definition.precision}, ${definition.scale || 0})` : 'DECIMAL';
        break;
      case 'BOOLEAN':
        pgType = 'BOOLEAN';
        break;
      case 'DATE':
        pgType = 'TIMESTAMP WITH TIME ZONE';
        break;
      case 'DATEONLY':
        pgType = 'DATE';
        break;
      case 'JSON':
        pgType = 'JSON';
        break;
      case 'JSONB':
        pgType = 'JSONB';
        break;
      case 'UUID':
        pgType = 'UUID';
        break;
      case 'TEXT':
      default:
        pgType = 'TEXT';
    }

    // 制約の追加
    const constraintList = [];
    if (constraints.primaryKey) constraintList.push('PRIMARY KEY');
    if (constraints.unique) constraintList.push('UNIQUE');
    if (constraints.allowNull === false) constraintList.push('NOT NULL');
    if (constraints.defaultValue !== undefined) {
      constraintList.push(`DEFAULT ${this._formatDefaultValue(constraints.defaultValue)}`);
    }

    return `${pgType} ${constraintList.join(' ')}`.trim();
  }

  /**
   * デフォルト値をフォーマット
   * @private
   */
  _formatDefaultValue(value) {
    if (value === null) return 'NULL';
    if (typeof value === 'string') return `'${value}'`;
    if (typeof value === 'boolean') return value.toString();
    if (typeof value === 'number') return value.toString();
    return `'${value}'`;
  }

  /**
   * クエリビルダーを取得
   */
  getQueryBuilder() {
    return new QueryBuilder(this);
  }
}

module.exports = PostgreSQLAdapter;