/**
 * 統一されたクエリビルダー
 * 
 * データベース非依存のクエリを構築し、実行時に各データベース固有のSQLに変換
 */
class QueryBuilder {
  constructor(adapter) {
    this.adapter = adapter;
    this.reset();
  }

  /**
   * ビルダーをリセット
   */
  reset() {
    this.queryType = null;
    this.tableName = null;
    this.selectFields = ['*'];
    this.whereConditions = [];
    this.joinClauses = [];
    this.orderByFields = [];
    this.groupByFields = [];
    this.havingConditions = [];
    this.limitValue = null;
    this.offsetValue = null;
    this.insertData = null;
    this.updateData = null;
    this.params = [];
    return this;
  }

  /**
   * SELECT クエリを開始
   * @param {string|Array} fields - 選択するフィールド
   * @returns {QueryBuilder}
   */
  select(fields = ['*']) {
    this.queryType = 'SELECT';
    this.selectFields = Array.isArray(fields) ? fields : [fields];
    return this;
  }

  /**
   * INSERT クエリを開始
   * @param {Object} data - 挿入データ
   * @returns {QueryBuilder}
   */
  insert(data) {
    this.queryType = 'INSERT';
    this.insertData = data;
    return this;
  }

  /**
   * UPDATE クエリを開始
   * @param {Object} data - 更新データ
   * @returns {QueryBuilder}
   */
  update(data) {
    this.queryType = 'UPDATE';
    this.updateData = data;
    return this;
  }

  /**
   * DELETE クエリを開始
   * @returns {QueryBuilder}
   */
  delete() {
    this.queryType = 'DELETE';
    return this;
  }

  /**
   * FROM句を指定
   * @param {string} table - テーブル名
   * @returns {QueryBuilder}
   */
  from(table) {
    this.tableName = table;
    return this;
  }

  /**
   * INTO句を指定（INSERT用）
   * @param {string} table - テーブル名
   * @returns {QueryBuilder}
   */
  into(table) {
    this.tableName = table;
    return this;
  }

  /**
   * WHERE句を追加
   * @param {string} field - フィールド名
   * @param {string} operator - 演算子
   * @param {*} value - 値
   * @returns {QueryBuilder}
   */
  where(field, operator, value) {
    if (arguments.length === 2) {
      value = operator;
      operator = '=';
    }
    
    this.whereConditions.push({
      type: 'AND',
      field,
      operator,
      value
    });
    
    return this;
  }

  /**
   * OR WHERE句を追加
   * @param {string} field - フィールド名
   * @param {string} operator - 演算子
   * @param {*} value - 値
   * @returns {QueryBuilder}
   */
  orWhere(field, operator, value) {
    if (arguments.length === 2) {
      value = operator;
      operator = '=';
    }
    
    this.whereConditions.push({
      type: 'OR',
      field,
      operator,
      value
    });
    
    return this;
  }

  /**
   * WHERE IN句を追加
   * @param {string} field - フィールド名
   * @param {Array} values - 値の配列
   * @returns {QueryBuilder}
   */
  whereIn(field, values) {
    this.whereConditions.push({
      type: 'AND',
      field,
      operator: 'IN',
      value: values
    });
    
    return this;
  }

  /**
   * WHERE BETWEEN句を追加
   * @param {string} field - フィールド名
   * @param {*} min - 最小値
   * @param {*} max - 最大値
   * @returns {QueryBuilder}
   */
  whereBetween(field, min, max) {
    this.whereConditions.push({
      type: 'AND',
      field,
      operator: 'BETWEEN',
      value: [min, max]
    });
    
    return this;
  }

  /**
   * WHERE LIKE句を追加
   * @param {string} field - フィールド名
   * @param {string} pattern - パターン
   * @returns {QueryBuilder}
   */
  whereLike(field, pattern) {
    this.whereConditions.push({
      type: 'AND',
      field,
      operator: 'LIKE',
      value: pattern
    });
    
    return this;
  }

  /**
   * JOIN句を追加
   * @param {string} table - テーブル名
   * @param {string} condition - 結合条件
   * @param {string} type - 結合タイプ（INNER, LEFT, RIGHT, FULL）
   * @returns {QueryBuilder}
   */
  join(table, condition, type = 'INNER') {
    this.joinClauses.push({
      type: type.toUpperCase(),
      table,
      condition
    });
    
    return this;
  }

  /**
   * LEFT JOIN句を追加
   * @param {string} table - テーブル名
   * @param {string} condition - 結合条件
   * @returns {QueryBuilder}
   */
  leftJoin(table, condition) {
    return this.join(table, condition, 'LEFT');
  }

  /**
   * RIGHT JOIN句を追加
   * @param {string} table - テーブル名
   * @param {string} condition - 結合条件
   * @returns {QueryBuilder}
   */
  rightJoin(table, condition) {
    return this.join(table, condition, 'RIGHT');
  }

  /**
   * ORDER BY句を追加
   * @param {string} field - フィールド名
   * @param {string} direction - 方向（ASC, DESC）
   * @returns {QueryBuilder}
   */
  orderBy(field, direction = 'ASC') {
    this.orderByFields.push({
      field,
      direction: direction.toUpperCase()
    });
    
    return this;
  }

  /**
   * GROUP BY句を追加
   * @param {string|Array} fields - フィールド名
   * @returns {QueryBuilder}
   */
  groupBy(fields) {
    const fieldsArray = Array.isArray(fields) ? fields : [fields];
    this.groupByFields.push(...fieldsArray);
    return this;
  }

