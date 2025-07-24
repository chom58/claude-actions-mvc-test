const express = require('express');
const router = express.Router();
const { csrfTokenEndpoint } = require('../middleware/security');
const { sessionHelpers } = require('../config/session');

// CSRFトークン取得エンドポイント
router.get('/csrf-token', csrfTokenEndpoint);

// セッション情報取得エンドポイント（デバッグ用）
router.get('/session-info', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'エンドポイントが見つかりません' });
  }

  const sessionInfo = sessionHelpers.getSessionInfo(req);
  
  res.json({
    message: 'セッション情報',
    session: sessionInfo,
    isValid: sessionHelpers.isSessionValid(req)
  });
});

// セッション終了エンドポイント
router.post('/logout', async (req, res) => {
  try {
    await sessionHelpers.destroySession(req);
    
    res.json({
      message: 'ログアウトしました'
    });
  } catch (error) {
    res.status(500).json({
      error: 'ログアウトに失敗しました',
      details: error.message
    });
  }
});

// セッション再生成エンドポイント（セキュリティ強化）
router.post('/regenerate-session', async (req, res) => {
  try {
    const user = sessionHelpers.getUserSession(req);
    
    await sessionHelpers.regenerateSession(req);
    
    // ユーザー情報を復元
    if (user) {
      sessionHelpers.setUserSession(req, user);
    }
    
    res.json({
      message: 'セッションを再生成しました'
    });
  } catch (error) {
    res.status(500).json({
      error: 'セッション再生成に失敗しました',
      details: error.message
    });
  }
});

module.exports = router;