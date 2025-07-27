# データベース抽象化レイヤー

データベース抽象化レイヤーは、異なるデータベース（PostgreSQL、MySQL、SQLite）間でのスムーズな切り替えを可能にし、統一されたインターフェースを提供します。

## 📋 概要

### 主な機能

- **マルチデータベース対応**: PostgreSQL、MySQL、SQLiteをサポート
- **統一インターフェース**: データベースに関係なく同じAPIを使用
- **クエリビルダー**: SQL構文を知らなくても直感的にクエリを構築
- **接続プール管理**: 効率的な接続管理とパフォーマンス最適化
- **トランザクション**: 安全なデータ操作
- **マイグレーション**: データベーススキーマの管理
- **ヘルスチェック**: システム監視とデバッグ支援

### アーキテクチャ

```
┌─────────────────────────────────────────────────────┐
│                Application Layer                    │
├─────────────────────────────────────────────────────┤
│            Database Manager (統一管理)              │
├─────────────────────────────────────────────────────┤
│     QueryBuilder      │    Configuration Manager    │
├─────────────────────────────────────────────────────┤
│  PostgreSQL  │    MySQL    │      SQLite            │
│   Adapter    │   Adapter   │     Adapter            │
├─────────────────────────────────────────────────────┤
│   Database   │  Database   │    Database            │
│   Engine     │   Engine    │    Engine              │
└─────────────────────────────────────────────────────┘
```

## 🚀 基本的な使用方法

### 1. 初期化

```javascript
const { initialize } = require('./src/database');

// 環境に基づいて自動初期化
const dbManager = await initialize('development');

// または手動設定
const { createAdapter } = require('./src/database');
const adapter = await createAdapter({
  dialect: 'postgres',
  host: 'localhost',
  port: 5432,
  database: 'myapp',
  username: 'user',
  password: 'password'
});
```

### 2. 基本的なクエリ

```javascript
// 直接SQL実行
const result = await dbManager.query('SELECT * FROM users WHERE id = ?', [1]);

// クエリビルダー使用
const users = await dbManager.getQueryBuilder()
  .select('*')
  .from('users')
  .where('active', true)
  .orderBy('created_at', 'DESC')
  .limit(10)
  .execute();
```

### 3. トランザクション

```javascript
await dbManager.transaction(async (trx) => {
  await trx.query('INSERT INTO users (name, email) VALUES (?, ?)', ['John', 'john@example.com']);
  await trx.query('INSERT INTO profiles (user_id, bio) VALUES (?, ?)', [userId, 'Developer']);
  // 自動的にコミットされる（エラー時はロールバック）
});
```

## 🛠️ 詳細な機能

### DatabaseManager

複数のデータベースアダプターを管理するメインクラス。

```javascript
const { DatabaseManager } = require('./src/database');

// アダプターの登録
await DatabaseManager.registerAdapter('main', config, true);
await DatabaseManager.registerAdapter('readonly', replicaConfig);

// 読み書き分離
const writeResult = await DatabaseManager.query('INSERT INTO ...'); // メインDBに書き込み
const readResult = await DatabaseManager.smartQuery('SELECT ...'); // レプリカから読み取り
```

### QueryBuilder

SQL構文を知らなくても直感的にクエリを構築できます。

```javascript
const qb = dbManager.getQueryBuilder();

// 複雑なクエリの例
const result = await qb
  .select(['u.name', 'p.title', 'COUNT(c.id) as comment_count'])
  .from('users u')
  .leftJoin('posts p', 'u.id = p.user_id')
  .leftJoin('comments c', 'p.id = c.post_id')
  .where('u.active', true)
  .whereBetween('p.created_at', '2023-01-01', '2023-12-31')
  .groupBy(['u.id', 'p.id'])
  .having('comment_count', '>', 5)
  .orderBy('comment_count', 'DESC')
  .paginate(2, 20) // ページ2、1ページ20件
  .execute();
```

### データベース固有の最適化

各データベースの特殊機能を活用できます。

```javascript
// PostgreSQL: 全文検索
const searchResult = await adapter.optimizedQuery('fullTextSearch', {
  table: 'articles',
  columns: ['title', 'content'],
  searchTerm: 'javascript framework',
  language: 'english'
});

// MySQL: JSONクエリ
const jsonResult = await adapter.optimizedQuery('jsonQuery', {
  table: 'products',
  column: 'metadata',
  path: '$.category',
  value: 'electronics'
});

// SQLite: FTS5全文検索
const ftsResult = await adapter.optimizedQuery('fullTextSearch', {
  table: 'documents',
  ftsTable: 'documents_fts',
  searchTerm: 'machine learning'
});
```

