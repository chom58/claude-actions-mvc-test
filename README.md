# このプロジェクトについて
Claude GitHub Actionsのテストプロジェクトです。

# Claude Code Action プロジェクト

このリポジトリはClaude Code Actionを使用して、AIアシスタントによる自動化を実現します。

## 🚀 クイックスタート

### 方法1: Claude CLIから設定（推奨）
```bash
claude /install-github-app
```
ガイドに従って設定を完了してください。

### 方法2: 手動設定

#### 1. Claude GitHubアプリのインストール
[Claude GitHub App](https://github.com/apps/claude-ai)をリポジトリにインストール

#### 2. 認証設定
以下のいずれかの方法で認証を設定：
- **Anthropic APIキー**: リポジトリの Settings → Secrets → Actions で `ANTHROPIC_API_KEY` を設定
- **Claude Code OAuthトークン**: Claude CLIで認証済みの場合は自動的に使用

#### 3. 使用方法
IssueやPull Requestで `@claude` とメンションすることで、AIアシスタントが対応します。

## 💬 使用例

```
@claude この関数は何をしていますか？
```

```
@claude エラーハンドリングを追加してください
```

```
@claude このPRをレビューしてください
```

## 📋 プロジェクト構成

```
.
├── .github/
│   └── workflows/
│       └── claude.yml    # Claude Code Action設定
├── .gitignore           # Git除外設定
├── CLAUDE.md            # プロジェクト規約・AI向け指示
└── README.md            # このファイル
```

## 🔧 カスタマイズ

`CLAUDE.md`ファイルを編集することで、プロジェクト固有のルールやコーディング規約を設定できます。

## ⚠️ 注意事項

- 現在ベータ版のため、機能が変更される可能性があります
- 生成されたコードは必ず人間がレビューしてからマージしてください
- セキュリティに関わる変更は特に慎重に確認してください
- APIキーは絶対に公開しないでください

## 📚 参考リンク

- [Claude Code Action](https://github.com/anthropics/claude-code-action)
- [Claude Code Documentation](https://docs.anthropic.com/en/docs/claude-code)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)