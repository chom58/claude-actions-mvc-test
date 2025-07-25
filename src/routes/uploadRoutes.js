const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const { authenticate } = require('../middleware/auth');
const { uploadImageRateLimit } = require('../middleware/rateLimit');
const { body, param } = require('express-validator');

// 認証が必要な全ルートに適用
router.use(authenticate);

// バリデーションルール
const imageIdValidation = [
  param('id')
    .isUUID()
    .withMessage('無効な画像IDです')
];

// POST /api/upload/image - 単一画像アップロード
router.post('/image', 
  uploadImageRateLimit,
  uploadController.uploadSingle
);

// POST /api/upload/images - 複数画像アップロード
router.post('/images', 
  uploadImageRateLimit,
  uploadController.uploadMultiple
);

// DELETE /api/upload/image/:id - 画像削除
router.delete('/image/:id', 
  imageIdValidation,
  uploadController.deleteImage
);

module.exports = router;