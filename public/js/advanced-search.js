/**
 * 高度な検索・フィルタリング機能
 * 
 * 機能:
 * - リアルタイム検索（debounce付き）
 * - 複数条件でのフィルタリング
 * - 検索履歴の保存
 * - URLクエリパラメータによる状態永続化
 * - 無限スクロール対応
 */

class AdvancedSearch {
  constructor(config) {
    this.config = {
      searchDelay: 300,
      historyLimit: 10,
      resultsPerPage: 20,
      ...config
    };
    
    this.searchTimeout = null;
    this.currentPage = 1;
    this.isLoading = false;
    this.hasMore = true;
    this.currentFilters = {};
    this.searchHistory = this.loadSearchHistory();
    
    this.init();
  }

  init() {
    this.setupDOM();
    this.bindEvents();
    this.loadFromURL();
    this.setupInfiniteScroll();
  }

  setupDOM() {
    // 検索バー
    this.searchInput = document.getElementById('searchInput');
    this.searchButton = document.getElementById('searchButton');
    this.clearButton = document.getElementById('clearSearch');
    
    // フィルターパネル
    this.filterPanel = document.getElementById('filterPanel');
    this.filterToggle = document.getElementById('filterToggle');
    this.activeFiltersCount = document.getElementById('activeFiltersCount');
    
    // 検索履歴
    this.historyDropdown = document.getElementById('searchHistory');
    
    // 結果表示
    this.resultsContainer = document.getElementById('searchResults');
    this.resultsCount = document.getElementById('resultsCount');
    this.loadingIndicator = document.getElementById('loadingIndicator');
    this.noResultsMessage = document.getElementById('noResults');
    
    // ソート
    this.sortSelect = document.getElementById('sortBy');
  }

