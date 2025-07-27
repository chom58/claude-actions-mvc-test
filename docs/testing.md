# テストガイド

## 概要

このプロジェクトは包括的なテスト戦略を採用しており、単体テスト、統合テスト、E2Eテストの3層構造でコード品質を保証します。

## テストの種類

### 1. 単体テスト (Unit Tests)

個々の関数やクラスの動作を検証します。

```bash
# 単体テストの実行
npm run test:unit

# ウォッチモード
npm run test:watch
```

### 2. 統合テスト (Integration Tests)

APIエンドポイントやデータベース連携を検証します。

```bash
# 統合テストの実行
npm run test:integration

# カバレッジ付き
npm run test:coverage
```

### 3. E2Eテスト (End-to-End Tests)

実際のブラウザでユーザーフローを検証します。

```bash
# E2Eテストの実行
npm run test:e2e

# UIモードで実行（デバッグ用）
npm run test:e2e:ui

# 特定のブラウザで実行
npm run test:e2e:chrome
```

## ディレクトリ構造

```
tests/
├── unit/              # 単体テスト
├── integration/       # 統合テスト
│   └── api/          # API統合テスト
├── e2e/              # E2Eテスト
│   ├── pages/        # Page Object Models
│   └── specs/        # テストスペック
├── fixtures/         # テストデータ
├── helpers/          # テストヘルパー
├── utils/            # ユーティリティ
└── setup.js          # グローバルセットアップ
```

## テストヘルパー

### API Test Helper

API統合テストを簡単に書くためのヘルパー：

```javascript
const apiHelper = require('./tests/helpers/api.helper');

// 認証済みユーザーの作成
const { user, token } = await apiHelper.createAuthenticatedUser();

// 認証付きリクエスト
const response = await apiHelper.authPost('/api/posts', postData, token);

// レスポンス検証
apiHelper.expectSuccess(response, 201);
apiHelper.expectPagination(response);
```

### DB Test Helper

データベース操作のヘルパー：

```javascript
const dbHelper = require('./tests/helpers/db.helper');

// データベースリセット
await dbHelper.resetDatabase();

// テストデータ作成
const user = await dbHelper.createTestData('User', { 
  username: 'testuser' 
});

// トランザクション内でのテスト
await dbHelper.withTransaction(async (transaction) => {
  // テスト実行
});
```

### Test Data Generator

リアルなテストデータを生成：

```javascript
const TestDataGenerator = require('./tests/utils/test-data-generator');

// 単一データ生成
const user = TestDataGenerator.generateUser();
const post = TestDataGenerator.generatePost();

// 複数データ生成
const users = TestDataGenerator.generateBulk('user', 10);

// シナリオベースのデータ生成
const data = TestDataGenerator.generateScenarioData('newUserRegistration');
```

## テストの書き方

### 単体テストの例

```javascript
describe('UserService', () => {
  describe('createUser', () => {
    it('should create a new user with valid data', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'Test123!@#'
      };

      const user = await UserService.createUser(userData);
      
      expect(user).toBeDefined();
      expect(user.username).toBe(userData.username);
      expect(user.password).not.toBe(userData.password); // ハッシュ化確認
    });

    it('should throw error for invalid email', async () => {
      const userData = {
        username: 'testuser',
        email: 'invalid-email',
        password: 'Test123!@#'
      };

      await expect(UserService.createUser(userData))
        .rejects.toThrow('Invalid email format');
    });
  });
});
```

### 統合テストの例

```javascript
describe('Posts API', () => {
  let authToken;

  beforeEach(async () => {
    await dbHelper.resetDatabase();
    const { token } = await apiHelper.createAuthenticatedUser();
    authToken = token;
  });

  describe('POST /api/posts', () => {
    it('should create a new post', async () => {
      const postData = {
        title: 'Test Post',
        content: 'Test content'
      };

      const response = await apiHelper.authPost('/api/posts', postData, authToken);
      
      apiHelper.expectSuccess(response, 201);
      expect(response.body.post.title).toBe(postData.title);
    });
  });
});
```

### E2Eテストの例

```javascript
const { test, expect } = require('@playwright/test');
const LoginPage = require('../pages/login.page');

test.describe('認証フロー', () => {
  test('正常なログイン', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    
    await loginPage.login('user@example.com', 'password123');
    
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('.welcome-message')).toBeVisible();
  });
});
```

## カバレッジ

### カバレッジ目標

- 全体: 80%以上
- ブランチ: 80%以上
- 関数: 80%以上
- 行: 80%以上

### カバレッジレポート

```bash
# カバレッジレポートの生成
npm run test:coverage

# HTMLレポートを開く
open coverage/index.html
```

## CI/CD統合

### GitHub Actions設定例

```yaml
name: Test
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Run unit and integration tests
      run: npm run test:ci
      
    - name: Run E2E tests
      run: npm run test:e2e
      
    - name: Upload coverage
      uses: codecov/codecov-action@v3
```

## ベストプラクティス

### 1. テストの独立性

- 各テストは独立して実行可能
- テスト間の依存関係を避ける
- 必要なデータは各テスト内で準備

### 2. 明確な命名

```javascript
// 良い例
it('should return 404 when post does not exist', async () => {});

// 悪い例
it('test post not found', async () => {});
```

### 3. AAA パターン

```javascript
it('should update user profile', async () => {
  // Arrange (準備)
  const user = await createUser();
  const updateData = { bio: 'New bio' };
  
  // Act (実行)
  const result = await updateProfile(user.id, updateData);
  
  // Assert (検証)
  expect(result.bio).toBe('New bio');
});
```

### 4. テストデータの管理

- ファクトリーパターンを使用
- ランダムデータでテストの信頼性向上
- シードデータは最小限に

### 5. 非同期処理の適切な処理

```javascript
// 良い例
it('should process async operation', async () => {
  const result = await asyncOperation();
  expect(result).toBeDefined();
});

// 悪い例（done コールバックは避ける）
it('should process async operation', (done) => {
  asyncOperation().then(result => {
    expect(result).toBeDefined();
    done();
  });
});
```

## トラブルシューティング

### テストがタイムアウトする

```javascript
// タイムアウトを延長
jest.setTimeout(30000); // 30秒

// または個別のテストで
it('long running test', async () => {
  // ...
}, 30000);
```

### データベース接続エラー

```bash
# テスト用データベースの確認
npm run docker:up
npm run seed
```

### E2Eテストが不安定

```javascript
// 明示的な待機を使用
await page.waitForSelector('.element');
await page.waitForLoadState('networkidle');
```

## 参考リンク

- [Jest Documentation](https://jestjs.io/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)