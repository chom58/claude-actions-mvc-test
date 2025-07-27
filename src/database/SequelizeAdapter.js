const DatabaseAdapter = require('./DatabaseAdapter');
const QueryBuilder = require('./QueryBuilder');

/**
 * Sequelize統合アダプター
 * 
 * 既存のSequelizeベースのモデルと新しいデータベース抽象化レイヤーを橋渡し
 */
class SequelizeAdapter extends DatabaseAdapter {
  constructor(sequelizeInstance) {
    super({});
    this.sequelize = sequelizeInstance;
    this.isConnected = false;
    this.queryBuilder = new QueryBuilder(this);
  }

  /**
   * データベースに接続（既存のSequelize接続を使用）
   */
  async connect() {
    try {
      await this.sequelize.authenticate();
      this.isConnected = true;
      console.log('✅ Sequelize統合アダプター接続成功');
    } catch (error) {
      console.error('❌ Sequelize統合アダプター接続エラー:', error.message);
      throw error;
    }
  }

  /**
   * データベース接続を切断
   */
  async disconnect() {
    try {
      await this.sequelize.close();
      this.isConnected = false;
      console.log('✅ Sequelize統合アダプター接続切断');
    } catch (error) {
      console.error('❌ Sequelize統合アダプター切断エラー:', error.message);
      throw error;
    }
  }

