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

module.exports = router;