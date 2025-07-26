# システム改善内容（Issue #11）

## 概要
このドキュメントは、Issue #11「システム改善」で実装された改善内容を説明します。

## 実装された改善

### 1. 環境変数の管理改善（`/src/config/env.js`）

#### 特徴
- 必須環境変数の検証
- デフォルト値の自動設定
- 型安全な環境変数の取得
- 環境判定ヘルパー

#### 使用方法
```javascript
const EnvironmentConfig = require('./config/env');

// 設定の取得
const config = EnvironmentConfig.getConfig();

// 個別の環境変数取得
const port = EnvironmentConfig.getInt('PORT', 3000);
const isProduction = EnvironmentConfig.isProduction();
```

### 2. エラーハンドリングの改善（`/src/middleware/errorHandler.improved.js`）

#### 特徴
- 統一されたエラーレスポンス形式
- エラータイプの自動判定
- 環境別のエラー情報制御
- 詳細なエラーロギング
- セキュリティを考慮したエラー情報

#### エラーレスポンス形式
```json
{
  "success": false,
  "error": {
    "message": "エラーメッセージ",
    "code": "ERROR_CODE",
    "timestamp": "2024-07-25T12:00:00.000Z",
    "path": "/api/endpoint",
    "method": "POST",
    "validationErrors": [] // バリデーションエラーの場合
  }
}
```

### 3. セキュリティミドルウェアの強化（`/src/middleware/security.improved.js`）

#### 新機能
- **強化されたCSPヘッダー**: より厳格なContent Security Policy
- **包括的なセキュリティヘッダー**: HSTS、Permissions-Policy等
- **改善された入力サニタイゼーション**: HTMLエンティティの完全なエスケープ
- **高度なSQLインジェクション防止**: より多くのパターンを検出
- **NoSQLインジェクション防止**: MongoDBオペレーターの検出
- **リクエストサイズ制限**: DoS攻撃対策
- **リクエスト署名検証**: Webhook用のHMAC検証
- **コンテンツタイプ検証**: 不正なコンテンツタイプを拒否
- **IPベースのアクセス制御**: ホワイトリスト/ブラックリスト機能

#### 使用例
```javascript
const security = require('./middleware/security.improved');

// 基本的なセキュリティヘッダー
app.use(security.securityHeaders());

// 入力サニタイゼーション
app.use('/api', security.sanitizeInput());

// SQLインジェクション防止
app.use('/api', security.preventSqlInjection());

// Webhook署名検証
app.use('/webhook', security.verifyRequestSignature('webhook-secret'));
```

### 4. レート制限の高度化（`/src/middleware/rateLimit.improved.js`）

#### 新機能
- **エンドポイント別制限**: 認証、API、アップロード、検索等で異なる制限
- **Redis対応**: スケーラブルな分散レート制限
- **動的レート制限**: ユーザープランに基づく制限
- **詳細なログ記録**: レート制限違反の追跡
- **カスタムレート制限**: 任意の設定でレート制限を作成

#### レート制限の種類
```javascript
const rateLimit = require('./middleware/rateLimit.improved');

// 認証エンドポイント用（15分で5回まで）
router.post('/login', rateLimit.authRateLimit, ...);

// API用（認証済みユーザー、15分で1000回まで）
router.get('/api/data', rateLimit.apiRateLimit, ...);

// ファイルアップロード用（1時間で20回まで）
router.post('/upload', rateLimit.uploadRateLimit, ...);

// 検索用（1分で30回まで）
router.get('/search', rateLimit.searchRateLimit, ...);

// 動的レート制限（ユーザープランに基づく）
router.use('/api', rateLimit.dynamicRateLimit, ...);
```

## 移行ガイド

### 1. 環境変数の設定
`.env`ファイルに以下を追加：
```env
# 改善されたミドルウェアを有効化
USE_IMPROVED_MIDDLEWARE=true

# Redis設定（オプション）
REDIS_URL=redis://localhost:6379

# レート制限設定
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 2. アプリケーションの更新
`src/app.js`は既に条件付きでミドルウェアを切り替えるように更新済み。

### 3. ルートの更新
必要に応じて、各ルートファイルで改善されたミドルウェアを使用：
```javascript
const USE_IMPROVED_MIDDLEWARE = process.env.USE_IMPROVED_MIDDLEWARE === 'true';
const rateLimit = USE_IMPROVED_MIDDLEWARE
  ? require('./middleware/rateLimit.improved')
  : require('./middleware/rateLimit');
```

## パフォーマンスへの影響
- Redis使用時: レート制限のパフォーマンスが向上
- セキュリティチェック: わずかなオーバーヘッドがあるが、セキュリティ向上のメリットが大きい
- エラーハンドリング: ログ記録が充実し、デバッグが容易に

## 注意事項
1. 本番環境では必ずRedisを使用することを推奨
2. CSPヘッダーは環境に応じて調整が必要
3. レート制限の値は実際の使用状況に基づいて調整
4. 新しいミドルウェアは段階的に導入することを推奨