# MVC Template へようこそ

**MVC Template** は、Express.js と Sequelize ORM を使用した本格的な **原宿クリエイティブコミュニティプラットフォーム** です。

## 🎯 プロジェクト概要

このプロジェクトは以下の目的で開発されています：

- **クリエイティブコミュニティ**: デザイン会社、アパレルブランド、イベント、コラボレーションを繋ぐプラットフォーム
- **デザイナー求人板**: デザイナー向けの専門的な求人情報集約システム
- **ユーザー管理システム**: JWT + OAuth を使用した包括的な認証システム

## ✨ 主な機能

### 🎨 クリエイティブコミュニティ
- デザイン会社・アパレルブランドディレクトリ
- クリエイティブイベント管理
- コラボレーションマッチングシステム
- レビュー・評価システム

### 💼 デザイナー求人板
- 複数ソースからの求人情報集約
- 高度なフィルタリング（経験レベル、雇用形態、場所）
- エントリーレベル・新卒向け機能
- クリック追跡・分析機能

### 🔐 認証・ユーザー管理
- JWT ベース認証（リフレッシュトークン対応）
- OAuth 統合（Google、GitHub）
- ユーザープロフィール管理
- セッション管理

### 📝 コンテンツ管理
- 投稿作成・管理
- 画像アップロード・処理
- 検索機能
- ページネーション・フィルタリング

### ⚡ リアルタイム機能
- WebSocket ベースチャットシステム
- ライブ通知
- リアルタイム更新

## 🏗️ 技術スタック

- **Backend**: Express.js (Node.js)
- **ORM**: Sequelize
- **Database**: SQLite (開発) / PostgreSQL (本番)
- **Authentication**: JWT + OAuth
- **Security**: Helmet、CORS、CSRF保護、レート制限
- **File Upload**: Multer + Sharp (画像処理)
- **Real-time**: Socket.io + Redis アダプター
- **Testing**: Jest (ユニット)、Playwright (E2E)、Supertest (統合)
- **Monitoring**: Winston ロギング、メトリクス収集

## 🚀 クイックスタート

### 1. リポジトリをクローン

```bash
git clone https://github.com/chom58/claude-actions-mvc-test.git
cd claude-actions-mvc-test
```

### 2. 依存関係をインストール

```bash
npm install
```

### 3. 環境変数を設定

```bash
cp .env.example .env
# .env ファイルを編集して必要な値を設定
```

### 4. データベースをセットアップ

```bash
# 開発用データでシード
npm run seed
```

### 5. 開発サーバーを起動

```bash
npm run dev
```

アプリケーションは `http://localhost:3000` で起動します。

## 📚 ドキュメント

- [インストールガイド](getting-started/installation)
- [設定方法](getting-started/configuration)
- [API リファレンス](/api)
- [アーキテクチャ概要](architecture/overview)
- [開発者向けガイド](development/setup)

## 🧪 テスト

```bash
# ユニットテスト
npm test

# E2Eテスト
npm run test:e2e

# カバレッジ付きテスト
npm run test:coverage
```

## 📖 ドキュメント生成

このプロジェクトには包括的なドキュメント自動生成システムが含まれています：

```bash
# 全ドキュメント生成
npm run docs:generate

# API ドキュメント
npm run docs:api

# コードドキュメント
npm run docs:code

# アーキテクチャ図
npm run docs:diagrams

# ドキュメントサイト起動
npm run docs:serve
```

## 🤝 コントリビューション

プロジェクトへの貢献を歓迎します！以下をご確認ください：

1. [開発ガイド](development/setup)
2. [コーディング規約](development/coding-standards)
3. [プルリクエストガイドライン](development/contributing)

## 📄 ライセンス

このプロジェクトは MIT ライセンスの下で公開されています。詳細は [LICENSE](https://github.com/chom58/claude-actions-mvc-test/blob/main/LICENSE) ファイルをご覧ください。

## 📞 サポート

- [GitHub Issues](https://github.com/chom58/claude-actions-mvc-test/issues)
- [ドキュメント](/docs)
- [FAQ](faq/common-issues)

---

*このドキュメントは自動生成されています。最新の情報については [GitHub リポジトリ](https://github.com/chom58/claude-actions-mvc-test) をご確認ください。*