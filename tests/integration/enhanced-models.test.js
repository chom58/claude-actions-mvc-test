/**
 * 拡張モデルシステムの統合テスト
 */

const path = require('path');
const fs = require('fs');

// テスト環境の設定
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'sqlite::memory:';

describe('拡張モデルシステム統合テスト', () => {
  let enhancedModels;
  let originalModels;

  beforeAll(async () => {
    // テスト用のSQLiteデータベースを使用
    const { Sequelize } = require('sequelize');
    const sequelize = new Sequelize('sqlite::memory:', {
      logging: false
    });

    // 既存モデルの模擬
    const mockUser = sequelize.define('User', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      }
    });

    const mockPost = sequelize.define('Post', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false
      },
      content: {
        type: Sequelize.TEXT
      }
    });

    // リレーション設定
    mockUser.hasMany(mockPost, { foreignKey: 'userId' });
    mockPost.belongsTo(mockUser, { foreignKey: 'userId' });

    // テスト用モデルを作成
    originalModels = {
      User: mockUser,
      Post: mockPost,
      sequelize: sequelize,
      syncDatabase: async () => {
        await sequelize.sync({ force: true });
      }
    };

    // データベースを同期
    await sequelize.sync({ force: true });

    // 拡張モデルシステムを初期化
    enhancedModels = require('../../src/models/enhanced');
    
    // テスト用のモデルを設定
    enhancedModels.sequelize = sequelize;
    enhancedModels.models = {
      User: mockUser,
      Post: mockPost
    };
  }, 30000);

  afterAll(async () => {
    if (enhancedModels && enhancedModels.sequelize) {
      await enhancedModels.sequelize.close();
    }
  });

  describe('基本機能テスト', () => {
    test('拡張モデルシステムの初期化', async () => {
      await enhancedModels.initialize();
      
      expect(enhancedModels.initialized).toBe(true);
      expect(enhancedModels.sequelize).toBeTruthy();
      expect(enhancedModels.models).toBeTruthy();
      expect(enhancedModels.adapter).toBeTruthy();
      expect(enhancedModels.helper).toBeTruthy();
    });

    test('従来のモデルアクセス互換性', async () => {
      await enhancedModels.initialize();
      
      // 従来通りのモデルアクセス
      const User = enhancedModels.User;
      const Post = enhancedModels.Post;
      
      expect(User).toBeTruthy();
      expect(Post).toBeTruthy();
      expect(typeof User.create).toBe('function');
      expect(typeof Post.create).toBe('function');
    });

    test('sequelizeプロパティアクセス', async () => {
      await enhancedModels.initialize();
      
      const sequelize = enhancedModels.sequelize;
      expect(sequelize).toBeTruthy();
      expect(typeof sequelize.authenticate).toBe('function');
    });

    test('syncDatabase互換性', async () => {
      await enhancedModels.initialize();
      
      const result = await enhancedModels.syncDatabase();
      expect(result).toBe(true);
    });
  });

  describe('新機能テスト', () => {
    beforeEach(async () => {
      if (!enhancedModels.initialized) {
        await enhancedModels.initialize();
      }
    });

    test('getModel メソッド', async () => {
      const User = enhancedModels.getModel('User');
      expect(User).toBeTruthy();
      expect(typeof User.create).toBe('function');
    });

    test('直接SQLクエリ実行', async () => {
      const result = await enhancedModels.sql('SELECT 1 as test');
      expect(result).toBeTruthy();
      expect(result.rows).toBeTruthy();
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].test).toBe(1);
    });

    test('統計情報取得', async () => {
      const stats = await enhancedModels.getStats();
      expect(stats).toBeTruthy();
      expect(stats.totalModels).toBe(2);
      expect(stats.models).toBeTruthy();
      expect(stats.models.User).toBeTruthy();
      expect(stats.models.Post).toBeTruthy();
    });

    test('ヘルスチェック', async () => {
      const health = await enhancedModels.healthCheck();
      expect(health).toBeTruthy();
      expect(health.status).toBe('operational');
      expect(health.healthy).toBe(true);
      expect(health.adapter).toBeTruthy();
      expect(health.models).toBeTruthy();
      expect(health.timestamp).toBeTruthy();
    });

    test('システム情報取得', () => {
      const info = enhancedModels.getSystemInfo();
      expect(info).toBeTruthy();
      expect(info.initialized).toBe(true);
      expect(info.modelCount).toBe(2);
      expect(info.adapterType).toBe('SequelizeAdapter');
      expect(info.sequelizeDialect).toBe('sqlite');
    });

    test('全モデル取得', async () => {
      const models = enhancedModels.getAllModels();
      expect(models).toBeTruthy();
      expect(models.User).toBeTruthy();
      expect(models.Post).toBeTruthy();
    });

    test('アダプター取得', async () => {
      const adapter = enhancedModels.getAdapter();
      expect(adapter).toBeTruthy();
      expect(adapter.constructor.name).toBe('SequelizeAdapter');
    });
  });

  describe('データ操作テスト', () => {
    beforeEach(async () => {
      if (!enhancedModels.initialized) {
        await enhancedModels.initialize();
      }
      
      // テストデータをクリア
      await enhancedModels.User.destroy({ where: {}, force: true });
      await enhancedModels.Post.destroy({ where: {}, force: true });
    });

    test('従来のSequelizeモデル操作', async () => {
      // ユーザー作成
      const user = await enhancedModels.User.create({
        name: 'Test User',
        email: 'test@example.com'
      });
      
      expect(user.id).toBeTruthy();
      expect(user.name).toBe('Test User');
      expect(user.email).toBe('test@example.com');

      // ポスト作成
      const post = await enhancedModels.Post.create({
        title: 'Test Post',
        content: 'This is a test post',
        userId: user.id
      });
      
      expect(post.id).toBeTruthy();
      expect(post.title).toBe('Test Post');
      expect(post.userId).toBe(user.id);
    });

    test('新しいクエリビルダー機能', async () => {
      // テストユーザーを作成
      await enhancedModels.User.create({
        name: 'Query Test User',
        email: 'query@example.com'
      });

      // 新しいクエリビルダーでクエリ
      const qb = enhancedModels.query('User');
      expect(qb).toBeTruthy();
      expect(typeof qb.select).toBe('function');
      expect(typeof qb.where).toBe('function');
    });

    test('トランザクション機能', async () => {
      const result = await enhancedModels.transaction(async (transaction, models) => {
        // トランザクション内でユーザー作成
        const user = await models.User.create({
          name: 'Transaction User',
          email: 'transaction@example.com'
        }, { transaction: transaction.transaction });

        // トランザクション内でポスト作成
        const post = await models.Post.create({
          title: 'Transaction Post',
          content: 'Created in transaction',
          userId: user.id
        }, { transaction: transaction.transaction });

        return { user, post };
      });

      expect(result.user).toBeTruthy();
      expect(result.post).toBeTruthy();
      expect(result.post.userId).toBe(result.user.id);

      // データが実際に保存されているか確認
      const savedUser = await enhancedModels.User.findByPk(result.user.id);
      const savedPost = await enhancedModels.Post.findByPk(result.post.id);
      
      expect(savedUser).toBeTruthy();
      expect(savedPost).toBeTruthy();
    });
  });

  describe('エラーハンドリングテスト', () => {
    test('初期化前のメソッド呼び出し', async () => {
      const freshEnhancedModels = new (require('../../src/models/enhanced').constructor)();
      
      await expect(freshEnhancedModels.getModel('User')).rejects.toThrow('システムが初期化されていません');
      await expect(freshEnhancedModels.query('User')).rejects.toThrow('システムが初期化されていません');
      await expect(freshEnhancedModels.sql('SELECT 1')).rejects.toThrow('システムが初期化されていません');
    });

    test('存在しないモデルへのアクセス', async () => {
      await enhancedModels.initialize();
      
      await expect(enhancedModels.getModel('NonExistentModel')).rejects.toThrow('モデル NonExistentModel が見つかりません');
    });

    test('無効なSQLクエリ', async () => {
      await enhancedModels.initialize();
      
      await expect(enhancedModels.sql('INVALID SQL QUERY')).rejects.toThrow();
    });
  });

  describe('パフォーマンステスト', () => {
    beforeEach(async () => {
      if (!enhancedModels.initialized) {
        await enhancedModels.initialize();
      }
    });

    test('大量データ操作のパフォーマンス', async () => {
      const startTime = Date.now();
      
      // 100件のユーザーを作成
      const users = [];
      for (let i = 0; i < 100; i++) {
        users.push({
          name: `User ${i}`,
          email: `user${i}@example.com`
        });
      }
      
      await enhancedModels.User.bulkCreate(users);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // 5秒以内に完了することを確認
      expect(duration).toBeLessThan(5000);
      
      // 作成されたデータの確認
      const count = await enhancedModels.User.count();
      expect(count).toBe(100);
    }, 10000);

    test('並行アクセステスト', async () => {
      const promises = [];
      
      // 10個の並行クエリを実行
      for (let i = 0; i < 10; i++) {
        promises.push(enhancedModels.sql('SELECT 1 as test'));
      }
      
      const results = await Promise.all(promises);
      
      // 全てのクエリが正常に完了することを確認
      expect(results.length).toBe(10);
      results.forEach(result => {
        expect(result.rows[0].test).toBe(1);
      });
    });
  });
});