## ⚙️ 設定

### 環境変数

```bash
# 基本設定
DB_DIALECT=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=myapp
DB_USER=username
DB_PASSWORD=password

# 接続プール
DB_POOL_MAX=20
DB_POOL_MIN=5
DB_POOL_IDLE=10000
DB_POOL_ACQUIRE=60000

# セキュリティ
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=true

# レプリケーション
DB_REPLICA_HOST=replica.example.com
DB_REPLICA_PORT=5432
```

### 設定ファイル

```javascript
// src/database/config.js
module.exports = {
  development: {
    dialect: 'sqlite',
    storage: './database.sqlite'
  },
  
  test: {
    dialect: 'sqlite',
    storage: ':memory:'
  },
  
  production: {
    dialect: 'postgres',
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    
    pool: {
      max: 30,
      min: 10,
      idle: 30000
    },
    
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
};
```

## 🔧 CLIコマンド

データベース関連の操作をCLIから実行できます。

```bash
# データベース初期化
npx mvc-cli db init --env production

# 接続テスト
npx mvc-cli db test --env development

# ヘルスチェック
npx mvc-cli db health --watch --interval 30

# 設定確認
npx mvc-cli db config --env production --validate

# マイグレーション
npx mvc-cli db migrate create add-users-table
npx mvc-cli db migrate up
npx mvc-cli db migrate down --steps 1

# 対話型セットアップ
npx mvc-cli db setup
```

## 📊 マイグレーション

### マイグレーションファイルの作成

```bash
npx mvc-cli db migrate create create-users-table
```

```javascript
// src/migrations/20240101000000-create-users-table.js
module.exports = {
  name: 'CreateUsersTable',
  
  async up(adapter) {
    await adapter.createTable('users', {
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
        constraints: { unique: true, allowNull: false }
      },
      password_hash: {
        type: 'STRING',
        constraints: { allowNull: false }
      },
      created_at: {
        type: 'DATE',
        constraints: { allowNull: false }
      },
      updated_at: {
        type: 'DATE',
        constraints: { allowNull: false }
      }
    });
    
    await adapter.createIndex('users', 'idx_users_email', ['email'], { unique: true });
  },
  
  async down(adapter) {
    await adapter.dropTable('users');
  }
};
```

### マイグレーション実行

```bash
# すべてのマイグレーションを実行
npx mvc-cli db migrate up

# 特定のステップ数だけ実行
npx mvc-cli db migrate up --steps 3

# ロールバック
npx mvc-cli db migrate down --steps 1

# 状況確認
npx mvc-cli db migrate status
```

## 🔍 監視とデバッグ

### ヘルスチェック

```javascript
const health = await dbManager.healthCheck();
console.log(health);
```

出力例：
```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "overallHealth": true,
  "adapters": {
    "main": {
      "status": "connected",
      "healthy": true,
      "responseTime": 15,
      "adapter": "PostgreSQLAdapter"
    },
    "replica": {
      "status": "connected", 
      "healthy": true,
      "responseTime": 12,
      "adapter": "PostgreSQLAdapter"
    }
  }
}
```

### 接続統計

```javascript
const stats = await dbManager.getConnectionStats();
console.log(stats);
```

出力例：
```json
{
  "main": {
    "connected": true,
    "totalConnections": 15,
    "freeConnections": 8,
    "connectionQueue": 0
  }
}
```

### パフォーマンス監視

```javascript
// クエリ実行時間の監視（開発環境）
process.env.NODE_ENV = 'development';

// ログに実行時間が出力される
// 🔍 SQL実行: 45ms { query: "SELECT * FROM users", params: [] }
```

## 🚨 エラーハンドリング

### 基本的なエラーハンドリング

```javascript
try {
  const result = await dbManager.query('SELECT * FROM users');
} catch (error) {
  if (error.code === 'ECONNREFUSED') {
    console.error('データベースに接続できません');
  } else if (error.code === '23505') { // PostgreSQL UNIQUE violation
    console.error('重複するデータです');
  } else {
    console.error('データベースエラー:', error.message);
  }
}
```

### グレースフルシャットダウン

```javascript
const { setupGracefulShutdown } = require('./src/database');

// アプリケーション起動時に設定
setupGracefulShutdown();

// または手動で
process.on('SIGTERM', async () => {
  await dbManager.disconnect();
  process.exit(0);
});
```

## 🔐 セキュリティ

### 接続セキュリティ

