const { createClient } = require('redis');
const BaseAdapter = require('./BaseAdapter');

/**
 * Redisデータベースアダプター
 * 主にキャッシュとセッション管理に使用
 */
class RedisAdapter extends BaseAdapter {
  constructor(config) {
    super(config);
    this.client = null;
  }

  /**
   * Redisに接続
   */
  async connect() {
    const clientConfig = {
      socket: {
        host: this.config.host,
        port: this.config.port
      },
      database: this.config.database,
      ...this.config.options
    };

    if (this.config.password) {
      clientConfig.password = this.config.password;
    }

    try {
      this.client = createClient(clientConfig);
      
      this.client.on('error', (err) => {
        console.error('Redis Client Error:', err);
      });

      await this.client.connect();
      this.isConnected = true;
      return this;
    } catch (error) {
      throw new Error(`Redis connection failed: ${error.message}`);
    }
  }

  /**
   * Redis接続を閉じる
   */
  async close() {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
      this.client = null;
    }
  }

  /**
   * 生のRedisコマンドを実行
   * @param {string} command - Redisコマンド
   * @param {Array} params - コマンドパラメータ
   */
  async raw(command, params = []) {
    this.ensureConnected();
    
    try {
      return await this.client.sendCommand([command, ...params]);
    } catch (error) {
      throw new Error(`Redis command failed: ${error.message}`);
    }
  }

  /**
   * SELECT文を実行（Redisでは限定的なサポート）
   * @param {string} table - キープレフィックス
   * @param {Object} options - クエリオプション
   */
  async select(table, options = {}) {
    this.ensureConnected();
    
    // Redisでは通常、パターンマッチでキーを検索
    const pattern = `${table}:*`;
    const keys = await this.client.keys(pattern);
    
    if (keys.length === 0) {
      return [];
    }

    // 複数のキーから値を取得
    const values = await this.client.mGet(keys);
    
    return keys.map((key, index) => ({
      key: key,
      value: this.parseValue(values[index])
    }));
  }

  /**
   * INSERT文を実行（Redisではキー設定）
   * @param {string} table - キープレフィックス
   * @param {Object|Array} data - 挿入するデータ
   */
  async insert(table, data) {
    this.ensureConnected();
    
    try {
      if (Array.isArray(data)) {
        // 複数データの一括挿入
        const multi = this.client.multi();
        let insertCount = 0;
        
        data.forEach((item) => {
          const key = this.buildKey(table, item);
          const value = JSON.stringify(item);
          multi.set(key, value);
          insertCount++;
        });
        
        await multi.exec();
        
        return {
          insertedCount: insertCount
        };
      } else {
        // 単一データの挿入
        const key = this.buildKey(table, data);
        const value = JSON.stringify(data);
        
        await this.client.set(key, value);
        
        return {
          insertId: key,
          insertedCount: 1
        };
      }
    } catch (error) {
      throw new Error(`Redis insert failed: ${error.message}`);
    }
  }

  /**
   * UPDATE文を実行（Redisでは既存キーの更新）
   * @param {string} table - キープレフィックス
   * @param {Object} data - 更新するデータ
   * @param {Object} where - 更新条件
   */
  async update(table, data, where) {
    this.ensureConnected();
    
    try {
      const key = this.buildKeyFromWhere(table, where);
      const existingValue = await this.client.get(key);
      
      if (!existingValue) {
        return { modifiedCount: 0 };
      }
      
      const existingData = JSON.parse(existingValue);
      const updatedData = { ...existingData, ...data };
      
      await this.client.set(key, JSON.stringify(updatedData));
      
      return { modifiedCount: 1 };
    } catch (error) {
      throw new Error(`Redis update failed: ${error.message}`);
    }
  }

  /**
   * DELETE文を実行（Redisではキー削除）
   * @param {string} table - キープレフィックス
   * @param {Object} where - 削除条件
   */
  async delete(table, where) {
    this.ensureConnected();
    
    try {
      if (Object.keys(where).length === 0) {
        // 全てのキーを削除
        const pattern = `${table}:*`;
        const keys = await this.client.keys(pattern);
        
        if (keys.length > 0) {
          const deletedCount = await this.client.del(keys);
          return { deletedCount };
        }
        
        return { deletedCount: 0 };
      } else {
        // 特定のキーを削除
        const key = this.buildKeyFromWhere(table, where);
        const deletedCount = await this.client.del(key);
        
        return { deletedCount };
      }
    } catch (error) {
      throw new Error(`Redis delete failed: ${error.message}`);
    }
  }

  /**
   * トランザクションを実行（Redis MULTI/EXEC）
   * @param {Function} callback - トランザクション内で実行する処理
   */
  async transaction(callback) {
    this.ensureConnected();
    
    const multi = this.client.multi();
    
    // トランザクション用のアダプターを作成
    const transactionAdapter = {
      ...this,
      client: multi,
      raw: async (command, params = []) => {
        return multi.sendCommand([command, ...params]);
      }
    };
    
    try {
      await callback(transactionAdapter);
      const results = await multi.exec();
      return results;
    } catch (error) {
      throw new Error(`Redis transaction failed: ${error.message}`);
    }
  }

  /**
   * テーブルを作成（Redisでは名前空間の準備）
   * @param {string} tableName - テーブル名（名前空間）
   * @param {Object} schema - スキーマ（Redisでは主に参考用）
   */
  async createTable(tableName, schema) {
    this.ensureConnected();
    
    // Redisでは特別な作成処理は不要だが、
    // メタデータとしてスキーマ情報を保存
    const metaKey = `_schema:${tableName}`;
    await this.client.set(metaKey, JSON.stringify(schema));
    
    return { acknowledged: true };
  }

  /**
   * テーブルを削除（Redisでは名前空間のクリア）
   * @param {string} tableName - テーブル名
   */
  async dropTable(tableName) {
    this.ensureConnected();
    
    try {
      // テーブルのすべてのキーを削除
      const pattern = `${tableName}:*`;
      const keys = await this.client.keys(pattern);
      
      // スキーマメタデータも削除
      const metaKey = `_schema:${tableName}`;
      keys.push(metaKey);
      
      if (keys.length > 0) {
        await this.client.del(keys);
      }
      
      return { acknowledged: true };
    } catch (error) {
      throw new Error(`Redis table drop failed: ${error.message}`);
    }
  }

  /**
   * TTL（有効期限）を設定
   * @param {string} key - キー
   * @param {number} seconds - 秒数
   */
  async expire(key, seconds) {
    this.ensureConnected();
    return await this.client.expire(key, seconds);
  }

  /**
   * ハッシュセット操作
   * @param {string} key - ハッシュキー
   * @param {Object} data - ハッシュデータ
   */
  async hSet(key, data) {
    this.ensureConnected();
    return await this.client.hSet(key, data);
  }

  /**
   * ハッシュゲット操作
   * @param {string} key - ハッシュキー
   * @param {string} field - フィールド名
   */
  async hGet(key, field) {
    this.ensureConnected();
    return await this.client.hGet(key, field);
  }

  /**
   * ハッシュゲットオール操作
   * @param {string} key - ハッシュキー
   */
  async hGetAll(key) {
    this.ensureConnected();
    return await this.client.hGetAll(key);
  }

  /**
   * データからキーを構築
   * @param {string} table - テーブル名
   * @param {Object} data - データ
   * @returns {string} 構築されたキー
   */
  buildKey(table, data) {
    const id = data.id || data._id || Date.now();
    return `${table}:${id}`;
  }

  /**
   * WHERE条件からキーを構築
   * @param {string} table - テーブル名
   * @param {Object} where - WHERE条件
   * @returns {string} 構築されたキー
   */
  buildKeyFromWhere(table, where) {
    const id = where.id || where._id;
    if (!id) {
      throw new Error('Redis operations require an id field in where clause');
    }
    return `${table}:${id}`;
  }

  /**
   * 値をパース
   * @param {string} value - 文字列値
   * @returns {*} パースされた値
   */
  parseValue(value) {
    if (!value) return null;
    
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
}

module.exports = RedisAdapter;