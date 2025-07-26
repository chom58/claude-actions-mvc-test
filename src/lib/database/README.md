# データベース抽象化レイヤー

複数のデータベースシステムに対応した統一されたAPI を提供するデータベース抽象化レイヤーです。

## サポートしているデータベース

- **SQLite** - 開発・テスト環境向け
- **PostgreSQL** - 本格的なWebアプリケーション向け
- **MySQL/MariaDB** - 既存のMySQLシステムとの互換性
- **MongoDB** - NoSQL、ドキュメント指向データベース
- **Redis** - キャッシュ、セッション管理

## 基本的な使用方法

### 1. 設定

`.env`ファイルでデータベースタイプを指定：

```bash
# 使用するデータベースタイプ
DB_TYPE=sqlite

# 各データベースの設定
SQLITE_FILENAME=./database.sqlite
PG_HOST=localhost
PG_PORT=5432
# ... その他の設定
```

### 2. 基本的なクエリ

```javascript
const db = require('./lib/database');

// データベース初期化
await db.init();

// データの取得
const users = await db.table('users').where('active', true).get();

// 単一レコードの取得
const user = await db.table('users').find(1);

// データの挿入
await db.table('users').insert({
  name: 'John Doe',
  email: 'john@example.com'
});

// データの更新
await db.table('users')
  .where('id', 1)
  .update({ name: 'Jane Doe' });

// データの削除
await db.table('users').where('id', 1).delete();
```

### 3. 高度なクエリ

```javascript
// 条件指定
const activeUsers = await db.table('users')
  .where('active', true)
  .where('age', '>', 18)
  .whereIn('role', ['admin', 'user'])
  .get();

// ソート・ページネーション
const users = await db.table('users')
  .orderBy('created_at', 'DESC')
  .limit(10)
  .offset(20)
  .get();

// ページネーション（簡単）
const users = await db.table('users')
  .paginate(2, 15); // 2ページ目、15件ずつ

// カウント
const userCount = await db.table('users').count();

// 存在チェック
const exists = await db.table('users').where('email', 'test@example.com').exists();
```

### 4. トランザクション

```javascript
await db.transaction(async (trx) => {
  // トランザクション内でのオペレーション
  await trx.table('users').insert({
    name: 'Alice',
    email: 'alice@example.com'
  });
  
  await trx.table('profiles').insert({
    user_id: userId,
    bio: 'Profile description'
  });
  
  // 成功すると自動コミット、エラーで自動ロールバック
});
```

### 5. 生のクエリ

```javascript
// SQL データベースの場合
const results = await db.raw('SELECT * FROM users WHERE age > ?', [18]);

// MongoDB の場合
const results = await db.raw('users', 'aggregate', [
  { $match: { age: { $gt: 18 } } },
  { $group: { _id: '$role', count: { $sum: 1 } } }
]);
```

## マイグレーション

### マイグレーションコマンド

```bash
# 新しいマイグレーションファイルを作成
npm run migrate:create create_users_table

# 未実行のマイグレーションを実行
npm run migrate:up

# 最後のバッチをロールバック
npm run migrate:down

# マイグレーション状態を確認
npm run migrate:status

# 全てのマイグレーションをリセット
npm run migrate:reset
```

### マイグレーションファイルの例

```javascript
// src/migrations/20250726_create_users_table.js
module.exports = {
  async up(db) {
    await db.createTable('users', {
      id: { type: 'increments', primary: true },
      email: { type: 'string', unique: true, nullable: false },
      password: { type: 'string', nullable: false },
      created_at: { type: 'timestamp', default: 'now' }
    });
  },

  async down(db) {
    await db.dropTable('users');
  }
};
```

## データベース固有の機能

### MongoDB

```javascript
// MongoDB 固有の操作
const adapter = db.manager.getAdapter();

// Aggregation Pipeline
const results = await db.raw('users', 'aggregate', [
  { $match: { active: true } },
  { $group: { _id: '$role', count: { $sum: 1 } } }
]);

// インデックス作成
await adapter.db.collection('users').createIndex({ email: 1 }, { unique: true });
```

### Redis

