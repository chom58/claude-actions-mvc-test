/**
 * 画像アップロードクラス
 * ドラッグ&ドロップ、ファイル選択、プレビュー、アップロード進捗を管理
 */
class ImageUploader {
  constructor(config = {}) {
    // 設定
    this.config = {
      maxFileSize: config.maxFileSize || 10 * 1024 * 1024, // 10MB
      acceptedTypes: config.acceptedTypes || ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      maxFiles: config.maxFiles || 10,
      uploadUrl: config.uploadUrl || '/api/upload/images',
      singleUploadUrl: config.singleUploadUrl || '/api/upload/image',
      multiple: config.multiple !== false, // デフォルトは複数アップロード有効
      onSuccess: config.onSuccess || null,
      onError: config.onError || null,
      onProgress: config.onProgress || null,
      onPreview: config.onPreview || null,
      compressImages: config.compressImages || false,
      compressionQuality: config.compressionQuality || 0.8
    };

    // 内部状態
    this.files = [];
    this.uploading = false;
    this.uploadedImages = [];

    // DOM要素
    this.container = null;
    this.uploadArea = null;
    this.fileInput = null;
    this.previewArea = null;
    this.previewGrid = null;
    this.progressArea = null;
    this.progressList = null;
    this.errorArea = null;
    this.errorMessage = null;

    // イベントハンドラーをバインド
    this.handleDrop = this.handleDrop.bind(this);
    this.handleDragOver = this.handleDragOver.bind(this);
    this.handleDragEnter = this.handleDragEnter.bind(this);
    this.handleDragLeave = this.handleDragLeave.bind(this);
    this.handleFileSelect = this.handleFileSelect.bind(this);
    this.handleAreaClick = this.handleAreaClick.bind(this);
  }

  /**
   * 指定した要素にアップローダーを初期化
   * @param {HTMLElement|string} element - DOM要素またはセレクタ
   */
  init(element) {
    // DOM要素の取得
    if (typeof element === 'string') {
      this.container = document.querySelector(element);
    } else {
      this.container = element;
    }

    if (!this.container) {
      throw new Error('ImageUploader: コンテナ要素が見つかりません');
    }

    // DOM要素の参照を取得
    this.uploadArea = this.container.querySelector('#uploadArea');
    this.fileInput = this.container.querySelector('#fileInput');
    this.previewArea = this.container.querySelector('#previewArea');
    this.previewGrid = this.container.querySelector('#previewGrid');
    this.progressArea = this.container.querySelector('#progressArea');
    this.progressList = this.container.querySelector('#progressList');
    this.errorArea = this.container.querySelector('#errorArea');
    this.errorMessage = this.container.querySelector('#errorMessage');

    // 設定の適用
    this.applyConfig();

    // イベントリスナーの設定
    this.setupEventListeners();

    return this;
  }

  /**
   * 設定を適用
   */
  applyConfig() {
    if (this.fileInput) {
      this.fileInput.multiple = this.config.multiple;
      this.fileInput.accept = this.config.acceptedTypes.join(',');
    }
  }

  /**
   * イベントリスナーを設定
   */
  setupEventListeners() {
    if (!this.uploadArea || !this.fileInput) {
      console.error('ImageUploader: 必要なDOM要素が見つかりません');
      return;
    }

    // ドラッグ&ドロップイベント
    this.uploadArea.addEventListener('drop', this.handleDrop);
    this.uploadArea.addEventListener('dragover', this.handleDragOver);
    this.uploadArea.addEventListener('dragenter', this.handleDragEnter);
    this.uploadArea.addEventListener('dragleave', this.handleDragLeave);

    // ファイル選択イベント
    this.fileInput.addEventListener('change', this.handleFileSelect);
    this.uploadArea.addEventListener('click', this.handleAreaClick);

    // エラー閉じるボタン
    const errorClose = this.container.querySelector('#errorClose');
    if (errorClose) {
      errorClose.addEventListener('click', () => this.hideError());
    }
  }

  /**
   * アップロードエリアクリック処理
   */
  handleAreaClick(e) {
    if (e.target === this.uploadArea || e.target.closest('.upload-content')) {
      this.fileInput.click();
    }
  }

  /**
   * ドロップ処理
   */
  handleDrop(e) {
    e.preventDefault();
    this.uploadArea.classList.remove('drag-over');

    const files = Array.from(e.dataTransfer.files);
    this.processFiles(files);
  }

  /**
   * ドラッグオーバー処理
   */
  handleDragOver(e) {
    e.preventDefault();
  }

  /**
   * ドラッグエンター処理
   */
  handleDragEnter(e) {
    e.preventDefault();
    this.uploadArea.classList.add('drag-over');
  }

