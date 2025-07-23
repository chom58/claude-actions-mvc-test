# API ドキュメント

## 認証

このAPIはJWT（JSON Web Token）を使用した認証を実装しています。
保護されたエンドポイントへのアクセスには、Authorizationヘッダーにトークンを含める必要があります。

```
Authorization: Bearer <your-jwt-token>
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

**レスポンス例:**
```json
{
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "isActive": true,
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

**リクエスト例:**
```json
{
  "title": "New Post Title",
  "content": "This is the content of my new post...",
  "slug": "new-post-title"
}
```

**レスポンス例:**
```json
{
  "message": "投稿が作成されました",
  "post": {
    "id": 2,
    "title": "New Post Title",
    "content": "This is the content of my new post...",
    "slug": "new-post-title",
    "published": false,
    "userId": 1,
    "createdAt": "2024-01-02T00:00:00.000Z"
  }
}
```

#### 投稿公開（要認証）
**POST** `/api/posts/:id/publish`

投稿を公開状態にします。

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

## エラーレスポンス

APIは以下の形式でエラーを返します：

```json
{
  "error": "エラーメッセージ"
}
```

バリデーションエラーの場合：

```json
{
  "errors": [
    {
      "type": "field",
      "msg": "ユーザー名は3文字以上必要です",
      "path": "username",
      "location": "body"
    }
  ]
}
```

## HTTPステータスコード

- `200 OK`: リクエスト成功
- `201 Created`: リソース作成成功
- `400 Bad Request`: 不正なリクエスト
- `401 Unauthorized`: 認証エラー
- `403 Forbidden`: アクセス権限なし
- `404 Not Found`: リソースが見つからない
- `500 Internal Server Error`: サーバーエラー