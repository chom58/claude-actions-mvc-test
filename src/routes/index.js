const express = require('express');
const router = express.Router();
const userRoutes = require('./userRoutes');
const socialAuthRoutes = require('./socialAuthRoutes');
const authRoutes = require('./authRoutes');
const postRoutes = require('./postRoutes');
const uploadRoutes = require('./uploadRoutes');
const imageRoutes = require('./imageRoutes');
const csrfRoutes = require('./csrf');
const pushNotificationRoutes = require('./pushNotificationRoutes');
const systemRoutes = require('./systemRoutes');
const searchRoutes = require('./searchRoutes');
const notificationRoutes = require('./notificationRoutes');
const reviewRoutes = require('./reviewRoutes');

router.get('/', (req, res) => {
  res.json({
    message: 'Web API Server',
    version: '1.0.0',
    description: 'Express.js MVC Web Application',
    endpoints: {
      // 認証
      users: '/api/users',
      socialAuth: '/api/social-auth',
      auth: '/api/auth',
      posts: '/api/posts',
      // システム情報
      health: '/api/system/health',
      info: '/api/system/info',
      config: '/api/system/config',
      csrf: '/api/csrf/token',
      // 画像アップロード
      upload: '/api/upload',
      images: '/api/images',
      // プッシュ通知
      push: '/api/push',
      // 検索
      search: '/api/search',
      // 通知
      notifications: '/api/notifications',
      // レビュー・評価
      reviews: '/api/reviews'
    },
  });
});

// 認証ルート
router.use('/users', userRoutes);
router.use('/social-auth', socialAuthRoutes);
router.use('/auth', authRoutes);
router.use('/posts', postRoutes);

// CSRF トークンルート
router.use('/csrf', csrfRoutes);

// システム情報ルート
router.use('/system', systemRoutes);



// 画像アップロードルート
router.use('/upload', uploadRoutes);
router.use('/images', imageRoutes);

// プッシュ通知ルート
router.use('/push', pushNotificationRoutes);

// 検索ルート
router.use('/search', searchRoutes);

// 通知ルート
router.use('/notifications', notificationRoutes);

// レビュー・評価ルート
router.use('/reviews', reviewRoutes);

module.exports = router;