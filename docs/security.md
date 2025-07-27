# セキュリティベストプラクティス

## 概要

このドキュメントは、本プロジェクトにおけるセキュリティ実装のベストプラクティスとガイドラインを提供します。OWASP Top 10に準拠し、包括的なセキュリティ対策を実装しています。

## セキュリティテンプレートの利用

### 1. 認証テンプレート (AuthTemplate)

安全な認証フローを実装するためのテンプレート：

```javascript
const AuthTemplate = require('./src/templates/security/auth.template');

const auth = new AuthTemplate({
  accessTokenExpiry: '15m',
  refreshTokenExpiry: '7d',
  bcryptRounds: 12,
  maxLoginAttempts: 5
});

// ユーザー登録
const { user, accessToken, refreshToken } = await auth.register({
  email: 'user@example.com',
  password: 'SecurePassword123!',
  username: 'username'
});

// ログイン
const result = await auth.login(email, password, req.ip);

// ミドルウェアとして使用
app.use('/api/protected', auth.authenticate());
app.use('/api/admin', auth.authenticate(), auth.authorize('admin'));
```

### 2. 権限管理テンプレート (PermissionTemplate)

柔軟な権限管理システム：

```javascript
const permissions = require('./src/templates/security/permission.template');

// 権限チェック
const hasPermission = permissions.hasPermission(
  user.role,
  'post.update',
  { userId: user.id, resourceOwnerId: post.userId }
);

// ミドルウェアとして使用
app.put('/api/posts/:id', 
  permissions.requirePermission('post.update', { resourceType: 'post' })
);
```

### 3. OWASPセキュリティミドルウェア

OWASP Top 10に対応した包括的なセキュリティ対策：

```javascript
const OWASPSecurity = require('./src/templates/security/owasp.middleware');

const security = new OWASPSecurity({
  trustProxy: true,
  environment: 'production'
});

// 全てのセキュリティ対策を適用
app.use(security.applyAll());

// 認証ルートの保護
const authProtection = security.protectAuthRoutes();
app.use('/api/auth/login', authProtection['/api/auth/login']);
```

## OWASP Top 10 対策

### A01:2021 – アクセス制御の不備

**対策実装:**
- ロールベースアクセス制御（RBAC）
- 最小権限の原則
- リソースレベルの権限チェック

```javascript
// 例: 自分の投稿のみ編集可能
app.put('/api/posts/:id', 
  auth.authenticate(),
  permissions.requirePermission('post.update:own', { resourceType: 'post' }),
  postController.update
);
```

### A02:2021 – 暗号化の失敗

**対策実装:**
- HTTPS強制（本番環境）
- 強力な暗号化アルゴリズム（bcrypt、12ラウンド）
- セキュアなセッション設定

```javascript
// HTTPS強制
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && !req.secure) {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
});

// セキュアクッキー
app.use(session({
  cookie: {
    secure: true,      // HTTPS必須
    httpOnly: true,    // XSS対策
    sameSite: 'strict' // CSRF対策
  }
}));
```

### A03:2021 – インジェクション

**対策実装:**
- パラメータ化クエリ（Sequelize ORM使用）
- 入力検証とサニタイゼーション
- NoSQLインジェクション対策

```javascript
// SQLインジェクション対策（Sequelize使用）
const user = await User.findOne({
  where: { email: req.body.email } // 自動的にエスケープ
});

// 入力サニタイゼーション
app.use(security.sanitizeInput());
```

### A04:2021 – 安全でない設計

**対策実装:**
- セキュリティヘッダーの設定（Helmet使用）
- Content Security Policy (CSP)
- HTTPパラメータ汚染対策

```javascript
// Helmetによるセキュリティヘッダー
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      // その他の設定...
    }
  }
}));
```

### A05:2021 – セキュリティの設定ミス

**対策実装:**
- エラー情報の適切な処理
- デバッグ情報の非表示（本番環境）
- デフォルト設定の見直し

```javascript
// 本番環境でのエラー処理
app.use((err, req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    // スタックトレースを削除
    delete err.stack;
    res.status(500).json({ error: 'Internal Server Error' });
  } else {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});
```

### A06:2021 – 脆弱で古いコンポーネント

**対策実装:**
- 定期的な依存関係の更新
- `npm audit` による脆弱性チェック
- セキュリティ監査ツールの使用