  /**
   * ドラッグリーブ処理
   */
  handleDragLeave(e) {
    e.preventDefault();
    if (!this.uploadArea.contains(e.relatedTarget)) {
      this.uploadArea.classList.remove('drag-over');
    }
  }

  /**
   * ファイル選択処理
   */
  handleFileSelect(e) {
    const files = Array.from(e.target.files);
    this.processFiles(files);
  }

  /**
   * ファイルを処理
   * @param {File[]} files - 処理するファイル配列
   */
  processFiles(files) {
    this.hideError();

    // ファイル数チェック
    const totalFiles = this.files.length + files.length;
    if (totalFiles > this.config.maxFiles) {
      this.showError(`最大${this.config.maxFiles}ファイルまでアップロードできます`);
      return;
    }

    // 各ファイルを検証
    const validFiles = [];
    for (const file of files) {
      try {
        this.validateFile(file);
        validFiles.push(file);
      } catch (error) {
        this.showError(`${file.name}: ${error.message}`);
      }
    }

    if (validFiles.length === 0) {
      return;
    }

    // ファイルを追加してプレビュー生成
    this.files.push(...validFiles);
    this.generatePreviews(validFiles);
  }

  /**
   * ファイルの検証
   * @param {File} file - 検証するファイル
   */
  validateFile(file) {
    // ファイルタイプチェック
    if (!this.config.acceptedTypes.includes(file.type)) {
      throw new Error('サポートされていないファイル形式です');
    }

    // ファイルサイズチェック
    if (file.size > this.config.maxFileSize) {
      const maxSizeMB = Math.round(this.config.maxFileSize / (1024 * 1024));
      throw new Error(`ファイルサイズが${maxSizeMB}MBを超えています`);
    }
  }

  /**
   * プレビューを生成
   * @param {File[]} files - プレビューを生成するファイル配列
   */
  async generatePreviews(files) {
    this.showPreviewArea();

    for (const file of files) {
      try {
        const preview = await this.createPreviewItem(file);
        this.previewGrid.appendChild(preview);
        
        // プレビューコールバック
        if (this.config.onPreview) {
          this.config.onPreview(file, preview);
        }
      } catch (error) {
        console.error('プレビュー生成エラー:', error);
        this.showError(`${file.name}のプレビュー生成に失敗しました`);
      }
    }
  }

  /**
   * プレビューアイテムを作成
   * @param {File} file - ファイル
   * @returns {Promise<HTMLElement>} プレビュー要素
   */
  createPreviewItem(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const previewItem = document.createElement('div');
        previewItem.className = 'preview-item';
        previewItem.dataset.filename = file.name;

        const img = document.createElement('img');
        img.className = 'preview-image';
        img.src = e.target.result;
        img.alt = file.name;

        const info = document.createElement('div');
        info.className = 'preview-info';

        const name = document.createElement('div');
        name.className = 'preview-name';
        name.textContent = file.name;

        const size = document.createElement('div');
        size.className = 'preview-size';
        size.textContent = this.formatFileSize(file.size);

        const removeBtn = document.createElement('button');
        removeBtn.className = 'preview-remove';
        removeBtn.innerHTML = '<i class="fas fa-times"></i>';
        removeBtn.addEventListener('click', () => {
          this.removeFile(file, previewItem);
        });

        info.appendChild(name);
        info.appendChild(size);

        previewItem.appendChild(img);
        previewItem.appendChild(info);
        previewItem.appendChild(removeBtn);

        resolve(previewItem);
      };

      reader.onerror = () => {
        reject(new Error('ファイル読み込みエラー'));
      };

