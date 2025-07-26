const sqlite3 = require('sqlite3').verbose();
const { promisify } = require('util');
const BaseAdapter = require('./BaseAdapter');

/**
 * SQLiteデータベースアダプター
 */
class SQLiteAdapter extends BaseAdapter {
  constructor(config) {
    super(config);
    this.db = null;
  }

  /**
   * SQLiteデータベースに接続
   */
  async connect() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.config.filename, (err) => {
        if (err) {
          reject(err);
          return;
        }

        this.isConnected = true;
        
        // 外部キー制約を有効化
        if (this.config.options?.enableForeignKeys) {
          this.db.run('PRAGMA foreign_keys = ON');
        }

        // ビジータイムアウト設定
        if (this.config.options?.busyTimeout) {
          this.db.run(`PRAGMA busy_timeout = ${this.config.options.busyTimeout}`);
        }

        resolve(this);
      });
    });
  }

  /**
   * データベース接続を閉じる
   */
  async close() {
    if (this.db) {
      return new Promise((resolve, reject) => {
        this.db.close((err) => {
          if (err) {
            reject(err);
            return;
          }
          this.isConnected = false;
          this.db = null;
          resolve();
        });
      });
    }
  }

  /**
   * 生のクエリを実行
   * @param {string} query - 実行するクエリ
   * @param {Array} params - クエリパラメータ
   */
  async raw(query, params = []) {
    this.ensureConnected();
    
    const method = query.trim().toUpperCase().startsWith('SELECT') ? 'all' : 'run';
    
    return new Promise((resolve, reject) => {
      this.db[method](query, params, function(err, result) {
        if (err) {
          reject(err);
          return;
        }
        
        if (method === 'run') {
          resolve({
            changes: this.changes,
            lastID: this.lastID
          });
        } else {
          resolve(result);
        }
      });
    });
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
    
    return new Promise((resolve, reject) => {
      this.db.all(query, whereClause.params, (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows);
      });
    });
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
    
    return new Promise((resolve, reject) => {
      this.db.run(query, insertClause.params, function(err) {
        if (err) {
          reject(err);
          return;
        }
        
        resolve({
          insertId: this.lastID,
          changes: this.changes
        });
      });
    });
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
    
    return new Promise((resolve, reject) => {
      this.db.run(query, params, function(err) {
        if (err) {
          reject(err);
          return;
        }
        
        resolve({
          changes: this.changes
        });
      });
    });
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
    
    return new Promise((resolve, reject) => {
      this.db.run(query, whereClause.params, function(err) {
        if (err) {
          reject(err);
          return;
        }
        
        resolve({
          changes: this.changes
        });
      });
    });
  }

  /**
   * トランザクションを実行
   * @param {Function} callback - トランザクション内で実行する処理
   */
  async transaction(callback) {
    this.ensureConnected();
    
    await this.raw('BEGIN TRANSACTION');
    
    try {
      const result = await callback(this);
      await this.raw('COMMIT');
      return result;
    } catch (error) {
      await this.raw('ROLLBACK');
      throw error;
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
   * SQLite用のカラム定義を構築
   * @param {string} name - カラム名
   * @param {Object} definition - カラム定義
   * @returns {string} カラム定義文字列
   */
  buildColumnDefinition(name, definition) {
    let sql = name;
    
    // データタイプ
    switch (definition.type) {
      case 'increments':
        sql += ' INTEGER PRIMARY KEY AUTOINCREMENT';
        break;
      case 'string':
        sql += ` TEXT${definition.length ? `(${definition.length})` : ''}`;
        break;
      case 'text':
        sql += ' TEXT';
        break;
      case 'integer':
        sql += ' INTEGER';
        break;
      case 'boolean':
        sql += ' INTEGER';
        break;
      case 'timestamp':
        sql += ' DATETIME';
        break;
      case 'json':
        sql += ' TEXT';
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

module.exports = SQLiteAdapter;