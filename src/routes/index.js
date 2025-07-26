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
const uploadRoutes = require('./uploadRoutes');
const imageRoutes = require('./imageRoutes');
const csrfRoutes = require('./csrf');
const searchRoutes = require('./searchRoutes');

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
      // デザイナー採用メディア
      designerJobs: '/api/designer-jobs',
      jobSites: '/api/job-sites',
      // 画像アップロード
      upload: '/api/upload',
      images: '/api/images',
      // 検索
      search: '/api/search'
    },
    specialEndpoints: {
      harajukuDesignCompanies: '/api/design-companies/harajuku',
      harajukuApparelBrands: '/api/apparel-brands/harajuku',
      upcomingEvents: '/api/events/upcoming',
      featuredCollaborations: '/api/collaborations/featured',
      highPriorityMatching: '/api/matching/high-priority',
      // デザイナー採用メディア特別エンドポイント
      entryLevelJobs: '/api/designer-jobs?experience=entry_level',
      newGraduateJobs: '/api/designer-jobs?experience=new_graduate',
      featuredJobs: '/api/designer-jobs/featured/list',
      jobStats: '/api/designer-jobs/stats/entry-level',
      popularJobSites: '/api/job-sites/popular/list'
    }
  });
});

// 認証ルート
router.use('/users', userRoutes);
router.use('/social-auth', socialAuthRoutes);
router.use('/auth', authRoutes);
router.use('/posts', postRoutes);

// CSRF トークンルート
router.use('/csrf', csrfRoutes);

// 新しいクリエイティブコミュニティルート
router.use('/design-companies', designCompanyRoutes);
router.use('/apparel-brands', apparelBrandRoutes);
router.use('/events', creativeEventRoutes);
router.use('/collaborations', collaborationRoutes);
router.use('/matching', matchingRoutes);

// デザイナー採用メディアルート
router.use('/designer-jobs', designerJobRoutes);
router.use('/job-sites', jobSiteRoutes);

// 画像アップロードルート
router.use('/upload', uploadRoutes);
router.use('/images', imageRoutes);

// 検索ルート
router.use('/search', searchRoutes);

module.exports = router;