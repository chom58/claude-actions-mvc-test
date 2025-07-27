# Docker環境ガイド

## 概要

このプロジェクトはDocker環境での開発・本番運用をサポートしています。マルチステージビルドを使用した最適化されたDockerイメージと、開発・本番それぞれに最適化されたDocker Compose設定を提供します。

## 必要な環境

- Docker 20.10+
- Docker Compose 2.0+
- Node.js 18+ (ローカル開発時のみ)

## クイックスタート

### 開発環境の起動

```bash
# 1. 環境変数ファイルの準備
cp .env.example .env

# 2. Docker環境の起動
npm run docker:up

# 3. データベースの初期化
npm run seed

# または一括セットアップ
npm run setup
```

### アプリケーションへのアクセス

- アプリケーション: http://localhost:3000
- Adminer (DB管理): http://localhost:8080
- Redis Commander: http://localhost:8081
- MailHog (メール): http://localhost:8025

## Docker構成

### 開発環境 (docker-compose.yml)

```yaml
services:
  app:         # Node.jsアプリケーション (ホットリロード対応)
  db:          # PostgreSQL 15
  redis:       # Redis 7 (セッション・キャッシュ)
  mailhog:     # メール開発環境
  adminer:     # データベース管理UI
  redis-commander: # Redis管理UI
```

### 本番環境 (docker-compose.prod.yml)

```yaml
services:
  app:    # 最適化されたNode.jsアプリケーション
  db:     # PostgreSQL 15 (本番設定)
  redis:  # Redis 7 (本番設定)
  nginx:  # リバースプロキシ・静的ファイル配信
```

## Dockerfileの詳細

### 開発用 (Dockerfile.dev)

- ホットリロード対応
- デバッグポート (9229) 公開
- 開発ツール同梱

### 本番用 (Dockerfile)

- マルチステージビルド
- 最小限のイメージサイズ
- セキュリティ強化
- ヘルスチェック機能

## 便利なコマンド

### 基本操作

```bash
# 環境の起動
npm run docker:up

# 環境の停止
npm run docker:down

# ログの確認
npm run docker:logs
npm run docker:logs:app  # アプリケーションのみ

# 再起動
npm run docker:restart
```

### 開発作業

```bash
# コンテナ内でコマンド実行
npm run docker:exec -- npm install [package-name]

# コンテナ内のシェルに接続
npm run docker:shell

# 開発モードで起動（ビルド含む）
npm run docker:dev
```

### データベース操作

```bash
# データベースのリセット（初期データ投入）
npm run docker:db:reset

# マイグレーション実行
npm run docker:exec -- npm run migrate

# シーダー実行
npm run docker:exec -- npm run seed
```

### クリーンアップ

```bash
# 全てを削除して環境をクリーンに
npm run docker:clean

# イメージの再ビルド
npm run docker:build
```

## VS Codeデバッグ設定

`.vscode/launch.json`に以下の設定が含まれています：

1. **Docker: Attach to Node** - Dockerコンテナ内のNode.jsプロセスにアタッチ
2. **Launch Program** - ローカルでの直接実行
3. **Jest Tests** - テストのデバッグ

### Dockerデバッグの使い方

1. `npm run docker:up`で環境を起動
2. VS Codeで「Docker: Attach to Node」設定を選択
3. F5キーでデバッガーを起動
4. ブレークポイントを設定してデバッグ

## 本番環境へのデプロイ

### 1. 環境変数の設定

```bash
# .env.production ファイルを作成
cp .env.example .env.production
# 本番用の値を設定
```

### 2. ビルドと起動

```bash
# 本番用イメージのビルド
docker build -t myapp:latest .

# Docker Composeで起動
docker-compose -f docker-compose.prod.yml up -d
```

### 3. SSL証明書の設定

Nginxを使用する場合は、`/nginx/ssl/`ディレクトリに証明書を配置：

```
nginx/ssl/
├── cert.pem
└── key.pem
```

## トラブルシューティング

### ポート競合エラー

```bash
# 使用中のポートを確認
lsof -i :3000

# 別のポートで起動
PORT=3001 npm run docker:up
```

### データベース接続エラー

```bash
# データベースの状態確認
docker-compose ps db

# データベースのログ確認
docker-compose logs db

# 接続テスト
docker-compose exec db psql -U developer -d mvc_dev
```

### ビルドエラー

```bash
# キャッシュを無視して再ビルド
docker-compose build --no-cache

# 不要なイメージを削除
docker system prune -a
```

### パーミッションエラー

```bash
# コンテナ内のユーザーIDを確認
docker-compose exec app id

# ホストとコンテナのUID/GIDを合わせる
# Dockerfileで調整が必要な場合があります
```

## パフォーマンス最適化

### 開発環境

- `node_modules`をボリュームマウントから除外
- ホットリロードの最適化
- キャッシュの活用

### 本番環境

- マルチステージビルドで最小イメージ
- 静的ファイルはNginxから配信
- リソース制限の設定

## セキュリティ考慮事項

1. **非rootユーザーでの実行**
   - nodejs ユーザー (UID: 1001)で実行

2. **最小権限の原則**
   - 必要最小限のディレクトリのみ書き込み可能

3. **ヘルスチェック**
   - 定期的な死活監視

4. **シークレット管理**
   - 環境変数で管理
   - `.env`ファイルはGitに含めない

## 参考リンク

- [Docker公式ドキュメント](https://docs.docker.com/)
- [Docker Compose仕様](https://docs.docker.com/compose/compose-file/)
- [Node.js Dockerベストプラクティス](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md)