```bash
# 脆弱性チェック
npm audit

# 自動修正
npm audit fix

# セキュリティ監査ツールの実行
node src/tools/security-audit.js
```

### A07:2021 – 識別と認証の失敗

**対策実装:**
- 強力なパスワードポリシー
- アカウントロックアウト機能
- 2要素認証のサポート
- レート制限

```javascript
// パスワード強度チェック
const validation = auth.validatePasswordStrength(password);
if (!validation.isValid) {
  throw new Error(validation.errors.join(', '));
}

// アカウントロックアウト
if (user.loginAttempts >= 5) {
  user.lockoutUntil = new Date(Date.now() + 15 * 60 * 1000);
}
```

### A08:2021 – ソフトウェアとデータの整合性の不備

**対策実装:**
- リクエスト署名検証
- Content-MD5チェック
- 整合性検証

```javascript
// Webhook署名検証
app.use('/api/webhook', security.verifyRequestSignature(webhookSecret));
```

### A09:2021 – セキュリティログとモニタリングの不備

**対策実装:**
- 包括的なロギング
- セキュリティイベントの記録
- 異常検知

```javascript
// セキュリティイベントのロギング
app.use((req, res, next) => {
  if (res.statusCode === 401 || res.statusCode === 403) {
    logger.warn('Security Event', {
      type: 'access_denied',
      ip: req.ip,
      path: req.path,
      user: req.user?.id
    });
  }
  next();
});
```

### A10:2021 – サーバーサイドリクエストフォージェリ (SSRF)

**対策実装:**
- URLバリデーション
- 内部ネットワークへのアクセス制限
- 許可されたプロトコルの制限

```javascript
// SSRF対策
app.use(security.ssrfPrevention());
```

## セキュリティチェックリスト

### 開発時

- [ ] 入力検証の実装
- [ ] 出力エンコーディング
- [ ] 認証・認可の適切な実装
- [ ] センシティブデータの暗号化
- [ ] エラーハンドリングの実装

### デプロイ前

- [ ] `npm audit` の実行と修正
- [ ] セキュリティ監査ツールの実行
- [ ] 環境変数の確認
- [ ] HTTPS設定の確認
- [ ] ログ設定の確認

### 運用時

- [ ] 定期的なセキュリティアップデート
- [ ] ログの監視
- [ ] 侵入検知システムの設定
- [ ] バックアップの実施
- [ ] インシデント対応計画の準備

## パスワードポリシー

- 最小長: 8文字
- 必須要素: 大文字、小文字、数字、特殊文字のうち3種類以上
- 一般的なパスワードの禁止
- パスワード履歴の保持（オプション）

## セッション管理

```javascript
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,       // HTTPS必須
    httpOnly: true,     // JavaScriptアクセス禁止
    maxAge: 1800000,    // 30分
    sameSite: 'strict'  // CSRF対策
  },
  store: new RedisStore({
    client: redisClient,
    prefix: 'sess:'
  })
}));
```

## APIセキュリティ

### レート制限

```javascript
// 認証エンドポイント: 15分間に5回まで
app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true
}));

// 一般API: 15分間に100回まで
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
}));
```

### APIキー管理

- APIキーの定期的なローテーション
- スコープベースの権限管理
- 使用状況のモニタリング

## インシデント対応

1. **検知**: ログ監視、異常検知システム
2. **封じ込め**: 影響範囲の特定、被害の最小化
3. **根絶**: 脆弱性の修正、セキュリティパッチの適用
4. **復旧**: システムの正常化、データの復元
5. **事後分析**: 原因分析、再発防止策の実施

## セキュリティツール

### 監査ツールの使用

```bash
# セキュリティ監査の実行
node src/tools/security-audit.js

# 結果の確認
cat security-audit-report.json
```

### 推奨ツール

- **SAST**: ESLint Security Plugin
- **DAST**: OWASP ZAP
- **依存関係チェック**: npm audit, Snyk
- **コンテナスキャン**: Trivy, Clair

## 継続的なセキュリティ改善

1. **定期的な監査**: 月次でのセキュリティ監査実施
2. **脆弱性情報の収集**: CVEデータベースの監視
3. **ペネトレーションテスト**: 年次での実施推奨
4. **セキュリティトレーニング**: 開発チームへの教育

## 参考リンク

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)