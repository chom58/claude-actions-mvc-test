const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const reviewController = require('../controllers/reviewController');

// バリデーションルール
const createReviewValidation = [
  body('reviewedEntityId')
    .isInt({ min: 1 })
    .withMessage('有効なエンティティIDを指定してください'),
  body('reviewedEntityType')
    .isIn(['user', 'design_company', 'apparel_brand', 'collaboration', 'event'])
    .withMessage('有効なエンティティタイプを指定してください'),
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('評価は1-5の範囲で指定してください'),
  body('content')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('レビュー内容は10文字以上2000文字以下で入力してください'),
  body('title')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('タイトルは200文字以下で入力してください'),
  body('pros')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('良い点は1000文字以下で入力してください'),
  body('cons')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('改善点は1000文字以下で入力してください'),
  body('collaborationId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('有効なコラボレーションIDを指定してください')
];

const updateReviewValidation = [
  body('rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('評価は1-5の範囲で指定してください'),
  body('content')
    .optional()
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('レビュー内容は10文字以上2000文字以下で入力してください'),
  body('title')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('タイトルは200文字以下で入力してください'),
  body('pros')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('良い点は1000文字以下で入力してください'),
  body('cons')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('改善点は1000文字以下で入力してください')
];

// レビュー作成
router.post('/', authenticateToken, createReviewValidation, reviewController.createReview);

// レビュー一覧取得
// クエリパラメータ: entityType, entityId, rating, verified, page, limit, sortBy, sortOrder
router.get('/', reviewController.getReviews);

// 特定エンティティのレビュー統計取得
router.get('/stats/:entityType/:entityId', async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    
    // reviewController内のヘルパー関数を使用
    const { Review } = require('../models');
    
    const stats = await Review.findAll({
      where: {
        reviewedEntityType: entityType,
        reviewedEntityId: entityId,
        isHidden: false
      },
      attributes: [
        'rating',
        [Review.sequelize.fn('COUNT', Review.sequelize.col('rating')), 'count']
      ],
      group: ['rating'],
      raw: true
    });

    const totalReviews = stats.reduce((sum, stat) => sum + parseInt(stat.count), 0);
    const averageRating = totalReviews > 0 
      ? stats.reduce((sum, stat) => sum + (stat.rating * stat.count), 0) / totalReviews 
      : 0;

    const ratingDistribution = [1, 2, 3, 4, 5].map(rating => {
      const stat = stats.find(s => s.rating === rating);
      return {
        rating,
        count: stat ? parseInt(stat.count) : 0,
        percentage: totalReviews > 0 ? ((stat ? parseInt(stat.count) : 0) / totalReviews * 100).toFixed(1) : '0.0'
      };
    });

    res.json({
      totalReviews,
      averageRating: Math.round(averageRating * 10) / 10,
      ratingDistribution
    });
  } catch (error) {
    console.error('Error fetching review stats:', error);
    res.status(500).json({ error: '統計情報の取得に失敗しました' });
  }
});

// 特定のレビュー取得
router.get('/:id', reviewController.getReview);

// ユーザーのレビュー一覧取得
router.get('/user/:userId', reviewController.getUserReviews);

// レビューを「役に立った」と評価
router.post('/:id/helpful', authenticateToken, [
  body('isHelpful')
    .optional()
    .isBoolean()
    .withMessage('isHelpfulは真偽値で指定してください')
], reviewController.markHelpful);

// レビュー更新（自分のレビューのみ）
router.put('/:id', authenticateToken, updateReviewValidation, reviewController.updateReview);

// レビュー削除（自分のレビューのみ）
router.delete('/:id', authenticateToken, reviewController.deleteReview);

// レビュー可能なエンティティ一覧取得（デバッグ用）
router.get('/debug/entities', authenticateToken, async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Debug endpoints are not available in production' });
  }

  try {
    const { User, DesignCompany, ApparelBrand } = require('../models');
    
    const users = await User.findAll({ 
      attributes: ['id', 'username'],
      where: { id: { [require('sequelize').Op.ne]: req.user.id } } // 自分以外
    });
    
    const designCompanies = await DesignCompany.findAll({ 
      attributes: ['id', 'name'] 
    });
    
    const apparelBrands = await ApparelBrand.findAll({ 
      attributes: ['id', 'name'] 
    });

    res.json({
      users: users.map(u => ({ ...u.toJSON(), type: 'user' })),
      designCompanies: designCompanies.map(dc => ({ ...dc.toJSON(), type: 'design_company' })),
      apparelBrands: apparelBrands.map(ab => ({ ...ab.toJSON(), type: 'apparel_brand' }))
    });
  } catch (error) {
    console.error('Error fetching entities:', error);
    res.status(500).json({ error: 'エンティティ一覧の取得に失敗しました' });
  }
});

module.exports = router;