  /**
   * クエリを実行
   */
  async query(query, params = []) {
    if (!this.sequelize) {
      throw new Error('Sequelizeインスタンスが初期化されていません');
    }

    try {
      const start = Date.now();
      const [results, metadata] = await this.sequelize.query(query, {
        replacements: params,
        type: this.sequelize.QueryTypes.RAW
      });
      const duration = Date.now() - start;

      // ログ出力（開発環境のみ）
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔍 SQL実行: ${duration}ms`, { query, params });
      }

      return {
        rows: Array.isArray(results) ? results : [results],
        rowCount: Array.isArray(results) ? results.length : 1,
        fields: metadata?.fields || []
      };
    } catch (error) {
      console.error('❌ Sequelizeクエリエラー:', error.message);
      throw error;
    }
  }

  /**
   * トランザクションを開始
   */
  async beginTransaction() {
    const transaction = await this.sequelize.transaction();
    
    return {
      transaction,
      async commit() {
        await transaction.commit();
      },
      async rollback() {
        await transaction.rollback();
      },
      async query(sql, params) {
        const [results, metadata] = await this.sequelize.query(sql, {
          replacements: params,
          type: this.sequelize.QueryTypes.RAW,
          transaction
        });

        return {
          rows: Array.isArray(results) ? results : [results],
          rowCount: Array.isArray(results) ? results.length : 1,
          fields: metadata?.fields || []
        };
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
    try {
      const queryInterface = this.sequelize.getQueryInterface();
      const tables = await queryInterface.showAllTables();
      return tables.includes(tableName);
    } catch (error) {
      console.error('テーブル存在確認エラー:', error.message);
      return false;
    }
  }

  /**
   * テーブルを作成
   */
  async createTable(tableName, schema) {
    try {
      const queryInterface = this.sequelize.getQueryInterface();
      const attributes = this._convertSchemaToSequelize(schema);
      
      await queryInterface.createTable(tableName, attributes);
    } catch (error) {
      console.error('テーブル作成エラー:', error.message);
      throw error;
    }
  }

  /**
   * テーブルを削除
   */
  async dropTable(tableName) {
    try {
      const queryInterface = this.sequelize.getQueryInterface();
      await queryInterface.dropTable(tableName);
    } catch (error) {
      console.error('テーブル削除エラー:', error.message);
      throw error;
    }
  }

  /**
   * インデックスを作成
   */
  async createIndex(tableName, indexName, columns, options = {}) {
    try {
      const queryInterface = this.sequelize.getQueryInterface();
      
      await queryInterface.addIndex(tableName, columns, {
        name: indexName,
        unique: options.unique || false,
        ...options
      });
    } catch (error) {
      console.error('インデックス作成エラー:', error.message);
      throw error;
    }
  }

  /**
   * 接続統計情報を取得
   */
  async getConnectionStats() {
    if (!this.sequelize) {
      return { connected: false };
    }

    return {
      connected: this.isConnected,
      adapter: 'SequelizeAdapter',
      dialect: this.sequelize.getDialect(),
      databaseVersion: this.sequelize.getDatabaseVersion ? 
        await this.sequelize.getDatabaseVersion() : 'unknown'
    };
  }

  /**
   * Sequelize固有の最適化されたクエリを実行
   */
  async optimizedQuery(operation, params) {
    switch (operation) {
      case 'findAndCountAll':
        return await this._findAndCountAll(params);
      case 'bulkCreate':
        return await this._bulkCreate(params);
      case 'bulkUpdate':
        return await this._bulkUpdate(params);
      case 'bulkDestroy':
        return await this._bulkDestroy(params);
      default:
        throw new Error(`未対応の操作: ${operation}`);
    }
  }

  /**
   * findAndCountAll操作
   * @private
   */
  async _findAndCountAll({ modelName, options = {} }) {
    const model = this.sequelize.models[modelName];
    if (!model) {
      throw new Error(`モデル ${modelName} が見つかりません`);
    }

    return await model.findAndCountAll(options);
  }

  /**
   * bulkCreate操作
   * @private
   */
  async _bulkCreate({ modelName, data, options = {} }) {
    const model = this.sequelize.models[modelName];
    if (!model) {
      throw new Error(`モデル ${modelName} が見つかりません`);
    }

    return await model.bulkCreate(data, options);
  }

  /**
   * bulkUpdate操作
   * @private
   */
  async _bulkUpdate({ modelName, values, options = {} }) {
    const model = this.sequelize.models[modelName];
    if (!model) {
      throw new Error(`モデル ${modelName} が見つかりません`);
    }

    return await model.update(values, options);
  }

  /**
   * bulkDestroy操作
   * @private
   */
  async _bulkDestroy({ modelName, options = {} }) {
    const model = this.sequelize.models[modelName];
    if (!model) {
      throw new Error(`モデル ${modelName} が見つかりません`);
    }

    return await model.destroy(options);
  }

  /**
   * スキーマ情報を取得
   */
  async getSchema(tableName) {
    try {
      const queryInterface = this.sequelize.getQueryInterface();
      const tableInfo = await queryInterface.describeTable(tableName);
      
      return Object.entries(tableInfo).map(([columnName, columnInfo]) => ({
        column_name: columnName,
        data_type: columnInfo.type,
        is_nullable: columnInfo.allowNull ? 'YES' : 'NO',
        column_default: columnInfo.defaultValue,
        primary_key: columnInfo.primaryKey || false
      }));
    } catch (error) {
      console.error('スキーマ情報取得エラー:', error.message);
      throw error;
    }
  }

  /**
   * データベース情報を取得
   */
  async getDatabaseInfo() {
    try {
      const dialect = this.sequelize.getDialect();
      const version = this.sequelize.getDatabaseVersion ? 
        await this.sequelize.getDatabaseVersion() : 'unknown';
      
      // 登録されているモデル数を取得
      const modelCount = Object.keys(this.sequelize.models).length;

      return {
        version: `${dialect} ${version}`,
        dialect,
        modelCount,
        adapter: 'SequelizeAdapter'
      };
    } catch (error) {
      console.error('データベース情報取得エラー:', error.message);
      throw error;
    }
  }

  /**
   * スキーマをSequelize形式に変換
   * @private
   */
  _convertSchemaToSequelize(schema) {
    const attributes = {};
    
    Object.entries(schema).forEach(([name, definition]) => {
      const sequelizeType = this._convertTypeToSequelize(definition.type);
      const constraints = definition.constraints || {};
      
      attributes[name] = {
        type: sequelizeType,
        allowNull: constraints.allowNull !== false,
        primaryKey: constraints.primaryKey || false,
        autoIncrement: constraints.autoIncrement || false,
        unique: constraints.unique || false,
        defaultValue: constraints.defaultValue
      };
    });
    
    return attributes;
  }

  /**
   * データ型をSequelize形式に変換
   * @private
   */
  _convertTypeToSequelize(type) {
    const DataTypes = this.sequelize.Sequelize.DataTypes;
    
    switch (type?.toUpperCase()) {
      case 'STRING':
        return DataTypes.STRING;
      case 'TEXT':
        return DataTypes.TEXT;
      case 'INTEGER':
        return DataTypes.INTEGER;
      case 'BIGINT':
        return DataTypes.BIGINT;
      case 'FLOAT':
        return DataTypes.FLOAT;
      case 'DOUBLE':
        return DataTypes.DOUBLE;
      case 'DECIMAL':
        return DataTypes.DECIMAL;
      case 'BOOLEAN':
        return DataTypes.BOOLEAN;
      case 'DATE':
        return DataTypes.DATE;
      case 'DATEONLY':
        return DataTypes.DATEONLY;
      case 'JSON':
        return DataTypes.JSON;
      case 'JSONB':
        return DataTypes.JSONB;
      case 'UUID':
        return DataTypes.UUID;
      default:
        return DataTypes.STRING;
    }
  }

  /**
   * Sequelizeインスタンスを取得
   */
  getSequelizeInstance() {
    return this.sequelize;
  }

  /**
   * モデルを取得
   */
  getModel(modelName) {
    return this.sequelize.models[modelName];
  }

  /**
   * 全モデルを取得
   */
  getAllModels() {
    return this.sequelize.models;
  }

  /**
   * クエリビルダーを取得
   */
  getQueryBuilder() {
    return new QueryBuilder(this);
  }
}

module.exports = SequelizeAdapter;