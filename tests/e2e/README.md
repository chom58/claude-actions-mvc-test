# E2Eテストスイート

このディレクトリには、アプリケーション全体の品質を保証するためのエンドツーエンド（E2E）テストが含まれています。

## 📁 ディレクトリ構成

```
tests/e2e/
├── specs/                  # テストスペック
│   ├── auth.spec.js       # 認証フローのテスト
│   ├── jobs.spec.js       # 求人関連フローのテスト
│   └── community.spec.js  # コミュニティ機能のテスト
├── pages/                 # Page Object Model
│   ├── BasePage.js        # 基底ページクラス
│   ├── LoginPage.js       # ログインページ
│   ├── RegisterPage.js    # 登録ページ
│   └── DashboardPage.js   # ダッシュボードページ
├── fixtures/              # テストデータ
│   └── testData.js        # ユーザー、求人、イベントデータ
├── utils/                 # ヘルパー関数
│   └── helpers.js         # 共通ユーティリティ
├── accessibility/         # アクセシビリティテスト
│   └── accessibility.spec.js
├── global-setup.js       # グローバルセットアップ
├── global-teardown.js    # グローバルティアダウン
└── README.md             # このファイル
```

## 🚀 テストの実行

### 前提条件

1. Node.js (18以上) がインストールされていること
2. アプリケーションサーバーが起動していること (http://localhost:3000)

### 依存関係のインストール

```bash
npm install
```

### 基本的なテスト実行

```bash
# 全てのE2Eテストを実行
npm run test:e2e

# UIモードでテストを実行（推奨）
npm run test:e2e:ui

# デバッグモードでテストを実行
npm run test:e2e:debug
```

### 特定のテストファイルを実行

```bash
# 認証テストのみ実行
npx playwright test tests/e2e/specs/auth.spec.js

# 求人関連テストのみ実行
npx playwright test tests/e2e/specs/jobs.spec.js

# コミュニティ機能テストのみ実行
npx playwright test tests/e2e/specs/community.spec.js
```

### 特定のブラウザでテスト実行

```bash
# Chromiumでのみ実行
npx playwright test --project=chromium

# Firefoxでのみ実行
npx playwright test --project=firefox

# WebKitでのみ実行
npx playwright test --project=webkit

# モバイルChromeでのみ実行
npx playwright test --project=mobile-chrome
```

### ヘッドレスモードの切り替え

```bash
# ヘッドレスモードで実行（デフォルト）
npx playwright test

# ヘッドあり（ブラウザを表示）で実行
npx playwright test --headed
```

## 📊 テスト結果とレポート

### HTMLレポートの確認

```bash
# テスト実行後にHTMLレポートを表示
npx playwright show-report
```

### テスト結果の出力場所

- **HTMLレポート**: `test-results/html-report/index.html`
- **JSONレポート**: `test-results/results.json`
- **JUnitレポート**: `test-results/junit.xml`
- **スクリーンショット**: `test-results/screenshots/`
- **ビデオ録画**: `test-results/videos/`

## 🧪 テストの種類

### 1. 認証フロー (`auth.spec.js`)

- ユーザー登録（デザイナー、企業、ブランド）
- ログイン/ログアウト
- パスワードリセット
- ソーシャル認証
- バリデーション機能

### 2. 求人関連フロー (`jobs.spec.js`)

- 求人検索・フィルタリング
- 求人詳細の閲覧
- 求人応募プロセス
- 求人投稿（企業側）
- 応募管理

### 3. コミュニティ機能 (`community.spec.js`)

- プロフィール作成・編集
- 画像アップロード
- イベント参加登録
- コラボレーション申請
- ユーザー検索・フィルタリング

### 4. アクセシビリティテスト (`accessibility.spec.js`)

- WCAG 2.1 AA準拠チェック
- キーボードナビゲーション
- スクリーンリーダー対応
- 色のコントラスト比
- フォーカス管理

## 🛠️ テストの作成・編集

### Page Object Modelパターン

```javascript
// 新しいページクラスの例
const BasePage = require('./BasePage');

class NewPage extends BasePage {
  constructor(page) {
    super(page);
    
    this.selectors = {
      submitButton: '.submit-button',
      errorMessage: '.error-message'
    };
  }
  
  async submitForm() {
    await this.click(this.selectors.submitButton);
    await this.waitForLoadState();
  }
  
  async getErrorMessage() {
    return await this.getText(this.selectors.errorMessage);
  }
}

module.exports = NewPage;
```

### テストの書き方

```javascript
const { test, expect } = require('@playwright/test');
const NewPage = require('../pages/NewPage');

test.describe('新機能のテスト', () => {
  let newPage;
  
  test.beforeEach(async ({ page }) => {
    newPage = new NewPage(page);
  });
  
  test('新機能が正常に動作する', async ({ page }) => {
    await newPage.goto('/new-feature');
    await newPage.submitForm();
    
    expect(await newPage.getCurrentUrl()).toContain('/success');
  });
});
```

## ⚙️ 設定のカスタマイズ

### 環境変数

```bash
# ベースURL（デフォルト: http://localhost:3000）
BASE_URL=http://localhost:3000

# タイムアウト設定（ミリ秒）
PLAYWRIGHT_TIMEOUT=30000

# ヘッドレスモード切り替え
PLAYWRIGHT_HEADLESS=false
```

### playwright.config.js の主要設定

- **testDir**: テストディレクトリのパス
- **timeout**: テスト全体のタイムアウト
- **retries**: 失敗時のリトライ回数
- **workers**: 並列実行ワーカー数
- **use.baseURL**: アプリケーションのベースURL
- **projects**: 実行するブラウザの設定

## 🐛 トラブルシューティング

### よくある問題と解決方法

#### 1. テストが失敗する

```bash
# 詳細なデバッグ情報を表示
npx playwright test --debug

# スクリーンショットを確認
# test-results/screenshots/ ディレクトリを確認
```

#### 2. アプリケーションに接続できない

```bash
# アプリケーションが起動しているか確認
curl http://localhost:3000

# ポートが正しいか確認
netstat -tlnp | grep 3000
```

#### 3. ブラウザのインストールエラー

```bash
# Playwrightブラウザを再インストール
npx playwright install --with-deps
```

#### 4. 権限エラー

```bash
# Linux/macOSの場合
chmod +x node_modules/.bin/playwright
```

## 📈 CI/CDでの実行

GitHub Actionsでの自動実行は`.github/workflows/e2e-tests.yml`で設定されています。

### 実行される内容

1. **マルチブラウザテスト**: Chromium, Firefox, WebKit
2. **パフォーマンステスト**: Lighthouseを使用
3. **アクセシビリティテスト**: axe-coreを使用
4. **テスト結果レポート**: HTMLレポートとアーティファクト保存

### 手動トリガー

```bash
# GitHub CLIを使用して手動実行
gh workflow run e2e-tests.yml
```

## 🎯 ベストプラクティス

### テスト作成時の注意点

1. **独立性**: 各テストは他のテストに依存しない
2. **清潔性**: テスト前後でデータをクリーンアップ
3. **可読性**: わかりやすいテスト名と構造
4. **安定性**: 時間やランダム要素に依存しない
5. **効率性**: 必要最小限のテスト時間

### Page Object Modelの活用

- UIの変更に強いテストを作成
- 再利用可能なメソッドの作成
- セレクタの一元管理

### テストデータの管理

- `fixtures/testData.js`でテストデータを一元管理
- ランダムデータの活用で重複を回避
- 環境に依存しないテストデータの使用

## 📚 参考資料

- [Playwright公式ドキュメント](https://playwright.dev/)
- [Page Object Modelパターン](https://playwright.dev/docs/pom)
- [アクセシビリティテスト](https://playwright.dev/docs/accessibility-testing)
- [CI/CDでの実行](https://playwright.dev/docs/ci)