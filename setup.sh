#!/bin/bash

# Claude GitHub Actions MVC Test - 初回セットアップスクリプト

set -e

echo "🚀 Claude GitHub Actions MVC Test セットアップを開始します..."
echo ""

# 色の定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# GitHub CLIの確認
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) がインストールされていません"
    echo "👉 インストール方法: brew install gh (Mac) または https://cli.github.com/"
    exit 1
fi

# Git設定の確認
if ! git config user.name &> /dev/null || ! git config user.email &> /dev/null; then
    echo "⚠️  Gitのユーザー設定が必要です"
    read -p "名前を入力してください: " git_name
    read -p "メールアドレスを入力してください: " git_email
    git config user.name "$git_name"
    git config user.email "$git_email"
fi

# GitHub認証の確認
echo "🔐 GitHub認証を確認中..."
if ! gh auth status &> /dev/null; then
    echo "GitHub CLIでログインが必要です"
    gh auth login
fi

# リポジトリ作成
echo ""
echo "📦 GitHubリポジトリを作成します..."
read -p "GitHubのユーザー名を入力してください: " github_username

# リポジトリの存在確認
if gh repo view "${github_username}/claude-actions-mvc-test" &> /dev/null; then
    echo "⚠️  リポジトリは既に存在します"
    read -p "既存のリポジトリを使用しますか？ (y/n): " use_existing
    if [[ $use_existing != "y" ]]; then
        echo "セットアップを中止します"
        exit 1
    fi
else
    # 新規作成
    gh repo create claude-actions-mvc-test \
        --public \
        --description "Claude GitHub Actions testing environment with MVC application" \
        --source=. \
        --remote=origin
    echo -e "${GREEN}✅ リポジトリを作成しました${NC}"
fi

# 環境変数ファイルの作成
if [ ! -f .env ]; then
    echo ""
    echo "📝 環境変数ファイルを作成中..."
    cp .env.example .env
    echo -e "${GREEN}✅ .envファイルを作成しました${NC}"
fi

# 依存関係のインストール
echo ""
echo "📚 依存関係をインストール中..."
npm install
echo -e "${GREEN}✅ 依存関係をインストールしました${NC}"

# 初回コミット & プッシュ
echo ""
echo "🚀 GitHubにプッシュ中..."
git add .
git commit -m "Initial commit: Claude GitHub Actions MVC test project" || true
git branch -M main
git push -u origin main
echo -e "${GREEN}✅ プッシュ完了${NC}"

# Claude GitHub Appのインストール案内
echo ""
echo -e "${YELLOW}📱 Claude GitHub Appのインストール${NC}"
echo "以下のいずれかの方法でインストールしてください："
echo ""
echo "1. Claude CLIから（推奨）:"
echo "   claude /install-github-app"
echo ""
echo "2. ブラウザから:"
echo "   https://github.com/apps/claude-ai"
echo ""

# 完了メッセージ
echo -e "${GREEN}🎉 セットアップが完了しました！${NC}"
echo ""
echo "📋 次のステップ:"
echo "1. Claude GitHub Appをインストール"
echo "2. 以下のコマンドでブラウザでリポジトリを開く:"
echo "   gh repo view --web"
echo "3. 新しいIssueを作成して '@claude' メンションでテスト"
echo ""
echo "💡 ヒント: 'npm run dev' で開発サーバーを起動できます"