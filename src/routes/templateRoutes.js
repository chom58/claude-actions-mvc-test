// テンプレートエンジン関連のルート
const express = require('express');
const router = express.Router();
const templateController = require('../controllers/templateController');

// ホームページ（テンプレートエンジンデモ）
router.get('/', templateController.renderHome);

// テンプレートエンジン情報を取得するAPIエンドポイント
router.get('/api/template-info', templateController.getEngineInfo);

// パフォーマンステスト用エンドポイント
router.get('/api/performance-test', templateController.performanceTest);

module.exports = router;