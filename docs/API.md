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

### デザイナー求人管理

#### 求人一覧取得
**GET** `/api/designer-jobs`

デザイナー求人の一覧を取得します。未経験歓迎・新卒歓迎の求人を含む幅広い求人情報を提供します。

**クエリパラメータ:**
- `page` (number): ページ番号（デフォルト: 1）
- `limit` (number): 1ページあたりの件数（デフォルト: 10、最大: 100）
- `experience` (string): 経験レベルでフィルタ
  - `all`: すべて
  - `entry_level`: 未経験歓迎
  - `new_graduate`: 新卒歓迎
  - `both`: 未経験・新卒両方歓迎
- `jobType` (string): 雇用形態でフィルタ
  - `full_time`: 正社員
  - `part_time`: パート・アルバイト
  - `contract`: 契約社員
  - `freelance`: フリーランス
  - `internship`: インターンシップ
- `designCategory` (string): デザインカテゴリーでフィルタ
- `location` (string): 勤務地でフィルタ
- `isRemoteOk` (boolean): リモート可の求人のみ
- `salaryMin` (number): 最低給与でフィルタ
- `salaryMax` (number): 最高給与でフィルタ
- `sortBy` (string): ソート項目（`createdAt`, `postedAt`, `salaryMin`, `priority`）
- `sortOrder` (string): ソート順（`ASC`, `DESC`）

**リクエスト例:**
```
GET /api/designer-jobs?experience=entry_level&limit=20&sortBy=priority&sortOrder=DESC
```

**レスポンス例:**
```json
{
  "success": true,
  "data": {
    "jobs": [
      {
        "id": 1,
        "title": "UIデザイナー（未経験歓迎）",
        "company": "デザインスタジオXYZ",
        "description": "成長中のデザインスタジオで、UIデザインを学びながら実践できます...",
        "originalUrl": "https://example.com/jobs/1",
        "jobType": "full_time",
        "experienceLevel": "entry_level",
        "isExperienceWelcome": true,
        "isNewGraduateWelcome": true,
        "designCategories": ["UI", "UX", "Web"],
        "skills": ["Figma", "デザイン基礎"],
        "tools": ["Figma", "Adobe XD"],
        "location": "東京都渋谷区",
        "isRemoteOk": true,
        "salaryMin": 300,
        "salaryMax": 500,
        "salaryType": "annual",
        "clickCount": 42,
        "applicationDeadline": "2024-12-31T23:59:59.000Z",
        "postedAt": "2024-01-01T00:00:00.000Z",
        "tags": ["未経験OK", "研修充実", "リモート可"],
        "jobSite": {
          "id": 1,
          "name": "vivivit",
          "domain": "vivivit.jp",
          "category": "design_specialized"
        }
      }
    ],
    "pagination": {
      "total": 150,
      "totalPages": 8,
      "currentPage": 1,
      "perPage": 20,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

#### 求人詳細取得
**GET** `/api/designer-jobs/:id`

指定されたIDの求人詳細を取得します。

**レスポンス例:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "UIデザイナー（未経験歓迎）",
    "company": "デザインスタジオXYZ",
    "description": "成長中のデザインスタジオで、UIデザインを学びながら実践できます。\n\n【仕事内容】\n・Webサイトのデザイン\n・モバイルアプリのUI設計\n・デザインシステムの構築\n\n【必須スキル】\n・デザインへの情熱\n・コミュニケーション能力\n\n【歓迎スキル】\n・Figmaの使用経験\n・HTMLCSSの基礎知識",
    "originalUrl": "https://example.com/jobs/1",
    "jobType": "full_time",
    "experienceLevel": "entry_level",
    "isExperienceWelcome": true,
    "isNewGraduateWelcome": true,
    "designCategories": ["UI", "UX", "Web"],
    "skills": ["Figma", "デザイン基礎", "コミュニケーション"],
    "tools": ["Figma", "Adobe XD", "Sketch"],
    "location": "東京都渋谷区",
    "isRemoteOk": true,
    "salaryMin": 300,
    "salaryMax": 500,
    "salaryType": "annual",
    "benefits": ["社会保険完備", "交通費支給", "研修制度", "リモートワーク"],
    "workHours": "10:00-19:00（フレックスタイム制）",
    "clickCount": 42,
    "applicationDeadline": "2024-12-31T23:59:59.000Z",
    "postedAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-15T00:00:00.000Z",
    "tags": ["未経験OK", "研修充実", "リモート可", "フレックス"],
    "status": "approved",
    "isActive": true,
    "isFeatured": true,
    "priority": 10,
    "jobSite": {
      "id": 1,
      "name": "vivivit",
      "domain": "vivivit.jp",
      "baseUrl": "https://vivivit.jp",
      "description": "デザイナー・クリエイター専門の求人サイト",
      "category": "design_specialized"
    }
  }
}
```

