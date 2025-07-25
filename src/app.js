require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const { syncDatabase } = require('./models');
const { securityHeaders, sanitizeInput } = require('./middleware/security');
const { generalRateLimit } = require('./middleware/rateLimit');
const { csrfToken, webCsrfProtection } = require('./middleware/csrf');
const { initializeSession } = require('./config/session');
const storageService = require('./services/storageService');
const searchIndexService = require('./services/searchIndexService');
const fs = require('fs').promises;

const app = express();
const PORT = process.env.PORT || 3000;

// セキュリティミドルウェア
app.use(helmet());
app.use(securityHeaders);
app.use(generalRateLimit);

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// クッキーパーサーミドルウェアを追加（HTTP-onlyクッキー認証のため）
app.use(cookieParser());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// セッション初期化（CSRFトークン生成の前に必要）
const sessionMiddleware = require('express-session');
app.use(sessionMiddleware({
  secret: process.env.SESSION_SECRET || 'your-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24時間
  }
}));

// CSRFトークン生成ミドルウェア
app.use(csrfToken);

// 入力サニタイゼーション（APIルートのみ）
app.use('/api', sanitizeInput);

// 静的ファイル配信設定
app.use(express.static('public'));

app.use('/api', routes);

app.get('/', (req, res) => {
  res.sendFile('index.html', { root: 'public' });
});

app.use((req, res) => {
  res.status(404).json({
    error: 'エンドポイントが見つかりません'
  });
});

app.use(errorHandler);

const startServer = async () => {
  try {
    // 必要なディレクトリを作成
    await fs.mkdir('temp', { recursive: true });
    await fs.mkdir('public/uploads', { recursive: true });
    await fs.mkdir('public/uploads/thumbnails', { recursive: true });
    console.log('アップロードディレクトリが作成されました');
    
    // ストレージサービスの初期化
    await storageService.initialize();
    console.log('ストレージサービスが初期化されました');
    
    // 検索インデックスサービスの初期化
    await searchIndexService.initialize();
    console.log('検索インデックスサービスが初期化されました');
    
    await syncDatabase();
    
    // セッション初期化
    await initializeSession(app);
    
    // CSRF保護をPOST/PUT/DELETE リクエストに適用
    app.use('/api', webCsrfProtection);
    
    app.listen(PORT, () => {
      console.log(`サーバーがポート${PORT}で起動しました`);
      console.log(`環境: ${process.env.NODE_ENV || 'development'}`);
      console.log(`http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('サーバー起動エラー:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;