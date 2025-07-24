require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const { syncDatabase } = require('./models');
const { securityHeaders, sanitizeInput, csrfProtection } = require('./middleware/security');
const { generalRateLimit } = require('./middleware/rateLimit');
const { initializeSession } = require('./config/session');

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

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
    await syncDatabase();
    
    // セッション初期化
    await initializeSession(app);
    
    // CSRF保護ミドルウェアをAPIルートに適用
    app.use('/api', csrfProtection({
      skipPaths: ['/api/auth/csrf-token', '/api/auth/social']
    }));
    
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