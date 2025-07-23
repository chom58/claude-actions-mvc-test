const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const { body, param } = require('express-validator');
const authMiddleware = require('../middleware/auth');

router.get('/', postController.getAllPosts);

router.get('/:id', [
  param('id').isInt().withMessage('有効な投稿IDを指定してください')
], postController.getPost);

router.post('/', authMiddleware, [
  body('title').notEmpty().withMessage('タイトルは必須です'),
  body('content').notEmpty().withMessage('内容は必須です')
], postController.createPost);

router.put('/:id', authMiddleware, [
  param('id').isInt().withMessage('有効な投稿IDを指定してください'),
  body('title').optional().notEmpty().withMessage('タイトルは空にできません'),
  body('content').optional().notEmpty().withMessage('内容は空にできません')
], postController.updatePost);

router.delete('/:id', authMiddleware, [
  param('id').isInt().withMessage('有効な投稿IDを指定してください')
], postController.deletePost);

router.post('/:id/publish', authMiddleware, [
  param('id').isInt().withMessage('有効な投稿IDを指定してください')
], postController.publishPost);

module.exports = router;