  /**
   * HAVING句を追加
   * @param {string} field - フィールド名
   * @param {string} operator - 演算子
   * @param {*} value - 値
   * @returns {QueryBuilder}
   */
  having(field, operator, value) {
    if (arguments.length === 2) {
      value = operator;
      operator = '=';
    }
    
    this.havingConditions.push({
      field,
      operator,
      value
    });
    
    return this;
  }

  /**
   * LIMIT句を追加
   * @param {number} limit - 制限数
   * @returns {QueryBuilder}
   */
  limit(limit) {
    this.limitValue = limit;
    return this;
  }

  /**
   * OFFSET句を追加
   * @param {number} offset - オフセット
   * @returns {QueryBuilder}
   */
  offset(offset) {
    this.offsetValue = offset;
    return this;
  }

  /**
   * ページネーション
   * @param {number} page - ページ番号（1から開始）
   * @param {number} perPage - 1ページあたりの件数
   * @returns {QueryBuilder}
   */
  paginate(page, perPage) {
    this.limitValue = perPage;
    this.offsetValue = (page - 1) * perPage;
    return this;
  }

  /**
   * SQLクエリを生成
   * @returns {Object} - {sql, params}
   */
  toSQL() {
    this.params = [];
    let sql = '';

    switch (this.queryType) {
      case 'SELECT':
        sql = this._buildSelectQuery();
        break;
      case 'INSERT':
        sql = this._buildInsertQuery();
        break;
      case 'UPDATE':
        sql = this._buildUpdateQuery();
        break;
      case 'DELETE':
        sql = this._buildDeleteQuery();
        break;
      default:
        throw new Error('Invalid query type');
    }

    return { sql, params: this.params };
  }

  /**
   * クエリを実行
   * @returns {Promise<Object>}
   */
  async execute() {
    const { sql, params } = this.toSQL();
    const result = await this.adapter.query(sql, params);
    this.reset();
    return result;
  }

  /**
   * SELECT クエリを構築
   * @private
   */
  _buildSelectQuery() {
    let sql = `SELECT ${this.selectFields.join(', ')} FROM ${this.tableName}`;
    
    // JOIN
    if (this.joinClauses.length > 0) {
      sql += ' ' + this.joinClauses.map(join => 
        `${join.type} JOIN ${join.table} ON ${join.condition}`
      ).join(' ');
    }
    
    // WHERE
    if (this.whereConditions.length > 0) {
      sql += ' WHERE ' + this._buildWhereClause();
    }
    
    // GROUP BY
    if (this.groupByFields.length > 0) {
      sql += ` GROUP BY ${this.groupByFields.join(', ')}`;
    }
    
    // HAVING
    if (this.havingConditions.length > 0) {
      sql += ' HAVING ' + this._buildHavingClause();
    }
    
    // ORDER BY
    if (this.orderByFields.length > 0) {
      sql += ' ORDER BY ' + this.orderByFields.map(order => 
        `${order.field} ${order.direction}`
      ).join(', ');
    }
    
    // LIMIT/OFFSET
    if (this.limitValue !== null) {
      sql += ` LIMIT ${this.limitValue}`;
    }
    if (this.offsetValue !== null) {
      sql += ` OFFSET ${this.offsetValue}`;
    }
    
    return sql;
  }

  /**
   * INSERT クエリを構築
   * @private
   */
  _buildInsertQuery() {
    const fields = Object.keys(this.insertData);
    const placeholders = fields.map(() => '?').join(', ');
    const values = Object.values(this.insertData);
    
    this.params.push(...values);
    
    return `INSERT INTO ${this.tableName} (${fields.join(', ')}) VALUES (${placeholders})`;
  }

  /**
   * UPDATE クエリを構築
   * @private
   */
  _buildUpdateQuery() {
    const setClause = Object.keys(this.updateData)
      .map(field => `${field} = ?`)
      .join(', ');
    
    this.params.push(...Object.values(this.updateData));
    
    let sql = `UPDATE ${this.tableName} SET ${setClause}`;
    
    if (this.whereConditions.length > 0) {
      sql += ' WHERE ' + this._buildWhereClause();
    }
    
    return sql;
  }

  /**
   * DELETE クエリを構築
   * @private
   */
  _buildDeleteQuery() {
    let sql = `DELETE FROM ${this.tableName}`;
    
    if (this.whereConditions.length > 0) {
      sql += ' WHERE ' + this._buildWhereClause();
    }
    
    return sql;
  }

  /**
   * WHERE句を構築
   * @private
   */
  _buildWhereClause() {
    return this.whereConditions.map((condition, index) => {
      let clause = '';
      
      if (index > 0) {
        clause += ` ${condition.type} `;
      }
      
      if (condition.operator === 'IN') {
        const placeholders = condition.value.map(() => '?').join(', ');
        clause += `${condition.field} IN (${placeholders})`;
        this.params.push(...condition.value);
      } else if (condition.operator === 'BETWEEN') {
        clause += `${condition.field} BETWEEN ? AND ?`;
        this.params.push(...condition.value);
      } else {
        clause += `${condition.field} ${condition.operator} ?`;
        this.params.push(condition.value);
      }
      
      return clause;
    }).join('');
  }

  /**
   * HAVING句を構築
   * @private
   */
  _buildHavingClause() {
    return this.havingConditions.map(condition => {
      this.params.push(condition.value);
      return `${condition.field} ${condition.operator} ?`;
    }).join(' AND ');
  }
}

module.exports = QueryBuilder;