      reader.readAsDataURL(file);
    });
  }

  /**
   * ファイルを削除
   * @param {File} file - 削除するファイル
   * @param {HTMLElement} previewItem - プレビュー要素
   */
  removeFile(file, previewItem) {
    // ファイル配列から削除
    const index = this.files.indexOf(file);
    if (index > -1) {
      this.files.splice(index, 1);
    }

    // プレビューから削除
    previewItem.remove();

    // プレビューエリアを非表示（ファイルがない場合）
    if (this.files.length === 0) {
      this.hidePreviewArea();
    }
  }

  /**
   * ファイルサイズをフォーマット
   * @param {number} bytes - ファイルサイズ（バイト）
   * @returns {string} フォーマット済みサイズ
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * アップロードを開始
   */
  async upload() {
    if (this.files.length === 0) {
      this.showError('アップロードするファイルがありません');
      return;
    }

    if (this.uploading) {
      return;
    }

    this.uploading = true;
    this.uploadedImages = [];
    this.showProgressArea();

    try {
      // 画像圧縮（オプション）
      let filesToUpload = this.files;
      if (this.config.compressImages) {
        filesToUpload = await this.compressImages(this.files);
      }

      // アップロード実行
      if (this.config.multiple && filesToUpload.length > 1) {
        await this.uploadMultiple(filesToUpload);
      } else {
        await this.uploadSingle(filesToUpload[0]);
      }

      // 成功時の処理
      this.hideProgressArea();
      this.hidePreviewArea();
      this.clearFiles();

      if (this.config.onSuccess) {
        this.config.onSuccess(this.uploadedImages);
      }

    } catch (error) {
      console.error('アップロードエラー:', error);
      this.showError(`アップロードに失敗しました: ${error.message}`);
      
      if (this.config.onError) {
        this.config.onError(error);
      }
    } finally {
      this.uploading = false;
      this.hideProgressArea();
    }
  }

  /**
   * 単一ファイルアップロード
   * @param {File} file - アップロードするファイル
   */
  async uploadSingle(file) {
    const formData = new FormData();
    formData.append('image', file);

    const progressItem = this.createProgressItem(file);
    this.progressList.appendChild(progressItem);

    try {
      const response = await this.uploadWithProgress(
        this.config.singleUploadUrl,
        formData,
        (progress) => this.updateProgress(progressItem, progress)
      );

      const result = await response.json();
      if (result.success) {
        this.uploadedImages.push(result.data);
        this.completeProgress(progressItem);
      } else {
        throw new Error(result.error?.message || 'アップロードに失敗しました');
      }
    } catch (error) {
      this.errorProgress(progressItem, error.message);
      throw error;
    }
  }

  /**
   * 複数ファイルアップロード
   * @param {File[]} files - アップロードするファイル配列
   */
  async uploadMultiple(files) {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('images', file);
    });

    const progressItem = this.createProgressItem({ name: `${files.length}ファイル` });
    this.progressList.appendChild(progressItem);

    try {
      const response = await this.uploadWithProgress(
        this.config.uploadUrl,
        formData,
        (progress) => this.updateProgress(progressItem, progress)
      );

      const result = await response.json();
      if (result.success && result.data) {
        this.uploadedImages.push(...result.data);
        this.completeProgress(progressItem);
      } else {
        throw new Error(result.error?.message || 'アップロードに失敗しました');
      }
    } catch (error) {
      this.errorProgress(progressItem, error.message);
      throw error;
    }
  }

  /**
   * 進捗付きアップロード
   * @param {string} url - アップロードURL
   * @param {FormData} formData - フォームデータ
   * @param {Function} onProgress - 進捗コールバック
   * @returns {Promise<Response>} レスポンス
   */
  uploadWithProgress(url, formData, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // 進捗イベント
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          onProgress(progress);
          
          if (this.config.onProgress) {
            this.config.onProgress(progress);
          }
        }
      });

      // 完了イベント
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({
            json: () => Promise.resolve(JSON.parse(xhr.responseText))
          });
        } else {
          reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
        }
      });

      // エラーイベント
      xhr.addEventListener('error', () => {
        reject(new Error('ネットワークエラーが発生しました'));
      });

      // 認証トークンを取得して設定
      const token = this.getAuthToken();
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      xhr.open('POST', url);
      xhr.send(formData);
    });
  }

  /**
   * 認証トークンを取得
   * @returns {string|null} トークン
   */
  getAuthToken() {
    // sessionStorageから取得
    let token = sessionStorage.getItem('authToken');
    if (token) return token;

    // localStorageから取得
    token = localStorage.getItem('authToken');
    if (token) return token;

    // Cookieから取得（jwt等）
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'token' || name === 'jwt' || name === 'authToken') {
        return value;
      }
    }

    return null;
  }

  /**
   * 画像圧縮
   * @param {File[]} files - 圧縮するファイル配列
   * @returns {Promise<File[]>} 圧縮済みファイル配列
   */
  async compressImages(files) {
    const compressedFiles = [];
    
    for (const file of files) {
      try {
        const compressedFile = await this.compressImage(file);
        compressedFiles.push(compressedFile);
      } catch (error) {
        console.warn(`画像圧縮失敗 (${file.name}):`, error);
        compressedFiles.push(file); // 圧縮失敗時は元ファイルを使用
      }
    }
    
    return compressedFiles;
  }

  /**
   * 単一画像圧縮
   * @param {File} file - 圧縮するファイル
   * @returns {Promise<File>} 圧縮済みファイル
   */
  compressImage(file) {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // 最大サイズを設定（例: 1920x1080）
        const maxWidth = 1920;
        const maxHeight = 1080;
        
        let { width, height } = img;
        
        // アスペクト比を保持してリサイズ
        if (width > height) {
          if (width > maxWidth) {
            height = height * (maxWidth / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = width * (maxHeight / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // 画像を描画
        ctx.drawImage(img, 0, 0, width, height);

        // WebPまたはJPEGで出力
        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/webp',
              lastModified: Date.now()
            });
            resolve(compressedFile);
          } else {
            reject(new Error('画像圧縮に失敗しました'));
          }
        }, 'image/webp', this.config.compressionQuality);
      };

      img.onerror = () => {
        reject(new Error('画像の読み込みに失敗しました'));
      };

      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * 進捗アイテムを作成
   * @param {File|Object} file - ファイルまたはファイル情報
   * @returns {HTMLElement} 進捗要素
   */
  createProgressItem(file) {
    const progressItem = document.createElement('div');
    progressItem.className = 'progress-item';

    progressItem.innerHTML = `
      <div class="progress-header">
        <div class="progress-filename">${file.name}</div>
        <div class="progress-percentage">0%</div>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: 0%"></div>
      </div>
    `;

    return progressItem;
  }

  /**
   * 進捗を更新
   * @param {HTMLElement} progressItem - 進捗要素
   * @param {number} progress - 進捗率（0-100）
   */
  updateProgress(progressItem, progress) {
    const percentage = progressItem.querySelector('.progress-percentage');
    const fill = progressItem.querySelector('.progress-fill');

    if (percentage) percentage.textContent = `${progress}%`;
    if (fill) fill.style.width = `${progress}%`;
  }

  /**
   * 進捗完了
   * @param {HTMLElement} progressItem - 進捗要素
   */
  completeProgress(progressItem) {
    this.updateProgress(progressItem, 100);
    progressItem.classList.add('completed');
    
    setTimeout(() => {
      progressItem.style.opacity = '0.5';
    }, 1000);
  }

  /**
   * 進捗エラー
   * @param {HTMLElement} progressItem - 進捗要素
   * @param {string} errorMessage - エラーメッセージ
   */
  errorProgress(progressItem, errorMessage) {
    const percentage = progressItem.querySelector('.progress-percentage');
    const fill = progressItem.querySelector('.progress-fill');

    if (percentage) percentage.textContent = 'エラー';
    if (fill) {
      fill.style.background = '#ff4444';
      fill.style.width = '100%';
    }

    progressItem.classList.add('error');
    progressItem.title = errorMessage;
  }

  /**
   * エラーを表示
   * @param {string} message - エラーメッセージ
   */
  showError(message) {
    if (this.errorMessage) {
      this.errorMessage.textContent = message;
    }
    if (this.errorArea) {
      this.errorArea.style.display = 'block';
    }
  }

  /**
   * エラーを非表示
   */
  hideError() {
    if (this.errorArea) {
      this.errorArea.style.display = 'none';
    }
  }

  /**
   * プレビューエリアを表示
   */
  showPreviewArea() {
    if (this.previewArea) {
      this.previewArea.style.display = 'block';
    }
  }

  /**
   * プレビューエリアを非表示
   */
  hidePreviewArea() {
    if (this.previewArea) {
      this.previewArea.style.display = 'none';
    }
  }

  /**
   * 進捗エリアを表示
   */
  showProgressArea() {
    if (this.progressArea) {
      this.progressArea.style.display = 'block';
    }
    if (this.progressList) {
      this.progressList.innerHTML = '';
    }
  }

  /**
   * 進捗エリアを非表示
   */
  hideProgressArea() {
    if (this.progressArea) {
      this.progressArea.style.display = 'none';
    }
  }

  /**
   * ファイルをクリア
   */
  clearFiles() {
    this.files = [];
    if (this.previewGrid) {
      this.previewGrid.innerHTML = '';
    }
    if (this.fileInput) {
      this.fileInput.value = '';
    }
  }

  /**
   * アップローダーをリセット
   */
  reset() {
    this.clearFiles();
    this.hidePreviewArea();
    this.hideProgressArea();
    this.hideError();
    this.uploading = false;
    this.uploadedImages = [];
  }

  /**
   * アップローダーを破棄
   */
  destroy() {
    // イベントリスナーを削除
    if (this.uploadArea) {
      this.uploadArea.removeEventListener('drop', this.handleDrop);
      this.uploadArea.removeEventListener('dragover', this.handleDragOver);
      this.uploadArea.removeEventListener('dragenter', this.handleDragEnter);
      this.uploadArea.removeEventListener('dragleave', this.handleDragLeave);
      this.uploadArea.removeEventListener('click', this.handleAreaClick);
    }

    if (this.fileInput) {
      this.fileInput.removeEventListener('change', this.handleFileSelect);
    }

    // 状態をリセット
    this.reset();
  }
}

// AMD/CommonJS/グローバル対応
if (typeof define === 'function' && define.amd) {
  define([], function() { return ImageUploader; });
} else if (typeof module !== 'undefined' && module.exports) {
  module.exports = ImageUploader;
} else {
  window.ImageUploader = ImageUploader;
}