/**
 * 求人一覧表示とフィルタリング機能
 * デザイナー求人データの動的表示
 */

class JobListings {
  constructor() {
    this.apiBaseUrl = '/api/designer-jobs';
    this.currentPage = 1;
    this.itemsPerPage = 20;
    this.totalPages = 1;
    this.currentFilters = {
      experience: 'all',
      jobType: 'all',
      location: '',
      isRemoteOk: false,
      sortBy: 'createdAt',
      sortOrder: 'DESC'
    };
    this.isLoading = false;
    this.hasMoreResults = true;

    // DOM要素の参照
    this.jobsContainer = null;
    this.paginationContainer = null;
    this.filterForm = null;
    this.searchInput = null;
    this.loadingIndicator = null;
    this.resultsCount = null;

    this.init();
  }

  /**
   * 初期化
   */
  async init() {
    this.initializeDOM();
    this.bindEvents();
    await this.loadJobs();
  }

  /**
   * DOM要素の初期化
   */
  initializeDOM() {
    // 求人一覧コンテナ
    this.jobsContainer = document.getElementById('jobsContainer') || this.createJobsContainer();
    
    // フィルターフォーム
    this.filterForm = document.getElementById('filterForm');
    this.searchInput = document.getElementById('searchInput');
    
    // ローディングインジケーター
    this.loadingIndicator = document.getElementById('loadingIndicator') || this.createLoadingIndicator();
    
    // 結果件数表示
    this.resultsCount = document.getElementById('resultsCount') || this.createResultsCount();
    
    // ページネーション
    this.paginationContainer = document.getElementById('paginationContainer') || this.createPaginationContainer();
  }

  /**
   * 求人一覧コンテナの作成
   */
  createJobsContainer() {
    const container = document.createElement('div');
    container.id = 'jobsContainer';
    container.className = 'jobs-grid';
    
    // 既存の静的求人リストを置き換え
    const existingJobsList = document.querySelector('.job-list, .jobs-container, .job-cards');
    if (existingJobsList) {
      existingJobsList.parentNode.replaceChild(container, existingJobsList);
    } else {
      // フィルターセクションの後に挿入
      const filterSection = document.querySelector('.filters-section, .search-section');
      if (filterSection) {
        filterSection.parentNode.insertBefore(container, filterSection.nextSibling);
      } else {
        document.body.appendChild(container);
      }
    }
    
    return container;
  }

  /**
   * ローディングインジケーターの作成
   */
  createLoadingIndicator() {
    const loading = document.createElement('div');
    loading.id = 'loadingIndicator';
    loading.className = 'loading-indicator';
    loading.innerHTML = `
      <div class="loading-spinner"></div>
      <span>求人を読み込み中...</span>
    `;
    loading.style.display = 'none';
    this.jobsContainer.parentNode.insertBefore(loading, this.jobsContainer);
    return loading;
  }

  /**
   * 結果件数表示の作成
   */
  createResultsCount() {
    const resultsCount = document.createElement('div');
    resultsCount.id = 'resultsCount';
    resultsCount.className = 'results-count';
    this.jobsContainer.parentNode.insertBefore(resultsCount, this.jobsContainer);
    return resultsCount;
  }

  /**
   * ページネーションコンテナの作成
   */
  createPaginationContainer() {
    const pagination = document.createElement('div');
    pagination.id = 'paginationContainer';
    pagination.className = 'pagination-container';
    this.jobsContainer.parentNode.insertBefore(pagination, this.jobsContainer.nextSibling);
    return pagination;
  }

