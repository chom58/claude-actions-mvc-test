const express = require('express');
const router = express.Router();
const userRoutes = require('./userRoutes');
const postRoutes = require('./postRoutes');
const designCompanyRoutes = require('./designCompanyRoutes');
const eventRoutes = require('./eventRoutes');

router.get('/', (req, res) => {
  res.json({
    message: '原宿デザイナーの会 API',
    version: '1.0.0',
    description: '原宿エリアのデザイン会社ネットワーキングプラットフォーム',
    endpoints: {
      users: '/api/users',
      posts: '/api/posts',
      designCompanies: '/api/design-companies',
      events: '/api/events'
    },
    features: [
      '原宿エリアのデザイン会社登録・管理',
      'ネットワーキングイベントの作成・管理',
      'イベント参加申し込み機能',
      'グラフィックデザインに特化したコミュニティ'
    ]
  });
});

router.use('/users', userRoutes);
router.use('/posts', postRoutes);
router.use('/design-companies', designCompanyRoutes);
router.use('/events', eventRoutes);

module.exports = router;