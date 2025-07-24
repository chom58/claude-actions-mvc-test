const express = require('express');
const router = express.Router();
const socialAuthController = require('../controllers/socialAuthController');
const { generalRateLimit } = require('../middleware/rateLimit');

// ソーシャルログインURLの取得
router.get('/urls', 
  generalRateLimit,
  socialAuthController.getSocialLoginUrls
);

// Google OAuth コールバック
router.get('/google/callback', 
  generalRateLimit,
  socialAuthController.googleCallback
);

// GitHub OAuth コールバック
router.get('/github/callback', 
  generalRateLimit,
  socialAuthController.githubCallback
);

// OAuth設定状態確認
router.get('/config-status', 
  generalRateLimit,
  socialAuthController.getOAuthConfigStatus
);

module.exports = router;