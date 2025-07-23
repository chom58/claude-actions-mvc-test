// Express.jsを使った簡単なWebサーバー
const express = require('express');

// Expressアプリケーションを作成
const app = express();
const port = 3000;

// "Hello World"を返すルートエンドポイント
app.get('/', (req, res) => {
  res.send('Hello World');
});

// サーバーを起動
app.listen(port, () => {
  console.log(`サーバーがポート${port}で起動しました`);
  console.log(`http://localhost:${port} でアクセスできます`);
});