# 🚀 GitHub リポジトリセットアップガイド

## 前提条件
- GitHub CLIがインストール済み（`brew install gh` または [公式サイト](https://cli.github.com/)）
- Gitの初期設定が完了済み

## セットアップ手順

### 1. GitHub CLIでリポジトリ作成（推奨）

```bash
# GitHub CLIでログイン（初回のみ）
gh auth login

# リポジトリ作成
gh repo create claude-actions-mvc-test \
  --public \
  --description "Claude GitHub Actions testing environment with MVC application" \
  --source=. \
  --remote=origin \
  --push

# 作成完了！ブラウザで開く
gh repo view --web
```

### 2. 手動でリポジトリ作成する場合

1. [GitHub](https://github.com/new)で新規リポジトリ作成
   - Repository name: `claude-actions-mvc-test`
   - Description: `Claude GitHub Actions testing environment with MVC application`
   - Public リポジトリを選択
   - READMEは追加しない（既にあるため）

2. ローカルリポジトリと接続

```bash
# リモートリポジトリを追加
git remote add origin https://github.com/YOUR_USERNAME/claude-actions-mvc-test.git

# 最初のプッシュ
git branch -M main
git push -u origin main
```

### 3. Claude GitHub Appのインストール

```bash
# Claude CLIから（推奨）
claude /install-github-app

# または手動で
# https://github.com/apps/claude-ai からインストール
```

### 4. 動作確認

新しいIssueを作成してテスト：

```bash
# CLIから
gh issue create \
  --title "Claude動作テスト" \
  --body "@claude こんにちは！自己紹介をしてください。"

# または GitHubのWebUIから作成
```

## トラブルシューティング

### リポジトリ作成でエラーが出る場合
```bash
# 認証状態を確認
gh auth status

# 再ログイン
gh auth login
```

### プッシュでエラーが出る場合
```bash
# リモートURLを確認
git remote -v

# 必要に応じて変更
git remote set-url origin https://github.com/YOUR_USERNAME/claude-actions-mvc-test.git
```

## 次のステップ

1. 最初のIssueで`@claude`メンションをテスト
2. PRを作成してコードレビューをテスト
3. [運用ガイド](./README.md#運用方法)を参照して本格的な活用開始

---

💡 **ヒント**: `gh`コマンドは多くの便利な機能があります。`gh --help`で確認してみてください。