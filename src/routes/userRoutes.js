const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { body } = require('express-validator');
const authMiddleware = require('../middleware/auth');

router.post('/register', [
  body('username').isLength({ min: 3 }).withMessage('ユーザー名は3文字以上必要です'),
  body('email').isEmail().withMessage('有効なメールアドレスを入力してください'),
  body('password').isLength({ min: 6 }).withMessage('パスワードは6文字以上必要です')
], userController.register);

router.post('/login', [
  body('email').isEmail().withMessage('有効なメールアドレスを入力してください'),
  body('password').notEmpty().withMessage('パスワードを入力してください')
], userController.login);

router.get('/profile', authMiddleware, userController.getProfile);

router.put('/profile', authMiddleware, [
  body('username').optional().isLength({ min: 3 }).withMessage('ユーザー名は3文字以上必要です'),
  body('email').optional().isEmail().withMessage('有効なメールアドレスを入力してください')
], userController.updateProfile);

router.delete('/profile', authMiddleware, userController.deleteAccount);

module.exports = router;