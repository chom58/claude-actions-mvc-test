const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const mime = require('mime-types');
const imageService = require('../services/imageService');
const storageService = require('../services/storageService');
const { Image, ImageUsage } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { validationResult } = require('express-validator');

// Multer設定（一時ファイル保存）
const upload = multer({
  dest: path.join(__dirname, '../../temp'),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 10 // 最大10ファイル同時アップロード
  },
  fileFilter: (req, file, cb) => {
    try {
      imageService.validateImageFile(file);
      cb(null, true);
    } catch (error) {
      cb(error, false);
    }
  }
});

class UploadController {
  // 単一画像アップロード
  uploadSingle = [
    upload.single('image'),
    asyncHandler(async (req, res) => {
      if (!req.file) {
        return res.status(400).json({
          error: {
            code: 'NO_FILE',
            message: 'アップロードする画像ファイルが見つかりません'
          }
        });
      }

      const userId = req.user.id;
      const { originalname, mimetype, size, path: tempPath } = req.file;

      try {
        // 画像処理とサムネイル生成
        const processedImage = await imageService.processUploadedImage(
          tempPath,
          originalname,
          userId
        );

        // データベースに保存
        const image = await Image.create({
          userId,
          originalName: originalname,
          filePath: processedImage.filePath,
          mimeType: 'image/webp', // 処理後はWebP形式
          sizeBytes: processedImage.sizeBytes,
          width: processedImage.width,
          height: processedImage.height,
          thumbnails: processedImage.thumbnails,
          metadata: {
            originalMimeType: mimetype,
            originalSize: size
          }
        });

        res.status(201).json({
          success: true,
          data: {
            id: image.id,
            filePath: storageService.generateCdnUrl(image.filePath),
            thumbnails: Object.fromEntries(
              Object.entries(image.thumbnails).map(([size, path]) => [
                size,
                storageService.generateCdnUrl(path)
              ])
            ),
            originalName: image.originalName,
            mimeType: image.mimeType,
            size: image.sizeBytes,
            dimensions: {
              width: image.width,
              height: image.height
            },
            uploadedAt: image.uploadedAt
          }
        });
      } catch (error) {
        console.error('画像アップロードエラー:', error);
        res.status(500).json({
          error: {
            code: 'UPLOAD_FAILED',
            message: '画像のアップロードに失敗しました',
            details: error.message
          }
        });
      }
    })
  ];

  // 複数画像アップロード
  uploadMultiple = [
    upload.array('images', 10),
    asyncHandler(async (req, res) => {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          error: {
            code: 'NO_FILES',
            message: 'アップロードする画像ファイルが見つかりません'
          }
        });
      }

      const userId = req.user.id;
      const results = [];
      const errors = [];

      for (const file of req.files) {
        try {
          const { originalname, mimetype, size, path: tempPath } = file;

          // 画像処理とサムネイル生成
          const processedImage = await imageService.processUploadedImage(
            tempPath,
            originalname,
            userId
          );

          // データベースに保存
          const image = await Image.create({
            userId,
            originalName: originalname,
            filePath: processedImage.filePath,
            mimeType: 'image/webp',
            sizeBytes: processedImage.sizeBytes,
            width: processedImage.width,
            height: processedImage.height,
            thumbnails: processedImage.thumbnails,
            metadata: {
              originalMimeType: mimetype,
              originalSize: size
            }
          });

          results.push({
            id: image.id,
            filePath: storageService.generateCdnUrl(image.filePath),
            thumbnails: Object.fromEntries(
              Object.entries(image.thumbnails).map(([size, path]) => [
                size,
                storageService.generateCdnUrl(path)
              ])
            ),
            originalName: image.originalName,
            mimeType: image.mimeType,
            size: image.sizeBytes,
            dimensions: {
              width: image.width,
              height: image.height
            },
            uploadedAt: image.uploadedAt
          });
        } catch (error) {
          console.error(`画像処理エラー (${file.originalname}):`, error);
          errors.push({
            filename: file.originalname,
            error: error.message
          });
        }
      }

