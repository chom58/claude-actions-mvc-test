const express = require('express');
const router = express.Router();
const userRoutes = require('./userRoutes');
const postRoutes = require('./postRoutes');
const designCompanyRoutes = require('./designCompanyRoutes');
const eventRoutes = require('./eventRoutes');

router.get('/', (req, res) => {
  res.json({
    message: '🎨 原宿デザイナーの会 API',
    version: '1.0.0',
    description: '原宿エリアのデザイン会社ネットワーキングプラットフォーム',
    endpoints: {
      users: '/api/users',
      posts: '/api/posts',
      designCompanies: '/api/design-companies',
      events: '/api/events'
    },
    features: [
      'デザイン会社管理',
      'イベント管理・参加登録',
      '原宿エリア特化ネットワーキング',
      'グラフィックデザイン会社向けコミュニティ'
    ]
  });
});

router.use('/users', userRoutes);
router.use('/posts', postRoutes);
router.use('/design-companies', designCompanyRoutes);
router.use('/events', eventRoutes);

module.exports = router;