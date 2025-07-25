const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const jobSiteController = require('../controllers/jobSiteController');
const auth = require('../middleware/auth');

// バリデーションルール
const createJobSiteValidation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('サイト名は必須で、100文字以内で入力してください'),
  body('domain')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('ドメインは必須で、255文字以内で入力してください')
    .matches(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)
    .withMessage('有効なドメイン形式で入力してください'),
  body('baseUrl')
    .isURL()
    .withMessage('有効なベースURLを入力してください'),
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('説明は1000文字以内で入力してください'),
  body('logoUrl')
    .optional()
    .isURL()
    .withMessage('有効なロゴURLを入力してください'),
  body('category')
    .optional()
    .isIn(['general', 'design_specialized', 'creative_focused', 'freelance'])
    .withMessage('有効なカテゴリーを選択してください'),
  body('priority')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('優先度は1〜10の数値で入力してください'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('アクティブ状態は真偽値で入力してください')
];

const updateJobSiteValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('サイト名は100文字以内で入力してください'),
  body('domain')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('ドメインは255文字以内で入力してください')
    .matches(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)
    .withMessage('有効なドメイン形式で入力してください'),
  body('baseUrl')
    .optional()
    .isURL()
    .withMessage('有効なベースURLを入力してください'),
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('説明は1000文字以内で入力してください'),
  body('logoUrl')
    .optional()
    .isURL()
    .withMessage('有効なロゴURLを入力してください'),
  body('category')
    .optional()
    .isIn(['general', 'design_specialized', 'creative_focused', 'freelance'])
    .withMessage('有効なカテゴリーを選択してください'),
  body('priority')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('優先度は1〜10の数値で入力してください'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('アクティブ状態は真偽値で入力してください')
];

// 公開エンドポイント（認証不要）

// 求人サイト一覧取得
router.get('/', jobSiteController.getJobSites);

// 求人サイト詳細取得
router.get('/:id', jobSiteController.getJobSiteById);

// 統計情報取得
router.get('/stats/overview', jobSiteController.getJobSiteStats);

// 人気の求人サイト取得
router.get('/popular/list', jobSiteController.getPopularJobSites);

// 管理者向けエンドポイント（認証必要）

// 求人サイト作成
router.post('/', auth, createJobSiteValidation, jobSiteController.createJobSite);

// 求人サイト更新
router.put('/:id', auth, updateJobSiteValidation, jobSiteController.updateJobSite);

// 求人サイト削除
router.delete('/:id', auth, jobSiteController.deleteJobSite);

// アクティブ状態切り替え
router.patch('/:id/toggle-active', auth, jobSiteController.toggleActiveStatus);

module.exports = router;