# MVC CLI ドキュメント

## 概要

MVC CLIは、Express MVCアプリケーションの開発を加速するためのコマンドラインツールです。コントローラー、モデル、ルート、テストなどのボイラープレートコードを自動生成します。

## インストール

プロジェクト内で使用：
```bash
npx mvc-cli [コマンド]
```

グローバルインストール：
```bash
npm install -g .
mvc-cli [コマンド]
```

## コマンド一覧

### プロジェクト初期化

新しいMVCプロジェクトを作成します。

```bash
mvc-cli init [project-name]
```

オプション：
- `-t, --template <template>` - テンプレートを指定 (basic, full, api)
- `--skip-install` - npm installをスキップ
- `--git` - Gitリポジトリを初期化

例：
```bash
# 基本的なプロジェクトを作成
mvc-cli init my-app

# フルスタックプロジェクトを作成
mvc-cli init my-app --template full --git

# API専用プロジェクトを作成
mvc-cli init my-api --template api
```

### コントローラー生成

```bash
mvc-cli generate:controller <name>
mvc-cli g:c <name>  # 短縮形
```

オプション：
- `-a, --actions <actions...>` - アクションメソッドを指定
- `-r, --resource` - RESTfulリソースコントローラーを生成
- `--api` - APIコントローラーとして生成
- `--auth` - 認証が必要なコントローラーとして生成

例：
```bash
# 基本的なコントローラー
mvc-cli g:c Home -a index about contact

# RESTfulリソースコントローラー
mvc-cli g:c User --resource

# APIコントローラー（認証付き）
mvc-cli g:c Product --resource --api --auth
```

### モデル生成

```bash
mvc-cli generate:model <name>
mvc-cli g:m <name>  # 短縮形
```

オプション：
- `-a, --attributes <attributes...>` - 属性を指定 (name:type:constraints)
- `--timestamps` - タイムスタンプを追加（デフォルト: true）
- `--paranoid` - 論理削除を有効化
- `--migration` - マイグレーションファイルも生成（デフォルト: true）

サポートされるデータ型：
- STRING, TEXT
- INTEGER, BIGINT, FLOAT, DOUBLE, DECIMAL
- BOOLEAN
- DATE, DATEONLY
- JSON, JSONB
- UUID

制約：
- required (必須)
- unique (ユニーク)
- primarykey (主キー)
- autoincrement (自動採番)
- default:value (デフォルト値)

例：
```bash
# 基本的なモデル
mvc-cli g:m Post -a title:string content:text

# 制約付きモデル
mvc-cli g:m User -a email:string:unique:required password:string:required

# 論理削除対応モデル
mvc-cli g:m Product -a name:string price:decimal --paranoid
```

### ルート生成

```bash
mvc-cli generate:route <name>
mvc-cli g:r <name>  # 短縮形
```

オプション：
- `-m, --methods <methods...>` - HTTPメソッドを指定
- `-p, --prefix <prefix>` - URLプレフィックスを指定
- `--middleware <middleware...>` - ミドルウェアを追加

例：
```bash
# 基本的なルート
mvc-cli g:r products

# カスタムメソッドとプレフィックス
mvc-cli g:r admin -m GET POST DELETE -p /admin

# ミドルウェア付きルート
mvc-cli g:r api/users --middleware auth rateLimit
```

### テスト生成

```bash
mvc-cli generate:test <type> <name>
mvc-cli g:t <type> <name>  # 短縮形
```

タイプ：
- controller - コントローラーテスト
- model - モデルテスト
- middleware - ミドルウェアテスト
- service - サービステスト
- util - ユーティリティテスト

オプション：
- `-t, --test-type <type>` - テストタイプ (unit, integration, e2e)

例：
```bash
# コントローラーの統合テスト
mvc-cli g:t controller User --test-type integration

# モデルの単体テスト
mvc-cli g:t model Product

# ミドルウェアのテスト
mvc-cli g:t middleware auth
```

