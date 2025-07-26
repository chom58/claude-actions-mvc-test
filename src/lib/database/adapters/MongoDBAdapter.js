const { MongoClient, ObjectId } = require('mongodb');
const BaseAdapter = require('./BaseAdapter');

/**
 * MongoDBデータベースアダプター
 * NoSQLなので、SQLライクなAPIを提供しつつ、MongoDB固有の操作もサポート
 */
class MongoDBAdapter extends BaseAdapter {
  constructor(config) {
    super(config);
    this.client = null;
    this.db = null;
  }

  /**
   * MongoDBに接続
   */
  async connect() {
    try {
      this.client = new MongoClient(this.config.url, this.config.options);
      await this.client.connect();
      
      // データベース名をURLから抽出
      const dbName = this.config.url.split('/').pop().split('?')[0];
      this.db = this.client.db(dbName);
      
      this.isConnected = true;
      return this;
    } catch (error) {
      throw new Error(`MongoDB connection failed: ${error.message}`);
    }
  }

  /**
   * データベース接続を閉じる
   */
  async close() {
    if (this.client) {
      await this.client.close();
      this.isConnected = false;
      this.client = null;
      this.db = null;
    }
  }

  /**
   * 生のクエリを実行（MongoDB aggregation pipelineなど）
   * @param {string} collection - コレクション名
   * @param {string} operation - 実行する操作
   * @param {Array|Object} params - オペレーションパラメータ
   */
  async raw(collection, operation, params = {}) {
    this.ensureConnected();
    
    try {
      const coll = this.db.collection(collection);
      
      switch (operation) {
        case 'aggregate':
          return await coll.aggregate(params).toArray();
        case 'findOne':
          return await coll.findOne(params);
        case 'find':
          return await coll.find(params).toArray();
        case 'insertOne':
          return await coll.insertOne(params);
        case 'insertMany':
          return await coll.insertMany(params);
        case 'updateOne':
          return await coll.updateOne(params.filter, params.update, params.options);
        case 'updateMany':
          return await coll.updateMany(params.filter, params.update, params.options);
        case 'deleteOne':
          return await coll.deleteOne(params);
        case 'deleteMany':
          return await coll.deleteMany(params);
        case 'countDocuments':
          return await coll.countDocuments(params);
        default:
          throw new Error(`Unsupported MongoDB operation: ${operation}`);
      }
    } catch (error) {
      throw new Error(`MongoDB operation failed: ${error.message}`);
    }
  }

  /**
   * SELECT文を実行（MongoDBのfindに変換）
   * @param {string} table - コレクション名
   * @param {Object} options - クエリオプション
   */
  async select(table, options = {}) {
    this.ensureConnected();
    
    const collection = this.db.collection(table);
    const filter = this.convertWhereToFilter(options.where || {});
    
    let cursor = collection.find(filter);
    
    // プロジェクション（カラム選択）
    if (options.select && options.select !== '*') {
      const projection = this.convertSelectToProjection(options.select);
      cursor = cursor.project(projection);
    }
    
    // ソート
    if (options.orderBy) {
      const sort = this.convertOrderByToSort(options.orderBy);
      cursor = cursor.sort(sort);
    }
    
    // リミット
    if (options.limit) {
      cursor = cursor.limit(options.limit);
    }
    
    // オフセット
    if (options.offset) {
      cursor = cursor.skip(options.offset);
    }
    
    return await cursor.toArray();
  }

  /**
   * INSERT文を実行（MongoDBのinsertに変換）
   * @param {string} table - コレクション名
   * @param {Object|Array} data - 挿入するデータ
   */
  async insert(table, data) {
    this.ensureConnected();
    
    const collection = this.db.collection(table);
    
    try {
      if (Array.isArray(data)) {
        const result = await collection.insertMany(data);
        return {
          insertedIds: result.insertedIds,
          insertedCount: result.insertedCount
        };
      } else {
        const result = await collection.insertOne(data);
        return {
          insertId: result.insertedId,
          insertedCount: 1
        };
      }
    } catch (error) {
      throw new Error(`MongoDB insert failed: ${error.message}`);
    }
  }

  /**
   * UPDATE文を実行（MongoDBのupdateに変換）
   * @param {string} table - コレクション名
   * @param {Object} data - 更新するデータ
   * @param {Object} where - 更新条件
   */
  async update(table, data, where) {
    this.ensureConnected();
    
    const collection = this.db.collection(table);
    const filter = this.convertWhereToFilter(where);
    const update = { $set: data };
    
    try {
      const result = await collection.updateMany(filter, update);
      return {
        modifiedCount: result.modifiedCount,
        matchedCount: result.matchedCount
      };
    } catch (error) {
      throw new Error(`MongoDB update failed: ${error.message}`);
    }
  }

  /**
   * DELETE文を実行（MongoDBのdeleteに変換）
   * @param {string} table - コレクション名
   * @param {Object} where - 削除条件
   */
  async delete(table, where) {
    this.ensureConnected();
    
    const collection = this.db.collection(table);
    const filter = this.convertWhereToFilter(where);
    
    try {
      const result = await collection.deleteMany(filter);
      return {
        deletedCount: result.deletedCount
      };
    } catch (error) {
      throw new Error(`MongoDB delete failed: ${error.message}`);
    }
  }

