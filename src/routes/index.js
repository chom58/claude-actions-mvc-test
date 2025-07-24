const express = require('express');
const router = express.Router();
const userRoutes = require('./userRoutes');
const socialAuthRoutes = require('./socialAuthRoutes');
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
      // 認証
      users: '/api/users',
      socialAuth: '/api/social-auth',
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

// 認証ルート
router.use('/users', userRoutes);
router.use('/social-auth', socialAuthRoutes);
router.use('/posts', postRoutes);

// 新しいクリエイティブコミュニティルート
router.use('/design-companies', designCompanyRoutes);
router.use('/apparel-brands', apparelBrandRoutes);
router.use('/events', creativeEventRoutes);
router.use('/collaborations', collaborationRoutes);
router.use('/matching', matchingRoutes);

module.exports = router;