  /**
   * イベントバインディング
   */
  bindEvents() {
    // フィルターフォームの変更
    if (this.filterForm) {
      this.filterForm.addEventListener('change', this.handleFilterChange.bind(this));
    }

    // 検索入力
    if (this.searchInput) {
      let debounceTimer;
      this.searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          this.currentFilters.search = e.target.value;
          this.resetPage();
          this.loadJobs();
        }, 500);
      });
    }

    // 経験レベルフィルター
    const experienceFilters = document.querySelectorAll('input[name="experience"]');
    experienceFilters.forEach(input => {
      input.addEventListener('change', () => {
        this.currentFilters.experience = input.value;
        this.resetPage();
        this.loadJobs();
      });
    });

    // 雇用形態フィルター
    const jobTypeFilters = document.querySelectorAll('input[name="jobType"]');
    jobTypeFilters.forEach(input => {
      input.addEventListener('change', () => {
        if (input.checked) {
          this.currentFilters.jobType = input.value;
        }
        this.resetPage();
        this.loadJobs();
      });
    });

    // リモートワークフィルター
    const remoteFilter = document.getElementById('isRemoteOk');
    if (remoteFilter) {
      remoteFilter.addEventListener('change', () => {
        this.currentFilters.isRemoteOk = remoteFilter.checked;
        this.resetPage();
        this.loadJobs();
      });
    }

    // ソート変更
    const sortSelect = document.getElementById('sortBy');
    if (sortSelect) {
      sortSelect.addEventListener('change', () => {
        this.currentFilters.sortBy = sortSelect.value;
        this.resetPage();
        this.loadJobs();
      });
    }
  }

  /**
   * フィルター変更処理
   */
  handleFilterChange(event) {
    const target = event.target;
    const name = target.name;
    const value = target.type === 'checkbox' ? target.checked : target.value;

    this.currentFilters[name] = value;
    this.resetPage();
    this.loadJobs();
  }

  /**
   * ページリセット
   */
  resetPage() {
    this.currentPage = 1;
  }

  /**
   * 求人データの取得
   */
  async loadJobs() {
    if (this.isLoading) return;

    this.isLoading = true;
    this.showLoading();

    try {
      const params = new URLSearchParams({
        page: this.currentPage,
        limit: this.itemsPerPage,
        ...this.currentFilters
      });

      const response = await fetch(`${this.apiBaseUrl}?${params}`);
      
      if (!response.ok) {
        throw new Error(`求人取得エラー: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        this.displayJobs(data.data.jobs);
        this.updatePagination(data.data.pagination);
        this.updateResultsCount(data.data.pagination.totalJobs);
        this.updateURL();
      } else {
        throw new Error(data.error || '求人データの取得に失敗しました');
      }

    } catch (error) {
      console.error('求人取得エラー:', error);
      this.showError(error.message);
    } finally {
      this.isLoading = false;
      this.hideLoading();
    }
  }

  /**
   * 求人一覧の表示
   */
  displayJobs(jobs) {
    if (!jobs || jobs.length === 0) {
      this.showNoResults();
      return;
    }

    const jobsHTML = jobs.map(job => this.createJobCard(job)).join('');
    this.jobsContainer.innerHTML = jobsHTML;

    // 求人カードクリックイベント
    this.bindJobCardEvents();
  }

  /**
   * 求人カードの作成
   */
  createJobCard(job) {
    const salaryText = this.formatSalary(job);
    const experienceText = this.formatExperience(job);
    const tagsHTML = this.formatTags(job);
    const benefitsHTML = this.formatBenefits(job);

    return `
      <div class="job-card" data-job-id="${job.id}">
        <div class="job-header">
          <div class="company-info">
            ${job.jobSite?.logoUrl ? `<img src="${job.jobSite.logoUrl}" alt="${job.company}" class="company-logo">` : ''}
            <div>
              <h3 class="job-title">${this.escapeHtml(job.title)}</h3>
              <p class="company-name">${this.escapeHtml(job.company)}</p>
            </div>
          </div>
          ${job.isFeatured ? '<span class="featured-badge">おすすめ</span>' : ''}
        </div>

        <div class="job-meta">
          <span class="job-type">${this.getJobTypeLabel(job.jobType)}</span>
          <span class="experience-level">${experienceText}</span>
          ${job.location ? `<span class="location"><i class="fas fa-map-marker-alt"></i> ${this.escapeHtml(job.location)}</span>` : ''}
          ${job.isRemoteOk ? '<span class="remote-ok"><i class="fas fa-home"></i> リモートOK</span>' : ''}
        </div>

        ${job.description ? `<p class="job-description">${this.escapeHtml(job.description.substring(0, 150))}${job.description.length > 150 ? '...' : ''}</p>` : ''}

        ${salaryText ? `<div class="salary-info"><i class="fas fa-yen-sign"></i> ${salaryText}</div>` : ''}

        ${tagsHTML ? `<div class="job-tags">${tagsHTML}</div>` : ''}

        ${benefitsHTML ? `<div class="job-benefits">${benefitsHTML}</div>` : ''}

        <div class="job-footer">
          <span class="posted-date">
            <i class="fas fa-clock"></i>
            ${this.formatDate(job.postedAt || job.createdAt)}
          </span>
          <div class="job-actions">
            <button class="btn btn-outline view-details" data-job-id="${job.id}">
              詳細を見る
            </button>
            <button class="btn btn-primary apply-job" data-job-id="${job.id}" data-url="${job.originalUrl}">
              応募する
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 給与情報のフォーマット
   */
  formatSalary(job) {
    if (!job.salaryMin && !job.salaryMax) return '';

    const typeLabel = {
      'hourly': '時給',
      'monthly': '月給',
      'annual': '年収',
      'project_based': 'プロジェクト'
    }[job.salaryType] || '月給';

    if (job.salaryMin && job.salaryMax) {
      return `${typeLabel} ${job.salaryMin}〜${job.salaryMax}万円`;
    } else if (job.salaryMin) {
      return `${typeLabel} ${job.salaryMin}万円〜`;
    } else if (job.salaryMax) {
      return `${typeLabel} 〜${job.salaryMax}万円`;
    }
    return '';
  }

  /**
   * 経験レベルのフォーマット
   */
  formatExperience(job) {
    const labels = [];
    if (job.isExperienceWelcome) labels.push('未経験歓迎');
    if (job.isNewGraduateWelcome) labels.push('新卒歓迎');
    
    if (labels.length > 0) return labels.join('・');

    const levelLabels = {
      'entry_level': '初級者',
      'mid_level': '中級者',
      'senior_level': '上級者',
      'executive': '管理職'
    };
    
    return levelLabels[job.experienceLevel] || '';
  }

  /**
   * 雇用形態ラベルの取得
   */
  getJobTypeLabel(jobType) {
    const labels = {
      'full_time': '正社員',
      'part_time': 'パート・アルバイト',
      'contract': '契約社員',
      'freelance': 'フリーランス',
      'internship': 'インターン'
    };
    return labels[jobType] || jobType;
  }

  /**
   * タグのフォーマット
   */
  formatTags(job) {
    const tags = [];
    
    if (job.designCategories) {
      tags.push(...job.designCategories);
    }
    
    if (job.skills) {
      tags.push(...job.skills.slice(0, 3)); // 最初の3つのスキルのみ
    }

    if (job.tags) {
      tags.push(...job.tags);
    }

    return tags.slice(0, 5).map(tag => 
      `<span class="tag">${this.escapeHtml(tag)}</span>`
    ).join('');
  }

  /**
   * 福利厚生のフォーマット
   */
  formatBenefits(job) {
    if (!job.benefits || job.benefits.length === 0) return '';
    
    return job.benefits.slice(0, 3).map(benefit => 
      `<span class="benefit">${this.escapeHtml(benefit)}</span>`
    ).join('');
  }

  /**
   * 日付のフォーマット
   */
  formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return '今日';
    } else if (diffDays === 1) {
      return '昨日';
    } else if (diffDays < 7) {
      return `${diffDays}日前`;
    } else if (diffDays < 30) {
      return `${Math.floor(diffDays / 7)}週間前`;
    } else {
      return date.toLocaleDateString('ja-JP');
    }
  }

  /**
   * 求人カードイベントのバインディング
   */
  bindJobCardEvents() {
    // 詳細表示ボタン
    const detailButtons = this.jobsContainer.querySelectorAll('.view-details');
    detailButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        const jobId = button.dataset.jobId;
        this.showJobDetail(jobId);
      });
    });

    // 応募ボタン
    const applyButtons = this.jobsContainer.querySelectorAll('.apply-job');
    applyButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        const jobId = button.dataset.jobId;
        const url = button.dataset.url;
        this.handleApplyClick(jobId, url);
      });
    });

    // 求人カード全体クリック
    const jobCards = this.jobsContainer.querySelectorAll('.job-card');
    jobCards.forEach(card => {
      card.addEventListener('click', () => {
        const jobId = card.dataset.jobId;
        this.showJobDetail(jobId);
      });
    });
  }

  /**
   * 求人詳細表示
   */
  async showJobDetail(jobId) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/${jobId}`);
      
      if (!response.ok) {
        throw new Error(`求人詳細取得エラー: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        // 求人詳細ページに遷移、またはモーダル表示
        this.displayJobDetailModal(data.data);
      } else {
        throw new Error(data.error || '求人詳細の取得に失敗しました');
      }

    } catch (error) {
      console.error('求人詳細取得エラー:', error);
      alert('求人詳細の取得に失敗しました');
    }
  }

  /**
   * 求人詳細モーダルの表示
   */
  displayJobDetailModal(job) {
    // 既存のモーダルを削除
    const existingModal = document.getElementById('jobDetailModal');
    if (existingModal) {
      existingModal.remove();
    }

    // モーダル作成
    const modal = this.createJobDetailModal(job);
    document.body.appendChild(modal);

    // モーダル表示
    setTimeout(() => {
      modal.classList.add('show');
    }, 10);

    // 閉じるイベント
    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.classList.contains('close-modal')) {
        this.closeJobDetailModal(modal);
      }
    });

    // ESCキーで閉じる
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        this.closeJobDetailModal(modal);
        document.removeEventListener('keydown', handleEsc);
      }
    };
    document.addEventListener('keydown', handleEsc);
  }

  /**
   * 求人詳細モーダルの作成
   */
  createJobDetailModal(job) {
    const modal = document.createElement('div');
    modal.id = 'jobDetailModal';
    modal.className = 'job-detail-modal';
    
    const salaryText = this.formatSalary(job);
    const experienceText = this.formatExperience(job);
    const skillsHTML = job.skills ? job.skills.map(skill => `<span class="skill-tag">${this.escapeHtml(skill)}</span>`).join('') : '';
    const toolsHTML = job.tools ? job.tools.map(tool => `<span class="tool-tag">${this.escapeHtml(tool)}</span>`).join('') : '';
    const benefitsHTML = job.benefits ? job.benefits.map(benefit => `<li>${this.escapeHtml(benefit)}</li>`).join('') : '';

    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>${this.escapeHtml(job.title)}</h2>
          <button class="close-modal">&times;</button>
        </div>
        
        <div class="modal-body">
          <div class="company-section">
            <h3>${this.escapeHtml(job.company)}</h3>
            ${job.jobSite ? `<p class="job-site">via ${this.escapeHtml(job.jobSite.name)}</p>` : ''}
          </div>

          <div class="job-details">
            <div class="detail-item">
              <strong>雇用形態:</strong> ${this.getJobTypeLabel(job.jobType)}
            </div>
            <div class="detail-item">
              <strong>経験レベル:</strong> ${experienceText}
            </div>
            ${job.location ? `<div class="detail-item"><strong>勤務地:</strong> ${this.escapeHtml(job.location)}</div>` : ''}
            ${job.isRemoteOk ? '<div class="detail-item"><strong>リモートワーク:</strong> 可能</div>' : ''}
            ${salaryText ? `<div class="detail-item"><strong>給与:</strong> ${salaryText}</div>` : ''}
          </div>

          ${job.description ? `
            <div class="description-section">
              <h4>求人詳細</h4>
              <p>${this.escapeHtml(job.description).replace(/\\n/g, '<br>')}</p>
            </div>
          ` : ''}

          ${skillsHTML ? `
            <div class="skills-section">
              <h4>必要スキル</h4>
              <div class="skills-list">${skillsHTML}</div>
            </div>
          ` : ''}

          ${toolsHTML ? `
            <div class="tools-section">
              <h4>使用ツール</h4>
              <div class="tools-list">${toolsHTML}</div>
            </div>
          ` : ''}

          ${benefitsHTML ? `
            <div class="benefits-section">
              <h4>福利厚生</h4>
              <ul class="benefits-list">${benefitsHTML}</ul>
            </div>
          ` : ''}
        </div>

        <div class="modal-footer">
          <button class="btn btn-outline close-modal">閉じる</button>
          <button class="btn btn-primary apply-modal" data-job-id="${job.id}" data-url="${job.originalUrl}">
            この求人に応募する
          </button>
        </div>
      </div>
    `;

    // 応募ボタンイベント
    const applyButton = modal.querySelector('.apply-modal');
    applyButton.addEventListener('click', () => {
      this.handleApplyClick(job.id, job.originalUrl);
    });

    return modal;
  }

  /**
   * モーダルを閉じる
   */
  closeJobDetailModal(modal) {
    modal.classList.remove('show');
    setTimeout(() => {
      modal.remove();
    }, 300);
  }

  /**
   * 応募ボタンクリック処理
   */
  async handleApplyClick(jobId, originalUrl) {
    try {
      // クリック数増加のAPI呼び出し
      await fetch(`${this.apiBaseUrl}/${jobId}/click`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // 外部サイトを開く
      window.open(originalUrl, '_blank');

    } catch (error) {
      console.error('クリック追跡エラー:', error);
      // エラーが起きても外部サイトは開く
      window.open(originalUrl, '_blank');
    }
  }

  /**
   * ページネーションの更新
   */
  updatePagination(pagination) {
    if (!pagination || pagination.totalPages <= 1) {
      this.paginationContainer.innerHTML = '';
      return;
    }

    this.totalPages = pagination.totalPages;
    this.currentPage = pagination.currentPage;

    let paginationHTML = '<div class="pagination">';

    // 前のページ
    if (pagination.hasPrev) {
      paginationHTML += `<button class="page-btn prev-btn" data-page="${this.currentPage - 1}">← 前へ</button>`;
    }

    // ページ番号
    const startPage = Math.max(1, this.currentPage - 2);
    const endPage = Math.min(this.totalPages, this.currentPage + 2);

    if (startPage > 1) {
      paginationHTML += `<button class="page-btn" data-page="1">1</button>`;
      if (startPage > 2) {
        paginationHTML += '<span class="pagination-dots">...</span>';
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      const activeClass = i === this.currentPage ? 'active' : '';
      paginationHTML += `<button class="page-btn ${activeClass}" data-page="${i}">${i}</button>`;
    }

    if (endPage < this.totalPages) {
      if (endPage < this.totalPages - 1) {
        paginationHTML += '<span class="pagination-dots">...</span>';
      }
      paginationHTML += `<button class="page-btn" data-page="${this.totalPages}">${this.totalPages}</button>`;
    }

    // 次のページ
    if (pagination.hasNext) {
      paginationHTML += `<button class="page-btn next-btn" data-page="${this.currentPage + 1}">次へ →</button>`;
    }

    paginationHTML += '</div>';
    this.paginationContainer.innerHTML = paginationHTML;

    // ページネーションイベント
    this.bindPaginationEvents();
  }

  /**
   * ページネーションイベントのバインディング
   */
  bindPaginationEvents() {
    const pageButtons = this.paginationContainer.querySelectorAll('.page-btn');
    pageButtons.forEach(button => {
      button.addEventListener('click', () => {
        const page = parseInt(button.dataset.page);
        if (page !== this.currentPage) {
          this.currentPage = page;
          this.loadJobs();
          this.scrollToTop();
        }
      });
    });
  }

  /**
   * 結果件数の更新
   */
  updateResultsCount(totalJobs) {
    if (this.resultsCount) {
      this.resultsCount.textContent = `${totalJobs}件の求人が見つかりました`;
    }
  }

  /**
   * URLの更新
   */
  updateURL() {
    const params = new URLSearchParams();
    
    if (this.currentPage > 1) {
      params.set('page', this.currentPage);
    }
    
    Object.entries(this.currentFilters).forEach(([key, value]) => {
      if (value && value !== 'all' && value !== '') {
        params.set(key, value);
      }
    });

    const newUrl = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
    window.history.replaceState({}, '', newUrl);
  }

  /**
   * ページトップにスクロール
   */
  scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  /**
   * ローディング表示
   */
  showLoading() {
    if (this.loadingIndicator) {
      this.loadingIndicator.style.display = 'flex';
    }
  }

  /**
   * ローディング非表示
   */
  hideLoading() {
    if (this.loadingIndicator) {
      this.loadingIndicator.style.display = 'none';
    }
  }

  /**
   * 結果なし表示
   */
  showNoResults() {
    this.jobsContainer.innerHTML = `
      <div class="no-results">
        <i class="fas fa-search"></i>
        <h3>該当する求人が見つかりませんでした</h3>
        <p>検索条件を変更して再度お試しください</p>
      </div>
    `;
  }

  /**
   * エラー表示
   */
  showError(message) {
    this.jobsContainer.innerHTML = `
      <div class="error-message">
        <i class="fas fa-exclamation-triangle"></i>
        <h3>エラーが発生しました</h3>
        <p>${this.escapeHtml(message)}</p>
        <button class="btn btn-primary retry-btn">再試行</button>
      </div>
    `;

    // 再試行ボタン
    const retryButton = this.jobsContainer.querySelector('.retry-btn');
    retryButton.addEventListener('click', () => {
      this.loadJobs();
    });
  }

  /**
   * HTMLエスケープ
   */
  escapeHtml(text) {
    if (typeof text !== 'string') return text;
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * フィルターリセット
   */
  resetFilters() {
    this.currentFilters = {
      experience: 'all',
      jobType: 'all',
      location: '',
      isRemoteOk: false,
      sortBy: 'createdAt',
      sortOrder: 'DESC'
    };
    
    // フォームリセット
    if (this.filterForm) {
      this.filterForm.reset();
    }
    
    if (this.searchInput) {
      this.searchInput.value = '';
    }

    this.resetPage();
    this.loadJobs();
  }

  /**
   * 破棄
   */
  destroy() {
    // イベントリスナーなどのクリーンアップ
    if (this.jobsContainer) {
      this.jobsContainer.innerHTML = '';
    }
  }
}

// CSSスタイルの追加
const jobListingsCSS = `
<style>
.jobs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
  margin: 2rem 0;
}