      res.status(results.length > 0 ? 201 : 400).json({
        success: results.length > 0,
        data: results,
        errors: errors.length > 0 ? errors : undefined
      });
    })
  ];

  // 画像削除
  deleteImage = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    const image = await Image.findOne({
      where: { id, userId }
    });

    if (!image) {
      return res.status(404).json({
        error: {
          code: 'IMAGE_NOT_FOUND',
          message: '画像が見つかりません'
        }
      });
    }

    try {
      // ストレージから画像を削除
      await imageService.deleteImage(image.filePath, image.thumbnails);

      // データベースから削除（論理削除）
      await image.destroy();

      // 関連する使用記録も削除
      await ImageUsage.destroy({
        where: { imageId: id }
      });

      res.json({
        success: true,
        message: '画像が削除されました'
      });
    } catch (error) {
      console.error('画像削除エラー:', error);
      res.status(500).json({
        error: {
          code: 'DELETE_FAILED',
          message: '画像の削除に失敗しました',
          details: error.message
        }
      });
    }
  });

  // 画像メタデータ取得
  getImageMetadata = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    const image = await Image.findOne({
      where: { id, userId },
      include: [{
        model: ImageUsage,
        as: 'usages'
      }]
    });

    if (!image) {
      return res.status(404).json({
        error: {
          code: 'IMAGE_NOT_FOUND',
          message: '画像が見つかりません'
        }
      });
    }

    res.json({
      success: true,
      data: {
        id: image.id,
        originalName: image.originalName,
        filePath: storageService.generateCdnUrl(image.filePath),
        thumbnails: Object.fromEntries(
          Object.entries(image.thumbnails || {}).map(([size, path]) => [
            size,
            storageService.generateCdnUrl(path)
          ])
        ),
        mimeType: image.mimeType,
        size: image.sizeBytes,
        dimensions: {
          width: image.width,
          height: image.height
        },
        metadata: image.metadata,
        uploadedAt: image.uploadedAt,
        usages: image.usages || []
      }
    });
  });

  // 画像ダウンロード
  downloadImage = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    const image = await Image.findOne({
      where: { id, userId }
    });

    if (!image) {
      return res.status(404).json({
        error: {
          code: 'IMAGE_NOT_FOUND',
          message: '画像が見つかりません'
        }
      });
    }

    try {
      const filePath = path.join(__dirname, '../../public', image.filePath);
      const stats = await fs.stat(filePath);

      res.setHeader('Content-Type', image.mimeType);
      res.setHeader('Content-Length', stats.size);
      res.setHeader('Content-Disposition', `attachment; filename="${image.originalName}"`);

      const stream = require('fs').createReadStream(filePath);
      stream.pipe(res);
    } catch (error) {
      console.error('画像ダウンロードエラー:', error);
      res.status(500).json({
        error: {
          code: 'DOWNLOAD_FAILED',
          message: '画像のダウンロードに失敗しました'
        }
      });
    }
  });

  // ユーザーの画像一覧取得
  getUserImages = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const { count, rows: images } = await Image.findAndCountAll({
      where: { userId },
      offset,
      limit,
      order: [['uploadedAt', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        images: images.map(image => ({
          id: image.id,
          originalName: image.originalName,
          filePath: storageService.generateCdnUrl(image.filePath),
          thumbnails: Object.fromEntries(
            Object.entries(image.thumbnails || {}).map(([size, path]) => [
              size,
              storageService.generateCdnUrl(path)
            ])
          ),
          mimeType: image.mimeType,
          size: image.sizeBytes,
          dimensions: {
            width: image.width,
            height: image.height
          },
          uploadedAt: image.uploadedAt
        })),
        pagination: {
          page,
          limit,
          total: count,
          pages: Math.ceil(count / limit)
        }
      }
    });
  });
}

module.exports = new UploadController();