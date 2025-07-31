const express = require('express');
const { body, param, query } = require('express-validator');
const auth = require('../middleware/auth');
const {
  getRecommendations,
  regenerateRecommendations,
  handleFeedback,
  recordInteraction,
  getSimilarUsers,
  getUserProfile,
  getRecommendationStats
} = require('../controllers/recommendationController');

const router = express.Router();

// 全てのルートで認証が必要
router.use(auth);

/**
 * @swagger
 * /api/recommendations:
 *   get:
 *     summary: ユーザーのレコメンドを取得
 *     tags: [Recommendations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: 取得するレコメンド数
 *       - in: query
 *         name: algorithm
 *         schema:
 *           type: string
 *           enum: [content, collaborative, hybrid]
 *           default: hybrid
 *         description: レコメンドアルゴリズム
 *     responses:
 *       200:
 *         description: レコメンド一覧
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     recommendations:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Recommendation'
 *                     total:
 *                       type: integer
 *                     algorithm:
 *                       type: string
 */
router.get('/', [
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('algorithm').optional().isIn(['content', 'collaborative', 'hybrid'])
], getRecommendations);

/**
 * @swagger
 * /api/recommendations/regenerate:
 *   post:
 *     summary: レコメンドを強制的に再生成
 *     tags: [Recommendations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               algorithm:
 *                 type: string
 *                 enum: [content, collaborative, hybrid]
 *                 default: hybrid
 *               limit:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 50
 *                 default: 10
 *     responses:
 *       200:
 *         description: 再生成されたレコメンド
 */
router.post('/regenerate', [
  body('algorithm').optional().isIn(['content', 'collaborative', 'hybrid']),
  body('limit').optional().isInt({ min: 1, max: 50 })
], regenerateRecommendations);

/**
 * @swagger
 * /api/recommendations/{recommendationId}/feedback:
 *   post:
 *     summary: レコメンドのフィードバックを送信
 *     tags: [Recommendations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recommendationId
 *         required: true
 *         schema:
 *           type: integer
 *         description: レコメンドID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [view, click, dismiss]
 *                 description: フィードバックアクション
 *     responses:
 *       200:
 *         description: フィードバック記録完了
 */
router.post('/:recommendationId/feedback', [
  param('recommendationId').isInt({ min: 1 }),
  body('action').isIn(['view', 'click', 'dismiss'])
], handleFeedback);

/**
 * @swagger
 * /api/recommendations/interactions:
 *   post:
 *     summary: ユーザーインタラクションを記録
 *     tags: [Recommendations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - targetId
 *               - targetType
 *               - interactionType
 *             properties:
 *               targetId:
 *                 type: integer
 *                 description: インタラクション対象のID
 *               targetType:
 *                 type: string
 *                 enum: [post, user]
 *                 description: インタラクション対象の種類
 *               interactionType:
 *                 type: string
 *                 enum: [view, like, share, comment, bookmark]
 *                 description: インタラクションの種類
 *               metadata:
 *                 type: object
 *                 description: インタラクションの追加情報
 *     responses:
 *       200:
 *         description: インタラクション記録完了
 */
router.post('/interactions', [
  body('targetId').isInt({ min: 1 }),
  body('targetType').isIn(['post', 'user']),
  body('interactionType').isIn(['view', 'like', 'share', 'comment', 'bookmark']),
  body('metadata').optional().isObject()
], recordInteraction);

/**
 * @swagger
 * /api/recommendations/similar-users:
 *   get:
 *     summary: 類似ユーザーを取得
 *     tags: [Recommendations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 20
 *           default: 10
 *         description: 取得する類似ユーザー数
 *     responses:
 *       200:
 *         description: 類似ユーザー一覧
 */
router.get('/similar-users', [
  query('limit').optional().isInt({ min: 1, max: 20 })
], getSimilarUsers);

/**
 * @swagger
 * /api/recommendations/profile:
 *   get:
 *     summary: ユーザープロファイル分析結果を取得
 *     tags: [Recommendations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: ユーザープロファイル分析結果
 */
router.get('/profile', getUserProfile);

/**
 * @swagger
 * /api/recommendations/stats:
 *   get:
 *     summary: レコメンドの統計情報を取得
 *     tags: [Recommendations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: レコメンド統計情報
 */
router.get('/stats', getRecommendationStats);

module.exports = router;