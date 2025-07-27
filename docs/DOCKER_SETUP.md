# Docker開発環境セットアップガイド

## 概要

このドキュメントでは、Docker化された開発環境のセットアップと使用方法について説明します。

## 前提条件

- Docker Engine 20.10.0 以上
- Docker Compose 2.0.0 以上
- VS Code（推奨）
- Git

## クイックスタート

```bash
# 1. リポジトリのクローン
git clone <repository-url>
cd claude-actions-mvc-test

# 2. 開発環境のセットアップ
make setup

# 3. 開発環境の起動
make dev
```

## サービス構成

| サービス | ポート | 説明 |
|---------|-------|------|
| app | 3000 | メインアプリケーション |
| db | 5432 | PostgreSQL データベース |
| redis | 6379 | Redis キャッシュ/セッション |
| mailhog | 8025 | メール送信テスト |
| adminer | 8080 | データベース管理 |
| redis-commander | 8081 | Redis 管理 |

## 開発ワークフロー

### 1. 環境の起動

```bash
# バックグラウンドで起動
make dev-bg

# ログを確認
make logs

# 特定のサービスのログのみ
make logs-app
```

### 2. 開発作業

```bash
# コンテナ内でコマンド実行
make shell

# テストの実行
make test

# データベースリセット
make db-reset
```

### 3. デバッグ

- VS Code でデバッグ設定を使用
- ブレークポイントを設定してデバッグ実行
- ポート 9229 でNode.jsデバッガーに接続

### 4. 環境の停止

```bash
# サービス停止
make stop

# 完全クリーンアップ
make clean
```

## VS Code 統合

### 推奨拡張機能

インストール時に自動的に推奨される拡張機能：

- Docker
- Remote - Containers
- REST Client
- GitLens
- Jest
- Playwright

### デバッグ設定

`.vscode/launch.json` で以下のデバッグ設定が利用可能：

1. **Docker: デバッグモードでアプリケーションを起動**
   - Dockerコンテナ内でデバッグ実行
   
2. **ローカル: デバッグモードでアプリケーションを起動**
   - ローカル環境でデバッグ実行
   
3. **Jest: 全テスト実行**
   - すべてのテストをデバッグモードで実行
   
4. **Jest: 現在のファイルをテスト**
   - 現在開いているテストファイルのみ実行

## 環境設定

### 開発環境

- 設定ファイル: `environments/development/.env`
- Hot reload 有効
- デバッグログ出力
- 全開発ツール利用可能

### テスト環境

- 設定ファイル: `environments/testing/.env`
- 独立したデータベース
- テスト専用設定

### 本番環境

- 設定ファイル: `environments/production/.env.example`
- セキュリティ設定強化
- パフォーマンス最適化

## 利用可能なコマンド

### Make コマンド

```bash
make help          # ヘルプ表示
make setup         # 初期セットアップ
make dev           # 開発環境起動
make dev-bg        # バックグラウンド起動
make test          # テスト実行
make test-e2e      # E2Eテスト実行
make build         # イメージビルド
make logs          # ログ表示
make shell         # シェル接続
make db-reset      # DB リセット
make clean         # クリーンアップ
make dashboard     # ダッシュボードURL表示
```

### npm スクリプト

```bash
npm run docker:up       # Docker 起動
npm run docker:down     # Docker 停止
npm run docker:build    # Docker ビルド
npm run docker:logs     # ログ表示
npm run docker:db:reset # DB リセット
npm run docker:shell    # シェル接続
```

## 開発ツールダッシュボード

開発中に利用できるツール：

- **アプリケーション**: http://localhost:3000
- **Adminer (DB管理)**: http://localhost:8080
  - サーバー: `db`
  - ユーザー: `developer`
  - パスワード: `password`
  - データベース: `mvc_dev`
- **Redis Commander**: http://localhost:8081
- **MailHog**: http://localhost:8025

## ホットリロード設定

`nodemon.json` でホットリロードの設定を管理：

- `src/` ディレクトリの変更を監視
- JavaScript、JSON ファイルの変更で自動再起動
- 1秒の遅延で再起動実行

## データベース管理

### 接続方法

```bash
# データベースに直接接続
make db-connect

# または
docker-compose exec db psql -U developer -d mvc_dev
```

### データリセット

```bash
# データベースの完全リセット
make db-reset
```

### バックアップ・リストア

```bash
# バックアップ
docker-compose exec db pg_dump -U developer mvc_dev > backup.sql

# リストア
docker-compose exec -T db psql -U developer mvc_dev < backup.sql
```

## Redis管理

### 接続方法

```bash
# Redis に直接接続
make redis-connect

# または
docker-compose exec redis redis-cli
```

### データ確認

```bash
# すべてのキーを表示
docker-compose exec redis redis-cli KEYS "*"

# 特定のキーの値を表示
docker-compose exec redis redis-cli GET "key_name"
```

## トラブルシューティング

### よくある問題

#### 1. ポートが既に使用されている

```bash
# ポート使用状況確認
netstat -tulpn | grep :3000

# サービス停止
make stop
```

#### 2. データベース接続エラー

```bash
# データベースログ確認
docker-compose logs db

# データベース再起動
docker-compose restart db
```

#### 3. Redis接続エラー

```bash
# Redis ログ確認
docker-compose logs redis

# Redis 再起動
docker-compose restart redis
```

#### 4. ファイル権限エラー

```bash
# ログディレクトリの権限修正
sudo chown -R $USER:$USER logs/
```

#### 5. Docker ボリューム問題

```bash
# 完全クリーンアップ
make clean

# 再セットアップ
make setup
```

### デバッグ方法

1. **ログ確認**
   ```bash
   make logs
   make logs-app
   ```

2. **コンテナ内確認**
   ```bash
   make shell
   ```

3. **ヘルスチェック**
   ```bash
   docker-compose ps
   ```

4. **VS Code デバッガー使用**
   - デバッグ設定を選択
   - ブレークポイント設定
   - F5 でデバッグ開始

## パフォーマンス最適化

### 開発環境での最適化

1. **ボリュームマウント最適化**
   - `node_modules` を除外ボリュームとしてマウント
   - ソースコードのみ監視対象

2. **メモリ使用量削減**
   - 不要なサービス停止
   - アプリケーション固有のサービスのみ起動

3. **ビルド時間短縮**
   - `.dockerignore` でビルドコンテキスト最適化
   - マルチステージビルド活用

## セキュリティ考慮事項

### 開発環境

- デフォルトパスワード使用（本番環境では変更必須）
- HTTPS 無効（本番環境では有効化必須）
- 全ポート開放（本番環境では制限必須）

### 本番環境への移行時注意点

1. 環境変数の本番用設定
2. SSL/TLS 設定
3. ファイアウォール設定
4. セキュリティヘッダー設定
5. ログ出力レベル調整

## 継続的インテグレーション

GitHub Actions やその他 CI/CD パイプラインとの統合：

```yaml
# .github/workflows/test.yml 例
- name: Run tests
  run: |
    make setup
    make test
    make test-e2e
```

## サポート・連絡先

問題が発生した場合：

1. このドキュメントのトラブルシューティングを確認
2. GitHub Issues で報告
3. 開発チームに連絡