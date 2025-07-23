const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const apparelBrandController = require('../controllers/apparelBrandController');

// バリデーションルール
const createValidation = [
  body('name').trim().notEmpty().withMessage('ブランド名は必須です').isLength({ max: 255 }).withMessage('ブランド名は255文字以内で入力してください'),
  body('brandConcept').optional().trim(),
  body('targetMarket').isArray().withMessage('ターゲット市場は配列で指定してください'),
  body('style').isArray().withMessage('スタイルは配列で指定してください'),
  body('location').optional().trim().isLength({ max: 100 }).withMessage('所在地は100文字以内で入力してください'),
  body('establishedYear').optional().isInt({ min: 1900, max: new Date().getFullYear() }).withMessage('設立年は有効な年を入力してください'),
  body('teamSize').optional().isIn(['1-5', '6-20', '21-50', '51-100', '100+']).withMessage('チームサイズは指定された選択肢から選んでください'),
  body('lookbookUrl').optional().isURL().withMessage('ルックブックURLは有効なURLを入力してください'),
  body('websiteUrl').optional().isURL().withMessage('WebサイトURLは有効なURLを入力してください'),
  body('instagramUrl').optional().isURL().withMessage('Instagram URLは有効なURLを入力してください'),
  body('contactEmail').isEmail().withMessage('有効なメールアドレスを入力してください'),
  body('contactPhone').optional().trim(),
  body('logoUrl').optional().isURL().withMessage('ロゴURLは有効なURLを入力してください'),
  body('priceRange').optional().isIn(['プチプラ', 'ミドルレンジ', 'ハイエンド', 'ラグジュアリー']).withMessage('価格帯は指定された選択肢から選んでください'),
  body('collaborationNeeds').optional().isArray().withMessage('コラボレーション希望分野は配列で指定してください'),
  body('brandValues').optional().isArray().withMessage('ブランド価値観は配列で指定してください'),
  body('rating').optional().isFloat({ min: 0, max: 5 }).withMessage('評価は0-5の間で入力してください'),
  body('seasonalCollections').optional().isInt({ min: 0 }).withMessage('年間コレクション数は0以上の整数を入力してください')
];

const updateValidation = [
  body('name').optional().trim().notEmpty().withMessage('ブランド名は必須です').isLength({ max: 255 }).withMessage('ブランド名は255文字以内で入力してください'),
  body('brandConcept').optional().trim(),
  body('targetMarket').optional().isArray().withMessage('ターゲット市場は配列で指定してください'),
  body('style').optional().isArray().withMessage('スタイルは配列で指定してください'),
  body('location').optional().trim().isLength({ max: 100 }).withMessage('所在地は100文字以内で入力してください'),
  body('establishedYear').optional().isInt({ min: 1900, max: new Date().getFullYear() }).withMessage('設立年は有効な年を入力してください'),
  body('teamSize').optional().isIn(['1-5', '6-20', '21-50', '51-100', '100+']).withMessage('チームサイズは指定された選択肢から選んでください'),
  body('lookbookUrl').optional().isURL().withMessage('ルックブックURLは有効なURLを入力してください'),
  body('websiteUrl').optional().isURL().withMessage('WebサイトURLは有効なURLを入力してください'),
  body('instagramUrl').optional().isURL().withMessage('Instagram URLは有効なURLを入力してください'),
  body('contactEmail').optional().isEmail().withMessage('有効なメールアドレスを入力してください'),
  body('contactPhone').optional().trim(),
  body('logoUrl').optional().isURL().withMessage('ロゴURLは有効なURLを入力してください'),
  body('priceRange').optional().isIn(['プチプラ', 'ミドルレンジ', 'ハイエンド', 'ラグジュアリー']).withMessage('価格帯は指定された選択肢から選んでください'),
  body('collaborationNeeds').optional().isArray().withMessage('コラボレーション希望分野は配列で指定してください'),
  body('brandValues').optional().isArray().withMessage('ブランド価値観は配列で指定してください'),
  body('rating').optional().isFloat({ min: 0, max: 5 }).withMessage('評価は0-5の間で入力してください'),
  body('seasonalCollections').optional().isInt({ min: 0 }).withMessage('年間コレクション数は0以上の整数を入力してください')
];

// ルート定義
router.get('/', apparelBrandController.getAllBrands);
router.get('/harajuku', apparelBrandController.getHarajukuBrands);
router.get('/style/:style', apparelBrandController.searchByStyle);
router.get('/collaboration-needs/:need', apparelBrandController.searchByCollaborationNeeds);
router.get('/:id', apparelBrandController.getBrandById);
router.post('/', createValidation, apparelBrandController.createBrand);
router.put('/:id', updateValidation, apparelBrandController.updateBrand);
router.delete('/:id', apparelBrandController.deleteBrand);

module.exports = router;