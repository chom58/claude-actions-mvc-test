const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const designerJobController = require('../controllers/designerJobController');
const auth = require('../middleware/auth');

// バリデーションルール
const createJobValidation = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('タイトルは3〜200文字で入力してください'),
  body('company')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('会社名は必須で、100文字以内で入力してください'),
  body('originalUrl')
    .isURL()
    .withMessage('有効なURLを入力してください'),
  body('jobSiteId')
    .isInt({ min: 1 })
    .withMessage('有効な求人サイトIDを選択してください'),
  body('jobType')
    .optional()
    .isIn(['full_time', 'part_time', 'contract', 'freelance', 'internship'])
    .withMessage('有効な雇用形態を選択してください'),
  body('experienceLevel')
    .optional()
    .isIn(['entry_level', 'mid_level', 'senior_level', 'executive'])
    .withMessage('有効な経験レベルを選択してください'),
  body('isExperienceWelcome')
    .optional()
    .isBoolean()
    .withMessage('未経験歓迎は真偽値で入力してください'),
  body('isNewGraduateWelcome')
    .optional()
    .isBoolean()
    .withMessage('新卒歓迎は真偽値で入力してください'),
  body('designCategories')
    .optional()
    .isArray()
    .withMessage('デザインカテゴリーは配列で入力してください'),
  body('skills')
    .optional()
    .isArray()
    .withMessage('スキルは配列で入力してください'),
  body('tools')
    .optional()
    .isArray()
    .withMessage('ツールは配列で入力してください'),
  body('salaryMin')
    .optional()
    .isInt({ min: 0 })
    .withMessage('最低給与は0以上の数値で入力してください'),
  body('salaryMax')
    .optional()
    .isInt({ min: 0 })
    .withMessage('最高給与は0以上の数値で入力してください'),
  body('salaryType')
    .optional()
    .isIn(['hourly', 'monthly', 'annual', 'project_based'])
    .withMessage('有効な給与タイプを選択してください'),
  body('applicationDeadline')
    .optional()
    .isISO8601()
    .withMessage('有効な日付形式で入力してください'),
  body('postedAt')
    .optional()
    .isISO8601()
    .withMessage('有効な日付形式で入力してください')
];

const updateJobValidation = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('タイトルは3〜200文字で入力してください'),
  body('company')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('会社名は100文字以内で入力してください'),
  body('originalUrl')
    .optional()
    .isURL()
    .withMessage('有効なURLを入力してください'),
  body('jobSiteId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('有効な求人サイトIDを選択してください'),
  body('jobType')
    .optional()
    .isIn(['full_time', 'part_time', 'contract', 'freelance', 'internship'])
    .withMessage('有効な雇用形態を選択してください'),
  body('experienceLevel')
    .optional()
    .isIn(['entry_level', 'mid_level', 'senior_level', 'executive'])
    .withMessage('有効な経験レベルを選択してください'),
  body('isExperienceWelcome')
    .optional()
    .isBoolean()
    .withMessage('未経験歓迎は真偽値で入力してください'),
  body('isNewGraduateWelcome')
    .optional()
    .isBoolean()
    .withMessage('新卒歓迎は真偽値で入力してください'),
  body('designCategories')
    .optional()
    .isArray()
    .withMessage('デザインカテゴリーは配列で入力してください'),
  body('skills')
    .optional()
    .isArray()
    .withMessage('スキルは配列で入力してください'),
  body('tools')
    .optional()
    .isArray()
    .withMessage('ツールは配列で入力してください'),
  body('salaryMin')
    .optional()
    .isInt({ min: 0 })
    .withMessage('最低給与は0以上の数値で入力してください'),
  body('salaryMax')
    .optional()
    .isInt({ min: 0 })
    .withMessage('最高給与は0以上の数値で入力してください'),
  body('salaryType')
    .optional()
    .isIn(['hourly', 'monthly', 'annual', 'project_based'])
    .withMessage('有効な給与タイプを選択してください'),
  body('applicationDeadline')
    .optional()
    .isISO8601()
    .withMessage('有効な日付形式で入力してください'),
  body('postedAt')
    .optional()
    .isISO8601()
    .withMessage('有効な日付形式で入力してください'),
  body('status')
    .optional()
    .isIn(['draft', 'pending_review', 'approved', 'rejected', 'expired'])
    .withMessage('有効なステータスを選択してください'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('アクティブ状態は真偽値で入力してください'),
  body('isFeatured')
    .optional()
    .isBoolean()
    .withMessage('おすすめ状態は真偽値で入力してください'),
  body('priority')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('優先度は1〜10の数値で入力してください')
];

// 公開エンドポイント（認証不要）

// 求人一覧取得
router.get('/', designerJobController.getJobs);

// 求人詳細取得
router.get('/:id', designerJobController.getJobById);

// 求人クリック追跡（RESTful: POST /designer-jobs/:id/actions/click）
router.post('/:id/actions/click', designerJobController.trackClick);

// おすすめ求人取得（RESTful: GET /designer-jobs/collections/featured）
router.get('/collections/featured', designerJobController.getFeaturedJobs);

// 統計情報取得（RESTful: GET /designer-jobs/analytics/entry-level-stats）
router.get('/analytics/entry-level-stats', designerJobController.getEntryLevelStats);

// 検索サジェスト
router.get('/search/suggestions', designerJobController.getSearchSuggestions);

// 管理者向けエンドポイント（認証必要）

// 求人作成
router.post('/', auth, createJobValidation, designerJobController.createJob);

// 求人更新
router.put('/:id', auth, updateJobValidation, designerJobController.updateJob);

// 求人承認
router.patch('/:id/approve', auth, designerJobController.approveJob);

// 求人削除
router.delete('/:id', auth, designerJobController.deleteJob);

module.exports = router;