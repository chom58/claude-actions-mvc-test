.PHONY: setup dev test clean build logs shell db-reset help

# デフォルトターゲット
.DEFAULT_GOAL := help

# ヘルプ
help: ## この Help を表示
	@echo "使用可能なコマンド:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# 初期セットアップ
setup: ## 開発環境のセットアップ
	@echo "🚀 開発環境をセットアップしています..."
	@docker-compose build
	@docker-compose run --rm app npm install
	@echo "✅ セットアップ完了"

# 開発環境起動
dev: ## 開発環境の起動
	@echo "🏗️ 開発環境を起動しています..."
	@docker-compose up

# 開発環境起動（バックグラウンド）
dev-bg: ## 開発環境の起動（バックグラウンド）
	@echo "🏗️ 開発環境をバックグラウンドで起動しています..."
	@docker-compose up -d

# テスト実行
test: ## テストの実行
	@echo "🧪 テストを実行しています..."
	@docker-compose run --rm app npm test

# E2Eテスト実行
test-e2e: ## E2Eテストの実行
	@echo "🎭 E2Eテストを実行しています..."
	@docker-compose run --rm app npm run test:e2e

# カバレッジ付きテスト
test-coverage: ## カバレッジ付きテストの実行
	@echo "📊 カバレッジ付きテストを実行しています..."
	@docker-compose run --rm app npm run test:coverage

# ビルド
build: ## Docker イメージのビルド
	@echo "🔨 Docker イメージをビルドしています..."
	@docker-compose build --no-cache

# ログ確認
logs: ## ログの表示
	@docker-compose logs -f

# アプリケーションログのみ
logs-app: ## アプリケーションログのみ表示
	@docker-compose logs -f app

# シェル接続
shell: ## アプリケーションコンテナのシェルに接続
	@docker-compose exec app sh

# データベースリセット
db-reset: ## データベースのリセット
	@echo "🗄️ データベースをリセットしています..."
	@docker-compose down -v
	@docker-compose up -d db redis
	@sleep 5
	@docker-compose run --rm app npm run seed
	@echo "✅ データベースリセット完了"

# クリーンアップ
clean: ## 全てのコンテナとボリュームを削除
	@echo "🧹 クリーンアップしています..."
	@docker-compose down -v --remove-orphans
	@docker system prune -f
	@echo "✅ クリーンアップ完了"

# リスタート
restart: ## 全サービスの再起動
	@echo "🔄 サービスを再起動しています..."
	@docker-compose restart

# 停止
stop: ## 全サービスの停止
	@echo "⏹️ サービスを停止しています..."
	@docker-compose down

# データベース接続
db-connect: ## データベースに接続
	@docker-compose exec db psql -U developer -d mvc_dev

# Redis接続
redis-connect: ## Redisに接続
	@docker-compose exec redis redis-cli

# 依存関係のインストール
install: ## 依存関係の再インストール
	@echo "📦 依存関係をインストールしています..."
	@docker-compose run --rm app npm install

# 本番環境向けビルド
build-prod: ## 本番環境用ビルド
	@echo "🏭 本番環境用イメージをビルドしています..."
	@docker build -f Dockerfile -t claude-web-server:production .

# 開発ツールダッシュボードのURL表示
dashboard: ## 開発ツールダッシュボードのURL表示
	@echo "🎛️ 開発ツールダッシュボード:"
	@echo "  📊 アプリケーション: http://localhost:3000"
	@echo "  🗄️ Adminer (DB管理): http://localhost:8080"
	@echo "  🔴 Redis Commander: http://localhost:8081"
	@echo "  📧 MailHog: http://localhost:8025"

# 本番環境テスト
test-prod: ## 本番環境設定でのテスト
	@echo "🏭 本番環境設定でテストしています..."
	@docker-compose -f environments/production/docker-compose.prod.yml build
	@docker-compose -f environments/production/docker-compose.prod.yml run --rm app npm test

# セキュリティ監査
audit: ## セキュリティ監査の実行
	@echo "🔒 セキュリティ監査を実行しています..."
	@docker-compose run --rm app npm audit

# パフォーマンステスト
perf-test: ## パフォーマンステストの実行
	@echo "⚡ パフォーマンステストを実行しています..."
	@docker-compose run --rm app npm run test:e2e