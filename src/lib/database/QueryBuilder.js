/**
 * クエリビルダークラス
 * SQLライクなクエリを構築するためのフルエントインターフェース
 */
class QueryBuilder {
  constructor(manager, tableName) {
    this.manager = manager;
    this.tableName = tableName;
    this.queryOptions = {
      select: '*',
      where: {},
      orderBy: null,
      limit: null,
      offset: null
    };
  }

  /**
   * SELECTカラムを指定
   * @param {string|Array} columns - 選択するカラム
   * @returns {QueryBuilder} チェーンメソッド
   */
  select(columns) {
    if (Array.isArray(columns)) {
      this.queryOptions.select = columns.join(', ');
    } else {
      this.queryOptions.select = columns;
    }
    return this;
  }

  /**
   * WHERE条件を指定
   * @param {string|Object} column - カラム名またはWHERE条件オブジェクト
   * @param {string} operator - 比較演算子
   * @param {*} value - 比較値
   * @returns {QueryBuilder} チェーンメソッド
   */
  where(column, operator, value) {
    if (typeof column === 'object') {
      // オブジェクト形式の場合
      Object.assign(this.queryOptions.where, column);
    } else if (arguments.length === 2) {
      // where(column, value)
      this.queryOptions.where[column] = operator;
    } else {
      // where(column, operator, value)
      this.queryOptions.where[column] = {
        operator: operator,
        value: value
      };
    }
    return this;
  }

  /**
   * WHERE IN条件を指定
   * @param {string} column - カラム名
   * @param {Array} values - 値の配列
   * @returns {QueryBuilder} チェーンメソッド
   */
  whereIn(column, values) {
    this.queryOptions.where[column] = values;
    return this;
  }

  /**
   * WHERE NULL条件を指定
   * @param {string} column - カラム名
   * @returns {QueryBuilder} チェーンメソッド
   */
  whereNull(column) {
    this.queryOptions.where[column] = null;
    return this;
  }

  /**
   * WHERE NOT NULL条件を指定
   * @param {string} column - カラム名
   * @returns {QueryBuilder} チェーンメソッド
   */
  whereNotNull(column) {
    this.queryOptions.where[column] = {
      operator: '!=',
      value: null
    };
    return this;
  }

  /**
   * ORDER BY句を指定
   * @param {string} column - ソートするカラム
   * @param {string} direction - ソート方向（ASC/DESC）
   * @returns {QueryBuilder} チェーンメソッド
   */
  orderBy(column, direction = 'ASC') {
    if (this.queryOptions.orderBy) {
      if (Array.isArray(this.queryOptions.orderBy)) {
        this.queryOptions.orderBy.push(`${column} ${direction}`);
      } else {
        this.queryOptions.orderBy = [this.queryOptions.orderBy, `${column} ${direction}`];
      }
    } else {
      this.queryOptions.orderBy = `${column} ${direction}`;
    }
    return this;
  }

  /**
   * LIMIT句を指定
   * @param {number} count - 取得する行数
   * @returns {QueryBuilder} チェーンメソッド
   */
  limit(count) {
    this.queryOptions.limit = count;
    return this;
  }

  /**
   * OFFSET句を指定
   * @param {number} count - スキップする行数
   * @returns {QueryBuilder} チェーンメソッド
   */
  offset(count) {
    this.queryOptions.offset = count;
    return this;
  }

  /**
   * ページネーション
   * @param {number} page - ページ番号（1から開始）
   * @param {number} perPage - 1ページあたりの件数
   * @returns {QueryBuilder} チェーンメソッド
   */
  paginate(page, perPage = 15) {
    this.queryOptions.limit = perPage;
    this.queryOptions.offset = (page - 1) * perPage;
    return this;
  }

  /**
   * 最初の1件を取得
   * @returns {Promise<Object|null>} 取得結果
   */
  async first() {
    this.limit(1);
    const results = await this.get();
    return results.length > 0 ? results[0] : null;
  }