### 対話型ジェネレーター

コマンドを覚えていない場合は、対話型モードを使用できます：

```bash
mvc-cli generate
mvc-cli g  # 短縮形
```

### リスト表示

既存のリソースを確認：

```bash
mvc-cli list <type>
mvc-cli ls <type>  # 短縮形
```

タイプ：
- controllers - コントローラー一覧
- models - モデル一覧
- routes - ルート一覧

例：
```bash
mvc-cli ls controllers
mvc-cli ls models
```

## スキャフォールド（CRUD生成）

完全なCRUD機能を一度に生成：

```bash
mvc-cli g
# "フルスタック機能（CRUD）"を選択
```

生成されるもの：
- モデル（マイグレーション付き）
- RESTfulコントローラー
- ルート定義
- 統合テスト

## 使用例

### 1. ブログ機能の追加

```bash
# Postモデルとコントローラーを生成
mvc-cli g:m Post -a title:string:required content:text status:string
mvc-cli g:c Post --resource --api

# テストを追加
mvc-cli g:t controller Post --test-type integration
```

### 2. ユーザー認証システム

```bash
# Userモデル
mvc-cli g:m User -a email:string:unique:required password:string:required isActive:boolean

# 認証コントローラー
mvc-cli g:c Auth -a login logout register refreshToken --api

# 認証ミドルウェア用のテスト
mvc-cli g:t middleware auth
```

### 3. 管理画面の追加

```bash
# 管理者用コントローラー
mvc-cli g:c Admin/Dashboard --auth -a index stats
mvc-cli g:c Admin/Users --resource --auth

# ルート
mvc-cli g:r admin --prefix /admin --middleware auth adminOnly
```

## ベストプラクティス

### 命名規則

- **コントローラー**: PascalCase (例: UserController)
- **モデル**: PascalCase 単数形 (例: User)
- **ルート**: kebab-case (例: user-profiles)
- **テスト**: コンポーネント名.test.js

### プロジェクト構造

生成されたファイルは以下の構造に配置されます：

```
src/
├── controllers/
│   └── UserController.js
├── models/
│   ├── index.js
│   └── User.js
├── routes/
│   ├── index.js
│   └── userRoutes.js
├── migrations/
│   └── 20240101000000-create-users.js
└── middleware/
    └── auth.js

tests/
├── unit/
│   └── User.test.js
├── integration/
│   └── UserController.test.js
└── e2e/
    └── auth.spec.js
```

### 生成後の手順

1. **モデル生成後**
   - マイグレーションを実行: `npm run migrate`
   - 必要に応じてシーダーを作成

2. **コントローラー生成後**
   - ビジネスロジックを実装
   - エラーハンドリングを追加

3. **ルート生成後**
   - app.jsまたはroutes/index.jsに登録
   - バリデーションルールを追加

4. **テスト生成後**
   - テストケースを実装
   - `npm test`で実行

## トラブルシューティング

### ファイルが既に存在する

```
エラー: コントローラー UserController は既に存在します
```

解決策：
- 別の名前を使用
- 既存ファイルを削除してから再生成

### 依存関係エラー

```
エラー: Cannot find module 'change-case'
```

解決策：
```bash
npm install commander inquirer chalk change-case
```

### 権限エラー

```
エラー: EACCES: permission denied
```

解決策：
```bash
sudo npm install -g .  # グローバルインストールの場合
```

## 設定

### カスタムテンプレート

独自のテンプレートを作成する場合は、`src/cli/templates/`ディレクトリに配置します。

### 環境変数

CLI動作に影響する環境変数：
- `NODE_ENV` - 環境（development/production）
- `CLI_TEMPLATE_PATH` - カスタムテンプレートパス

## 貢献

バグ報告や機能リクエストは、GitHubのIssueで受け付けています。

プルリクエストを送る際は：
1. 新機能にはテストを追加
2. `npm run lint`でコードスタイルをチェック
3. ドキュメントを更新

## ライセンス

MIT