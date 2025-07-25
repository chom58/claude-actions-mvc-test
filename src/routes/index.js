const express = require('express');
const router = express.Router();
const userRoutes = require('./userRoutes');
const socialAuthRoutes = require('./socialAuthRoutes');
const authRoutes = require('./authRoutes');
const postRoutes = require('./postRoutes');
const designCompanyRoutes = require('./designCompanyRoutes');
const apparelBrandRoutes = require('./apparelBrandRoutes');
const creativeEventRoutes = require('./creativeEventRoutes');
const collaborationRoutes = require('./collaborationRoutes');
const matchingRoutes = require('./matchingRoutes');
const designerJobRoutes = require('./designerJobRoutes');
const jobSiteRoutes = require('./jobSiteRoutes');

router.get('/', (req, res) => {
  res.json({
    message: '🎨 原宿クリエイティブコミュニティ API',
    version: '2.0.0',
    description: 'デザインとファッションが融合するクリエイティブハブ',
    endpoints: {
      // 認証
      users: '/api/users',
      socialAuth: '/api/social-auth',
      auth: '/api/auth',
      posts: '/api/posts',
      // クリエイティブコミュニティ
      designCompanies: '/api/design-companies',
      apparelBrands: '/api/apparel-brands',
      events: '/api/events',
      collaborations: '/api/collaborations',
      matching: '/api/matching',
      // デザイナー求人
      designerJobs: '/api/designer-jobs',
      jobSites: '/api/job-sites'
    },
    specialEndpoints: {
      harajukuDesignCompanies: '/api/design-companies/harajuku',
      harajukuApparelBrands: '/api/apparel-brands/harajuku',
      upcomingEvents: '/api/events/upcoming',
      featuredCollaborations: '/api/collaborations/featured',
      highPriorityMatching: '/api/matching/high-priority',
      // デザイナー求人特別エンドポイント
      entryLevelStats: '/api/designer-jobs/stats/entry-level',
      featuredJobs: '/api/designer-jobs/featured/list',
      jobSiteStats: '/api/job-sites?include_stats=true'
    }
  });
});

// 認証ルート
router.use('/users', userRoutes);
router.use('/social-auth', socialAuthRoutes);
router.use('/auth', authRoutes);
router.use('/posts', postRoutes);

// 新しいクリエイティブコミュニティルート
router.use('/design-companies', designCompanyRoutes);
router.use('/apparel-brands', apparelBrandRoutes);
router.use('/events', creativeEventRoutes);
router.use('/collaborations', collaborationRoutes);
router.use('/matching', matchingRoutes);

// デザイナー求人ルート
router.use('/designer-jobs', designerJobRoutes);
router.use('/job-sites', jobSiteRoutes);

module.exports = router;