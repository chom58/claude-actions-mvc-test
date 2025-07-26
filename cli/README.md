# CLIジェネレーター

MVCアプリケーション開発を効率化するためのコード生成ツールです。

## 📦 インストール

```bash
# 依存関係をインストール
npm install

# ジェネレーターを使用準備完了
npm run generate
```

## 🚀 使用方法

### インタラクティブモード（推奨）

```bash
npm run generate
```

対話形式で生成したいコンポーネントを選択し、設定できます。

### コマンドラインモード

#### モデル生成
```bash
# 基本的なモデル
npm run generate:model User name:string email:string

# 詳細な属性指定
npm run generate:model Product name:string:required price:integer:required description:text
```

#### コントローラー生成
```bash
# デフォルトアクション（index,show,create,update,destroy）
npm run generate:controller User

# カスタムアクション
npm run generate:controller User -- --actions index,show,create
```

#### ルート生成
```bash
npm run generate:routes users
```

#### ビュー生成
```bash
# 全ビュー（index,show,edit,new）
npm run generate:views users

# 特定のビュー
npm run generate:views users index show
```

#### API生成
```bash
npm run generate:api users
```

#### スキャフォールド生成（推奨）
```bash
# 完全なCRUDリソース
npm run generate:scaffold Product name:string:required price:integer description:text

# APIのみ（ビューなし）
npm run generate:scaffold Product name:string price:integer -- --api-only
```

## 📋 属性の指定方法

属性は `name:type:option1:option2` の形式で指定します。

### データ型
- `string` - 文字列
- `text` - 長いテキスト
- `integer` - 整数
- `float` - 浮動小数点数
- `boolean` - 真偽値
- `date` - 日付
- `reference` - 外部キー

### オプション
- `required` - 必須フィールド
- `unique` - ユニーク制約
- `index` - インデックス

### 例
```bash
npm run generate:scaffold User \\
  name:string:required \\
  email:string:required:unique \\
  age:integer \\
  bio:text \\
  isActive:boolean \\
  createdAt:date
```

## 📂 生成されるファイル

### モデル生成
- `src/models/ModelName.js` - Sequelizeモデル定義
- `migrations/timestamp-create-model_name.js` - マイグレーションファイル

### コントローラー生成
- `src/controllers/modelNameController.js` - CRUD操作を含むコントローラー

### ルート生成
- `src/routes/model_namesRoutes.js` - RESTfulルート定義

### ビュー生成
- `public/model_names/index.html` - 一覧ページ
- `public/model_names/show.html` - 詳細ページ
- `public/model_names/edit.html` - 編集ページ
- `public/model_names/new.html` - 新規作成ページ

### API生成
- 上記のモデル、コントローラー、ルートに加えて：
- `docs/api/model_names.md` - API仕様書
- `docs/postman/model_names.json` - Postmanコレクション

### スキャフォールド生成
- 上記すべて + セットアップガイド
- `docs/setup/model_names-setup.md` - セットアップ手順書

## 🔧 セットアップ手順

1. **ルートの登録**
   `src/routes/index.js` に生成されたルートを追加：
   ```javascript
   const usersRoutes = require('./usersRoutes');
   app.use('/api/users', usersRoutes);
   ```

2. **マイグレーション実行**
   ```bash
   npx sequelize-cli db:migrate
   ```

3. **バリデーション設定**
   生成されたルートファイルのバリデーションルールを要件に合わせて調整

4. **認証追加（必要な場合）**
   認証が必要なエンドポイントに `authMiddleware` を追加

## 📚 生成例

### ブログ記事システム
```bash
npm run generate:scaffold Post \\
  title:string:required \\
  content:text:required \\
  published:boolean \\
  authorId:reference:required
```

### 商品管理システム
```bash
npm run generate:scaffold Product \\
  name:string:required:unique \\
  price:integer:required \\
  description:text \\
  categoryId:reference \\
  inStock:boolean
```

### ユーザー管理システム
```bash
npm run generate:scaffold User \\
  username:string:required:unique \\
  email:string:required:unique \\
  password:string:required \\
  role:string \\
  isActive:boolean
```

## 🎨 カスタマイズ

### テンプレートの編集
`cli/templates/` ディレクトリ内のテンプレートファイルを編集して、生成されるコードをカスタマイズできます。

### 新しいジェネレーターの追加
`cli/generators/` ディレクトリに新しいジェネレーターファイルを追加し、`cli/index.js` にコマンドを登録してください。

## ⚠️ 注意事項

- 既存ファイルは上書きされません（安全のため）
- `--force` オプションで強制上書き可能（開発中）
- バックアップを取ってから使用することを推奨
- 生成後は必ずコードをレビューしてください

## 🐛 トラブルシューティング

### よくある問題

1. **パッケージが見つからないエラー**
   ```bash
   npm install
   ```

2. **ディレクトリが存在しないエラー**
   ```bash
   mkdir -p migrations docs/api docs/setup docs/postman
   ```

3. **権限エラー**
   ```bash
   chmod +x cli/index.js
   ```

## 🤝 貢献

バグ報告や機能要求は Issue でお知らせください。
プルリクエストも歓迎します！

## 📄 ライセンス

MIT License