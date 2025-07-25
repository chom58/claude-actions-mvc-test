const express = require('express');
const router = express.Router();
const { sequelize } = require('../models');

// システム状態チェック
router.get('/health', async (req, res) => {
  try {
    // データベース接続テスト
    await sequelize.authenticate();
    
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      uptime: {
        seconds: Math.floor(uptime),
        formatted: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`
      },
      memory: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`
      },
      database: {
        status: 'connected',
        dialect: sequelize.getDialect()
      },
      environment: process.env.NODE_ENV || 'development',
      version: '2.0.0'
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      success: false,
      error: 'システムの状態確認に失敗しました',
      database: {
        status: 'disconnected',
        error: error.message
      }
    });
  }
});

// アプリケーション情報
router.get('/info', (req, res) => {
  res.json({
    name: '原宿クリエイティブコミュニティ',
    version: '2.0.0',
    description: 'デザインとファッションが融合するクリエイティブハブ',
    features: {
      authentication: '認証システム（JWT + リフレッシュトークン）',
      profiles: 'ユーザープロフィール（画像アップロード対応）',
      companies: 'デザイン会社管理',
      brands: 'アパレルブランド管理',
      events: 'クリエイティブイベント',
      collaborations: 'コラボレーション管理',
      jobs: 'デザイナー求人',
      search: '高度な検索・フィルタリング',
      security: 'セキュリティ対策（CSRF, Rate Limiting等）'
    },
    endpoints: {
      api: '/api',
      auth: '/api/auth',
      users: '/api/users',
      designCompanies: '/api/design-companies',
      apparelBrands: '/api/apparel-brands',
      events: '/api/events',
      collaborations: '/api/collaborations',
      jobs: '/api/designer-jobs',
      health: '/api/system/health',
      csrf: '/api/csrf/token'
    },
    contact: {
      github: 'https://github.com/chom58/claude-actions-mvc-test',
      location: '原宿, 東京'
    }
  });
});

// 設定情報（セキュリティに影響しない情報のみ）
router.get('/config', (req, res) => {
  res.json({
    environment: process.env.NODE_ENV || 'development',
    features: {
      imageUpload: true,
      search: true,
      authentication: true,
      socialAuth: false, // OAuth設定が必要
      emailNotifications: false, // メール設定が必要
      realTimeUpdates: false // WebSocket未実装
    },
    limits: {
      imageUpload: '5MB',
      pagination: {
        default: 12,
        max: 100
      },
      search: {
        maxResults: 1000
      }
    },
    supportedFormats: {
      images: ['JPEG', 'PNG', 'WebP'],
      uploads: ['profile', 'portfolio']
    },
    theme: {
      mode: 'harajuku-neon',
      colors: ['#FF1493', '#00FFFF', '#00FF00', '#FF00FF', '#FFFF00'],
      darkMode: true,
      lightMode: true
    }
  });
});

module.exports = router;