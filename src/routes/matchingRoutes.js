const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const matchingController = require('../controllers/matchingController');

// バリデーションルール
const createValidation = [
  body('title').trim().notEmpty().withMessage('リクエストタイトルは必須です').isLength({ max: 255 }).withMessage('タイトルは255文字以内で入力してください'),
  body('description').trim().notEmpty().withMessage('リクエスト説明は必須です'),
  body('requestType').isIn(['seeking_designer', 'seeking_brand', 'collaboration_offer', 'skill_exchange', 'mentorship', 'other']).withMessage('有効なリクエストタイプを選択してください'),
  body('requesterType').isIn(['design_company', 'apparel_brand']).withMessage('有効な申請者タイプを選択してください'),
  body('requesterId').isInt().withMessage('申請者IDは整数を入力してください'),
  body('requesterName').trim().notEmpty().withMessage('申請者名は必須です').isLength({ max: 100 }).withMessage('申請者名は100文字以内で入力してください'),
  body('targetType').isIn(['design_company', 'apparel_brand', 'either']).withMessage('有効なターゲットタイプを選択してください'),
  body('skillsNeeded').isArray().withMessage('必要スキルは配列で指定してください'),
  body('skillsOffered').isArray().withMessage('提供スキルは配列で指定してください'),
  body('projectScope').isIn(['short_term', 'long_term', 'ongoing', 'one_time', 'flexible']).withMessage('有効なプロジェクト規模を選択してください'),
  body('budgetRange').optional().isIn(['~10万円', '10-50万円', '50-100万円', '100-500万円', '500万円~', '要相談']).withMessage('有効な予算範囲を選択してください'),
  body('timeline').optional().trim(),
  body('requirements').optional().trim(),
  body('contactEmail').isEmail().withMessage('有効なメールアドレスを入力してください'),
  body('contactMethod').optional().isArray().withMessage('連絡手段は配列で指定してください'),
  body('location').optional().trim().isLength({ max: 100 }).withMessage('場所は100文字以内で入力してください'),
  body('isRemoteOk').optional().isBoolean().withMessage('リモート可否はboolean値で指定してください'),
  body('experienceLevel').optional().isIn(['junior', 'mid_level', 'senior', 'expert', 'any']).withMessage('有効な経験レベルを選択してください'),
  body('tags').optional().isArray().withMessage('タグは配列で指定してください'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('有効な優先度を選択してください'),
  body('expiryDate').optional().isISO8601().withMessage('有効な有効期限を入力してください'),
  body('notes').optional().trim()
];

const updateValidation = [
  body('title').optional().trim().notEmpty().withMessage('リクエストタイトルは必須です').isLength({ max: 255 }).withMessage('タイトルは255文字以内で入力してください'),
  body('description').optional().trim().notEmpty().withMessage('リクエスト説明は必須です'),
  body('requestType').optional().isIn(['seeking_designer', 'seeking_brand', 'collaboration_offer', 'skill_exchange', 'mentorship', 'other']).withMessage('有効なリクエストタイプを選択してください'),
  body('requesterType').optional().isIn(['design_company', 'apparel_brand']).withMessage('有効な申請者タイプを選択してください'),
  body('requesterId').optional().isInt().withMessage('申請者IDは整数を入力してください'),
  body('requesterName').optional().trim().notEmpty().withMessage('申請者名は必須です').isLength({ max: 100 }).withMessage('申請者名は100文字以内で入力してください'),
  body('targetType').optional().isIn(['design_company', 'apparel_brand', 'either']).withMessage('有効なターゲットタイプを選択してください'),
  body('skillsNeeded').optional().isArray().withMessage('必要スキルは配列で指定してください'),
  body('skillsOffered').optional().isArray().withMessage('提供スキルは配列で指定してください'),
  body('projectScope').optional().isIn(['short_term', 'long_term', 'ongoing', 'one_time', 'flexible']).withMessage('有効なプロジェクト規模を選択してください'),
  body('budgetRange').optional().isIn(['~10万円', '10-50万円', '50-100万円', '100-500万円', '500万円~', '要相談']).withMessage('有効な予算範囲を選択してください'),
  body('timeline').optional().trim(),
  body('requirements').optional().trim(),
  body('contactEmail').optional().isEmail().withMessage('有効なメールアドレスを入力してください'),
  body('contactMethod').optional().isArray().withMessage('連絡手段は配列で指定してください'),
  body('location').optional().trim().isLength({ max: 100 }).withMessage('場所は100文字以内で入力してください'),
  body('isRemoteOk').optional().isBoolean().withMessage('リモート可否はboolean値で指定してください'),
  body('experienceLevel').optional().isIn(['junior', 'mid_level', 'senior', 'expert', 'any']).withMessage('有効な経験レベルを選択してください'),
  body('tags').optional().isArray().withMessage('タグは配列で指定してください'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('有効な優先度を選択してください'),
  body('status').optional().isIn(['active', 'paused', 'completed', 'cancelled']).withMessage('有効なステータスを選択してください'),
  body('expiryDate').optional().isISO8601().withMessage('有効な有効期限を入力してください'),
  body('notes').optional().trim()
];

const responseValidation = [
  body('responderName').trim().notEmpty().withMessage('応答者名は必須です').isLength({ max: 100 }).withMessage('応答者名は100文字以内で入力してください'),
  body('responderEmail').isEmail().withMessage('有効なメールアドレスを入力してください'),
  body('message').trim().notEmpty().withMessage('メッセージは必須です').isLength({ max: 1000 }).withMessage('メッセージは1000文字以内で入力してください'),
  body('contactMethod').optional().isIn(['email', 'phone', 'meeting', 'other']).withMessage('有効な連絡方法を選択してください')
];

// ルート定義
router.get('/', matchingController.getAllRequests);
router.get('/high-priority', matchingController.getHighPriorityRequests);
router.get('/skill/:skill', matchingController.searchBySkill);
router.get('/request-type/:requestType', matchingController.searchByRequestType);
router.get('/:id', matchingController.getRequestById);
router.post('/', createValidation, matchingController.createRequest);
router.put('/:id', updateValidation, matchingController.updateRequest);
router.delete('/:id', matchingController.deleteRequest);
router.post('/:id/respond', responseValidation, matchingController.respondToRequest);

module.exports = router;