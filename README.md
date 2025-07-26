# Claude MVC Web Application

Express.jsとSequelizeを使用したMVCパターンのWebアプリケーションです。

## 📋 プロジェクト概要

このプロジェクトは、MVCアーキテクチャに基づいた基本的なWebアプリケーションのテンプレートです。ユーザー認証と投稿管理機能を含んでいます。

## 🚀 機能

- **ユーザー管理**
  - ユーザー登録・ログイン
  - JWT認証
  - プロフィール管理
  
- **投稿管理**
  - 投稿の作成・編集・削除
  - 投稿の公開・非公開設定
  - ページネーション

## 📁 プロジェクト構造

```
claude/
├── src/
│   ├── app.js              # メインアプリケーション
│   ├── config/
│   │   └── database.js     # データベース設定
│   ├── controllers/        # コントローラー層
│   │   ├── userController.js
│   │   └── postController.js
│   ├── middleware/         # ミドルウェア
│   │   ├── auth.js         # 認証ミドルウェア
│   │   └── errorHandler.js # エラーハンドリング
│   ├── models/             # データモデル
│   │   ├── index.js
│   │   ├── User.js
│   │   └── Post.js
│   └── routes/             # ルーティング定義
│       ├── index.js
│       ├── userRoutes.js
│       └── postRoutes.js
├── .env.example            # 環境変数テンプレート
├── .gitignore
├── package.json
└── README.md
```

## 🛠️ セットアップ

### Docker を使用した開発環境（推奨）

```bash
# 1. 初期セットアップ
make setup

# 2. 開発環境起動
make dev

# 3. 開発ツールダッシュボード確認
make dashboard
```

**利用可能なサービス:**
- アプリケーション: http://localhost:3000
- Adminer (DB管理): http://localhost:8080
- Redis Commander: http://localhost:8081
- MailHog: http://localhost:8025

詳細は [Docker セットアップガイド](./docs/DOCKER_SETUP.md) を参照してください。

### ローカル環境でのセットアップ

#### 1. 依存関係のインストール

```bash
npm install
```

#### 2. 環境変数の設定

`.env.example`をコピーして`.env`を作成し、必要な値を設定します：

```bash
cp .env.example .env
```

#### 3. データベースのセットアップ（オプション）

開発用のサンプルデータを投入：

```bash
npm run seed
```

#### 4. アプリケーションの起動

開発環境：
```bash
npm run dev
```

本番環境：
```bash
npm start
```

## 📡 API エンドポイント

### ユーザー関連

- `POST /api/users/register` - ユーザー登録
- `POST /api/users/login` - ログイン
- `GET /api/users/profile` - プロフィール取得（要認証）
- `PUT /api/users/profile` - プロフィール更新（要認証）
- `DELETE /api/users/profile` - アカウント削除（要認証）

### 投稿関連

- `GET /api/posts` - 投稿一覧取得
- `GET /api/posts/:id` - 投稿詳細取得
- `POST /api/posts` - 投稿作成（要認証）
- `PUT /api/posts/:id` - 投稿更新（要認証）
- `DELETE /api/posts/:id` - 投稿削除（要認証）
- `POST /api/posts/:id/publish` - 投稿公開（要認証）

## 🔧 技術スタック

- **フレームワーク**: Express.js
- **ORM**: Sequelize
- **データベース**: PostgreSQL
- **キャッシュ**: Redis
- **認証**: JWT (jsonwebtoken)
- **セキュリティ**: Helmet, CORS
- **バリデーション**: express-validator
- **ロギング**: Winston
- **テスト**: Jest, Supertest, Playwright
- **開発環境**: Docker, Docker Compose
- **開発ツール**: 
  - Adminer (データベース管理)
  - Redis Commander (Redis管理)
  - MailHog (メールテスト)
  - VS Code デバッグ設定

## 📝 開発ガイドライン

- コミットメッセージは `type(scope): message` 形式で記述
- 新機能にはテストを追加
- 日本語コメントを推奨

## 🧪 テスト

### Docker環境でのテスト

```bash
# テストの実行
make test

# E2Eテストの実行
make test-e2e

# カバレッジ付きテスト
make test-coverage
```

### ローカル環境でのテスト

```bash
# テストの実行
npm test

# ウォッチモードでテスト
npm run test:watch

# カバレッジレポート生成
npm run test:coverage

# E2Eテスト実行
npm run test:e2e
```

## 📚 追加ドキュメント

- [Docker セットアップガイド](./docs/DOCKER_SETUP.md) - Docker開発環境の詳細ガイド
- [API仕様書](./docs/API.md) - エンドポイントの詳細仕様

## 🔒 セキュリティ

- JWT認証を使用
- パスワードはbcryptでハッシュ化
- Helmetによるセキュリティヘッダー設定
- CORS設定による適切なアクセス制御

## 🤖 Claude GitHub Actions

このプロジェクトはClaude Code Actionを使用して、AIアシスタントによる自動化を実現します。
IssueやPull Requestで `@claude` とメンションすることで、AIアシスタントが対応します。