  bindEvents() {
    // 検索入力
    if (this.searchInput) {
      this.searchInput.addEventListener('input', (e) => this.handleSearchInput(e));
      this.searchInput.addEventListener('focus', () => this.showSearchHistory());
      this.searchInput.addEventListener('blur', () => {
        setTimeout(() => this.hideSearchHistory(), 200);
      });
    }

    // 検索ボタン
    if (this.searchButton) {
      this.searchButton.addEventListener('click', () => this.performSearch());
    }

    // クリアボタン
    if (this.clearButton) {
      this.clearButton.addEventListener('click', () => this.clearSearch());
    }

    // フィルターパネルトグル
    if (this.filterToggle) {
      this.filterToggle.addEventListener('click', () => this.toggleFilterPanel());
    }

    // フィルター変更
    this.setupFilterListeners();

    // ソート変更
    if (this.sortSelect) {
      this.sortSelect.addEventListener('change', () => this.performSearch());
    }

    // Enter キーで検索
    if (this.searchInput) {
      this.searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.performSearch();
        }
      });
    }
  }

  setupFilterListeners() {
    // 経験レベルフィルター
    const experienceFilters = document.querySelectorAll('input[name="experience"]');
    experienceFilters.forEach(input => {
      input.addEventListener('change', () => this.updateFilters());
    });

    // 雇用形態フィルター
    const employmentFilters = document.querySelectorAll('input[name="employment"]');
    employmentFilters.forEach(input => {
      input.addEventListener('change', () => this.updateFilters());
    });

    // 給与範囲
    const salaryMin = document.getElementById('salaryMin');
    const salaryMax = document.getElementById('salaryMax');
    if (salaryMin) {
      salaryMin.addEventListener('change', () => this.updateFilters());
    }
    if (salaryMax) {
      salaryMax.addEventListener('change', () => this.updateFilters());
    }

    // 場所フィルター
    const locationFilters = document.querySelectorAll('input[name="location"]');
    locationFilters.forEach(input => {
      input.addEventListener('change', () => this.updateFilters());
    });

    // リモート可
    const remoteOk = document.getElementById('remoteOk');
    if (remoteOk) {
      remoteOk.addEventListener('change', () => this.updateFilters());
    }

    // スキルタグ
    this.setupSkillTagsFilter();
  }

  setupSkillTagsFilter() {
    const skillTagsInput = document.getElementById('skillTags');
    const skillTagsContainer = document.getElementById('selectedSkills');
    
    if (!skillTagsInput || !skillTagsContainer) return;

    const skills = [];
    
    skillTagsInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        const skill = skillTagsInput.value.trim();
        if (skill && !skills.includes(skill)) {
          skills.push(skill);
          this.renderSkillTags(skills, skillTagsContainer);
          skillTagsInput.value = '';
          this.updateFilters();
        }
      }
    });

    // スキルタグの削除
    skillTagsContainer.addEventListener('click', (e) => {
      if (e.target.classList.contains('remove-tag')) {
        const index = parseInt(e.target.dataset.index);
        skills.splice(index, 1);
        this.renderSkillTags(skills, skillTagsContainer);
        this.updateFilters();
      }
    });

    this.currentFilters.skills = skills;
  }

  renderSkillTags(skills, container) {
    container.innerHTML = skills.map((skill, index) => `
      <span class="skill-tag">
        ${this.escapeHtml(skill)}
        <button class="remove-tag" data-index="${index}">&times;</button>
      </span>
    `).join('');
  }

  handleSearchInput(e) {
    const query = e.target.value;
    
    // debounce
    clearTimeout(this.searchTimeout);
    
    if (query.length > 2) {
      this.searchTimeout = setTimeout(() => {
        this.performSearch();
      }, this.config.searchDelay);
    }
    
    // クリアボタンの表示/非表示
    if (this.clearButton) {
      this.clearButton.style.display = query ? 'block' : 'none';
    }
  }

  updateFilters() {
    // フィルター情報を収集
    this.currentFilters = {
      ...this.currentFilters,
      experience: this.getCheckedValues('experience'),
      employment: this.getCheckedValues('employment'),
      location: this.getCheckedValues('location'),
      salaryMin: document.getElementById('salaryMin')?.value || '',
      salaryMax: document.getElementById('salaryMax')?.value || '',
      remoteOk: document.getElementById('remoteOk')?.checked || false,
    };

    // アクティブなフィルター数を更新
    this.updateActiveFiltersCount();
    
    // 検索実行
    this.currentPage = 1;
    this.performSearch();
  }

  getCheckedValues(name) {
    const checked = document.querySelectorAll(`input[name="${name}"]:checked`);
    return Array.from(checked).map(input => input.value);
  }

  updateActiveFiltersCount() {
    if (!this.activeFiltersCount) return;
    
    let count = 0;
    
    // 各フィルターをカウント
    if (this.currentFilters.experience?.length) count += this.currentFilters.experience.length;
    if (this.currentFilters.employment?.length) count += this.currentFilters.employment.length;
    if (this.currentFilters.location?.length) count += this.currentFilters.location.length;
    if (this.currentFilters.salaryMin || this.currentFilters.salaryMax) count++;
    if (this.currentFilters.remoteOk) count++;
    if (this.currentFilters.skills?.length) count += this.currentFilters.skills.length;
    
    this.activeFiltersCount.textContent = count;
    this.activeFiltersCount.style.display = count > 0 ? 'inline-block' : 'none';
  }

  async performSearch(append = false) {
    if (this.isLoading) return;
    
    const query = this.searchInput?.value || '';
    
    // 検索履歴に保存
    if (query && !append) {
      this.saveToHistory(query);
    }
    
    // URLを更新
    this.updateURL();
    
    // ローディング表示
    this.showLoading();
    
    try {
      const params = this.buildSearchParams();
      const response = await fetch(`/api/search?${params.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        if (append) {
          this.appendResults(data.results);
        } else {
          this.displayResults(data.results, data.total);
        }
        
        this.hasMore = data.hasMore || false;
        this.currentPage = data.page || 1;
      } else {
        this.showError('検索中にエラーが発生しました');
      }
    } catch (error) {
      console.error('検索エラー:', error);
      this.showError('検索中にエラーが発生しました');
    } finally {
      this.hideLoading();
    }
  }

  buildSearchParams() {
    const params = new URLSearchParams();
    
    // 検索クエリ
    const query = this.searchInput?.value || '';
    if (query) params.append('q', query);
    
    // ページ
    params.append('page', this.currentPage);
    params.append('limit', this.config.resultsPerPage);
    
    // ソート
    const sort = this.sortSelect?.value || 'relevance';
    params.append('sort', sort);
    
    // フィルター
    Object.entries(this.currentFilters).forEach(([key, value]) => {
      if (Array.isArray(value) && value.length > 0) {
        value.forEach(v => params.append(key, v));
      } else if (value && typeof value === 'boolean') {
        params.append(key, value);
      } else if (value) {
        params.append(key, value);
      }
    });
    
    return params;
  }

  displayResults(results, total) {
    if (!this.resultsContainer) return;
    
    // 結果数を表示
    if (this.resultsCount) {
      this.resultsCount.textContent = `${total}件の結果`;
    }
    
    if (results.length === 0) {
      this.showNoResults();
      return;
    }
    
    // 結果をレンダリング
    this.resultsContainer.innerHTML = results.map(result => 
      this.renderResultItem(result)
    ).join('');
    
    // アニメーション
    this.animateResults();
  }

  appendResults(results) {
    if (!this.resultsContainer || results.length === 0) return;
    
    const newItems = results.map(result => 
      this.renderResultItem(result)
    ).join('');
    
    this.resultsContainer.insertAdjacentHTML('beforeend', newItems);
    this.animateResults(true);
  }

  renderResultItem(item) {
    // アイテムタイプに応じてレンダリング
    switch (item.type) {
      case 'designer_job':
        return this.renderJobItem(item);
      case 'event':
        return this.renderEventItem(item);
      case 'collaboration':
        return this.renderCollaborationItem(item);
      default:
        return this.renderDefaultItem(item);
    }
  }

  renderJobItem(job) {
    const experienceText = job.isExperienceWelcome && job.isNewGraduateWelcome ? 
      '未経験・新卒歓迎' : 
      job.isExperienceWelcome ? '未経験歓迎' : 
      job.isNewGraduateWelcome ? '新卒歓迎' : '経験者向け';

    const salaryText = job.salaryMin && job.salaryMax ? 
      `${job.salaryMin}〜${job.salaryMax}万円` : 
      '給与応相談';

    return `
      <div class="search-result-item job-item" data-id="${job.id}">
        <div class="result-header">
          <h3>${this.escapeHtml(job.title)}</h3>
          <span class="result-type">求人</span>
        </div>
        <div class="result-meta">
          <span class="company">${this.escapeHtml(job.company)}</span>
          <span class="location">${this.escapeHtml(job.location || '場所未定')}</span>
          ${job.isRemoteOk ? '<span class="remote-ok">リモート可</span>' : ''}
        </div>
        <div class="result-details">
          <span class="experience">${experienceText}</span>
          <span class="salary">${salaryText}</span>
        </div>
        <p class="result-description">${this.escapeHtml(job.description || '')}</p>
        ${job.tags ? `
          <div class="result-tags">
            ${job.tags.map(tag => `<span class="tag">${this.escapeHtml(tag)}</span>`).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }

  renderEventItem(event) {
    return `
      <div class="search-result-item event-item" data-id="${event.id}">
        <div class="result-header">
          <h3>${this.escapeHtml(event.name)}</h3>
          <span class="result-type">イベント</span>
        </div>
        <div class="result-meta">
          <span class="date">${this.formatDate(event.date)}</span>
          <span class="location">${this.escapeHtml(event.location)}</span>
        </div>
        <p class="result-description">${this.escapeHtml(event.description || '')}</p>
      </div>
    `;
  }

  renderCollaborationItem(collab) {
    return `
      <div class="search-result-item collaboration-item" data-id="${collab.id}">
        <div class="result-header">
          <h3>${this.escapeHtml(collab.title)}</h3>
          <span class="result-type">コラボレーション</span>
        </div>
        <div class="result-meta">
          <span class="project-type">${this.escapeHtml(collab.projectType)}</span>
          ${collab.budget ? `<span class="budget">${this.escapeHtml(collab.budget)}</span>` : ''}
        </div>
        <p class="result-description">${this.escapeHtml(collab.description || '')}</p>
      </div>
    `;
  }

  renderDefaultItem(item) {
    return `
      <div class="search-result-item" data-id="${item.id}">
        <div class="result-header">
          <h3>${this.escapeHtml(item.title || item.name)}</h3>
          <span class="result-type">${this.escapeHtml(item.type)}</span>
        </div>
        <p class="result-description">${this.escapeHtml(item.description || '')}</p>
      </div>
    `;
  }

  setupInfiniteScroll() {
    let scrollTimeout;
    
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        if (this.shouldLoadMore()) {
          this.loadMore();
        }
      }, 100);
    });
  }

  shouldLoadMore() {
    if (this.isLoading || !this.hasMore) return false;
    
    const scrollPosition = window.innerHeight + window.scrollY;
    const threshold = document.body.offsetHeight - 200;
    
    return scrollPosition >= threshold;
  }

  loadMore() {
    this.currentPage++;
    this.performSearch(true);
  }

  toggleFilterPanel() {
    if (!this.filterPanel) return;
    
    this.filterPanel.classList.toggle('active');
    
    if (this.filterToggle) {
      this.filterToggle.classList.toggle('active');
    }
  }

  clearSearch() {
    if (this.searchInput) {
      this.searchInput.value = '';
      this.clearButton.style.display = 'none';
    }
    
    // フィルターをリセット
    this.resetFilters();
    
    // 結果をクリア
    if (this.resultsContainer) {
      this.resultsContainer.innerHTML = '';
    }
    
    if (this.resultsCount) {
      this.resultsCount.textContent = '';
    }
    
    // URLをクリア
    this.updateURL();
  }

  resetFilters() {
    // チェックボックスをリセット
    document.querySelectorAll('input[type="checkbox"]').forEach(input => {
      input.checked = false;
    });
    
    // 入力フィールドをリセット
    document.querySelectorAll('input[type="text"], input[type="number"]').forEach(input => {
      input.value = '';
    });
    
    // スキルタグをクリア
    const skillTagsContainer = document.getElementById('selectedSkills');
    if (skillTagsContainer) {
      skillTagsContainer.innerHTML = '';
    }
    
    this.currentFilters = {};
    this.updateActiveFiltersCount();
  }

  saveToHistory(query) {
    // 重複を削除
    this.searchHistory = this.searchHistory.filter(item => item !== query);
    
    // 先頭に追加
    this.searchHistory.unshift(query);
    
    // 制限を適用
    if (this.searchHistory.length > this.config.historyLimit) {
      this.searchHistory = this.searchHistory.slice(0, this.config.historyLimit);
    }
    
    // ローカルストレージに保存
    localStorage.setItem('searchHistory', JSON.stringify(this.searchHistory));
  }

  loadSearchHistory() {
    try {
      const history = localStorage.getItem('searchHistory');
      return history ? JSON.parse(history) : [];
    } catch (error) {
      return [];
    }
  }

  showSearchHistory() {
    if (!this.historyDropdown || this.searchHistory.length === 0) return;
    
    this.historyDropdown.innerHTML = this.searchHistory.map(query => `
      <div class="history-item" data-query="${this.escapeHtml(query)}">
        <i class="fas fa-history"></i>
        ${this.escapeHtml(query)}
      </div>
    `).join('');
    
    this.historyDropdown.style.display = 'block';
    
    // 履歴項目のクリックイベント
    this.historyDropdown.querySelectorAll('.history-item').forEach(item => {
      item.addEventListener('click', () => {
        this.searchInput.value = item.dataset.query;
        this.performSearch();
        this.hideSearchHistory();
      });
    });
  }

  hideSearchHistory() {
    if (this.historyDropdown) {
      this.historyDropdown.style.display = 'none';
    }
  }

  updateURL() {
    const params = this.buildSearchParams();
    const newURL = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState({}, '', newURL);
  }

  loadFromURL() {
    const params = new URLSearchParams(window.location.search);
    
    // 検索クエリ
    const query = params.get('q');
    if (query && this.searchInput) {
      this.searchInput.value = query;
    }
    
    // フィルターを復元
    this.restoreFilters(params);
    
    // 初期検索を実行
    if (query || this.hasActiveFilters()) {
      this.performSearch();
    }
  }

  restoreFilters(params) {
    // 経験レベル
    params.getAll('experience').forEach(value => {
      const input = document.querySelector(`input[name="experience"][value="${value}"]`);
      if (input) input.checked = true;
    });
    
    // 雇用形態
    params.getAll('employment').forEach(value => {
      const input = document.querySelector(`input[name="employment"][value="${value}"]`);
      if (input) input.checked = true;
    });
    
    // 場所
    params.getAll('location').forEach(value => {
      const input = document.querySelector(`input[name="location"][value="${value}"]`);
      if (input) input.checked = true;
    });
    
    // 給与範囲
    const salaryMin = params.get('salaryMin');
    const salaryMax = params.get('salaryMax');
    if (salaryMin) document.getElementById('salaryMin').value = salaryMin;
    if (salaryMax) document.getElementById('salaryMax').value = salaryMax;
    
    // リモート可
    const remoteOk = params.get('remoteOk') === 'true';
    if (remoteOk) document.getElementById('remoteOk').checked = true;
    
    // スキル
    const skills = params.getAll('skills');
    if (skills.length > 0) {
      this.currentFilters.skills = skills;
      const container = document.getElementById('selectedSkills');
      if (container) {
        this.renderSkillTags(skills, container);
      }
    }
    
    this.updateActiveFiltersCount();
  }

  hasActiveFilters() {
    return Object.keys(this.currentFilters).some(key => {
      const value = this.currentFilters[key];
      return Array.isArray(value) ? value.length > 0 : !!value;
    });
  }

  showLoading() {
    this.isLoading = true;
    if (this.loadingIndicator) {
      this.loadingIndicator.style.display = 'block';
    }
  }

  hideLoading() {
    this.isLoading = false;
    if (this.loadingIndicator) {
      this.loadingIndicator.style.display = 'none';
    }
  }

  showNoResults() {
    if (this.noResultsMessage) {
      this.noResultsMessage.style.display = 'block';
    }
    if (this.resultsContainer) {
      this.resultsContainer.innerHTML = '';
    }
  }

  showError(message) {
    if (this.resultsContainer) {
      this.resultsContainer.innerHTML = `
        <div class="error-message">
          <i class="fas fa-exclamation-circle"></i>
          ${message}
        </div>
      `;
    }
  }

  animateResults(append = false) {
    const items = append ? 
      this.resultsContainer.querySelectorAll('.search-result-item:not(.animated)') :
      this.resultsContainer.querySelectorAll('.search-result-item');
    
    items.forEach((item, index) => {
      setTimeout(() => {
        item.classList.add('animated');
      }, index * 50);
    });
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  window.advancedSearch = new AdvancedSearch({
    searchDelay: 300,
    historyLimit: 10,
    resultsPerPage: 20
  });
});