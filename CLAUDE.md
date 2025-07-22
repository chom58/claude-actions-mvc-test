# CLAUDE.md - ワークスペース全体の共通ルール

## 🏗️ プロジェクト構造
```
~/Claude/                      # Claude Code開発環境
├── projects/          # 開発プロジェクト (@~/Claude/projects/CLAUDE.md)
│   ├── active/       # 現在開発中
│   ├── archived/     # 完成・停止中
│   └── experiments/  # 実験的プロジェクト
├── scripts/          # スタンドアロンスクリプト (@~/Claude/scripts/CLAUDE.md)
├── services/         # バックエンドサービス
└── templates/        # プロジェクトテンプレート
```

## 📋 全体共通ルール
- コミットメッセージ: `type(scope): message` 形式
- ブランチ戦略: main → develop → feature/*
- 言語: 日本語コメント推奨（グローバルプロジェクトは英語）

## 🌐 言語・文字コード設定
- 言語: Japanese
- 文字コード: UTF-8
- コメント: 日本語推奨

## ⚠️ 安全な運用ガイドライン
- 重要な変更前は計画を説明
- 破壊的操作（削除、上書き等）は事前に警告
- ユーザーの意図を尊重し、勝手な最適化は避ける
- サーバー起動は必ず別ターミナルで実行（既存プロセスとの競合を防ぐため）

## 🔗 詳細ドキュメント参照
- プロジェクト管理: @~/Claude/projects/README.md
- プロジェクトステータス: @~/Claude/projects/PROJECT_STATUS.md
- 個別プロジェクトルール: 各プロジェクトのCLAUDE.md参照

## 🤖 Claude GitHub Actions設定
### 技術スタック
- 主要言語: TypeScript/JavaScript
- フレームワーク: Next.js, React
- スタイリング: Tailwind CSS
- パッケージマネージャー: npm

### コーディング規約
- インデント: スペース2つ
- 命名規則: camelCase（変数・関数）、PascalCase（コンポーネント・クラス）
- エラーハンドリング: try-catchを適切に使用
- テスト: 新機能には必ずテストを追加

### AIアシスタント利用時の注意
- @claudeメンションで起動
- 破壊的変更は必ずレビュー後にマージ
- 生成されたコードは必ず人間がレビュー
- セキュリティに関わる変更は特に慎重に確認