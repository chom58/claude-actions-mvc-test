const express = require('express');
const router = express.Router();
const userRoutes = require('./userRoutes');
const postRoutes = require('./postRoutes');
const designCompanyRoutes = require('./designCompanyRoutes');
const apparelBrandRoutes = require('./apparelBrandRoutes');
const creativeEventRoutes = require('./creativeEventRoutes');
const collaborationRoutes = require('./collaborationRoutes');
const matchingRoutes = require('./matchingRoutes');

router.get('/', (req, res) => {
  res.json({
    message: '🎨 原宿クリエイティブコミュニティ API',
    version: '2.0.0',
    description: 'デザインとファッションが融合するクリエイティブハブ',
    endpoints: {
      // 既存
      users: '/api/users',
      posts: '/api/posts',
      // クリエイティブコミュニティ
      designCompanies: '/api/design-companies',
      apparelBrands: '/api/apparel-brands',
      events: '/api/events',
      collaborations: '/api/collaborations',
      matching: '/api/matching'
    },
    specialEndpoints: {
      harajukuDesignCompanies: '/api/design-companies/harajuku',
      harajukuApparelBrands: '/api/apparel-brands/harajuku',
      upcomingEvents: '/api/events/upcoming',
      featuredCollaborations: '/api/collaborations/featured',
      highPriorityMatching: '/api/matching/high-priority'
    }
  });
});

// 既存ルート
router.use('/users', userRoutes);
router.use('/posts', postRoutes);

// 新しいクリエイティブコミュニティルート
router.use('/design-companies', designCompanyRoutes);
router.use('/apparel-brands', apparelBrandRoutes);
router.use('/events', creativeEventRoutes);
router.use('/collaborations', collaborationRoutes);
router.use('/matching', matchingRoutes);

module.exports = router;