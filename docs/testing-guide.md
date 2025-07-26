# テストフレームワーク ガイド

## 概要

本プロジェクトでは包括的なテスト戦略を採用し、コード品質の向上と信頼性の確保を図っています。

## テストの種類

### 1. 単体テスト（Unit Tests）
**目的**: 個別のコンポーネントやメソッドの動作検証

**実行方法**:
```bash
npm run test:unit
```

**対象**:
- Models（データベースモデル）
- Controllers（ビジネスロジック）
- Services（外部サービス連携）
- Utils（ヘルパー関数）

**場所**: `tests/unit/`

### 2. 統合テスト（Integration Tests）
**目的**: 複数のコンポーネント間の連携動作検証

**実行方法**:
```bash
npm run test:integration
```

**対象**:
- API エンドポイント
- 認証フロー
- データベース操作

**場所**: `tests/integration/`

### 3. E2Eテスト（End-to-End Tests）
**目的**: ユーザーの実際の操作フローの検証

**実行方法**:
```bash
npm run test:e2e        # ヘッドレスモード
npm run test:e2e:ui     # UIモード
npm run test:e2e:debug  # デバッグモード
```

**対象**:
- ユーザー認証フロー
- 主要機能のシナリオテスト
- クロスブラウザテスト

**場所**: `tests/e2e/`

### 4. パフォーマンステスト
**目的**: アプリケーションの性能と負荷耐性の検証

**実行方法**:
```bash
npm run test:performance  # 負荷テスト
npm run test:stress       # ストレステスト
```

**対象**:
- API レスポンス時間
- 並行ユーザー処理
- メモリリーク検出

**場所**: `tests/performance/`

## テスト構造

```
tests/
├── unit/                 # 単体テスト
│   ├── models/          # モデルテスト
│   ├── controllers/     # コントローラーテスト
│   ├── services/        # サービステスト
│   └── utils/           # ユーティリティテスト
├── integration/         # 統合テスト
│   ├── api/            # API テスト
│   ├── auth/           # 認証テスト
│   └── database/       # データベーステスト
├── e2e/                # E2Eテスト
│   ├── scenarios/      # シナリオテスト
│   ├── fixtures/       # テストデータ
│   └── pages/          # ページオブジェクト
├── performance/        # パフォーマンステスト
│   ├── load/          # 負荷テスト
│   └── stress/        # ストレステスト
└── helpers/           # テストヘルパー
    ├── factories/     # ファクトリー
    ├── fixtures/      # フィクスチャ
    └── utils/         # ユーティリティ
```

## テストヘルパーの使用

### ユーザーファクトリー
```javascript
const { userFactory } = require('../../helpers');

// ランダムユーザーデータ生成
const userData = userFactory.build();

// データベースにユーザー作成
const user = await userFactory.create();

// 複数ユーザー作成
const users = await userFactory.createMany(5);

// 管理者ユーザー作成
const admin = await userFactory.createAdmin();
```

### 認証ヘルパー
```javascript
const { AuthHelper } = require('../../helpers');

// JWTトークン生成
const token = AuthHelper.generateToken(userId, 'admin');

// 認証済みユーザー作成
const { user, token } = await AuthHelper.createUserWithToken();

// 認証ヘッダー取得
const headers = AuthHelper.getAuthHeaders(token);
```

### データベースヘルパー
```javascript
const { DatabaseHelper } = require('../../helpers');

// データベースクリーンアップ
await DatabaseHelper.cleanDatabase();

// テストデータシード
await DatabaseHelper.seedDatabase();

// データベースリセット
await DatabaseHelper.resetDatabase();

// トランザクション管理
const transaction = await DatabaseHelper.startTransaction();
await DatabaseHelper.rollbackTransaction(transaction);
```

## テスト実行

### 全テスト実行
```bash
npm test
```

### カバレッジレポート生成
```bash
npm run test:coverage
```

### ウォッチモード
```bash
npm run test:watch
```

## カバレッジ目標

- **ライン**: 80%以上
- **関数**: 80%以上
- **ブランチ**: 80%以上
- **ステートメント**: 80%以上

## ベストプラクティス

### 1. テスト命名規則
- **describe**: 機能やコンポーネント名を記述
- **test**: 「〜できる」「〜すべき」形式で記述

```javascript
describe('User Model', () => {
  test('有効なデータでユーザーを作成できる', () => {
    // テスト内容
  });
});
```

### 2. テストデータ管理
- ファクトリーパターンを使用してテストデータを生成
- 各テスト実行前にデータベースをクリーンアップ
- テスト間の依存関係を排除

### 3. モックとスタブ
- 外部サービスは必ずモック化
- データベース操作以外の副作用を排除
- テストの独立性を保持

### 4. 非同期テストの処理
```javascript
test('非同期処理のテスト', async () => {
  const result = await someAsyncFunction();
  expect(result).toBeDefined();
});
```

### 5. エラーハンドリングのテスト
```javascript
test('エラー条件のテスト', async () => {
  await expect(functionThatShouldThrow())
    .rejects
    .toThrow('期待されるエラーメッセージ');
});
```

## CI/CDの統合

### GitHub Actions
- プルリクエスト作成時に自動実行
- 複数Node.jsバージョンでテスト
- カバレッジレポートの自動生成
- セキュリティスキャンの実行

### 実行時間の目標
- **単体テスト**: 2分以内
- **統合テスト**: 3分以内
- **E2Eテスト**: 5分以内
- **パフォーマンステスト**: 5分以内

## トラブルシューティング

### よくある問題と解決策

1. **データベース接続エラー**
   ```bash
   # データベースサービスが起動していることを確認
   docker-compose up -d postgres
   ```

2. **ポート競合エラー**
   ```bash
   # 使用中のポートを確認
   lsof -i :3000
   ```

3. **タイムアウトエラー**
   ```javascript
   // テストタイムアウトを調整
   jest.setTimeout(30000);
   ```

4. **メモリリーク**
   ```javascript
   // afterEach でクリーンアップ
   afterEach(async () => {
     await DatabaseHelper.cleanDatabase();
   });
   ```

## パフォーマンステストの設定

### 負荷テスト設定
- **ウォームアップ**: 60秒間、毎秒5リクエスト
- **負荷テスト**: 300秒間、毎秒20リクエスト
- **ピーク負荷**: 120秒間、毎秒50リクエスト

### ストレステスト設定
- **負荷上昇**: 120秒間、1→100リクエスト/秒
- **ストレステスト**: 300秒間、毎秒100リクエスト
- **負荷低下**: 120秒間、100→1リクエスト/秒

## メトリクス

### 測定項目
- レスポンス時間（P50、P95、P99）
- スループット（RPS）
- エラー率
- リソース使用率（CPU、メモリ）

### アラート基準
- **レスポンス時間**: P95 > 2秒
- **エラー率**: > 1%
- **CPU使用率**: > 80%
- **メモリ使用率**: > 90%

## 継続的改善

1. **定期的なテストレビュー**: 月次でテストカバレッジと品質を確認
2. **フレーキーテストの特定**: 不安定なテストの修正
3. **パフォーマンス基準の見直し**: アプリケーション成長に合わせた調整
4. **新機能のテスト追加**: 機能追加時の適切なテストカバレッジ

## 参考資料

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Playwright Documentation](https://playwright.dev/)
- [Artillery Documentation](https://artillery.io/docs/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)