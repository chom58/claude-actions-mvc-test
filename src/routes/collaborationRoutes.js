const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const collaborationController = require('../controllers/collaborationController');

// バリデーションルール
const createValidation = [
  body('title').trim().notEmpty().withMessage('プロジェクトタイトルは必須です').isLength({ max: 255 }).withMessage('タイトルは255文字以内で入力してください'),
  body('description').trim().notEmpty().withMessage('プロジェクト説明は必須です'),
  body('projectType').isIn(['ブランディング', 'Webサイト制作', 'パッケージデザイン', 'グラフィックデザイン', 'ファッション撮影', 'イベント企画', 'マーケティング', 'その他']).withMessage('有効なプロジェクトタイプを選択してください'),
  body('designCompanyId').isInt().withMessage('デザイン会社IDは整数を入力してください'),
  body('apparelBrandId').isInt().withMessage('アパレルブランドIDは整数を入力してください'),
  body('status').optional().isIn(['proposed', 'accepted', 'in_progress', 'completed', 'cancelled']).withMessage('有効なステータスを選択してください'),
  body('startDate').optional().isISO8601().withMessage('有効な開始日を入力してください'),
  body('expectedEndDate').optional().isISO8601().withMessage('有効な予定終了日を入力してください'),
  body('actualEndDate').optional().isISO8601().withMessage('有効な実際の終了日を入力してください'),
  body('budget').optional().isFloat({ min: 0 }).withMessage('予算は0以上の数値を入力してください'),
  body('deliverables').optional().isArray().withMessage('成果物は配列で指定してください'),
  body('skills').optional().isArray().withMessage('必要スキルは配列で指定してください'),
  body('objectives').optional().trim(),
  body('results').optional().trim(),
  body('testimonial').optional().trim(),
  body('rating').optional().isFloat({ min: 0, max: 5 }).withMessage('評価は0-5の間で入力してください'),
  body('imageUrls').optional().isArray().withMessage('画像URLは配列で指定してください'),
  body('portfolioUrl').optional().isURL().withMessage('ポートフォリオURLは有効なURLを入力してください'),
  body('tags').optional().isArray().withMessage('タグは配列で指定してください'),
  body('isFeatured').optional().isBoolean().withMessage('注目フラグはboolean値で指定してください'),
  body('isPublic').optional().isBoolean().withMessage('公開フラグはboolean値で指定してください'),
  body('lessons').optional().trim(),
  body('challenges').optional().trim()
];

const updateValidation = [
  body('title').optional().trim().notEmpty().withMessage('プロジェクトタイトルは必須です').isLength({ max: 255 }).withMessage('タイトルは255文字以内で入力してください'),
  body('description').optional().trim().notEmpty().withMessage('プロジェクト説明は必須です'),
  body('projectType').optional().isIn(['ブランディング', 'Webサイト制作', 'パッケージデザイン', 'グラフィックデザイン', 'ファッション撮影', 'イベント企画', 'マーケティング', 'その他']).withMessage('有効なプロジェクトタイプを選択してください'),
  body('designCompanyId').optional().isInt().withMessage('デザイン会社IDは整数を入力してください'),
  body('apparelBrandId').optional().isInt().withMessage('アパレルブランドIDは整数を入力してください'),
  body('status').optional().isIn(['proposed', 'accepted', 'in_progress', 'completed', 'cancelled']).withMessage('有効なステータスを選択してください'),
  body('startDate').optional().isISO8601().withMessage('有効な開始日を入力してください'),
  body('expectedEndDate').optional().isISO8601().withMessage('有効な予定終了日を入力してください'),
  body('actualEndDate').optional().isISO8601().withMessage('有効な実際の終了日を入力してください'),
  body('budget').optional().isFloat({ min: 0 }).withMessage('予算は0以上の数値を入力してください'),
  body('deliverables').optional().isArray().withMessage('成果物は配列で指定してください'),
  body('skills').optional().isArray().withMessage('必要スキルは配列で指定してください'),
  body('objectives').optional().trim(),
  body('results').optional().trim(),
  body('testimonial').optional().trim(),
  body('rating').optional().isFloat({ min: 0, max: 5 }).withMessage('評価は0-5の間で入力してください'),
  body('imageUrls').optional().isArray().withMessage('画像URLは配列で指定してください'),
  body('portfolioUrl').optional().isURL().withMessage('ポートフォリオURLは有効なURLを入力してください'),
  body('tags').optional().isArray().withMessage('タグは配列で指定してください'),
  body('isFeatured').optional().isBoolean().withMessage('注目フラグはboolean値で指定してください'),
  body('isPublic').optional().isBoolean().withMessage('公開フラグはboolean値で指定してください'),
  body('lessons').optional().trim(),
  body('challenges').optional().trim()
];

// ルート定義
router.get('/', collaborationController.getAllCollaborations);
router.get('/featured', collaborationController.getFeaturedCollaborations);
router.get('/project-type/:projectType', collaborationController.searchByProjectType);
router.get('/design-company/:companyId', collaborationController.getByDesignCompany);
router.get('/apparel-brand/:brandId', collaborationController.getByApparelBrand);
router.get('/:id', collaborationController.getCollaborationById);
router.post('/', createValidation, collaborationController.createCollaboration);
router.put('/:id', updateValidation, collaborationController.updateCollaboration);
router.delete('/:id', collaborationController.deleteCollaboration);

module.exports = router;