  /**
   * トランザクションを実行
   * @param {Function} callback - トランザクション内で実行する処理
   */
  async transaction(callback) {
    this.ensureConnected();
    
    const session = this.client.startSession();
    
    try {
      return await session.withTransaction(async () => {
        // トランザクション用のアダプターを作成
        const transactionAdapter = {
          ...this,
          session: session
        };
        
        return await callback(transactionAdapter);
      });
    } finally {
      await session.endSession();
    }
  }

  /**
   * テーブルを作成（MongoDBではコレクション作成）
   * @param {string} tableName - コレクション名
   * @param {Object} schema - スキーマ（MongoDBでは主にインデックス作成用）
   */
  async createTable(tableName, schema) {
    this.ensureConnected();
    
    try {
      await this.db.createCollection(tableName);
      
      // スキーマからインデックスを作成
      const indexes = this.buildIndexesFromSchema(schema);
      if (indexes.length > 0) {
        const collection = this.db.collection(tableName);
        await collection.createIndexes(indexes);
      }
      
      return { acknowledged: true };
    } catch (error) {
      // コレクションが既に存在する場合はエラーを無視
      if (error.codeName !== 'NamespaceExists') {
        throw new Error(`MongoDB collection creation failed: ${error.message}`);
      }
    }
  }

  /**
   * テーブルを削除（MongoDBではコレクション削除）
   * @param {string} tableName - コレクション名
   */
  async dropTable(tableName) {
    this.ensureConnected();
    
    try {
      const result = await this.db.collection(tableName).drop();
      return { acknowledged: result };
    } catch (error) {
      // コレクションが存在しない場合はエラーを無視
      if (error.codeName !== 'NamespaceNotFound') {
        throw new Error(`MongoDB collection drop failed: ${error.message}`);
      }
    }
  }

  /**
   * WHERE句をMongoDBフィルターに変換
   * @param {Object} where - WHERE条件
   * @returns {Object} MongoDBフィルター
   */
  convertWhereToFilter(where) {
    const filter = {};
    
    Object.entries(where).forEach(([key, value]) => {
      if (key === 'id' && typeof value === 'string' && value.length === 24) {
        // 文字列IDをObjectIdに変換
        filter._id = new ObjectId(value);
      } else if (value === null) {
        filter[key] = null;
      } else if (Array.isArray(value)) {
        filter[key] = { $in: value };
      } else if (typeof value === 'object' && value.operator) {
        const mongoOperator = this.convertSqlOperatorToMongo(value.operator);
        filter[key] = { [mongoOperator]: value.value };
      } else {
        filter[key] = value;
      }
    });
    
    return filter;
  }

  /**
   * SQLオペレーターをMongoDBオペレーターに変換
   * @param {string} sqlOperator - SQLオペレーター
   * @returns {string} MongoDBオペレーター
   */
  convertSqlOperatorToMongo(sqlOperator) {
    const operatorMap = {
      '>': '$gt',
      '>=': '$gte',
      '<': '$lt',
      '<=': '$lte',
      '!=': '$ne',
      '<>': '$ne',
      'LIKE': '$regex'
    };
    
    return operatorMap[sqlOperator] || sqlOperator;
  }

  /**
   * SELECT句をMongoDBプロジェクションに変換
   * @param {string} select - カラム選択
   * @returns {Object} MongoDBプロジェクション
   */
  convertSelectToProjection(select) {
    if (typeof select === 'string') {
      const fields = select.split(',').map(field => field.trim());
      const projection = {};
      fields.forEach(field => {
        projection[field] = 1;
      });
      return projection;
    }
    return select;
  }

  /**
   * ORDER BY句をMongoDBソートに変換
   * @param {string|Array} orderBy - ソート条件
   * @returns {Object} MongoDBソート
   */
  convertOrderByToSort(orderBy) {
    if (typeof orderBy === 'string') {
      const [field, direction] = orderBy.split(' ');
      return { [field]: direction?.toUpperCase() === 'DESC' ? -1 : 1 };
    } else if (Array.isArray(orderBy)) {
      const sort = {};
      orderBy.forEach(item => {
        const [field, direction] = item.split(' ');
        sort[field] = direction?.toUpperCase() === 'DESC' ? -1 : 1;
      });
      return sort;
    }
    return orderBy;
  }

  /**
   * スキーマからMongoDBインデックスを構築
   * @param {Object} schema - テーブルスキーマ
   * @returns {Array} インデックス配列
   */
  buildIndexesFromSchema(schema) {
    const indexes = [];
    
    Object.entries(schema).forEach(([name, definition]) => {
      if (definition.unique) {
        indexes.push({
          key: { [name]: 1 },
          unique: true
        });
      }
      
      if (definition.index) {
        indexes.push({
          key: { [name]: 1 }
        });
      }
    });
    
    return indexes;
  }
}

module.exports = MongoDBAdapter;