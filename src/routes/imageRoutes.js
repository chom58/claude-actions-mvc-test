const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const { authenticate } = require('../middleware/auth');
const { param } = require('express-validator');

// 認証が必要な全ルートに適用
router.use(authenticate);

// バリデーションルール
const imageIdValidation = [
  param('id')
    .isUUID()
    .withMessage('無効な画像IDです')
];

// GET /api/images/:id - 画像メタデータ取得
router.get('/:id', 
  imageIdValidation,
  uploadController.getImageMetadata
);

// GET /api/images/:id/download - 画像ダウンロード
router.get('/:id/download', 
  imageIdValidation,
  uploadController.downloadImage
);

// GET /api/images - ユーザーの画像一覧取得
router.get('/', 
  uploadController.getUserImages
);

module.exports = router;