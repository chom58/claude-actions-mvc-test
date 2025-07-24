# API ドキュメント

## ベースURL

### 開発環境
```
http://localhost:3001/api
```

### 本番環境
```
https://api.harajuku-creative.com/api/v1
```

## セキュリティとプロトコル

### HTTPS必須
本番環境では **HTTPS通信が必須** です。HTTP通信は自動的にHTTPSにリダイレクトされます。

### 認証システム

このAPIはJWT（JSON Web Token）を使用した認証を実装しています。
保護されたエンドポイントへのアクセスには、Authorizationヘッダーに有効なBearer tokenを含める必要があります。

**リクエスト例:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**トークンの有効期限:** 24時間

### 認可と権限管理

#### 権限レベル
- **Guest**: 公開コンテンツの閲覧のみ
- **User**: 基本的なCRUD操作、自身のリソースの管理
- **Premium**: 高度な機能、マッチング機能、コラボレーション作成
- **Admin**: 全リソースの管理、ユーザー管理

#### アクセス制御
- 各エンドポイントには適切な権限レベルが設定されています
- ユーザーは自身が作成したリソースのみ変更・削除可能です
- 管理者権限が必要な操作は明示的に記載されています

### レート制限

#### 制限値
- **認証済みユーザー**: 1000回/時間
- **未認証ユーザー**: 100回/時間
- **重要なエンドポイント** (登録・ログイン): 10回/分

#### レート制限ヘッダー
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

### 入力値バリデーション

#### 共通ルール
- **文字列長**: 1-255文字（日本語対応）
- **メールアドレス**: RFC 5322準拠
- **パスワード**: 8文字以上、大文字・小文字・数字を含む
- **電話番号**: 日本の電話番号形式
- **URL**: HTTP/HTTPS形式

#### セキュリティ対策
- XSS攻撃対策: 全入力値のサニタイズ
- SQLインジェクション対策: パラメータ化クエリ使用
- CSRF攻撃対策: CSRFトークン検証

## APIバージョニング

現在のAPIバージョン: **v1**

### バージョニング戦略
- **メジャーバージョン**: 破壊的変更時に更新
- **マイナーバージョン**: 後方互換性のある機能追加
- **パッチバージョン**: バグフィックス

### 非推奨化ポリシー
- 新バージョンリリース後、旧バージョンは6ヶ月間サポート
- 非推奨化の3ヶ月前に事前通知

## ページネーション

### 標準仕様
すべてのリスト取得エンドポイントで統一されたページネーション仕様を使用します。

**クエリパラメータ:**
- `page` (number): ページ番号（デフォルト: 1、最小: 1）
- `limit` (number): 1ページあたりの件数（デフォルト: 10、最大: 100）
- `offset` (number): オフセット（代替方式、pageと併用不可）

