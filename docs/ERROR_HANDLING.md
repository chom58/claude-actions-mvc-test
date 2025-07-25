# エラーハンドリングシステム

このドキュメントでは、アプリケーションの統一されたエラーハンドリングシステムについて説明します。

## 概要

アプリケーションでは、一貫性のあるエラーハンドリングを実現するため、以下のコンポーネントで構成された統一システムを使用しています：

- **統一エラータイプ** (`src/utils/errorTypes.js`)
- **集約エラーハンドラー** (`src/middleware/errorHandler.js`)
- **コントローラーヘルパー** (`src/utils/controllerHelpers.js`)
- **非同期ハンドラー** (`src/utils/asyncHandler.js`)

## エラータイプ

### 基本エラークラス

すべてのエラーは `BaseError` クラスを継承しており、以下の構造を持ちます：

```javascript
{
  name: 'ErrorClassName',
  message: 'エラーメッセージ',
  statusCode: 400,
  code: 'ERROR_CODE',
  details: { /* 追加情報 */ },
  timestamp: '2024-01-01T00:00:00.000Z',
  isOperational: true
}
```

### 利用可能なエラータイプ

#### 認証関連
- `AuthenticationError` (401) - 認証失敗
- `AuthorizationError` (403) - アクセス権限なし
- `TokenExpiredError` (401) - トークン期限切れ
- `InvalidTokenError` (401) - 無効なトークン

#### バリデーション関連
- `ValidationError` (400) - バリデーションエラー
- `RequiredFieldError` (400) - 必須フィールド不足
- `InvalidFormatError` (400) - 不正なフォーマット

#### データベース関連
- `DatabaseError` (500) - データベースエラー
- `UniqueConstraintError` (400) - 一意制約違反
- `NotFoundError` (404) - リソース未発見
- `ResourceConflictError` (409) - リソース競合

#### その他
- `RateLimitError` (429) - レート制限
- `FileError` (400) - ファイル処理エラー
- `OAuthError` (401) - OAuth認証エラー

## コントローラーでの使用方法

### 基本パターン

```javascript
const asyncHandler = require('../utils/asyncHandler');
const { checkValidationErrors, checkResourceExists, sendSuccessResponse } = require('../utils/controllerHelpers');
const { NotFoundError, ValidationError } = require('../utils/errorTypes');

exports.getUser = asyncHandler(async (req, res) => {
  // バリデーションエラーチェック
  checkValidationErrors(req);
  
  // リソース取得
  const user = await User.findByPk(req.params.id);
  
  // 存在チェック
  checkResourceExists(user, 'ユーザー');
  
  // 成功レスポンス
  sendSuccessResponse(res, { user }, 'ユーザーを取得しました');
});
```

### エラーファクトリーの使用

```javascript
const { createError } = require('../utils/errorTypes');

// 様々なエラーの作成
throw createError.auth('認証に失敗しました');
throw createError.notFound('ユーザー', 'ユーザーが見つかりません');
throw createError.validation('無効な入力です', { field: 'email' });
```

## ヘルパー関数

### バリデーション

```javascript
// express-validatorのエラーチェック
checkValidationErrors(req);

// リソース存在チェック
const user = checkResourceExists(userFromDB, 'ユーザー');

// 認証チェック
const currentUser = checkAuthentication(req);

// 権限チェック
checkOwnership(currentUser, resource, resource.userId);
```

### レスポンス

```javascript
// 成功レスポンス
sendSuccessResponse(res, data, 'メッセージ', 200);

// ページネーション付きレスポンス
sendPaginatedResponse(res, data, { page: 1, limit: 20, total: 100 });
```

### セキュリティ

```javascript
// SQLインジェクション対策
const safeQuery = sanitizeSearchQuery(userInput);

// XSS対策
const safeHtml = sanitizeHtml(userInput);

// JSON安全解析
const data = parseJsonSafely(jsonString, defaultValue);
```

## データベースヘルパー

統一されたCRUD操作：

