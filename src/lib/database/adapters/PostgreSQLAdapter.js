const { Pool } = require('pg');
const BaseAdapter = require('./BaseAdapter');

/**
 * PostgreSQLデータベースアダプター
 */
class PostgreSQLAdapter extends BaseAdapter {
  constructor(config) {
    super(config);
    this.pool = null;
  }

  /**
   * PostgreSQLデータベースに接続
   */
  async connect() {
    const poolConfig = {
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.user,
      password: this.config.password,
      ...this.config.options
    };

    this.pool = new Pool(poolConfig);
    
    // 接続テスト
    try {
      const client = await this.pool.connect();
      client.release();
      this.isConnected = true;
      return this;
    } catch (error) {
      throw new Error(`PostgreSQL connection failed: ${error.message}`);
    }
  }

  /**
   * データベース接続を閉じる
   */
  async close() {
    if (this.pool) {
      await this.pool.end();
      this.isConnected = false;
      this.pool = null;
    }
  }

  /**
   * 生のクエリを実行
   * @param {string} query - 実行するクエリ
   * @param {Array} params - クエリパラメータ
   */
  async raw(query, params = []) {
    this.ensureConnected();
    
    // PostgreSQLのパラメータプレースホルダーに変換 (? -> $1, $2, ...)
    const pgQuery = this.convertPlaceholders(query);
    
    try {
      const result = await this.pool.query(pgQuery, params);
      
      if (query.trim().toUpperCase().startsWith('SELECT')) {
        return result.rows;
      } else {
        return {
          rowCount: result.rowCount,
          rows: result.rows
        };
      }
    } catch (error) {
      throw new Error(`PostgreSQL query failed: ${error.message}`);
    }
  }

  /**
   * SELECT文を実行
   * @param {string} table - テーブル名
   * @param {Object} options - クエリオプション
   */
  async select(table, options = {}) {
    this.ensureConnected();
    
    const columns = options.select || '*';
    const whereClause = this.buildWhereClause(options.where || {});
    const selectOptions = this.buildSelectOptions(options);
    
    const query = `SELECT ${columns} FROM ${table}${whereClause.sql}${selectOptions}`;
    const result = await this.pool.query(this.convertPlaceholders(query), whereClause.params);
    
    return result.rows;
  }

  /**
   * INSERT文を実行
   * @param {string} table - テーブル名
   * @param {Object|Array} data - 挿入するデータ
   */
  async insert(table, data) {
    this.ensureConnected();
    
    const insertClause = this.buildInsertClause(data);
    const query = `INSERT INTO ${table} (${insertClause.columns}) VALUES ${insertClause.values} RETURNING *`;
    
    const result = await this.pool.query(this.convertPlaceholders(query), insertClause.params);
    
    return {
      insertId: result.rows[0]?.id,
      rowCount: result.rowCount,
      rows: result.rows
    };
  }

  /**
   * UPDATE文を実行
   * @param {string} table - テーブル名
   * @param {Object} data - 更新するデータ
   * @param {Object} where - 更新条件
   */
  async update(table, data, where) {
    this.ensureConnected();
    
    const setClause = this.buildSetClause(data);
    const whereClause = this.buildWhereClause(where);
    const query = `UPDATE ${table} SET ${setClause.sql}${whereClause.sql} RETURNING *`;
    const params = [...setClause.params, ...whereClause.params];
    
    const result = await this.pool.query(this.convertPlaceholders(query), params);
    
    return {
      rowCount: result.rowCount,
      rows: result.rows
    };
  }

  /**
   * DELETE文を実行
   * @param {string} table - テーブル名
   * @param {Object} where - 削除条件
   */
  async delete(table, where) {
    this.ensureConnected();
    
    const whereClause = this.buildWhereClause(where);
    const query = `DELETE FROM ${table}${whereClause.sql} RETURNING *`;
    
    const result = await this.pool.query(this.convertPlaceholders(query), whereClause.params);
    
    return {
      rowCount: result.rowCount,
      rows: result.rows
    };
  }

  /**
   * トランザクションを実行
   * @param {Function} callback - トランザクション内で実行する処理
   */
  async transaction(callback) {
    this.ensureConnected();
    
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // トランザクション用のアダプターを作成
      const transactionAdapter = {
        ...this,
        pool: client,
        raw: async (query, params = []) => {
          const pgQuery = this.convertPlaceholders(query);
          const result = await client.query(pgQuery, params);
          
          if (query.trim().toUpperCase().startsWith('SELECT')) {
            return result.rows;
          } else {
            return {
              rowCount: result.rowCount,
              rows: result.rows
            };
          }
        }
      };
      
      const result = await callback(transactionAdapter);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * テーブルを作成
   * @param {string} tableName - テーブル名
   * @param {Object} schema - テーブルスキーマ
   */
  async createTable(tableName, schema) {
    this.ensureConnected();
    
    const columns = Object.entries(schema).map(([name, definition]) => {
      return this.buildColumnDefinition(name, definition);
    }).join(', ');
    
    const query = `CREATE TABLE IF NOT EXISTS ${tableName} (${columns})`;
    return await this.raw(query);
  }

  /**
   * テーブルを削除
   * @param {string} tableName - テーブル名
   */
  async dropTable(tableName) {
    this.ensureConnected();
    
    const query = `DROP TABLE IF EXISTS ${tableName}`;
    return await this.raw(query);
  }

  /**
   * PostgreSQL用のカラム定義を構築
   * @param {string} name - カラム名
   * @param {Object} definition - カラム定義
   * @returns {string} カラム定義文字列
   */
  buildColumnDefinition(name, definition) {
    let sql = name;
    
    // データタイプ
    switch (definition.type) {
      case 'increments':
        sql += ' SERIAL PRIMARY KEY';
        break;
      case 'string':
        sql += ` VARCHAR${definition.length ? `(${definition.length})` : '(255)'}`;
        break;
      case 'text':
        sql += ' TEXT';
        break;
      case 'integer':
        sql += ' INTEGER';
        break;
      case 'boolean':
        sql += ' BOOLEAN';
        break;
      case 'timestamp':
        sql += ' TIMESTAMP';
        break;
      case 'json':
        sql += ' JSONB';
        break;
      default:
        sql += ` ${definition.type.toUpperCase()}`;
    }
    
    // 制約
    if (definition.primary && definition.type !== 'increments') {
      sql += ' PRIMARY KEY';
    }
    
    if (definition.unique) {
      sql += ' UNIQUE';
    }
    
    if (definition.nullable === false) {
      sql += ' NOT NULL';
    }
    
    if (definition.default !== undefined) {
      if (definition.default === 'now') {
        sql += ' DEFAULT NOW()';
      } else {
        sql += ` DEFAULT ${typeof definition.default === 'string' ? `'${definition.default}'` : definition.default}`;
      }
    }
    
    return sql;
  }

  /**
   * プレースホルダーをPostgreSQL形式に変換
   * @param {string} query - SQLクエリ
   * @returns {string} 変換されたクエリ
   */
  convertPlaceholders(query) {
    let index = 1;
    return query.replace(/\?/g, () => `$${index++}`);
  }
}

module.exports = PostgreSQLAdapter;