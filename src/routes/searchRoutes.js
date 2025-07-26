const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');
const { query, validationResult } = require('express-validator');

/**
 * 検索エンドポイント
 * 複数のリソースタイプを横断検索
 */
router.get('/', 
  [
    query('q').optional().isString().trim(),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('sort').optional().isIn(['relevance', 'date_desc', 'date_asc', 'salary_desc', 'salary_asc']),
    query('experience').optional().isArray(),
    query('employment').optional().isArray(),
    query('location').optional().isArray(),
    query('salaryMin').optional().isFloat({ min: 0 }).toFloat(),
    query('salaryMax').optional().isFloat({ min: 0 }).toFloat(),
    query('remoteOk').optional().isBoolean().toBoolean(),
    query('skills').optional().isArray()
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }
    next();
  },
  searchController.search
);

/**
 * サジェスト（オートコンプリート）エンドポイント
 */
router.get('/suggest',
  [
    query('q').notEmpty().isString().trim().isLength({ min: 2 })
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }
    next();
  },
  searchController.suggest
);

/**
 * 人気の検索キーワード
 */
router.get('/popular', searchController.getPopularSearches);

/**
 * 検索フィルターの統計情報
 */
router.get('/filters/stats', searchController.getFilterStats);

module.exports = router;