.job-card {
  background: var(--surface-color, #ffffff);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 12px;
  padding: 1.5rem;
  transition: all 0.3s ease;
  cursor: pointer;
}

.job-card:hover {
  border-color: var(--primary-color, #2563eb);
  box-shadow: 0 10px 25px rgba(37, 99, 235, 0.1);
  transform: translateY(-2px);
}

.job-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.company-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.company-logo {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  object-fit: cover;
}

.job-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary, #0f172a);
  margin-bottom: 0.25rem;
  line-height: 1.3;
}

.company-name {
  color: var(--text-secondary, #64748b);
  font-size: 0.9rem;
}

.featured-badge {
  background: var(--accent-color, #f59e0b);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
}

.job-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.job-meta span {
  background: var(--background-color, #f8fafc);
  color: var(--text-secondary, #64748b);
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.job-description {
  color: var(--text-secondary, #64748b);
  font-size: 0.9rem;
  line-height: 1.5;
  margin-bottom: 1rem;
}

.salary-info {
  background: linear-gradient(135deg, var(--success-color, #10b981) 0%, #059669 100%);
  color: white;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.job-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-bottom: 1rem;
}

.tag {
  background: var(--primary-color, #2563eb);
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 500;
}

.job-benefits {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-bottom: 1rem;
}

.benefit {
  background: var(--background-color, #f8fafc);
  border: 1px solid var(--border-color, #e2e8f0);
  color: var(--text-secondary, #64748b);
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.7rem;
}

.job-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color, #e2e8f0);
}

.posted-date {
  color: var(--text-secondary, #64748b);
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.job-actions {
  display: flex;
  gap: 0.5rem;
}

.btn {
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
}

.btn-outline {
  background: transparent;
  border: 1px solid var(--border-color, #e2e8f0);
  color: var(--text-primary, #0f172a);
}

.btn-outline:hover {
  border-color: var(--primary-color, #2563eb);
  color: var(--primary-color, #2563eb);
}

.btn-primary {
  background: var(--primary-color, #2563eb);
  color: white;
}

.btn-primary:hover {
  background: #1d4ed8;
  transform: translateY(-1px);
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
  margin: 2rem 0;
}

.page-btn {
  background: var(--surface-color, #ffffff);
  border: 1px solid var(--border-color, #e2e8f0);
  color: var(--text-primary, #0f172a);
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.875rem;
}

.page-btn:hover {
  border-color: var(--primary-color, #2563eb);
  color: var(--primary-color, #2563eb);
}

.page-btn.active {
  background: var(--primary-color, #2563eb);
  border-color: var(--primary-color, #2563eb);
  color: white;
}

.pagination-dots {
  color: var(--text-secondary, #64748b);
  padding: 0 0.5rem;
}

.loading-indicator {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.75rem;
  padding: 2rem;
  color: var(--text-secondary, #64748b);
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--border-color, #e2e8f0);
  border-top: 2px solid var(--primary-color, #2563eb);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.no-results,
.error-message {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--text-secondary, #64748b);
  grid-column: 1 / -1;
}

.no-results i,
.error-message i {
  font-size: 3rem;
  color: var(--primary-color, #2563eb);
  margin-bottom: 1rem;
}

.no-results h3,
.error-message h3 {
  color: var(--text-primary, #0f172a);
  font-size: 1.25rem;
  margin-bottom: 0.5rem;
}

/* 求人詳細モーダル */
.job-detail-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000;
  opacity: 0;
  transition: opacity 0.3s ease;
  padding: 1rem;
}

.job-detail-modal.show {
  opacity: 1;
}

.modal-content {
  background: var(--surface-color, #ffffff);
  border-radius: 12px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-color, #e2e8f0);
}

.modal-header h2 {
  color: var(--text-primary, #0f172a);
  font-size: 1.5rem;
  margin: 0;
}

.close-modal {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--text-secondary, #64748b);
  padding: 0.25rem;
}

.close-modal:hover {
  color: var(--text-primary, #0f172a);
}

.modal-body {
  padding: 1.5rem;
}

.company-section {
  margin-bottom: 1.5rem;
}

.company-section h3 {
  color: var(--text-primary, #0f172a);
  margin-bottom: 0.25rem;
}

.job-site {
  color: var(--text-secondary, #64748b);
  font-size: 0.9rem;
}

.job-details {
  background: var(--background-color, #f8fafc);
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.detail-item {
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
}

.detail-item strong {
  color: var(--text-primary, #0f172a);
}

.description-section,
.skills-section,
.tools-section,
.benefits-section {
  margin-bottom: 1.5rem;
}

.description-section h4,
.skills-section h4,
.tools-section h4,
.benefits-section h4 {
  color: var(--text-primary, #0f172a);
  margin-bottom: 0.75rem;
  font-size: 1.1rem;
}

.skills-list,
.tools-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.skill-tag,
.tool-tag {
  background: var(--primary-color, #2563eb);
  color: white;
  padding: 0.375rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 500;
}

.benefits-list {
  margin: 0;
  padding-left: 1.25rem;
}

.benefits-list li {
  margin-bottom: 0.5rem;
  color: var(--text-secondary, #64748b);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1.5rem;
  border-top: 1px solid var(--border-color, #e2e8f0);
}

.results-count {
  color: var(--text-primary, #0f172a);
  font-weight: 600;
  margin-bottom: 1rem;
  text-align: center;
}

/* レスポンシブデザイン */
@media (max-width: 768px) {
  .jobs-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .job-footer {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }
  
  .job-actions {
    justify-content: stretch;
  }
  
  .job-actions .btn {
    flex: 1;
    justify-content: center;
  }
  
  .pagination {
    flex-wrap: wrap;
  }
  
  .modal-content {
    margin: 0;
    border-radius: 0;
    max-height: 100vh;
  }
  
  .modal-footer {
    flex-direction: column;
  }
  
  .modal-footer .btn {
    width: 100%;
    justify-content: center;
  }
}
</style>
`;

// CSSを動的に追加
if (typeof document !== 'undefined') {
  document.head.insertAdjacentHTML('beforeend', jobListingsCSS);
}

// グローバル変数として公開
window.JobListings = JobListings;

// DOM読み込み完了後の初期化
document.addEventListener('DOMContentLoaded', () => {
  // designer-jobs.htmlページでのみ初期化
  if (window.location.pathname.includes('designer-jobs') || document.body.classList.contains('designer-jobs-page')) {
    window.jobListings = new JobListings();
  }
});