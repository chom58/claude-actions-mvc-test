/**
 * すべてのデータベースアダプターの基底クラス
 */
class BaseAdapter {
  constructor(config) {
    this.config = config;
    this.connection = null;
    this.isConnected = false;
  }

  /**
   * データベースに接続（サブクラスで実装）
   */
  async connect() {
    throw new Error('connect() method must be implemented by subclass');
  }

  /**
   * データベース接続を閉じる（サブクラスで実装）
   */
  async close() {
    throw new Error('close() method must be implemented by subclass');
  }

  /**
   * 生のクエリを実行（サブクラスで実装）
   * @param {string} query - 実行するクエリ
   * @param {Array} params - クエリパラメータ
   */
  async raw(query, params = []) {
    throw new Error('raw() method must be implemented by subclass');
  }

  /**
   * SELECT文を実行（サブクラスで実装）
   * @param {string} table - テーブル名
   * @param {Object} options - クエリオプション
   */
  async select(table, options = {}) {
    throw new Error('select() method must be implemented by subclass');
  }

  /**
   * INSERT文を実行（サブクラスで実装）
   * @param {string} table - テーブル名
   * @param {Object|Array} data - 挿入するデータ
   */
  async insert(table, data) {
    throw new Error('insert() method must be implemented by subclass');
  }

  /**
   * UPDATE文を実行（サブクラスで実装）
   * @param {string} table - テーブル名
   * @param {Object} data - 更新するデータ
   * @param {Object} where - 更新条件
   */
  async update(table, data, where) {
    throw new Error('update() method must be implemented by subclass');
  }

  /**
   * DELETE文を実行（サブクラスで実装）
   * @param {string} table - テーブル名
   * @param {Object} where - 削除条件
   */
  async delete(table, where) {
    throw new Error('delete() method must be implemented by subclass');
  }

  /**
   * トランザクションを実行（サブクラスで実装）
   * @param {Function} callback - トランザクション内で実行する処理
   */
  async transaction(callback) {
    throw new Error('transaction() method must be implemented by subclass');
  }

  /**
   * テーブルを作成（サブクラスで実装）
   * @param {string} tableName - テーブル名
   * @param {Object} schema - テーブルスキーマ
   */
  async createTable(tableName, schema) {
    throw new Error('createTable() method must be implemented by subclass');
  }

  /**
   * テーブルを削除（サブクラスで実装）
   * @param {string} tableName - テーブル名
   */
  async dropTable(tableName) {
    throw new Error('dropTable() method must be implemented by subclass');
  }

  /**
   * WHERE句を構築するヘルパーメソッド
   * @param {Object} where - WHERE条件
   * @returns {Object} {sql, params}
   */
  buildWhereClause(where) {
    if (!where || Object.keys(where).length === 0) {
      return { sql: '', params: [] };
    }

    const conditions = [];
    const params = [];

    Object.entries(where).forEach(([key, value]) => {
      if (value === null) {
        conditions.push(`${key} IS NULL`);
      } else if (Array.isArray(value)) {
        conditions.push(`${key} IN (${value.map(() => '?').join(', ')})`);
        params.push(...value);
      } else if (typeof value === 'object' && value.operator) {
        conditions.push(`${key} ${value.operator} ?`);
        params.push(value.value);
      } else {
        conditions.push(`${key} = ?`);
        params.push(value);
      }
    });

    return {
      sql: conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '',
      params
    };
  }

  /**
   * SET句を構築するヘルパーメソッド
   * @param {Object} data - 更新データ
   * @returns {Object} {sql, params}
   */
  buildSetClause(data) {
    const keys = Object.keys(data);
    const placeholders = keys.map(key => `${key} = ?`).join(', ');
    const params = Object.values(data);

    return {
      sql: placeholders,
      params
    };
  }

  /**
   * INSERT文のVALUES句を構築するヘルパーメソッド
   * @param {Object|Array} data - 挿入データ
   * @returns {Object} {columns, values, params}
   */
  buildInsertClause(data) {
    if (Array.isArray(data)) {
      // 複数行挿入
      if (data.length === 0) {
        throw new Error('Cannot insert empty array');
      }

      const columns = Object.keys(data[0]);
      const values = data.map(() => `(${columns.map(() => '?').join(', ')})`).join(', ');
      const params = data.flatMap(row => columns.map(col => row[col]));

      return {
        columns: columns.join(', '),
        values,
        params
      };
    } else {
      // 単一行挿入
      const columns = Object.keys(data);
      const values = `(${columns.map(() => '?').join(', ')})`;
      const params = Object.values(data);

      return {
        columns: columns.join(', '),
        values,
        params
      };
    }
  }

  /**
   * SELECT文のOPTIONS句を構築するヘルパーメソッド
   * @param {Object} options - クエリオプション
   * @returns {string} SQL文字列
   */
  buildSelectOptions(options) {
    let sql = '';

    if (options.orderBy) {
      if (Array.isArray(options.orderBy)) {
        sql += ` ORDER BY ${options.orderBy.join(', ')}`;
      } else {
        sql += ` ORDER BY ${options.orderBy}`;
      }
    }

    if (options.limit) {
      sql += ` LIMIT ${options.limit}`;
    }

    if (options.offset) {
      sql += ` OFFSET ${options.offset}`;
    }

    return sql;
  }

  /**
   * 接続状態をチェック
   */
  ensureConnected() {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }
  }
}

module.exports = BaseAdapter;