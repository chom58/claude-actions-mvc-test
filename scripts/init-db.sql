-- データベース初期化スクリプト
-- 開発環境用のデータベースセットアップ

-- 拡張機能の有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- 開発用ユーザーの権限設定
GRANT ALL PRIVILEGES ON DATABASE mvc_dev TO developer;

-- 基本的なインデックスとパフォーマンス設定
-- アプリケーションで作成されるテーブル用の事前設定

-- ログ用テーブル（開発時のデバッグ用）
CREATE TABLE IF NOT EXISTS debug_logs (
    id SERIAL PRIMARY KEY,
    level VARCHAR(10) NOT NULL,
    message TEXT NOT NULL,
    meta JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- セッションストレージ用テーブル（Redisが利用できない場合の代替）
CREATE TABLE IF NOT EXISTS sessions (
    sid VARCHAR PRIMARY KEY,
    sess JSONB NOT NULL,
    expire TIMESTAMP(6) NOT NULL
);

-- 開発用のサンプルデータ挿入フラグ
CREATE TABLE IF NOT EXISTS db_migrations (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) UNIQUE NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 開発環境であることを示すフラグの設定
INSERT INTO db_migrations (migration_name) VALUES ('initial_dev_setup') ON CONFLICT DO NOTHING;

-- 開発環境用の最適化設定
-- ログレベルを上げてデバッグしやすくする
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_min_duration_statement = 0;
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';

-- 設定の反映（PostgreSQL 再起動後に有効）
SELECT pg_reload_conf();