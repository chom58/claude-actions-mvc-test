const mysql = require('mysql2/promise');
const BaseAdapter = require('./BaseAdapter');

/**
 * MySQLデータベースアダプター
 */
class MySQLAdapter extends BaseAdapter {
  constructor(config) {
    super(config);
    this.pool = null;
  }

  /**
   * MySQLデータベースに接続
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

    this.pool = mysql.createPool(poolConfig);
    
    // 接続テスト
    try {
      const connection = await this.pool.getConnection();
      connection.release();
      this.isConnected = true;
      return this;
    } catch (error) {
      throw new Error(`MySQL connection failed: ${error.message}`);
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
    
    try {
      const [rows, fields] = await this.pool.execute(query, params);
      
      if (query.trim().toUpperCase().startsWith('SELECT')) {
        return rows;
      } else {
        return {
          affectedRows: rows.affectedRows,
          insertId: rows.insertId,
          changedRows: rows.changedRows
        };
      }
    } catch (error) {
      throw new Error(`MySQL query failed: ${error.message}`);
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
    const [rows] = await this.pool.execute(query, whereClause.params);
    
    return rows;
  }

  /**
   * INSERT文を実行
   * @param {string} table - テーブル名
   * @param {Object|Array} data - 挿入するデータ
   */
  async insert(table, data) {
    this.ensureConnected();
    
    const insertClause = this.buildInsertClause(data);
    const query = `INSERT INTO ${table} (${insertClause.columns}) VALUES ${insertClause.values}`;
    
    const [result] = await this.pool.execute(query, insertClause.params);
    
    return {
      insertId: result.insertId,
      affectedRows: result.affectedRows
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
    const query = `UPDATE ${table} SET ${setClause.sql}${whereClause.sql}`;
    const params = [...setClause.params, ...whereClause.params];
    
    const [result] = await this.pool.execute(query, params);
    
    return {
      affectedRows: result.affectedRows,
      changedRows: result.changedRows
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
    const query = `DELETE FROM ${table}${whereClause.sql}`;
    
    const [result] = await this.pool.execute(query, whereClause.params);
    
    return {
      affectedRows: result.affectedRows
    };
  }

  /**
   * トランザクションを実行
   * @param {Function} callback - トランザクション内で実行する処理
   */
  async transaction(callback) {
    this.ensureConnected();
    
    const connection = await this.pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // トランザクション用のアダプターを作成
      const transactionAdapter = {
        ...this,
        pool: connection,
        raw: async (query, params = []) => {
          const [rows, fields] = await connection.execute(query, params);
          
          if (query.trim().toUpperCase().startsWith('SELECT')) {
            return rows;
          } else {
            return {
              affectedRows: rows.affectedRows,
              insertId: rows.insertId,
              changedRows: rows.changedRows
            };
          }
        }
      };
      
      const result = await callback(transactionAdapter);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
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
    
    const query = `CREATE TABLE IF NOT EXISTS ${tableName} (${columns}) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;
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
   * MySQL用のカラム定義を構築
   * @param {string} name - カラム名
   * @param {Object} definition - カラム定義
   * @returns {string} カラム定義文字列
   */
  buildColumnDefinition(name, definition) {
    let sql = name;
    
    // データタイプ
    switch (definition.type) {
      case 'increments':
        sql += ' INT AUTO_INCREMENT PRIMARY KEY';
        break;
      case 'string':
        sql += ` VARCHAR${definition.length ? `(${definition.length})` : '(255)'}`;
        break;
      case 'text':
        sql += ' TEXT';
        break;
      case 'integer':
        sql += ' INT';
        break;
      case 'boolean':
        sql += ' BOOLEAN';
        break;
      case 'timestamp':
        sql += ' TIMESTAMP';
        break;
      case 'json':
        sql += ' JSON';
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
        sql += ' DEFAULT CURRENT_TIMESTAMP';
      } else {
        sql += ` DEFAULT ${typeof definition.default === 'string' ? `'${definition.default}'` : definition.default}`;
      }
    }
    
    return sql;
  }
}

module.exports = MySQLAdapter;