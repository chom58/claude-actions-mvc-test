const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

// アップロードディレクトリを作成
const createUploadDirectories = async () => {
  const directories = [
    'public/uploads',
    'public/uploads/profiles',
    'public/uploads/portfolios',
    'public/uploads/events',
    'public/uploads/thumbnails'
  ];

  for (const dir of directories) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      console.error(`ディレクトリ作成エラー ${dir}:`, error);
    }
  }
};

// 初期化時にディレクトリを作成
createUploadDirectories();

// Multer設定
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // 許可する画像形式
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('サポートされていないファイル形式です。JPEG, PNG, WebPのみ対応しています。'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB制限
  }
});

// 画像処理とリサイズ
const processImage = async (buffer, options = {}) => {
  const {
    width = 800,
    height = 600,
    quality = 80,
    format = 'jpeg'
  } = options;

  try {
    const processedBuffer = await sharp(buffer)
      .resize(width, height, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality })
      .toBuffer();

    return processedBuffer;
  } catch (error) {
    throw new Error('画像処理中にエラーが発生しました: ' + error.message);
  }
};

// サムネイル生成
const generateThumbnail = async (buffer, size = 150) => {
  try {
    const thumbnailBuffer = await sharp(buffer)
      .resize(size, size, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 70 })
      .toBuffer();

    return thumbnailBuffer;
  } catch (error) {
    throw new Error('サムネイル生成中にエラーが発生しました: ' + error.message);
  }
};

// ファイル保存
const saveImage = async (buffer, filename, directory = 'uploads') => {
  const filePath = path.join('public', directory, filename);
  
  try {
    await fs.writeFile(filePath, buffer);
    return `/${directory}/${filename}`;
  } catch (error) {
    throw new Error('ファイル保存中にエラーが発生しました: ' + error.message);
  }
};

// プロフィール画像アップロード処理
const uploadProfileImage = async (req, res, next) => {
  if (!req.file) {
    return next();
  }

  try {
    const userId = req.user.id;
    const timestamp = Date.now();
    const filename = `profile_${userId}_${timestamp}.jpg`;
    const thumbnailFilename = `profile_${userId}_${timestamp}_thumb.jpg`;

    // メイン画像を処理
    const processedImage = await processImage(req.file.buffer, {
      width: 400,
      height: 400,
      quality: 85
    });

    // サムネイルを生成
    const thumbnailImage = await generateThumbnail(req.file.buffer, 150);

    // 画像を保存
    const imagePath = await saveImage(processedImage, filename, 'uploads/profiles');
    const thumbnailPath = await saveImage(thumbnailImage, thumbnailFilename, 'uploads/thumbnails');

    // リクエストに情報を追加
    req.uploadedImage = {
      originalPath: imagePath,
      thumbnailPath: thumbnailPath,
      filename: filename,
      thumbnailFilename: thumbnailFilename
    };

    next();
  } catch (error) {
    console.error('プロフィール画像アップロードエラー:', error);
    res.status(400).json({
      error: '画像のアップロードに失敗しました',
      details: error.message
    });
  }
};

// ポートフォリオ画像アップロード処理
const uploadPortfolioImage = async (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return next();
  }

  try {
    const userId = req.user.id;
    const timestamp = Date.now();
    const uploadedImages = [];

    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const filename = `portfolio_${userId}_${timestamp}_${i + 1}.jpg`;
      const thumbnailFilename = `portfolio_${userId}_${timestamp}_${i + 1}_thumb.jpg`;

      // メイン画像を処理
      const processedImage = await processImage(file.buffer, {
        width: 1200,
        height: 800,
        quality: 85
      });

      // サムネイルを生成
      const thumbnailImage = await generateThumbnail(file.buffer, 300);

      // 画像を保存
      const imagePath = await saveImage(processedImage, filename, 'uploads/portfolios');
      const thumbnailPath = await saveImage(thumbnailImage, thumbnailFilename, 'uploads/thumbnails');

      uploadedImages.push({
        originalPath: imagePath,
        thumbnailPath: thumbnailPath,
        filename: filename,
        thumbnailFilename: thumbnailFilename
      });
    }

    req.uploadedImages = uploadedImages;
    next();
  } catch (error) {
    console.error('ポートフォリオ画像アップロードエラー:', error);
    res.status(400).json({
      error: 'ポートフォリオ画像のアップロードに失敗しました',
      details: error.message
    });
  }
};

// ファイル削除
const deleteImage = async (filePath) => {
  try {
    const fullPath = path.join('public', filePath);
    await fs.unlink(fullPath);
  } catch (error) {
    console.error('画像削除エラー:', error);
  }
};

module.exports = {
  upload,
  processImage,
  generateThumbnail,
  saveImage,
  uploadProfileImage,
  uploadPortfolioImage,
  deleteImage
};