#### 求人クリック追跡
**POST** `/api/designer-jobs/:id/click`

求人のクリックを追跡し、元の求人ページへのリダイレクトURLを返します。

**レスポンス例:**
```json
{
  "success": true,
  "data": {
    "redirectUrl": "https://example.com/jobs/1",
    "clickCount": 43
  }
}
```

#### おすすめ求人取得
**GET** `/api/designer-jobs/featured/list`

おすすめフラグが立っている求人を優先度順に取得します。

**クエリパラメータ:**
- `limit` (number): 取得件数（デフォルト: 6、最大: 20）

**レスポンス例:**
```json
{
  "success": true,
  "data": {
    "featuredJobs": [
      {
        "id": 1,
        "title": "UIデザイナー（未経験歓迎）",
        "company": "デザインスタジオXYZ",
        "experienceLevel": "entry_level",
        "isExperienceWelcome": true,
        "isNewGraduateWelcome": true,
        "location": "東京都渋谷区",
        "salaryMin": 300,
        "salaryMax": 500,
        "tags": ["未経験OK", "研修充実", "リモート可"],
        "isFeatured": true,
        "priority": 10
      }
    ],
    "total": 6
  }
}
```

#### 未経験・新卒歓迎求人の統計取得
**GET** `/api/designer-jobs/stats/entry-level`

未経験歓迎・新卒歓迎求人の統計情報を取得します。

**レスポンス例:**
```json
{
  "success": true,
  "data": {
    "totalJobs": 150,
    "experienceWelcomeJobs": 85,
    "newGraduateWelcomeJobs": 62,
    "bothWelcomeJobs": 45,
    "averageSalary": {
      "min": 280,
      "max": 450
    },
    "jobTypeBreakdown": {
      "full_time": 120,
      "part_time": 15,
      "contract": 10,
      "freelance": 3,
      "internship": 2
    },
    "popularDesignCategories": [
      { "category": "UI", "count": 68 },
      { "category": "Web", "count": 55 },
      { "category": "UX", "count": 42 }
    ],
    "topLocations": [
      { "location": "東京都", "count": 95 },
      { "location": "大阪府", "count": 25 },
      { "location": "リモート", "count": 30 }
    ]
  }
}
```

#### 検索サジェスト取得
**GET** `/api/designer-jobs/search/suggestions`

検索入力時のサジェスト候補を取得します。

**クエリパラメータ:**
- `q` (string): 検索クエリ（必須）
- `type` (string): サジェストタイプ（`skills`, `tools`, `companies`, `all`）

**リクエスト例:**
```
GET /api/designer-jobs/search/suggestions?q=fig&type=tools
```

**レスポンス例:**
```json
{
  "success": true,
  "data": {
    "suggestions": [
      { "value": "Figma", "type": "tool", "count": 45 },
      { "value": "Fig", "type": "tool", "count": 3 }
    ]
  }
}
```

#### 求人作成（要認証）
**POST** `/api/designer-jobs`

新しい求人を作成します（管理者のみ）。

**リクエスト例:**
```json
{
  "title": "グラフィックデザイナー募集",
  "company": "クリエイティブエージェンシー",
  "originalUrl": "https://example.com/jobs/new",
  "jobSiteId": 1,
  "description": "詳細な求人情報...",
  "jobType": "full_time",
  "experienceLevel": "entry_level",
  "isExperienceWelcome": true,
  "isNewGraduateWelcome": false,
  "designCategories": ["Graphic", "Print", "Branding"],
  "skills": ["Illustrator", "Photoshop"],
  "tools": ["Adobe Illustrator", "Adobe Photoshop"],
  "location": "東京都新宿区",
  "isRemoteOk": false,
  "salaryMin": 250,
  "salaryMax": 400,
  "salaryType": "annual",
  "applicationDeadline": "2024-12-31T23:59:59.000Z",
  "postedAt": "2024-01-01T00:00:00.000Z",
  "tags": ["未経験可", "残業少なめ"]
}
```