```javascript
// Redis 固有の操作
const adapter = db.manager.getAdapter();

// TTL設定
await adapter.expire('session:123', 3600);

// ハッシュ操作
await adapter.hSet('user:123', { name: 'John', age: 30 });
const userData = await adapter.hGetAll('user:123');
```

## 設定オプション

### データベース接続プール

```javascript
// src/config/database-abstraction.js
module.exports = {
  pool: {
    min: 2,          // 最小接続数
    max: 20,         // 最大接続数
    acquire: 30000,  // 接続取得タイムアウト（ms）
    idle: 10000      // アイドルタイムアウト（ms）
  }
};
```

### データベース固有のオプション

```javascript
connections: {
  postgres: {
    driver: 'pg',
    host: process.env.PG_HOST,
    // ...
    options: {
      ssl: { require: true, rejectUnauthorized: false },
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000
    }
  }
}
```

## エラーハンドリング

```javascript
try {
  const users = await db.table('users').get();
} catch (error) {
  if (error.message.includes('connection')) {
    console.error('Database connection error:', error);
  } else {
    console.error('Query error:', error);
  }
}
```

## パフォーマンスの考慮事項

### 1. インデックス

```javascript
// マイグレーションでインデックスを作成
await db.createTable('users', {
  id: { type: 'increments', primary: true },
  email: { type: 'string', unique: true }, // 自動的にインデックス作成
  name: { type: 'string', index: true }    // 通常のインデックス
});
```

### 2. バッチ処理

```javascript
// 大量データの処理
await db.table('users').chunk(1000, async (users) => {
  // 1000件ずつ処理
  await processUsers(users);
});

// バッチ挿入
const userData = [/* 大量のデータ */];
await db.table('users').insert(userData);
```

### 3. 接続プール管理

```javascript
// 長時間のバッチ処理後は接続を明示的に閉じる
await db.close();
```

## トラブルシューティング

### 1. 接続エラー

```bash
# データベースが起動しているか確認
# PostgreSQL
pg_isready -h localhost -p 5432

# MySQL
mysqladmin ping -h localhost

# MongoDB
mongo --eval "db.adminCommand('ismaster')"

# Redis
redis-cli ping
```

### 2. マイグレーションエラー

```bash
# マイグレーション状態を確認
npm run migrate:status

# 問題のあるマイグレーションをロールバック
npm run migrate:down
```

### 3. パフォーマンス問題

```javascript
// クエリの詳細を確認
const query = db.table('users').where('active', true);
console.log(query.toSql());

// 実行時間の測定
console.time('query');
const results = await query.get();
console.timeEnd('query');
```

## 既存のSequelizeモデルとの統合

既存のSequelizeモデルはそのまま使用できます。新しい抽象化レイヤーと並行して利用可能です：

```javascript
// 既存のSequelizeモデル
const User = require('./models/User');
const users = await User.findAll();

// 新しい抽象化レイヤー
const users = await db.table('users').get();
```

## API リファレンス

### QueryBuilder メソッド

- `select(columns)` - 選択するカラムを指定
- `where(column, operator, value)` - WHERE条件を追加
- `whereIn(column, values)` - WHERE IN条件
- `whereNull(column)` - WHERE NULL条件
- `whereNotNull(column)` - WHERE NOT NULL条件
- `orderBy(column, direction)` - ORDER BY句
- `limit(count)` - LIMIT句
- `offset(count)` - OFFSET句
- `paginate(page, perPage)` - ページネーション
- `get()` - クエリ実行（複数レコード）
- `first()` - 最初の1件を取得
- `find(id)` - IDで検索
- `count()` - レコード数をカウント
- `exists()` - 存在チェック
- `insert(data)` - データ挿入
- `update(data)` - データ更新
- `delete()` - データ削除
- `chunk(size, callback)` - チャンク処理

### DatabaseManager メソッド

- `connect()` - データベース接続
- `close()` - 接続を閉じる
- `raw(query, params)` - 生のクエリ実行
- `transaction(callback)` - トランザクション実行
- `createTable(name, schema)` - テーブル作成
- `dropTable(name)` - テーブル削除