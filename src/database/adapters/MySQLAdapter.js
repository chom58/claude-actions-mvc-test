const mysql = require('mysql2/promise');
const DatabaseAdapter = require('../DatabaseAdapter');
const QueryBuilder = require('../QueryBuilder');

/**
 * MySQL データベースアダプター
 */
class MySQLAdapter extends DatabaseAdapter {
  constructor(config) {
    super(config);
    this.pool = null;
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
        port: this.config.port || 3306,
        database: this.config.database,
        user: this.config.username,
        password: this.config.password,
        connectionLimit: this.config.pool?.max || 20,
        acquireTimeout: this.config.pool?.acquire || 60000,
        timeout: this.config.pool?.idle || 10000,
        reconnect: true,
        charset: this.config.charset || 'utf8mb4',
        timezone: this.config.timezone || 'Z',
        ssl: this.config.ssl || false,
        multipleStatements: false,
        dateStrings: false
      };

      this.pool = mysql.createPool(poolConfig);
      
      // 接続テスト
      const connection = await this.pool.getConnection();
      await connection.query('SELECT 1');
      connection.release();
      
      this.isConnected = true;
      console.log('✅ MySQL接続成功');
    } catch (error) {
      console.error('❌ MySQL接続エラー:', error.message);
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
      console.log('✅ MySQL接続切断');
    } catch (error) {
      console.error('❌ MySQL切断エラー:', error.message);
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
      const [rows, fields] = await this.pool.execute(query, params);
      const duration = Date.now() - start;

      // ログ出力（開発環境のみ）
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔍 SQL実行: ${duration}ms`, { query, params });
      }

      return {
        rows: Array.isArray(rows) ? rows : [rows],
        rowCount: Array.isArray(rows) ? rows.length : (rows.affectedRows || 0),
        fields: fields,
        insertId: rows.insertId,
        affectedRows: rows.affectedRows,
        changedRows: rows.changedRows
      };
    } catch (error) {
      console.error('❌ MySQLクエリエラー:', error.message);
      throw error;
    }
  }

  /**
   * トランザクションを開始
   */
  async beginTransaction() {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      return {
        connection,
        async commit() {
          try {
            await connection.commit();
          } finally {
            connection.release();
          }
        },
        async rollback() {
          try {
            await connection.rollback();
          } finally {
            connection.release();
          }
        },
        async query(sql, params) {
          const [rows, fields] = await connection.execute(sql, params);
          return {
            rows: Array.isArray(rows) ? rows : [rows],
            rowCount: Array.isArray(rows) ? rows.length : (rows.affectedRows || 0),
            fields: fields,
            insertId: rows.insertId,
            affectedRows: rows.affectedRows
          };
        }
      };
    } catch (error) {
      connection.release();
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
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = ?
    `;
    
    const result = await this.query(query, [tableName]);
    return result.rows[0].count > 0;
  }

  /**
   * テーブルを作成
   */
  async createTable(tableName, schema) {
    const columns = Object.entries(schema).map(([name, definition]) => {
      return `${name} ${this._convertDataType(definition)}`;
    }).join(', ');

    const query = `CREATE TABLE IF NOT EXISTS \`${tableName}\` (${columns})`;
    await this.query(query);
  }

  /**
   * テーブルを削除
   */
  async dropTable(tableName) {
    const query = `DROP TABLE IF EXISTS \`${tableName}\``;
    await this.query(query);
  }

  /**
   * インデックスを作成
   */
  async createIndex(tableName, indexName, columns, options = {}) {
    const columnList = Array.isArray(columns) ? columns.map(col => `\`${col}\``).join(', ') : `\`${columns}\``;
    const unique = options.unique ? 'UNIQUE' : '';
    const indexType = options.type ? `USING ${options.type}` : '';
    
    const query = `
      CREATE ${unique} INDEX \`${indexName}\` 
      ON \`${tableName}\` (${columnList}) ${indexType}
    `;
    
    try {
      await this.query(query);
    } catch (error) {
      // インデックスが既に存在する場合は無視
      if (!error.message.includes('Duplicate key name')) {
        throw error;
      }
    }
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
      totalConnections: this.pool._allConnections.length,
      freeConnections: this.pool._freeConnections.length,
      connectionQueue: this.pool._connectionQueue.length
    };
  }

  /**
   * MySQL固有の最適化されたクエリを実行
   */
  async optimizedQuery(operation, params) {
    switch (operation) {
      case 'fullTextSearch':
        return await this._fullTextSearch(params);
      case 'jsonQuery':
        return await this._jsonQuery(params);
      case 'explain':
        return await this._explainQuery(params);
      case 'bulkInsert':
        return await this._bulkInsert(params);
      default:
        throw new Error(`未対応の操作: ${operation}`);
    }
  }

  /**
   * 全文検索
   * @private
   */
  async _fullTextSearch({ table, columns, searchTerm, mode = 'NATURAL LANGUAGE' }) {
    const columnList = Array.isArray(columns) ? columns.map(col => `\`${col}\``).join(', ') : `\`${columns}\``;
    const query = `
      SELECT *, MATCH(${columnList}) AGAINST(? IN ${mode} MODE) as relevance
      FROM \`${table}\`
      WHERE MATCH(${columnList}) AGAINST(? IN ${mode} MODE)
      ORDER BY relevance DESC
    `;
    
    return await this.query(query, [searchTerm, searchTerm]);
  }

  /**
   * JSON クエリ (MySQL 5.7+)
   * @private
   */
  async _jsonQuery({ table, column, path, value, operator = 'JSON_CONTAINS' }) {
    let query;
    let params;

    switch (operator) {
      case 'JSON_CONTAINS':
        query = `SELECT * FROM \`${table}\` WHERE JSON_CONTAINS(\`${column}\`, ?, ?)`;
        params = [JSON.stringify(value), path || '$'];
        break;
      case 'JSON_EXTRACT':
        query = `SELECT * FROM \`${table}\` WHERE JSON_EXTRACT(\`${column}\`, ?) = ?`;
        params = [path, value];
        break;
      case 'JSON_SEARCH':
        query = `SELECT * FROM \`${table}\` WHERE JSON_SEARCH(\`${column}\`, 'one', ?) IS NOT NULL`;
        params = [value];
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
  async _explainQuery({ query, params = [], format = 'TRADITIONAL' }) {
    const explainQuery = `EXPLAIN ${format !== 'TRADITIONAL' ? `FORMAT=${format}` : ''} ${query}`;
    return await this.query(explainQuery, params);
  }

  /**
   * バルクインサート
   * @private
   */
  async _bulkInsert({ table, data, options = {} }) {
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('データが空です');
    }

    const columns = Object.keys(data[0]);
    const placeholders = columns.map(() => '?').join(', ');
    const values = data.map(row => columns.map(col => row[col]));
    
    const ignore = options.ignore ? 'IGNORE' : '';
    const onDuplicate = options.onDuplicate ? `ON DUPLICATE KEY UPDATE ${options.onDuplicate}` : '';
    
    const query = `
      INSERT ${ignore} INTO \`${table}\` (\`${columns.join('`, `')}\`)
      VALUES ${values.map(() => `(${placeholders})`).join(', ')}
      ${onDuplicate}
    `;
    
    const flatParams = values.flat();
    return await this.query(query, flatParams);
  }

  /**
   * スキーマ情報を取得
   */
  async getSchema(tableName) {
    const query = `
      SELECT 
        COLUMN_NAME as column_name,
        DATA_TYPE as data_type,
        IS_NULLABLE as is_nullable,
        COLUMN_DEFAULT as column_default,
        CHARACTER_MAXIMUM_LENGTH as character_maximum_length,
        EXTRA as extra
      FROM information_schema.COLUMNS
      WHERE TABLE_NAME = ? 
      AND TABLE_SCHEMA = DATABASE()
      ORDER BY ORDINAL_POSITION
    `;
    
    const result = await this.query(query, [tableName]);
    return result.rows;
  }

  /**
   * データベース情報を取得
   */
  async getDatabaseInfo() {
    const versionQuery = 'SELECT VERSION() as version';
    const sizeQuery = `
      SELECT 
        ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size_mb
      FROM information_schema.tables 
      WHERE table_schema = DATABASE()
    `;
    const tablesQuery = `
      SELECT COUNT(*) as table_count
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
    `;

    const [version, size, tables] = await Promise.all([
      this.query(versionQuery),
      this.query(sizeQuery),
      this.query(tablesQuery)
    ]);

    return {
      version: version.rows[0].version,
      size: `${size.rows[0].size_mb} MB`,
      tableCount: parseInt(tables.rows[0].table_count),
      adapter: 'MySQL'
    };
  }

  /**
   * データ型をMySQL形式に変換
   * @private
   */
  _convertDataType(definition) {
    const type = definition.type?.toUpperCase() || 'TEXT';
    const constraints = definition.constraints || {};
    
    let mysqlType;
    switch (type) {
      case 'STRING':
        mysqlType = definition.length ? `VARCHAR(${definition.length})` : 'TEXT';
        break;
      case 'INTEGER':
        mysqlType = 'INT';
        break;
      case 'BIGINT':
        mysqlType = 'BIGINT';
        break;
      case 'FLOAT':
        mysqlType = 'FLOAT';
        break;
      case 'DOUBLE':
        mysqlType = 'DOUBLE';
        break;
      case 'DECIMAL':
        mysqlType = definition.precision ? 
          `DECIMAL(${definition.precision}, ${definition.scale || 0})` : 'DECIMAL(10,0)';
        break;
      case 'BOOLEAN':
        mysqlType = 'BOOLEAN';
        break;
      case 'DATE':
        mysqlType = 'DATETIME';
        break;
      case 'DATEONLY':
        mysqlType = 'DATE';
        break;
      case 'JSON':
        mysqlType = 'JSON';
        break;
      case 'UUID':
        mysqlType = 'CHAR(36)';
        break;
      case 'TEXT':
      default:
        mysqlType = 'TEXT';
    }

    // 制約の追加
    const constraintList = [];
    if (constraints.autoIncrement) constraintList.push('AUTO_INCREMENT');
    if (constraints.primaryKey) constraintList.push('PRIMARY KEY');
    if (constraints.unique) constraintList.push('UNIQUE');
    if (constraints.allowNull === false) constraintList.push('NOT NULL');
    if (constraints.defaultValue !== undefined) {
      constraintList.push(`DEFAULT ${this._formatDefaultValue(constraints.defaultValue)}`);
    }

    return `${mysqlType} ${constraintList.join(' ')}`.trim();
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
   * クエリビルダーを取得
   */
  getQueryBuilder() {
    return new QueryBuilder(this);
  }
}

module.exports = MySQLAdapter;