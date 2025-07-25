const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

class ImageService {
  constructor() {
    this.uploadDir = path.join(__dirname, '../../uploads');
    this.thumbnailSizes = {
      small: { width: 150, height: 150 },
      medium: { width: 800, height: 800 },
      large: { width: 1920, height: 1920 }
    };
  }

  // アップロードディレクトリの初期化
  async ensureDirectoryExists() {
    try {
      await fs.access(this.uploadDir);
    } catch (error) {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
  }

  // 画像の基本情報を取得
  async getImageInfo(filePath) {
    try {
      const metadata = await sharp(filePath).metadata();
      return {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: metadata.size,
        hasAlpha: metadata.hasAlpha,
        orientation: metadata.orientation
      };
    } catch (error) {
      throw new Error(`画像情報の取得に失敗しました: ${error.message}`);
    }
  }

  // 画像の処理（リサイズ、形式変換、EXIF削除、回転補正）
  async processImage(inputPath, outputPath, options = {}) {
    try {
      let pipeline = sharp(inputPath)
        .rotate() // EXIF orientationに基づく自動回転
        .withMetadata(false); // EXIF情報を削除

      // WebP形式に変換（デフォルト）
      if (options.format === 'webp' || !options.format) {
        pipeline = pipeline.webp({ quality: 85 });
      } else if (options.format === 'jpeg') {
        pipeline = pipeline.jpeg({ quality: 85 });
      } else if (options.format === 'png') {
        pipeline = pipeline.png();
      }

      // リサイズ処理
      if (options.width || options.height) {
        pipeline = pipeline.resize(options.width, options.height, {
          fit: 'inside',
          withoutEnlargement: true
        });
      }

      await pipeline.toFile(outputPath);
      return await this.getImageInfo(outputPath);
    } catch (error) {
      throw new Error(`画像処理に失敗しました: ${error.message}`);
    }
  }

  // サムネイル生成
  async generateThumbnails(originalPath, baseFilename) {
    const thumbnails = {};
    
    for (const [size, dimensions] of Object.entries(this.thumbnailSizes)) {
      const thumbnailFilename = `${baseFilename}_${size}.webp`;
      const thumbnailPath = path.join(this.uploadDir, 'thumbnails', thumbnailFilename);
      
      // サムネイルディレクトリを作成
      await fs.mkdir(path.dirname(thumbnailPath), { recursive: true });
      
      await this.processImage(originalPath, thumbnailPath, {
        width: dimensions.width,
        height: dimensions.height,
        format: 'webp'
      });
      
      thumbnails[size] = `/uploads/thumbnails/${thumbnailFilename}`;
    }
    
    return thumbnails;
  }

  // メイン画像処理フロー
  async processUploadedImage(tempFilePath, originalName, userId) {
    await this.ensureDirectoryExists();
    
    const fileId = uuidv4();
    const ext = path.extname(originalName);
    const baseFilename = `${userId}_${fileId}`;
    
    // 最適化されたメイン画像を保存
    const mainImageFilename = `${baseFilename}.webp`;
    const mainImagePath = path.join(this.uploadDir, mainImageFilename);
    
    try {
      // メイン画像を処理
      const imageInfo = await this.processImage(tempFilePath, mainImagePath, {
        format: 'webp'
      });
      
      // サムネイルを生成
      const thumbnails = await this.generateThumbnails(tempFilePath, baseFilename);
      
      // 一時ファイルを削除
      await fs.unlink(tempFilePath);
      
      return {
        filePath: `/uploads/${mainImageFilename}`,
        thumbnails,
        width: imageInfo.width,
        height: imageInfo.height,
        sizeBytes: (await fs.stat(mainImagePath)).size
      };
    } catch (error) {
      // エラー時は一時ファイルをクリーンアップ
      try {
        await fs.unlink(tempFilePath);
      } catch (cleanupError) {
        console.warn('一時ファイルの削除に失敗:', cleanupError);
      }
      throw error;
    }
  }

  // 画像とサムネイルの削除
  async deleteImage(filePath, thumbnails = {}) {
    try {
      // メイン画像を削除
      const fullPath = path.join(__dirname, '../../public', filePath);
      await fs.unlink(fullPath);
      
      // サムネイルを削除
      for (const thumbnailPath of Object.values(thumbnails)) {
        const fullThumbnailPath = path.join(__dirname, '../../public', thumbnailPath);
        try {
          await fs.unlink(fullThumbnailPath);
        } catch (error) {
          console.warn('サムネイル削除エラー:', error);
        }
      }
    } catch (error) {
      console.error('画像削除エラー:', error);
      throw new Error('画像の削除に失敗しました');
    }
  }

  // ファイルタイプの検証
  validateImageFile(file) {
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif'
    ];
    
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new Error('サポートされていないファイル形式です');
    }
    
    if (file.size > maxSize) {
      throw new Error(`ファイルサイズが${maxSize / (1024 * 1024)}MBを超えています`);
    }
    
    return true;
  }
}

module.exports = new ImageService();