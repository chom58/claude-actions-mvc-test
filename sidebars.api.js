/**
 * API documentation sidebar configuration
 */

// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  apiSidebar: [
    'README',
    {
      type: 'category',
      label: '🔐 認証',
      items: [
        'authentication/overview',
        'authentication/jwt',
        'authentication/oauth',
      ],
    },
    {
      type: 'category',
      label: '👥 ユーザー管理',
      items: [
        'users/overview',
        'users/registration',
        'users/profile',
      ],
    },
    {
      type: 'category',
      label: '📝 投稿管理',
      items: [
        'posts/overview',
        'posts/crud',
        'posts/images',
      ],
    },
    {
      type: 'category',
      label: '🎨 クリエイティブコミュニティ',
      items: [
        'community/design-companies',
        'community/apparel-brands',
        'community/events',
        'community/collaborations',
      ],
    },
    {
      type: 'category',
      label: '💼 求人管理',
      items: [
        'jobs/designer-jobs',
        'jobs/job-sites',
        'jobs/search',
      ],
    },
    {
      type: 'category',
      label: '⭐ レビュー',
      items: [
        'reviews/overview',
        'reviews/crud',
        'reviews/ratings',
      ],
    },
    {
      type: 'category',
      label: '🔍 検索',
      items: [
        'search/overview',
        'search/filtering',
        'search/pagination',
      ],
    },
    {
      type: 'category',
      label: '📁 ファイル管理',
      items: [
        'upload/overview',
        'upload/images',
        'upload/validation',
      ],
    },
    {
      type: 'category',
      label: '📊 システム',
      items: [
        'system/health',
        'system/metrics',
        'system/monitoring',
      ],
    },
  ],
};

module.exports = sidebars;