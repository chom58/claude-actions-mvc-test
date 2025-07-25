const express = require('express');
const router = express.Router();

// CSRFトークンを取得するエンドポイント
router.get('/token', (req, res) => {
  const token = res.locals.csrfToken;
  
  if (!token) {
    return res.status(500).json({
      error: 'CSRFトークンの生成に失敗しました'
    });
  }
  
  // クッキーにもセット（httpOnlyではない）
  res.cookie('csrf-token', token, {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 2 * 60 * 60 * 1000 // 2時間
  });
  
  res.json({
    csrfToken: token
  });
});

module.exports = router;