```javascript
// SSL接続の設定
const config = {
  dialect: 'postgres',
  host: 'localhost',
  ssl: {
    require: true,
    rejectUnauthorized: true,
    ca: fs.readFileSync('ca-cert.pem'),
    cert: fs.readFileSync('client-cert.pem'),
    key: fs.readFileSync('client-key.pem')
  }
};
```

### SQLインジェクション対策

```javascript
// ❌ 危険（SQLインジェクション脆弱性）
const userId = "1; DROP TABLE users;";
const query = `SELECT * FROM users WHERE id = ${userId}`;

// ✅ 安全（パラメーター化クエリ）
const result = await dbManager.query('SELECT * FROM users WHERE id = ?', [userId]);

// ✅ 安全（クエリビルダー）
const result = await dbManager.getQueryBuilder()
  .select('*')
  .from('users')
  .where('id', userId)
  .execute();
```

## 🧪 テスト

### 単体テスト

```javascript
const { createAdapter } = require('./src/database');

describe('データベーステスト', () => {
  let adapter;
  
  beforeAll(async () => {
    adapter = await createAdapter({
      dialect: 'sqlite',
      storage: ':memory:'
    });
  });
  
  afterAll(async () => {
    await adapter.disconnect();
  });
  
  test('ユーザー作成', async () => {
    const result = await adapter.query(
      'INSERT INTO users (name, email) VALUES (?, ?)',
      ['Test User', 'test@example.com']
    );
    expect(result.rowCount).toBe(1);
  });
});
```

### テスト実行

```bash
# 全テスト実行
npm test

# データベーステストのみ
npm test tests/unit/database.test.js

# カバレッジ付きテスト
npm run test:coverage
```

## ⚡ パフォーマンス最適化

### 接続プールの最適化

```javascript
const config = {
  pool: {
    max: 30,        // 最大接続数
    min: 5,         // 最小接続数
    idle: 30000,    // アイドルタイムアウト（30秒）
    acquire: 60000, // 接続取得タイムアウト（60秒）
    evict: 1000     // 削除チェック間隔（1秒）
  }
};
```

### クエリの最適化

```javascript
// インデックスの作成
await adapter.createIndex('users', 'idx_users_email', ['email']);
await adapter.createIndex('posts', 'idx_posts_user_id_created', ['user_id', 'created_at']);

// 実行計画の確認
const plan = await adapter.optimizedQuery('explain', {
  query: 'SELECT * FROM users WHERE email = ?',
  params: ['user@example.com']
});
```

### バッチ処理

```javascript
// 大量データの効率的な挿入
const users = [
  { name: 'User 1', email: 'user1@example.com' },
  { name: 'User 2', email: 'user2@example.com' },
  // ... 1000件のデータ
];

await dbManager.transaction(async (trx) => {
  for (const user of users) {
    await trx.query('INSERT INTO users (name, email) VALUES (?, ?)', [user.name, user.email]);
  }
});
```

## 🔄 マイグレーション

データベースの変更をバージョン管理できます。

### 作成と実行

```bash
# マイグレーション作成
npx mvc-cli db migrate create add-user-avatar

# 実行
npx mvc-cli db migrate up

# 状況確認
npx mvc-cli db migrate status
```

### 高度なマイグレーション

```javascript
module.exports = {
  name: 'AddUserAvatar',
  
  async up(adapter) {
    // カラム追加
    await adapter.query('ALTER TABLE users ADD COLUMN avatar_url VARCHAR(255)');
    
    // インデックス作成
    await adapter.createIndex('users', 'idx_users_avatar', ['avatar_url']);
    
    // データの移行
    await adapter.query(`
      UPDATE users 
      SET avatar_url = CONCAT('https://avatar.example.com/', id, '.jpg')
      WHERE avatar_url IS NULL
    `);
  },
  
  async down(adapter) {
    await adapter.query('ALTER TABLE users DROP COLUMN avatar_url');
  }
};
```

## 📚 参考資料

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [MySQL Documentation](https://dev.mysql.com/doc/)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [Node.js Database Drivers](https://nodejs.org/en/docs/guides/database/)

## 🤝 貢献

バグ報告や機能リクエストは、GitHubのIssueで受け付けています。

### 開発環境のセットアップ

```bash
# リポジトリのクローン
git clone <repository-url>
cd mvc-framework

# 依存関係のインストール
npm install

# テストの実行
npm test

# データベースのセットアップ
npx mvc-cli db setup
```

### プルリクエストの送信

1. フォークとブランチの作成
2. テストの追加と実行
3. ドキュメントの更新
4. プルリクエストの送信

## 📄 ライセンス

MIT License - 詳細は [LICENSE](./LICENSE) ファイルを参照してください。