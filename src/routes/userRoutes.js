const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { body } = require('express-validator');
const authMiddleware = require('../middleware/auth');
const { strictRateLimit, generalRateLimit, passwordResetRateLimit } = require('../middleware/rateLimit');
const { sanitizeInput, preventSqlInjection } = require('../middleware/security');
const { upload, uploadProfileImage } = require('../middleware/upload');

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