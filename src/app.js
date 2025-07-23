require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const { syncDatabase } = require('./models');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', routes);

app.get('/', (req, res) => {
  res.json({
    message: 'Claude MVC Application',
    environment: process.env.NODE_ENV || 'development'
  });
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