const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const designCompanyController = require('../controllers/designCompanyController');

// バリデーションルール
const createValidation = [
  body('name').trim().notEmpty().withMessage('会社名は必須です').isLength({ max: 255 }).withMessage('会社名は255文字以内で入力してください'),
  body('description').optional().trim(),
  body('specialties').isArray().withMessage('専門分野は配列で指定してください'),
  body('location').optional().trim().isLength({ max: 100 }).withMessage('所在地は100文字以内で入力してください'),
  body('establishedYear').optional().isInt({ min: 1900, max: new Date().getFullYear() }).withMessage('設立年は有効な年を入力してください'),
  body('employeeCount').optional().isIn(['1-5', '6-20', '21-50', '51-100', '100+']).withMessage('従業員数は指定された選択肢から選んでください'),
  body('portfolioUrl').optional().isURL().withMessage('ポートフォリオURLは有効なURLを入力してください'),
  body('websiteUrl').optional().isURL().withMessage('WebサイトURLは有効なURLを入力してください'),
  body('contactEmail').isEmail().withMessage('有効なメールアドレスを入力してください'),
  body('contactPhone').optional().trim(),
  body('logoUrl').optional().isURL().withMessage('ロゴURLは有効なURLを入力してください'),
  body('philosophy').optional().trim(),
  body('collaborationAreas').optional().isArray().withMessage('コラボレーション分野は配列で指定してください'),
  body('providedSkills').optional().isArray().withMessage('提供スキルは配列で指定してください'),
  body('rating').optional().isFloat({ min: 0, max: 5 }).withMessage('評価は0-5の間で入力してください')
];

const updateValidation = [
  body('name').optional().trim().notEmpty().withMessage('会社名は必須です').isLength({ max: 255 }).withMessage('会社名は255文字以内で入力してください'),
  body('description').optional().trim(),
  body('specialties').optional().isArray().withMessage('専門分野は配列で指定してください'),
  body('location').optional().trim().isLength({ max: 100 }).withMessage('所在地は100文字以内で入力してください'),
  body('establishedYear').optional().isInt({ min: 1900, max: new Date().getFullYear() }).withMessage('設立年は有効な年を入力してください'),
  body('employeeCount').optional().isIn(['1-5', '6-20', '21-50', '51-100', '100+']).withMessage('従業員数は指定された選択肢から選んでください'),
  body('portfolioUrl').optional().isURL().withMessage('ポートフォリオURLは有効なURLを入力してください'),
  body('websiteUrl').optional().isURL().withMessage('WebサイトURLは有効なURLを入力してください'),
  body('contactEmail').optional().isEmail().withMessage('有効なメールアドレスを入力してください'),
  body('contactPhone').optional().trim(),
  body('logoUrl').optional().isURL().withMessage('ロゴURLは有効なURLを入力してください'),
  body('philosophy').optional().trim(),
  body('collaborationAreas').optional().isArray().withMessage('コラボレーション分野は配列で指定してください'),
  body('providedSkills').optional().isArray().withMessage('提供スキルは配列で指定してください'),
  body('rating').optional().isFloat({ min: 0, max: 5 }).withMessage('評価は0-5の間で入力してください')
];

// ルート定義
router.get('/', designCompanyController.getAllCompanies);
router.get('/harajuku', designCompanyController.getHarajukuCompanies);
router.get('/specialty/:specialty', designCompanyController.searchBySpecialty);
router.get('/:id', designCompanyController.getCompanyById);
router.post('/', createValidation, designCompanyController.createCompany);
router.put('/:id', updateValidation, designCompanyController.updateCompany);
router.delete('/:id', designCompanyController.deleteCompany);

module.exports = router;