**レスポンス形式:**
```json
{
  "data": [...],
  "pagination": {
    "currentPage": 1,
    "totalPages": 10,
    "totalItems": 100,
    "itemsPerPage": 10,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

## エンドポイント一覧

### ユーザー管理

#### ユーザー登録
**POST** `/api/users/register`

新規ユーザーを登録します。

**リクエスト例:**
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**レスポンス例:**
```json
{
  "message": "ユーザー登録が完了しました",
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### ログイン
**POST** `/api/users/login`

既存ユーザーでログインします。

**リクエスト例:**
```json
{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**レスポンス例:**
```json
{
  "message": "ログインに成功しました",
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "isActive": true
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### プロフィール取得（要認証）
**GET** `/api/users/profile`

現在ログインしているユーザーのプロフィール情報を取得します。

**必要な権限:** User以上

**レスポンス例:**
```json
{
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "posts": [
      {
        "id": 1,
        "title": "First Post",
        "published": true,
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

#### プロフィール更新（要認証）
**PUT** `/api/users/profile`

ユーザーのプロフィール情報を更新します。

**必要な権限:** User以上（自分のプロフィールのみ）

**リクエスト例:**
```json
{
  "username": "john_doe_updated",
  "email": "john.updated@example.com"
}
```

**レスポンス例:**
```json
{
  "message": "プロフィールが更新されました",
  "user": {
    "id": 1,
    "username": "john_doe_updated",
    "email": "john.updated@example.com",
    "isActive": true,
    "updatedAt": "2024-01-02T00:00:00.000Z"
  }
}
```

#### アカウント削除（要認証）
**DELETE** `/api/users/profile`

ユーザーアカウントを削除します。この操作は取り消せません。

**必要な権限:** User以上（自分のアカウントのみ）

**レスポンス例:**
```json
{
  "message": "アカウントが削除されました"
}
```

### 投稿管理

#### 投稿一覧取得
**GET** `/api/posts`

公開されている投稿の一覧を取得します。

**クエリパラメータ:**
- `page` (number): ページ番号（デフォルト: 1）
- `limit` (number): 1ページあたりの件数（デフォルト: 10）
- `published` (boolean): 公開状態でフィルタ

**リクエスト例:**
```
GET /api/posts?page=1&limit=10&published=true
```

**レスポンス例:**
```json
{
  "posts": [
    {
      "id": 1,
      "title": "First Post",
      "content": "This is my first post content...",
      "slug": "first-post",
      "published": true,
      "publishedAt": "2024-01-01T00:00:00.000Z",
      "viewCount": 42,
      "author": {
        "id": 1,
        "username": "john_doe",
        "email": "john@example.com"
      }
    }
  ],
  "totalPages": 5,
  "currentPage": 1,
  "totalPosts": 50
}
```

#### 投稿詳細取得
**GET** `/api/posts/:id`

指定されたIDの投稿を取得します。

**レスポンス例:**
```json
{
  "post": {
    "id": 1,
    "title": "First Post",
    "content": "This is my first post content...",
    "slug": "first-post",
    "published": true,
    "publishedAt": "2024-01-01T00:00:00.000Z",
    "viewCount": 43,
    "author": {
      "id": 1,
      "username": "john_doe",
      "email": "john@example.com"
    }
  }
}
```

#### 投稿作成（要認証）
**POST** `/api/posts`

新しい投稿を作成します。

**必要な権限:** User以上

**リクエストボディ仕様:**
- `title` (string, 必須): 投稿タイトル（1-255文字）
- `content` (string, 必須): 投稿内容
- `slug` (string, オプション): URLスラッグ（英数字とハイフンのみ）

**リクエスト例:**
```json
{
  "title": "原宿ファッション最新トレンド",
  "content": "2024年の原宿ファッションの最新トレンドについて...",
  "slug": "harajuku-fashion-trends-2024"
}
```

**レスポンス例:**
```json
{
  "message": "投稿が作成されました",
  "post": {
    "id": 2,
    "title": "原宿ファッション最新トレンド",
    "content": "2024年の原宿ファッションの最新トレンドについて...",
    "slug": "harajuku-fashion-trends-2024",
    "published": false,
    "viewCount": 0,
    "userId": 1,
    "createdAt": "2024-01-02T00:00:00.000Z",
    "updatedAt": "2024-01-02T00:00:00.000Z"
  }
}
```

#### 投稿更新（要認証）
**PUT** `/api/posts/:id`

既存の投稿を更新します。

**必要な権限:** User以上（自分の投稿のみ）またはAdmin

**リクエスト例:**
```json
{
  "title": "原宿ファッション最新トレンド【更新版】",
  "content": "更新された2024年の原宿ファッションの最新トレンドについて..."
}
```

**レスポンス例:**
```json
{
  "message": "投稿が更新されました",
  "post": {
    "id": 2,
    "title": "原宿ファッション最新トレンド【更新版】",
    "content": "更新された2024年の原宿ファッションの最新トレンドについて...",
    "slug": "harajuku-fashion-trends-2024",
    "published": false,
    "viewCount": 5,
    "updatedAt": "2024-01-03T00:00:00.000Z"
  }
}
```

#### 投稿公開（要認証）
**POST** `/api/posts/:id/publish`

投稿を公開状態にします。

**必要な権限:** User以上（自分の投稿のみ）またはAdmin

**レスポンス例:**
```json
{
  "message": "投稿が公開されました",
  "post": {
    "id": 2,
    "published": true,
    "publishedAt": "2024-01-02T00:00:00.000Z"
  }
}
```

#### 投稿削除（要認証）
**DELETE** `/api/posts/:id`

投稿を削除します。

**必要な権限:** User以上（自分の投稿のみ）またはAdmin

**レスポンス例:**
```json
{
  "message": "投稿が削除されました"
}
```

### デザイン会社管理

#### デザイン会社一覧取得
**GET** `/api/design-companies`

登録されているデザイン会社の一覧を取得します。

**クエリパラメータ:**
- `page` (number): ページ番号
- `limit` (number): 1ページあたりの件数
- `location` (string): 所在地でフィルタ
- `specialty` (string): 専門分野でフィルタ

**レスポンス例:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "ハラジュクデザインスタジオ",
      "description": "原宿系ファッションのデザインを手掛けるスタジオ",
      "location": "東京都渋谷区原宿",
      "specialty": "ストリートファッション",
      "established": "2020-01-01",
      "website": "https://harajuku-design.com",
      "contactEmail": "info@harajuku-design.com",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 50,
    "itemsPerPage": 10
  }
}
```

#### デザイン会社詳細取得
**GET** `/api/design-companies/:id`

指定されたIDのデザイン会社を取得します。

#### デザイン会社登録（要認証）
**POST** `/api/design-companies`

新しいデザイン会社を登録します。

**必要な権限:** Premium以上

**リクエスト例:**
```json
{
  "name": "新原宿デザインラボ",
  "description": "最新のデジタルファッションデザインを手掛けるラボ",
  "location": "東京都渋谷区原宿",
  "specialty": "デジタルファッション",
  "website": "https://new-harajuku-lab.com",
  "contactEmail": "contact@new-harajuku-lab.com"
}
```

### アパレルブランド管理

#### アパレルブランド一覧取得
**GET** `/api/apparel-brands`

登録されているアパレルブランドの一覧を取得します。

**クエリパラメータ:**
- `page` (number): ページ番号
- `limit` (number): 1ページあたりの件数
- `category` (string): カテゴリでフィルタ
- `priceRange` (string): 価格帯でフィルタ (low, mid, high)

#### アパレルブランド登録（要認証）
**POST** `/api/apparel-brands`

新しいアパレルブランドを登録します。

**必要な権限:** Premium以上

**リクエスト例:**
```json
{
  "name": "HARAJUKU STREET",
  "description": "原宿発信のストリートファッションブランド",
  "category": "ストリートウェア",
  "targetAge": "15-25",
  "priceRange": "mid",
  "website": "https://harajuku-street.com",
  "instagramHandle": "@harajuku_street_official"
}
```

### クリエイティブイベント管理

#### イベント一覧取得
**GET** `/api/events`

クリエイティブイベントの一覧を取得します。

**クエリパラメータ:**
- `page` (number): ページ番号
- `limit` (number): 1ページあたりの件数
- `type` (string): イベントタイプでフィルタ
- `upcoming` (boolean): 今後のイベントのみ
- `location` (string): 開催地でフィルタ

#### 予定イベント取得
**GET** `/api/events/upcoming`

今後開催予定のイベント一覧を取得します。

#### イベント作成（要認証）
**POST** `/api/events`

新しいクリエイティブイベントを作成します。

**必要な権限:** Premium以上

**リクエスト例:**
```json
{
  "title": "原宿ファッションウィーク 2024",
  "description": "最新の原宿ファッションを一堂に集めたイベント",
  "type": "ファッションショー",
  "startDate": "2024-03-15T10:00:00.000Z",
  "endDate": "2024-03-17T18:00:00.000Z",
  "location": "東京ビッグサイト",
  "capacity": 500,
  "ticketPrice": 3000,
  "contactEmail": "info@harajuku-fashion-week.com"
}
```

### コラボレーション管理

#### コラボレーション一覧取得
**GET** `/api/collaborations`

コラボレーションプロジェクトの一覧を取得します。

**クエリパラメータ:**
- `page` (number): ページ番号
- `limit` (number): 1ページあたりの件数
- `status` (string): ステータスでフィルタ (active, completed, pending)
- `featured` (boolean): 注目コラボのみ

#### 注目コラボレーション取得
**GET** `/api/collaborations/featured`

注目のコラボレーションプロジェクト一覧を取得します。

#### コラボレーション作成（要認証）
**POST** `/api/collaborations`

新しいコラボレーションプロジェクトを作成します。

**必要な権限:** Premium以上

**リクエスト例:**
```json
{
  "title": "デジタル×アナログファッションコラボ",
  "description": "NFTアートとフィジカルアパレルのコラボレーション",
  "type": "商品コラボ",
  "participants": [
    {
      "type": "design_company",
      "id": 1
    },
    {
      "type": "apparel_brand",
      "id": 2
    }
  ],
  "startDate": "2024-02-01",
  "expectedEndDate": "2024-05-01",
  "budget": 1000000
}
```

### マッチング管理

#### マッチングリクエスト一覧取得
**GET** `/api/matching`

マッチングリクエストの一覧を取得します。

**クエリパラメータ:**
- `page` (number): ページ番号
- `limit` (number): 1ページあたりの件数
- `priority` (string): 優先度でフィルタ (high, medium, low)
- `status` (string): ステータスでフィルタ (open, matched, closed)

#### 高優先度マッチング取得
**GET** `/api/matching/high-priority`

高優先度のマッチングリクエスト一覧を取得します。

#### マッチングリクエスト作成（要認証）
**POST** `/api/matching`

新しいマッチングリクエストを作成します。

**必要な権限:** User以上

**リクエスト例:**
```json
{
  "title": "ストリートファッションブランドとのコラボ求む",
  "description": "グラフィックデザインのスキルを活かした  コラボレーションを希望",
  "type": "collaboration",
  "requesterType": "design_company",
  "targetType": "apparel_brand",
  "skills": ["graphic_design", "branding", "logo_design"],
  "budget": 500000,
  "priority": "high",
  "deadline": "2024-03-31"
}
```

## エラーレスポンス

APIは以下の形式でエラーを返します：

### 基本エラー形式
```json
{
  "error": "エラーメッセージ",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/endpoint"
}
```

### バリデーションエラー形式
```json
{
  "error": "入力値にエラーがあります",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "field": "username",
      "message": "ユーザー名は3文字以上必要です",
      "value": "ab",
      "location": "body"
    },
    {
      "field": "email",
      "message": "有効なメールアドレスを入力してください",
      "value": "invalid-email",
      "location": "body"
    }
  ],
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/users/register"
}
```

### 詳細エラー例

#### 401 Unauthorized (認証エラー)
```json
{
  "error": "認証が必要です",
  "code": "AUTHENTICATION_REQUIRED",
  "message": "このエンドポイントにアクセスするには有効なJWTトークンが必要です",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/users/profile"
}
```

```json
{
  "error": "無効なトークンです",
  "code": "INVALID_TOKEN",
  "message": "JWTトークンが無効または期限切れです",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/users/profile"
}
```

#### 403 Forbidden (アクセス権限エラー)
```json
{
  "error": "アクセスが拒否されました",
  "code": "INSUFFICIENT_PERMISSIONS",
  "message": "この操作を実行する権限がありません",
  "requiredPermission": "Premium",
  "currentPermission": "User",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/collaborations"
}
```

```json
{
  "error": "リソースの所有者ではありません",
  "code": "RESOURCE_ACCESS_DENIED",
  "message": "このリソースを変更する権限がありません",
  "resourceId": 123,
  "resourceType": "post",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/posts/123"
}
```

#### 422 Unprocessable Entity (ビジネスロジックエラー)
```json
{
  "error": "リクエストを処理できません",
  "code": "BUSINESS_LOGIC_ERROR",
  "message": "同じメールアドレスのユーザーが既に存在しています",
  "conflictField": "email",
  "conflictValue": "existing@example.com",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/users/register"
}
```

```json
{
  "error": "レート制限に達しました",
  "code": "RATE_LIMIT_EXCEEDED",
  "message": "1時間あたりのリクエスト数上限に達しました",
  "limit": 1000,
  "remaining": 0,
  "resetTime": "2024-01-01T01:00:00.000Z",
  "timestamp": "2024-01-01T00:30:00.000Z",
  "path": "/api/posts"
}
```

## HTTPステータスコード

### 成功レスポンス
- **200 OK**: リクエスト成功 (データ取得、更新)
- **201 Created**: リソース作成成功 (POSTリクエスト)
- **204 No Content**: 成功、レスポンスボディなし (削除等)

### クライアントエラー (4xx)
- **400 Bad Request**: 不正なリクエスト形式
- **401 Unauthorized**: 認証エラー (トークン未提供または無効)
- **403 Forbidden**: アクセス権限不足
- **404 Not Found**: リソースが見つからない
- **409 Conflict**: リソースの競合状態
- **422 Unprocessable Entity**: ビジネスロジックエラー
- **429 Too Many Requests**: レート制限超過

### サーバーエラー (5xx)
- **500 Internal Server Error**: サーバー内部エラー
- **502 Bad Gateway**: ゲートウェイエラー
- **503 Service Unavailable**: サービス一時的に利用不可
- **504 Gateway Timeout**: ゲートウェイタイムアウト

## サポート情報

### デベロッパーサポート
- **APIドキュメント**: 本ドキュメント
- **サポートメール**: api-support@harajuku-creative.com
- **ステータスページ**: https://status.harajuku-creative.com
- **GitHub Issues**: https://github.com/harajuku-creative/api/issues

### SLA (サービスレベル合意)
- **可用性**: 99.9%
- **レスポンスタイム**: 200ms以下 (平均)
- **メンテナンス窓**: 毎週日曜日 2:00-4:00 JST

---

*最終更新: 2024-01-01*  
*APIバージョン: v1.0.0*