const db = require('../../src/lib/database');
const DatabaseManager = require('../../src/lib/database/DatabaseManager');
const config = require('../../src/config/database-abstraction');

describe('Database Abstraction Layer', () => {
  beforeAll(async () => {
    // テスト用のSQLiteデータベースを使用
    process.env.DB_TYPE = 'sqlite';
    process.env.SQLITE_FILENAME = ':memory:';
  });

  afterAll(async () => {
    await db.close();
  });

  describe('DatabaseManager', () => {
    test('should create correct adapter based on configuration', () => {
      const manager = new DatabaseManager(config);
      const sqliteConfig = { driver: 'sqlite3' };
      const adapter = manager.createAdapter(sqliteConfig);
      
      expect(adapter.constructor.name).toBe('SQLiteAdapter');
    });

    test('should throw error for unsupported driver', () => {
      const manager = new DatabaseManager(config);
      const invalidConfig = { driver: 'invalid' };
      
      expect(() => {
        manager.createAdapter(invalidConfig);
      }).toThrow('Unsupported database driver: invalid');
    });
  });

  describe('Database Connection', () => {
    test('should connect to database successfully', async () => {
      await db.init();
      expect(db.manager.adapter).toBeDefined();
      expect(db.manager.adapter.isConnected).toBe(true);
    });

    test('should get connection info', () => {
      const info = db.getConnectionInfo();
      expect(info).toHaveProperty('name');
      expect(info).toHaveProperty('driver');
    });

    test('should get driver type', () => {
      const driverType = db.getDriverType();
      expect(driverType).toBe('sqlite3');
    });
  });

  describe('Table Operations', () => {
    beforeEach(async () => {
      await db.init();
      
      // テスト用テーブルを作成
      await db.manager.createTable('test_users', {
        id: { type: 'increments', primary: true },
        name: { type: 'string', nullable: false },
        email: { type: 'string', unique: true },
        active: { type: 'boolean', default: true },
        created_at: { type: 'timestamp', default: 'now' }
      });
    });

    afterEach(async () => {
      // テスト後にテーブルを削除
      try {
        await db.manager.dropTable('test_users');
      } catch (error) {
        // テーブルが存在しない場合はエラーを無視
      }
    });

    test('should insert data successfully', async () => {
      const result = await db.table('test_users').insert({
        name: 'John Doe',
        email: 'john@example.com'
      });
      
      expect(result).toHaveProperty('insertId');
    });

    test('should retrieve data with where clause', async () => {
      // データを挿入
      await db.table('test_users').insert({
        name: 'Jane Doe',
        email: 'jane@example.com',
        active: true
      });

      await db.table('test_users').insert({
        name: 'Bob Smith',
        email: 'bob@example.com',
        active: false
      });

      // アクティブユーザーのみ取得
      const activeUsers = await db.table('test_users')
        .where('active', true)
        .get();

      expect(activeUsers).toHaveLength(1);
      expect(activeUsers[0].name).toBe('Jane Doe');
    });

    test('should update data successfully', async () => {
      // データを挿入
      const insertResult = await db.table('test_users').insert({
        name: 'Update Test',
        email: 'update@example.com'
      });

      // データを更新
      const updateResult = await db.table('test_users')
        .where('id', insertResult.insertId)
        .update({ name: 'Updated Name' });

      expect(updateResult.changes).toBe(1);

      // 更新されたデータを確認
      const updatedUser = await db.table('test_users')
        .find(insertResult.insertId);

      expect(updatedUser.name).toBe('Updated Name');
    });

    test('should delete data successfully', async () => {
      // データを挿入
      await db.table('test_users').insert({
        name: 'Delete Test',
        email: 'delete@example.com'
      });

      // データを削除
      const deleteResult = await db.table('test_users')
        .where('email', 'delete@example.com')
        .delete();

      expect(deleteResult.changes).toBe(1);

      // データが削除されたことを確認
      const deletedUser = await db.table('test_users')
        .where('email', 'delete@example.com')
        .first();

      expect(deletedUser).toBeNull();
    });

    test('should count records correctly', async () => {
      // 複数のデータを挿入
      await db.table('test_users').insert([
        { name: 'User 1', email: 'user1@example.com' },
        { name: 'User 2', email: 'user2@example.com' },
        { name: 'User 3', email: 'user3@example.com' }
      ]);

      const count = await db.table('test_users').count();
      expect(count).toBe(3);
    });

    test('should check existence correctly', async () => {
      const existsBefore = await db.table('test_users')
        .where('email', 'exists@example.com')
        .exists();
      expect(existsBefore).toBe(false);

      await db.table('test_users').insert({
        name: 'Exists Test',
        email: 'exists@example.com'
      });

      const existsAfter = await db.table('test_users')
        .where('email', 'exists@example.com')
        .exists();
      expect(existsAfter).toBe(true);
    });
  });

  describe('Query Builder', () => {
    beforeEach(async () => {
      await db.init();
      
      await db.manager.createTable('test_posts', {
        id: { type: 'increments', primary: true },
        title: { type: 'string', nullable: false },
        content: { type: 'text' },
        author_id: { type: 'integer' },
        published: { type: 'boolean', default: false },
        views: { type: 'integer', default: 0 },
        created_at: { type: 'timestamp', default: 'now' }
      });

      // テストデータを挿入
      await db.table('test_posts').insert([
        { title: 'Post 1', author_id: 1, published: true, views: 100 },
        { title: 'Post 2', author_id: 2, published: false, views: 50 },
        { title: 'Post 3', author_id: 1, published: true, views: 200 }
      ]);
    });

    afterEach(async () => {
      try {
        await db.manager.dropTable('test_posts');
      } catch (error) {
        // テーブルが存在しない場合はエラーを無視
      }
    });

    test('should handle complex where clauses', async () => {
      const posts = await db.table('test_posts')
        .where('published', true)
        .where('views', '>', 100)
        .get();

      expect(posts).toHaveLength(1);
      expect(posts[0].title).toBe('Post 3');
    });

    test('should handle whereIn clause', async () => {
      const posts = await db.table('test_posts')
        .whereIn('author_id', [1, 2])
        .get();

      expect(posts).toHaveLength(3);
    });

    test('should handle ordering and limiting', async () => {
      const posts = await db.table('test_posts')
        .orderBy('views', 'DESC')
        .limit(2)
        .get();

      expect(posts).toHaveLength(2);
      expect(posts[0].views).toBe(200);
      expect(posts[1].views).toBe(100);
    });

    test('should handle pagination', async () => {
      const posts = await db.table('test_posts')
        .paginate(2, 1); // 2ページ目、1件ずつ

      expect(posts).toHaveLength(1);
    });

    test('should find specific record by ID', async () => {
      const post = await db.table('test_posts').find(1);
      expect(post).toBeDefined();
      expect(post.title).toBe('Post 1');
    });

    test('should get first record', async () => {
      const post = await db.table('test_posts')
        .orderBy('views', 'DESC')
        .first();

      expect(post).toBeDefined();
      expect(post.views).toBe(200);
    });
  });

  describe('Transactions', () => {
    beforeEach(async () => {
      await db.init();
      
      await db.manager.createTable('test_accounts', {
        id: { type: 'increments', primary: true },
        name: { type: 'string', nullable: false },
        balance: { type: 'integer', default: 0 }
      });

      // テストデータを挿入
      await db.table('test_accounts').insert([
        { name: 'Account A', balance: 1000 },
        { name: 'Account B', balance: 500 }
      ]);
    });

    afterEach(async () => {
      try {
        await db.manager.dropTable('test_accounts');
      } catch (error) {
        // テーブルが存在しない場合はエラーを無視
      }
    });

    test('should commit transaction on success', async () => {
      await db.transaction(async (trx) => {
        await trx.table('test_accounts')
          .where('id', 1)
          .update({ balance: 800 });

        await trx.table('test_accounts')
          .where('id', 2)
          .update({ balance: 700 });
      });

      const accountA = await db.table('test_accounts').find(1);
      const accountB = await db.table('test_accounts').find(2);

      expect(accountA.balance).toBe(800);
      expect(accountB.balance).toBe(700);
    });

    test('should rollback transaction on error', async () => {
      try {
        await db.transaction(async (trx) => {
          await trx.table('test_accounts')
            .where('id', 1)
            .update({ balance: 800 });

          // エラーを発生させる
          throw new Error('Test error');

          await trx.table('test_accounts')
            .where('id', 2)
            .update({ balance: 700 });
        });
      } catch (error) {
        expect(error.message).toBe('Test error');
      }

      // 元の値のまま変更されていないことを確認
      const accountA = await db.table('test_accounts').find(1);
      const accountB = await db.table('test_accounts').find(2);

      expect(accountA.balance).toBe(1000);
      expect(accountB.balance).toBe(500);
    });
  });
});