  /**
   * 指定したIDのレコードを取得
   * @param {*} id - レコードID
   * @returns {Promise<Object|null>} 取得結果
   */
  async find(id) {
    return await this.where('id', id).first();
  }

  /**
   * クエリを実行して結果を取得
   * @returns {Promise<Array>} 取得結果
   */
  async get() {
    return await this.manager.select(this.tableName, this.queryOptions);
  }

  /**
   * レコード数をカウント
   * @returns {Promise<number>} レコード数
   */
  async count() {
    // データベースタイプによって最適化
    const driverType = this.manager.getDriverType();
    
    if (driverType === 'mongodb') {
      const adapter = this.manager.getAdapter();
      const filter = adapter.convertWhereToFilter(this.queryOptions.where);
      const collection = adapter.db.collection(this.tableName);
      return await collection.countDocuments(filter);
    } else {
      // SQLデータベースの場合
      const results = await this.manager.select(this.tableName, {
        ...this.queryOptions,
        select: 'COUNT(*) as count'
      });
      
      return results[0]?.count || 0;
    }
  }

  /**
   * データを挿入
   * @param {Object|Array} data - 挿入するデータ
   * @returns {Promise} 挿入結果
   */
  async insert(data) {
    return await this.manager.insert(this.tableName, data);
  }

  /**
   * データを更新
   * @param {Object} data - 更新するデータ
   * @returns {Promise} 更新結果
   */
  async update(data) {
    return await this.manager.update(this.tableName, data, this.queryOptions.where);
  }

  /**
   * データを削除
   * @returns {Promise} 削除結果
   */
  async delete() {
    return await this.manager.delete(this.tableName, this.queryOptions.where);
  }

  /**
   * データが存在するかチェック
   * @returns {Promise<boolean>} 存在するかどうか
   */
  async exists() {
    const count = await this.count();
    return count > 0;
  }

  /**
   * UPSERT操作（存在すれば更新、なければ挿入）
   * @param {Object} data - データ
   * @param {Object} uniqueColumns - 一意制約のカラム
   * @returns {Promise} 操作結果
   */
  async upsert(data, uniqueColumns) {
    const existing = await this.where(uniqueColumns).first();
    
    if (existing) {
      return await this.where(uniqueColumns).update(data);
    } else {
      return await this.insert({ ...data, ...uniqueColumns });
    }
  }

  /**
   * バッチ処理
   * @param {Array} dataArray - データ配列
   * @param {Function} callback - 各データに対する処理
   * @param {number} batchSize - バッチサイズ
   * @returns {Promise} 処理結果
   */
  async batch(dataArray, callback, batchSize = 100) {
    const results = [];
    
    for (let i = 0; i < dataArray.length; i += batchSize) {
      const batch = dataArray.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(data => callback(data))
      );
      results.push(...batchResults);
    }
    
    return results;
  }

  /**
   * チャンク処理（大きなデータセットを小さな塊に分けて処理）
   * @param {number} chunkSize - チャンクサイズ
   * @param {Function} callback - 各チャンクに対する処理
   * @returns {Promise} 処理結果
   */
  async chunk(chunkSize, callback) {
    let offset = 0;
    let hasMore = true;
    
    while (hasMore) {
      const results = await this.limit(chunkSize).offset(offset).get();
      
      if (results.length === 0) {
        hasMore = false;
      } else {
        await callback(results);
        offset += chunkSize;
        
        if (results.length < chunkSize) {
          hasMore = false;
        }
      }
    }
  }

  /**
   * クエリを複製
   * @returns {QueryBuilder} 新しいQueryBuilderインスタンス
   */
  clone() {
    const newBuilder = new QueryBuilder(this.manager, this.tableName);
    newBuilder.queryOptions = JSON.parse(JSON.stringify(this.queryOptions));
    return newBuilder;
  }

  /**
   * 生成されるクエリの確認（デバッグ用）
   * @returns {Object} クエリ情報
   */
  toSql() {
    return {
      table: this.tableName,
      options: this.queryOptions,
      driver: this.manager.getDriverType()
    };
  }
}

module.exports = QueryBuilder;