```javascript
const { dbHelpers } = require('../utils/controllerHelpers');

// 作成
const user = await dbHelpers.create(User, userData);

// ID検索（自動的に存在チェック）
const user = await dbHelpers.findById(User, id, {}, 'ユーザー');

// 更新
const user = await dbHelpers.update(User, id, updateData, {}, 'ユーザー');

// 削除
await dbHelpers.delete(User, id, {}, 'ユーザー');
```

## エラーレスポンス形式

### 成功レスポンス

```json
{
  "success": true,
  "message": "処理が正常に完了しました",
  "data": { /* レスポンスデータ */ },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### エラーレスポンス

```json
{
  "success": false,
  "error": "エラーメッセージ",
  "code": "ERROR_CODE",
  "statusCode": 400,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "details": { /* エラー詳細（開発環境のみ） */ }
}
```

### バリデーションエラー

```json
{
  "success": false,
  "error": "バリデーションエラー",
  "code": "VALIDATION_ERROR",
  "statusCode": 400,
  "details": [
    {
      "field": "email",
      "message": "メールアドレスの形式が正しくありません",
      "value": "invalid-email"
    }
  ]
}
```

## ログ出力

### エラーログ

```javascript
// サーバーエラー（500系）
logger.error('Server Error:', {
  error: processedError.toJSON(),
  request: {
    method: 'POST',
    path: '/api/users',
    ip: '192.168.1.1',
    userAgent: 'Mozilla/5.0...',
    body: { /* リクエストbody */ }
  },
  user: 'user-id-or-anonymous'
});

// クライアントエラー（400系）
logger.warn('Client Error:', { /* 同様の構造 */ });
```

## マイグレーション指針

### 既存コントローラーの更新

1. **asyncHandler導入**
   ```javascript
   // 変更前
   exports.handler = async (req, res) => {
     try {
       // 処理
     } catch (error) {
       res.status(500).json({ error: 'エラー' });
     }
   };

   // 変更後
   exports.handler = asyncHandler(async (req, res) => {
     // 処理（try-catch不要）
   });
   ```

2. **エラー処理統一**
   ```javascript
   // 変更前
   if (!user) {
     return res.status(404).json({ error: 'ユーザーが見つかりません' });
   }

   // 変更後
   checkResourceExists(user, 'ユーザー');
   ```

3. **レスポンス統一**
   ```javascript
   // 変更前
   res.json({
     message: '成功',
     user: userData
   });

   // 変更後
   sendSuccessResponse(res, { user: userData }, '成功');
   ```

## テストパターン

### エラーハンドリングテスト

```javascript
describe('エラーハンドリング', () => {
  it('リソースが見つからない場合、404エラーを返す', async () => {
    const response = await request(app)
      .get('/api/users/999999')
      .expect(404);

    expect(response.body.code).toBe('NOT_FOUND');
    expect(response.body.error).toContain('ユーザーが見つかりません');
  });

  it('バリデーションエラーで詳細情報を返す', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({ email: 'invalid-email' })
      .expect(400);

    expect(response.body.code).toBe('VALIDATION_ERROR');
    expect(response.body.details).toBeInstanceOf(Array);
  });
});
```

## ベストプラクティス

### DO（推奨）

- ✅ `asyncHandler`を使用して非同期エラーを自動キャッチ
- ✅ 統一されたエラータイプを使用
- ✅ セキュリティのためユーザー列挙を防ぐ
- ✅ バリデーションエラーで詳細な情報を提供
- ✅ ログに十分な情報を含める

### DON'T（非推奨）

- ❌ 手動で `res.status().json()` を呼び出さない
- ❌ try-catchブロックを手動で記述しない
- ❌ エラーメッセージで内部情報を漏洩させない
- ❌ 予期しないエラーをそのまま返さない
- ❌ エラーログを console.error で出力しない

## セキュリティ考慮事項

1. **情報漏洩防止**
   - 本番環境でスタックトレースを表示しない
   - データベースエラーを直接返さない

2. **ユーザー列挙防止**
   - 存在しないユーザーでも同じエラーメッセージを返す

3. **レート制限**
   - 認証エラーに対してレート制限を適用

4. **入力サニタイゼーション**
   - XSS、SQLインジェクション対策を実施

このシステムにより、一貫性があり、セキュアで、デバッグしやすいエラーハンドリングを実現できます。