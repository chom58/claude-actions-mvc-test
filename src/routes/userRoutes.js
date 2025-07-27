const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { body } = require('express-validator');
const authMiddleware = require('../middleware/auth');
const { strictRateLimit, generalRateLimit, passwordResetRateLimit } = require('../middleware/rateLimit');
const { sanitizeInput, preventSqlInjection } = require('../middleware/security');
const { upload, uploadProfileImage } = require('../middleware/upload');

/**
 * @swagger
 * /api/users/register:
 *   post:
 *     summary: ユーザー登録
 *     description: 新規ユーザーを登録します。
 *     tags: [ユーザー管理]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserRegistration'
 *           example:
 *             username: "john_doe"
 *             email: "john@example.com"
 *             password: "securepassword123"
 *     responses:
 *       201:
 *         description: ユーザー登録成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "ユーザー登録が完了しました"
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 token:
 *                   type: string
 *                   description: "JWT認証トークン"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       409:
 *         description: ユーザーが既に存在します
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/register', 
  strictRateLimit,
  sanitizeInput,
  preventSqlInjection,
  [
    body('username').isLength({ min: 3 }).withMessage('ユーザー名は3文字以上必要です'),
    body('email').isEmail().withMessage('有効なメールアドレスを入力してください'),
    body('password').isLength({ min: 6 }).withMessage('パスワードは6文字以上必要です')
  ], 
  userController.register
);

/**
 * @swagger
 * /api/users/login:
 *   post:
 *     summary: ユーザーログイン
 *     description: 既存ユーザーでログインします。
 *     tags: [ユーザー管理]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserLogin'
 *           example:
 *             email: "john@example.com"
 *             password: "securepassword123"
 *     responses:
 *       200:
 *         description: ログイン成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "ログインに成功しました"
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 token:
 *                   type: string
 *                   description: "JWT認証トークン"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         description: 認証に失敗しました
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/login', 
  strictRateLimit,
  sanitizeInput,
  preventSqlInjection,
  [
    body('email').isEmail().withMessage('有効なメールアドレスを入力してください'),
    body('password').notEmpty().withMessage('パスワードを入力してください')
  ], 
  userController.login
);

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: プロフィール取得
 *     description: 現在ログインしているユーザーのプロフィール情報を取得します。
 *     tags: [ユーザー管理]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: プロフィール取得成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   allOf:
 *                     - $ref: '#/components/schemas/User'
 *                     - type: object
 *                       properties:
 *                         posts:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: integer
 *                               title:
 *                                 type: string
 *                               published:
 *                                 type: boolean
 *                               createdAt:
 *                                 type: string
 *                                 format: date-time
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/profile', 
  generalRateLimit,
  authMiddleware, 
  userController.getProfile
);

router.put('/profile', 
  generalRateLimit,
  authMiddleware,
  upload.single('profileImage'),
  uploadProfileImage,
  sanitizeInput,
  preventSqlInjection,
  [
    body('username').optional().isLength({ min: 3 }).withMessage('ユーザー名は3文字以上必要です'),
    body('email').optional().isEmail().withMessage('有効なメールアドレスを入力してください'),
    body('bio').optional().isLength({ max: 500 }).withMessage('自己紹介は500文字以内で入力してください'),
    body('website').optional().isURL().withMessage('有効なURLを入力してください'),
    body('location').optional().isLength({ max: 100 }).withMessage('所在地は100文字以内で入力してください')
  ], 
  userController.updateProfile
);

router.delete('/profile', 
  strictRateLimit,
  authMiddleware, 
  userController.deleteAccount
);

// 認証関連の追加エンドポイント
router.post('/logout', 
  generalRateLimit,
  authMiddleware, 
  userController.logout
);

router.post('/refresh-token', 
  generalRateLimit,
  sanitizeInput,
  userController.refreshToken
);

router.post('/request-password-reset', 
  passwordResetRateLimit,
  sanitizeInput,
  preventSqlInjection,
  [
    body('email').isEmail().withMessage('有効なメールアドレスを入力してください')
  ], 
  userController.requestPasswordReset
);

router.post('/reset-password', 
  strictRateLimit,
  sanitizeInput,
  preventSqlInjection,
  [
    body('token').notEmpty().withMessage('リセットトークンが必要です'),
    body('newPassword').isLength({ min: 6 }).withMessage('新しいパスワードは6文字以上必要です')
  ], 
  userController.resetPassword
);

module.exports = router;