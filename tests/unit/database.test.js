const { 
  DatabaseManager, 
  QueryBuilder, 
  SQLiteAdapter,
  createAdapter,
  validateConfig,
  parseConnectionUrl 
} = require('../../src/database');

describe('データベース抽象化レイヤーテスト', () => {
  let adapter;
  let manager;

  beforeAll(async () => {
    // テスト用SQLiteアダプターの作成
    adapter = await createAdapter({
      dialect: 'sqlite',
      storage: ':memory:'
    }, 'test');
    manager = DatabaseManager;
  });

  afterAll(async () => {
    if (adapter) {
      await adapter.disconnect();
    }
    await manager.disconnect();
  });

  describe('SQLiteAdapter', () => {
    test('接続とクエリ実行', async () => {
      const result = await adapter.query('SELECT 1 as test');
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].test).toBe(1);
    });

    test('テーブル作成と存在確認', async () => {
      const schema = {
        id: {
          type: 'INTEGER',
          constraints: { primaryKey: true, autoIncrement: true }
        },
        name: {
          type: 'STRING',
          constraints: { allowNull: false }
        },
        email: {
          type: 'STRING',
          constraints: { unique: true }
        }
      };

      await adapter.createTable('test_users', schema);
      const exists = await adapter.tableExists('test_users');
      expect(exists).toBe(true);
    });

    test('データの挿入と取得', async () => {
      // データ挿入
      const insertResult = await adapter.query(
        'INSERT INTO test_users (name, email) VALUES (?, ?)',
        ['Test User', 'test@example.com']
      );
      expect(insertResult.rowCount).toBe(1);

      // データ取得
      const selectResult = await adapter.query('SELECT * FROM test_users');
      expect(selectResult.rows).toHaveLength(1);
      expect(selectResult.rows[0].name).toBe('Test User');
      expect(selectResult.rows[0].email).toBe('test@example.com');
    });

    test('トランザクション', async () => {
      const transaction = await adapter.beginTransaction();
      
      try {
        // トランザクション内でデータ挿入
        await transaction.query(
          'INSERT INTO test_users (name, email) VALUES (?, ?)',
          ['Transaction User', 'transaction@example.com']
        );

        // コミット前は他の接続からは見えない
        await transaction.commit();

        // コミット後は見える
        const result = await adapter.query(
          'SELECT * FROM test_users WHERE email = ?',
          ['transaction@example.com']
        );
        expect(result.rows).toHaveLength(1);
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    });

    test('ヘルスチェック', async () => {
      const health = await adapter.healthCheck();
      expect(health.healthy).toBe(true);
      expect(health.status).toBe('connected');
      expect(typeof health.responseTime).toBe('number');
    });

    test('スキーマ情報取得', async () => {
      const schema = await adapter.getSchema('test_users');
      expect(schema).toBeInstanceOf(Array);
      expect(schema.length).toBeGreaterThan(0);
      
      const idColumn = schema.find(col => col.column_name === 'id');
      expect(idColumn).toBeDefined();
      expect(idColumn.primary_key).toBe(1);
    });
  });

  describe('QueryBuilder', () => {
    let queryBuilder;

    beforeEach(() => {
      queryBuilder = new QueryBuilder(adapter);
    });

    test('SELECT クエリ構築', () => {
      const { sql, params } = queryBuilder
        .select(['name', 'email'])
        .from('test_users')
        .where('name', 'Test User')
        .orderBy('id', 'DESC')
        .limit(10)
        .toSQL();

      expect(sql).toContain('SELECT name, email FROM test_users');
      expect(sql).toContain('WHERE name = ?');
      expect(sql).toContain('ORDER BY id DESC');
      expect(sql).toContain('LIMIT 10');
      expect(params).toEqual(['Test User']);
    });

    test('INSERT クエリ構築', () => {
      const { sql, params } = queryBuilder
        .insert({ name: 'New User', email: 'new@example.com' })
        .into('test_users')
        .toSQL();

      expect(sql).toContain('INSERT INTO test_users');
      expect(sql).toContain('(name, email)');
      expect(sql).toContain('VALUES (?, ?)');
      expect(params).toEqual(['New User', 'new@example.com']);
    });

    test('UPDATE クエリ構築', () => {
      const { sql, params } = queryBuilder
        .update({ name: 'Updated User' })
        .from('test_users')
        .where('id', 1)
        .toSQL();

      expect(sql).toContain('UPDATE test_users SET name = ?');
      expect(sql).toContain('WHERE id = ?');
      expect(params).toEqual(['Updated User', 1]);
    });

    test('DELETE クエリ構築', () => {
      const { sql, params } = queryBuilder
        .delete()
        .from('test_users')
        .where('id', 1)
        .toSQL();

      expect(sql).toContain('DELETE FROM test_users');
      expect(sql).toContain('WHERE id = ?');
      expect(params).toEqual([1]);
    });

    test('複雑なWHERE条件', () => {
      const { sql, params } = queryBuilder
        .select('*')
        .from('test_users')
        .where('name', 'LIKE', '%Test%')
        .orWhere('email', 'test@example.com')
        .whereIn('id', [1, 2, 3])
        .whereBetween('created_at', '2023-01-01', '2023-12-31')
        .toSQL();

      expect(sql).toContain('WHERE name LIKE ?');
      expect(sql).toContain('OR email = ?');
      expect(sql).toContain('AND id IN (?, ?, ?)');
      expect(sql).toContain('AND created_at BETWEEN ? AND ?');
      expect(params).toEqual([
        '%Test%', 'test@example.com', 1, 2, 3, '2023-01-01', '2023-12-31'
      ]);
    });

    test('JOIN クエリ', () => {
      const { sql } = queryBuilder
        .select(['u.name', 'p.title'])
        .from('users u')
        .join('posts p', 'u.id = p.user_id')
        .leftJoin('comments c', 'p.id = c.post_id')
        .toSQL();

      expect(sql).toContain('FROM users u');
      expect(sql).toContain('INNER JOIN posts p ON u.id = p.user_id');
      expect(sql).toContain('LEFT JOIN comments c ON p.id = c.post_id');
    });

    test('ページネーション', () => {
      const { sql } = queryBuilder
        .select('*')
        .from('test_users')
        .paginate(2, 10)
        .toSQL();

      expect(sql).toContain('LIMIT 10');
      expect(sql).toContain('OFFSET 10');
    });
  });

  describe('DatabaseManager', () => {
    test('アダプター登録と取得', async () => {
      const testAdapter = manager.getAdapter('test');
      expect(testAdapter).toBeDefined();
      expect(testAdapter).toBeInstanceOf(SQLiteAdapter);
    });

    test('ヘルスチェック', async () => {
      const health = await manager.healthCheck();
      expect(health).toHaveProperty('timestamp');
      expect(health).toHaveProperty('adapters');
      expect(health).toHaveProperty('overallHealth');
      expect(typeof health.overallHealth).toBe('boolean');
    });

    test('接続統計情報', async () => {
      const stats = await manager.getConnectionStats();
      expect(stats).toHaveProperty('test');
      expect(stats.test).toHaveProperty('connected');
      expect(stats.test.connected).toBe(true);
    });

    test('クエリビルダー取得', () => {
      const qb = manager.getQueryBuilder('test');
      expect(qb).toBeInstanceOf(QueryBuilder);
    });
  });

  describe('設定とユーティリティ', () => {
    test('設定検証 - 有効な設定', () => {
      const validConfig = {
        dialect: 'sqlite',
        storage: './test.db'
      };
      
      const errors = validateConfig(validConfig);
      expect(errors).toHaveLength(0);
    });

    test('設定検証 - 無効な設定', () => {
      const invalidConfig = {
        dialect: 'postgres'
        // 必要なhost, database, usernameが不足
      };
      
      const errors = validateConfig(invalidConfig);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors).toContain('host is required for SQL databases');
      expect(errors).toContain('database is required for SQL databases');
      expect(errors).toContain('username is required for SQL databases');
    });

    test('接続URL解析 - PostgreSQL', () => {
      const url = 'postgres://user:pass@localhost:5432/mydb';
      const config = parseConnectionUrl(url);
      
      expect(config.dialect).toBe('postgres');
      expect(config.host).toBe('localhost');
      expect(config.port).toBe(5432);
      expect(config.database).toBe('mydb');
      expect(config.username).toBe('user');
      expect(config.password).toBe('pass');
    });

    test('接続URL解析 - MySQL', () => {
      const url = 'mysql://root:secret@127.0.0.1:3306/testdb';
      const config = parseConnectionUrl(url);
      
      expect(config.dialect).toBe('mysql');
      expect(config.host).toBe('127.0.0.1');
      expect(config.port).toBe(3306);
      expect(config.database).toBe('testdb');
      expect(config.username).toBe('root');
      expect(config.password).toBe('secret');
    });

    test('接続URL解析 - SQLite', () => {
      const url = 'sqlite:///path/to/database.db';
      const config = parseConnectionUrl(url);
      
      expect(config.dialect).toBe('sqlite');
      expect(config.storage).toBe('/path/to/database.db');
      expect(config.host).toBeUndefined();
      expect(config.port).toBeUndefined();
    });

    test('接続URL解析 - 無効なURL', () => {
      expect(() => {
        parseConnectionUrl('invalid-url');
      }).toThrow('無効な接続URL');
    });
  });

  describe('エラーハンドリング', () => {
    test('存在しないアダプター取得', () => {
      expect(() => {
        manager.getAdapter('nonexistent');
      }).toThrow('アダプター \'nonexistent\' が見つかりません');
    });

    test('無効なSQL実行', async () => {
      await expect(
        adapter.query('INVALID SQL STATEMENT')
      ).rejects.toThrow();
    });

    test('存在しないテーブルへのクエリ', async () => {
      await expect(
        adapter.query('SELECT * FROM nonexistent_table')
      ).rejects.toThrow();
    });

    test('制約違反', async () => {
      // 重複するemailの挿入（UNIQUE制約違反）
      await expect(
        adapter.query(
          'INSERT INTO test_users (name, email) VALUES (?, ?)',
          ['Another User', 'test@example.com'] // 既存のemail
        )
      ).rejects.toThrow();
    });
  });

  describe('パフォーマンステスト', () => {
    test('大量データの処理', async () => {
      const startTime = Date.now();
      
      // 1000件のデータを挿入
      const transaction = await adapter.beginTransaction();
      
      try {
        for (let i = 0; i < 100; i++) {
          await transaction.query(
            'INSERT INTO test_users (name, email) VALUES (?, ?)',
            [`User ${i}`, `user${i}@example.com`]
          );
        }
        
        await transaction.commit();
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        // パフォーマンスの確認（100件で5秒以内）
        expect(duration).toBeLessThan(5000);
        
        // データ件数の確認
        const countResult = await adapter.query('SELECT COUNT(*) as count FROM test_users');
        expect(countResult.rows[0].count).toBeGreaterThan(100);
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    });

    test('クエリビルダーの性能', () => {
      const startTime = Date.now();
      
      // 1000回クエリを構築
      for (let i = 0; i < 1000; i++) {
        const qb = new QueryBuilder(adapter);
        qb.select('*')
          .from('test_users')
          .where('id', '>', i)
          .orderBy('name')
          .limit(10)
          .toSQL();
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // 1000回の構築で1秒以内
      expect(duration).toBeLessThan(1000);
    });
  });
});