**レスポンス例:**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "title": "グラフィックデザイナー募集",
    "status": "pending_review",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "求人が作成されました。レビュー後に公開されます。"
}
```

### 求人サイト管理

#### 求人サイト一覧取得
**GET** `/api/job-sites`

登録されている求人サイトの一覧を取得します。

**クエリパラメータ:**
- `category` (string): カテゴリーでフィルタ
  - `general`: 総合求人サイト
  - `design_specialized`: デザイン専門
  - `creative_focused`: クリエイティブ系
  - `freelance`: フリーランス向け
- `isActive` (boolean): アクティブな求人サイトのみ
- `sortBy` (string): ソート項目（`priority`, `name`, `createdAt`）
- `sortOrder` (string): ソート順（`ASC`, `DESC`）

**レスポンス例:**
```json
{
  "success": true,
  "data": {
    "jobSites": [
      {
        "id": 1,
        "name": "vivivit",
        "domain": "vivivit.jp",
        "baseUrl": "https://vivivit.jp",
        "description": "デザイナー・クリエイター専門の求人サイト",
        "logoUrl": null,
        "category": "design_specialized",
        "totalJobs": 42,
        "totalClicks": 1250,
        "priority": 10,
        "isActive": true,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "total": 15
  }
}
```

#### 求人サイト詳細取得
**GET** `/api/job-sites/:id`

指定されたIDの求人サイト詳細を取得します。

**レスポンス例:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "vivivit",
    "domain": "vivivit.jp",
    "baseUrl": "https://vivivit.jp",
    "description": "デザイナー・クリエイター専門の求人サイト",
    "logoUrl": null,
    "category": "design_specialized",
    "totalJobs": 42,
    "totalClicks": 1250,
    "activeJobs": 38,
    "priority": 10,
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "popularJobs": [
      {
        "id": 1,
        "title": "UIデザイナー（未経験歓迎）",
        "company": "デザインスタジオXYZ",
        "clickCount": 42
      }
    ]
  }
}
```

#### 求人サイト統計取得
**GET** `/api/job-sites/stats/overview`

全求人サイトの統計情報を取得します。

**レスポンス例:**
```json
{
  "success": true,
  "data": {
    "totalSites": 15,
    "activeSites": 12,
    "categoryBreakdown": {
      "design_specialized": 5,
      "creative_focused": 4,
      "general": 4,
      "freelance": 2
    },
    "totalJobs": 450,
    "totalClicks": 12500,
    "topPerformers": [
      {
        "id": 1,
        "name": "vivivit",
        "totalClicks": 3200,
        "conversionRate": 0.12
      }
    ]
  }
}
```

#### 人気の求人サイト取得
**GET** `/api/job-sites/popular/list`

クリック数や求人数に基づいて人気の求人サイトを取得します。

**クエリパラメータ:**
- `limit` (number): 取得件数（デフォルト: 5、最大: 10）
- `metric` (string): ランキング基準（`clicks`, `jobs`, `conversion`）

**レスポンス例:**
```json
{
  "success": true,
  "data": {
    "popularSites": [
      {
        "id": 1,
        "name": "vivivit",
        "domain": "vivivit.jp",
        "category": "design_specialized",
        "totalJobs": 42,
        "totalClicks": 3200,
        "rank": 1
      }
    ]
  }
}
```

## エラーレスポンス

APIは一貫した形式でエラーを返します。エラーの種類によって異なる構造を持ちます。

### 基本的なエラーレスポンス

一般的なエラーの場合：

```json
{
  "error": "エラーメッセージ"
}
```

成功フラグを含む場合：

```json
{
  "success": false,
  "error": "エラーメッセージ",
  "code": "ERROR_CODE"
}
```

### バリデーションエラー

リクエストパラメータの検証に失敗した場合：

```json
{
  "errors": [
    {
      "type": "field",
      "msg": "タイトルは3〜200文字で入力してください",
      "path": "title",
      "location": "body",
      "value": ""
    },
    {
      "type": "field",
      "msg": "有効なURLを入力してください",
      "path": "originalUrl",
      "location": "body",
      "value": "invalid-url"
    }
  ]
}
```

### 認証エラー

認証が必要なエンドポイントでトークンが無効な場合：

```json
{
  "error": "認証トークンが無効です",
  "code": "INVALID_TOKEN"
}
```

トークンが提供されていない場合：

```json
{
  "error": "認証トークンが提供されていません",
  "code": "TOKEN_REQUIRED"
}
```

### リソースエラー

リソースが見つからない場合：

```json
{
  "success": false,
  "error": "求人が見つかりません",
  "code": "RESOURCE_NOT_FOUND"
}
```

### レート制限エラー

APIリクエスト制限に達した場合：

```json
{
  "error": "リクエストが多すぎます。しばらく待ってから再試行してください。",
  "retryAfter": 300,
  "limit": 100,
  "remaining": 0
}
```

### サーバーエラー

内部サーバーエラーの場合：

```json
{
  "error": "サーバーエラーが発生しました",
  "code": "INTERNAL_SERVER_ERROR",
  "message": "システム管理者に連絡してください"
}
```

## HTTPステータスコード

APIは適切なHTTPステータスコードを返します：

### 成功レスポンス
- `200 OK`: リクエストが成功し、データを返す場合
- `201 Created`: 新しいリソースが作成された場合
- `204 No Content`: リクエストは成功したが、返すデータがない場合

### クライアントエラー
- `400 Bad Request`: リクエストが不正な場合（バリデーションエラーなど）
- `401 Unauthorized`: 認証が必要だが、認証情報が無効または未提供の場合
- `403 Forbidden`: 認証は成功したが、リソースへのアクセス権限がない場合
- `404 Not Found`: リクエストされたリソースが存在しない場合
- `409 Conflict`: リクエストが現在のリソースの状態と競合する場合（重複登録など）
- `422 Unprocessable Entity`: リクエストは理解できるが、処理できない場合
- `429 Too Many Requests`: レート制限に達した場合

### サーバーエラー
- `500 Internal Server Error`: サーバー側で予期しないエラーが発生した場合
- `502 Bad Gateway`: 上流サーバーから無効なレスポンスを受信した場合
- `503 Service Unavailable`: サーバーが一時的に利用できない場合（メンテナンスなど）
- `504 Gateway Timeout`: 上流サーバーからのレスポンスがタイムアウトした場合

## エラーハンドリングのベストプラクティス

### クライアント側での実装例

```javascript
try {
  const response = await fetch('/api/designer-jobs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(jobData)
  });

  const data = await response.json();

  if (!response.ok) {
    // エラーハンドリング
    if (response.status === 400 && data.errors) {
      // バリデーションエラーの処理
      data.errors.forEach(error => {
        console.error(`${error.path}: ${error.msg}`);
      });
    } else if (response.status === 401) {
      // 認証エラーの処理
      console.error('認証が必要です。再度ログインしてください。');
    } else if (response.status === 429) {
      // レート制限エラーの処理
      console.error(`レート制限に達しました。${data.retryAfter}秒後に再試行してください。`);
    } else {
      // その他のエラー
      console.error(data.error || 'エラーが発生しました');
    }
    return;
  }

  // 成功時の処理
  console.log('求人が作成されました:', data);

} catch (error) {
  // ネットワークエラーなど
  console.error('リクエストエラー:', error);
}
```

### 再試行ロジック

レート制限やサーバーエラーの場合の再試行実装例：

```javascript
async function fetchWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      
      if (response.status === 429) {
        // レート制限の場合
        const data = await response.json();
        const retryAfter = data.retryAfter || 60;
        console.log(`レート制限に達しました。${retryAfter}秒後に再試行します...`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        continue;
      }
      
      if (response.status >= 500 && i < maxRetries - 1) {
        // サーバーエラーの場合（最後の試行以外）
        console.log(`サーバーエラー。${2 ** i}秒後に再試行します...`);
        await new Promise(resolve => setTimeout(resolve, 2 ** i * 1000));
        continue;
      }
      
      return response;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      console.log(`ネットワークエラー。${2 ** i}秒後に再試行します...`);
      await new Promise(resolve => setTimeout(resolve, 2 ** i * 1000));
    }
  }
}
```