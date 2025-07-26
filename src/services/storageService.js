const fs = require('fs').promises;
const path = require('path');

class StorageService {
  constructor() {
    this.storageType = process.env.STORAGE_TYPE || 'local';
    this.localUploadDir = path.join(__dirname, '../../uploads');
    this.localPublicDir = path.join(__dirname, '../../public/uploads');
  }

  // ローカルストレージの初期化
  async initializeLocalStorage() {
    try {
      await fs.mkdir(this.localUploadDir, { recursive: true });
      await fs.mkdir(this.localPublicDir, { recursive: true });
      await fs.mkdir(path.join(this.localPublicDir, 'thumbnails'), { recursive: true });
    } catch (error) {
      console.error('ローカルストレージの初期化に失敗:', error);
      throw error;
    }
  }

  // ファイルをローカルストレージに保存
  async saveToLocal(sourceFilePath, destinationPath) {
    try {
      const fullDestinationPath = path.join(this.localPublicDir, destinationPath);
      const destinationDir = path.dirname(fullDestinationPath);
      
      // ディレクトリが存在しない場合は作成
      await fs.mkdir(destinationDir, { recursive: true });
      
      // ファイルをコピー
      await fs.copyFile(sourceFilePath, fullDestinationPath);
      
      return destinationPath;
    } catch (error) {
      console.error('ローカル保存エラー:', error);
      throw new Error('ファイルの保存に失敗しました');
    }
  }

  // ローカルストレージからファイルを削除
  async deleteFromLocal(filePath) {
    try {
      const fullPath = path.join(this.localPublicDir, filePath);
      await fs.unlink(fullPath);
    } catch (error) {
      console.error('ローカル削除エラー:', error);
      throw new Error('ファイルの削除に失敗しました');
    }
  }

  // ファイルの存在確認
  async fileExists(filePath) {
    try {
      const fullPath = path.join(this.localPublicDir, filePath);
      await fs.access(fullPath);
      return true;
    } catch (error) {
      return false;
    }
  }

  // ファイル情報の取得
  async getFileInfo(filePath) {
    try {
      const fullPath = path.join(this.localPublicDir, filePath);
      const stats = await fs.stat(fullPath);
      return {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime
      };
    } catch (error) {
      throw new Error('ファイル情報の取得に失敗しました');
    }
  }

  // 未使用ファイルのクリーンアップ
  async cleanupUnusedFiles(usedFilePaths) {
    try {
      const allFiles = await this.getAllFiles();
      const unusedFiles = allFiles.filter(file => !usedFilePaths.includes(file));
      
      for (const unusedFile of unusedFiles) {
        await this.deleteFromLocal(unusedFile);
        console.log(`未使用ファイルを削除: ${unusedFile}`);
      }
      
      return unusedFiles.length;
    } catch (error) {
      console.error('クリーンアップエラー:', error);
      throw new Error('未使用ファイルのクリーンアップに失敗しました');
    }
  }

  // 全ファイルリストの取得
  async getAllFiles(directory = '') {
    try {
      const dirPath = path.join(this.localPublicDir, directory);
      const items = await fs.readdir(dirPath, { withFileTypes: true });
      let files = [];
      
      for (const item of items) {
        const itemPath = path.join(directory, item.name);
        if (item.isDirectory()) {
          const subFiles = await this.getAllFiles(itemPath);
          files = files.concat(subFiles);
        } else {
          files.push(itemPath);
        }
      }
      
      return files;
    } catch (error) {
      console.error('ファイルリスト取得エラー:', error);
      return [];
    }
  }

  // S3互換ストレージ設定（将来の拡張用）
  initializeS3Storage() {
    // TODO: AWS SDK v3を使用してS3クライアントを初期化
    console.log('S3ストレージは未実装です');
  }

  // ストレージサービスの初期化
  async initialize() {
    switch (this.storageType) {
      case 'local':
        await this.initializeLocalStorage();
        break;
      case 's3':
        this.initializeS3Storage();
        break;
      default:
        throw new Error(`サポートされていないストレージタイプ: ${this.storageType}`);
    }
  }

  // ファイル保存の統一インターフェース
  async saveFile(sourceFilePath, destinationPath) {
    switch (this.storageType) {
      case 'local':
        return await this.saveToLocal(sourceFilePath, destinationPath);
      case 's3':
        // TODO: S3への保存を実装
        throw new Error('S3ストレージは未実装です');
      default:
        throw new Error(`サポートされていないストレージタイプ: ${this.storageType}`);
    }
  }

  // ファイル削除の統一インターフェース
  async deleteFile(filePath) {
    switch (this.storageType) {
      case 'local':
        return await this.deleteFromLocal(filePath);
      case 's3':
        // TODO: S3からの削除を実装
        throw new Error('S3ストレージは未実装です');
      default:
        throw new Error(`サポートされていないストレージタイプ: ${this.storageType}`);
    }
  }

  // CDN URL の生成
  generateCdnUrl(filePath) {
    const cdnBaseUrl = process.env.CDN_BASE_URL;
    if (cdnBaseUrl) {
      return `${cdnBaseUrl}${filePath}`;
    }
    return filePath; // CDNが設定されていない場合は相対パスを返す
  }
}

module.exports = new StorageService();