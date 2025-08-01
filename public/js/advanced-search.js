/**
 * 高度な検索・フィルタリング機能
 * リアルタイム検索、検索履歴、URLパラメータ対応、Intersection Observer対応
 */

class AdvancedSearch {
  constructor(options = {}) {
    this.options = {
      debounceDelay: 300,
      maxHistoryItems: 10,
      searchEndpoint: '/api/search',
      infiniteScroll: true,
      resultsPerPage: 20,
      ...options
    };

    // DOM要素の参照
    this.searchInput = null;
    this.searchContainer = null;
    this.searchDropdown = null;
    this.filterPanel = null;
    this.resultsContainer = null;
    this.resultsCount = null;
    this.searchTime = null;

    // 状態管理
    this.searchHistory = [];
    this.savedSearches = [];
    this.currentQuery = '';
    this.currentFilters = {};
    this.searchResults = [];
    this.isSearching = false;
    this.searchController = null;
    this.currentPage = 1;
    this.hasMoreResults = true;

    // デバウンス用タイマー
    this.debounceTimer = null;

    // Intersection Observer
    this.infiniteScrollObserver = null;

    this.init();
  }

  /**
   * 初期化処理
   */
  init() {
    this.loadSearchHistory();
    this.loadSavedSearches();
    this.initializeDOM();
    this.bindEvents();
    this.initializeInfiniteScroll();
    this.loadFromURL();
  }

  /**
   * DOM要素の初期化
   */
  initializeDOM() {
    this.searchContainer = document.querySelector('[data-search-container]');
    this.searchInput = document.getElementById('mainSearchInput') || document.getElementById('searchInput');
    this.searchDropdown = document.getElementById('searchDropdown') || document.getElementById('searchHistory');
    this.filterPanel = document.getElementById('filterPanel');
    this.resultsContainer = document.getElementById('searchResults');
    this.resultsCount = document.getElementById('resultsCount');
    this.searchTime = document.getElementById('searchTime');

    if (!this.searchInput) {
      console.error('検索入力要素が見つかりません');
      return;
    }

    // 検索結果コンテナがない場合は作成
    if (!this.resultsContainer) {
      this.createResultsContainer();
    }
  }

  /**
   * 検索結果コンテナの作成
   */
  createResultsContainer() {
    const container = document.createElement('div');
    container.id = 'searchResults';
    container.className = 'search-results';
    container.innerHTML = `
      <div class="results-header">
        <div class="results-info">
          <span id="resultsCount" class="results-count">0件の結果</span>
          <span id="searchTime" class="search-time"></span>
        </div>
        <div class="results-actions">
          <button class="save-search-btn" id="saveSearchBtn">
            <i class="fas fa-bookmark"></i>
            <span>検索を保存</span>
          </button>
        </div>
      </div>
      <div class="results-grid" id="resultsGrid"></div>
      <div class="loading-indicator" id="loadingIndicator">
        <i class="fas fa-spinner fa-spin"></i>
        <span>検索中...</span>
      </div>
      <div class="load-more-trigger" id="loadMoreTrigger"></div>
      <div class="no-results" id="noResults" style="display: none;">
        <i class="fas fa-search"></i>
        <h3>検索結果がありません</h3>
        <p>別のキーワードで検索してみてください</p>
      </div>
    `;

    // 検索コンテナの後に挿入
    const insertPoint = this.searchContainer || document.body;
    insertPoint.parentNode.insertBefore(container, insertPoint.nextSibling);
    this.resultsContainer = container;
    this.resultsCount = document.getElementById('resultsCount');
    this.searchTime = document.getElementById('searchTime');
  }

  /**
   * イベントの初期化
   */
  bindEvents() {
    // 検索入力イベント
    this.searchInput.addEventListener('input', this.handleSearchInput.bind(this));
    this.searchInput.addEventListener('focus', this.showSearchDropdown.bind(this));
    this.searchInput.addEventListener('keydown', this.handleKeyNavigation.bind(this));

    // クリアボタン
    const clearBtn = document.getElementById('searchClearBtn') || document.getElementById('clearSearch');
    if (clearBtn) {
      clearBtn.addEventListener('click', this.clearSearch.bind(this));
    }

    // フィルタートグル
    const filterToggle = document.getElementById('filterToggleBtn') || document.getElementById('filterToggle');
    if (filterToggle) {
      filterToggle.addEventListener('click', this.toggleFilterPanel.bind(this));
    }

    // 履歴トグル
    const historyToggle = document.getElementById('historyToggleBtn');
    if (historyToggle) {
      historyToggle.addEventListener('click', this.toggleSearchHistory.bind(this));
    }

    // 履歴クリア
    const clearHistory = document.getElementById('clearHistoryBtn');
    if (clearHistory) {
      clearHistory.addEventListener('click', this.clearSearchHistory.bind(this));
    }

    // フィルター変更
    this.setupFilterListeners();

    // 外部クリックでドロップダウンを閉じる
    document.addEventListener('click', this.handleOutsideClick.bind(this));

    // URLの変更を監視
    window.addEventListener('popstate', this.loadFromURL.bind(this));

    // 検索保存ボタン
    document.addEventListener('click', (e) => {
      if (e.target.closest('#saveSearchBtn')) {
        this.saveCurrentSearch();
      }
    });
  }

  /**
   * フィルターリスナーのセットアップ
   */
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

    // ソート変更
    const sortSelect = document.getElementById('sortBy');
    if (sortSelect) {
      sortSelect.addEventListener('change', () => this.performSearch());
    }

    // スキルタグ
    this.setupSkillTagsFilter();
  }

  /**
   * スキルタグフィルターのセットアップ
   */
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

  /**
   * スキルタグのレンダリング
   */
  renderSkillTags(skills, container) {
    container.innerHTML = skills.map((skill, index) => `
      <span class="skill-tag">
        ${this.escapeHtml(skill)}
        <button class="remove-tag" data-index="${index}">&times;</button>
      </span>
    `).join('');
  }

  /**
   * 無限スクロールの初期化
   */
  initializeInfiniteScroll() {
    if (!this.options.infiniteScroll) return;

    const loadMoreTrigger = document.getElementById('loadMoreTrigger');
    if (!loadMoreTrigger) return;

    this.infiniteScrollObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && this.hasMoreResults && !this.isSearching) {
            this.loadMoreResults();
          }
        });
      },
      { threshold: 0.1 }
    );

    this.infiniteScrollObserver.observe(loadMoreTrigger);
  }

  /**
   * 検索入力処理
   */
  handleSearchInput(event) {
    const query = event.target.value.trim();
    this.currentQuery = query;

    // デバウンス処理
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      if (query.length > 0) {
        this.performSearch(query);
        this.showSearchSuggestions(query);
      } else {
        this.clearResults();
        this.showSearchHistory();
      }
    }, this.options.debounceDelay);

    // クリアボタンの表示/非表示
    const clearBtn = document.getElementById('searchClearBtn') || document.getElementById('clearSearch');
    if (clearBtn) {
      clearBtn.style.display = query ? 'block' : 'none';
    }
  }

  /**
   * フィルター更新
   */
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

  /**
   * チェックされた値を取得
   */
  getCheckedValues(name) {
    const checked = document.querySelectorAll(`input[name="${name}"]:checked`);
    return Array.from(checked).map(input => input.value);
  }

  /**
   * アクティブなフィルター数を更新
   */
  updateActiveFiltersCount() {
    const activeFiltersCount = document.getElementById('activeFiltersCount') || document.getElementById('filterCount');
    if (!activeFiltersCount) return;
    
    let count = 0;
    
    // 各フィルターをカウント
    if (this.currentFilters.experience?.length) count += this.currentFilters.experience.length;
    if (this.currentFilters.employment?.length) count += this.currentFilters.employment.length;
    if (this.currentFilters.location?.length) count += this.currentFilters.location.length;
    if (this.currentFilters.salaryMin || this.currentFilters.salaryMax) count++;
    if (this.currentFilters.remoteOk) count++;
    if (this.currentFilters.skills?.length) count += this.currentFilters.skills.length;
    
    activeFiltersCount.textContent = count;
    if (count > 0) {
      activeFiltersCount.style.display = 'inline-block';
      activeFiltersCount.classList.add('show');
    } else {
      activeFiltersCount.style.display = 'none';
      activeFiltersCount.classList.remove('show');
    }
  }

  /**
   * 検索実行
   */
  async performSearch(query = null, page = 1, append = false) {
    if (this.isSearching) {
      this.searchController?.abort();
    }

    // queryが指定されていない場合は、現在の検索クエリを使用
    if (query === null) {
      query = this.currentQuery || this.searchInput?.value || '';
    }

    this.isSearching = true;
    this.searchController = new AbortController();
    
    const startTime = performance.now();
    
    try {
      // 検索履歴に保存
      if (query && page === 1 && !append) {
        this.addToSearchHistory(query);
      }

      // URLを更新
      this.updateURL(query, this.currentFilters);

      this.showLoadingState();
      
      const searchParams = this.buildSearchParams(query, page);

      const response = await fetch(`${this.options.searchEndpoint}?${searchParams}`, {
        signal: this.searchController.signal,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`検索エラー: ${response.status}`);
      }

      const data = await response.json();
      const endTime = performance.now();
      const searchTime = Math.round(endTime - startTime);

      if (data.success) {
        if (append) {
          this.searchResults.push(...(data.results || []));
          this.appendSearchResults(data.results || []);
        } else {
          this.searchResults = data.results || [];
          this.renderSearchResults(this.searchResults);
        }

        this.hasMoreResults = data.hasMore || false;
        this.currentPage = data.page || page;

        this.updateResultsStats(data.total || this.searchResults.length, searchTime);
        this.hideSearchDropdown();
      } else {
        this.showSearchError('検索中にエラーが発生しました');
      }

    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('検索エラー:', error);
        this.showSearchError(error.message);
      }
    } finally {
      this.isSearching = false;
      this.hideLoadingState();
    }
  }

  /**
   * 検索パラメータの構築
   */
  buildSearchParams(query, page) {
    const params = new URLSearchParams();
    
    // 検索クエリ
    if (query) params.append('q', query);
    
    // ページ
    params.append('page', page);
    params.append('limit', this.options.resultsPerPage);
    
    // ソート
    const sortSelect = document.getElementById('sortBy');
    const sort = sortSelect?.value || 'relevance';
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

  /**
   * より多くの結果を読み込み
   */
  async loadMoreResults() {
    if (!this.currentQuery || !this.hasMoreResults) return;
    await this.performSearch(this.currentQuery, this.currentPage + 1, true);
  }

  /**
   * 検索候補の表示
   */
  async showSearchSuggestions(query) {
    try {
      const response = await fetch(`/api/search/suggestions?q=${encodeURIComponent(query)}`);
      if (!response.ok) return;

      const suggestions = await response.json();
      this.renderSearchSuggestions(suggestions);
    } catch (error) {
      console.error('検索候補エラー:', error);
    }
  }

  /**
   * 検索候補のレンダリング
   */
  renderSearchSuggestions(suggestions) {
    const suggestionsList = document.getElementById('suggestionsList');
    if (!suggestionsList || !suggestions.length) return;

    suggestionsList.innerHTML = suggestions.map((suggestion, index) => `
      <div class="suggestion-item" data-suggestion="${suggestion.text}" data-index="${index}">
        <i class="fas fa-search"></i>
        <span class="suggestion-text">${this.highlightQuery(suggestion.text, this.currentQuery)}</span>
        <span class="suggestion-type">${suggestion.type || ''}</span>
      </div>
    `).join('');

    // 候補クリックイベント
    suggestionsList.addEventListener('click', (e) => {
      const suggestionItem = e.target.closest('.suggestion-item');
      if (suggestionItem) {
        const suggestion = suggestionItem.dataset.suggestion;
        this.selectSuggestion(suggestion);
      }
    });

    this.showSearchDropdown();
  }

  /**
   * 検索履歴の表示
   */
  showSearchHistory() {
    if (!this.searchDropdown || this.searchHistory.length === 0) return;
    
    this.searchDropdown.innerHTML = this.searchHistory.map((item, index) => {
      const query = typeof item === 'string' ? item : item.query;
      const timestamp = typeof item === 'object' ? item.timestamp : null;
      
      return `
        <div class="history-item" data-query="${this.escapeHtml(query)}" data-index="${index}">
          <i class="fas fa-history"></i>
          <span class="history-text">${this.escapeHtml(query)}</span>
          ${timestamp ? `<span class="history-time">${this.formatRelativeTime(timestamp)}</span>` : ''}
          <button class="remove-history-btn" data-remove-index="${index}">
            <i class="fas fa-times"></i>
          </button>
        </div>
      `;
    }).join('');

    // イベントリスナー
    this.searchDropdown.addEventListener('click', (e) => {
      const historyItem = e.target.closest('.history-item');
      const removeBtn = e.target.closest('.remove-history-btn');

      if (removeBtn) {
        e.stopPropagation();
        const index = parseInt(removeBtn.dataset.removeIndex);
        this.removeFromHistory(index);
      } else if (historyItem) {
        const query = historyItem.dataset.query;
        this.selectHistoryItem(query);
      }
    });

    this.showSearchDropdown();
  }

  /**
   * 検索結果のレンダリング
   */
  renderSearchResults(results) {
    const resultsGrid = document.getElementById('resultsGrid') || this.resultsContainer;
    const noResults = document.getElementById('noResults');
    
    if (!resultsGrid) return;

    if (!results.length) {
      resultsGrid.innerHTML = '';
      if (noResults) {
        noResults.style.display = 'block';
      }
      return;
    }

    if (noResults) {
      noResults.style.display = 'none';
    }

    resultsGrid.innerHTML = results.map(item => this.renderResultItem(item)).join('');
    this.animateResults();
  }

  /**
   * 検索結果の追加レンダリング（無限スクロール用）
   */
  appendSearchResults(results) {
    const resultsGrid = document.getElementById('resultsGrid') || this.resultsContainer;
    if (!resultsGrid || !results.length) return;

    const newItems = results.map(item => this.renderResultItem(item)).join('');
    resultsGrid.insertAdjacentHTML('beforeend', newItems);
    this.animateResults(true);
  }

  /**
   * 個別結果アイテムのレンダリング
   */
  renderResultItem(item) {
    // アイテムタイプに応じてレンダリング
    switch (item.type) {
      case 'designer_job':
      case 'designer-job':
        return this.renderJobItem(item);
      case 'event':
      case 'creative-event':
        return this.renderEventItem(item);
      case 'collaboration':
        return this.renderCollaborationItem(item);
      default:
        return this.renderDefaultItem(item);
    }
  }

  /**
   * 求人アイテムのレンダリング
   */
  renderJobItem(job) {
    const experienceText = job.isExperienceWelcome && job.isNewGraduateWelcome ? 
      '未経験・新卒歓迎' : 
      job.isExperienceWelcome ? '未経験歓迎' : 
      job.isNewGraduateWelcome ? '新卒歓迎' : '経験者向け';

    const salaryText = job.salaryMin && job.salaryMax ? 
      `${job.salaryMin}〜${job.salaryMax}万円` : 
      job.salary || '給与応相談';

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
        <div class="result-actions">
          <button class="action-btn bookmark-btn" data-action="bookmark" data-id="${job.id}">
            <i class="fas fa-bookmark"></i>
          </button>
          <button class="action-btn apply-btn" data-action="apply" data-id="${job.id}">
            <i class="fas fa-paper-plane"></i>
            <span>応募する</span>
          </button>
        </div>
      </div>
    `;
  }

  /**
   * イベントアイテムのレンダリング
   */
  renderEventItem(event) {
    return `
      <div class="search-result-item event-item" data-id="${event.id}">
        <div class="result-header">
          <h3>${this.escapeHtml(event.name || event.title)}</h3>
          <span class="result-type">イベント</span>
        </div>
        <div class="result-meta">
          <span class="date">${this.formatDate(event.date || event.eventDate)}</span>
          <span class="location">${this.escapeHtml(event.location)}</span>
          ${event.capacity ? `<span class="capacity">${event.capacity}人</span>` : ''}
        </div>
        <p class="result-description">${this.escapeHtml(event.description || '')}</p>
        <div class="result-actions">
          <button class="action-btn bookmark-btn" data-action="bookmark" data-id="${event.id}">
            <i class="fas fa-bookmark"></i>
          </button>
          <button class="action-btn register-btn" data-action="register" data-id="${event.id}">
            <i class="fas fa-calendar-plus"></i>
            <span>参加登録</span>
          </button>
        </div>
      </div>
    `;
  }

  /**
   * コラボレーションアイテムのレンダリング
   */
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
          ${collab.duration ? `<span class="duration">${this.escapeHtml(collab.duration)}</span>` : ''}
        </div>
        <p class="result-description">${this.escapeHtml(collab.description || '')}</p>
        <div class="result-actions">
          <button class="action-btn bookmark-btn" data-action="bookmark" data-id="${collab.id}">
            <i class="fas fa-bookmark"></i>
          </button>
          <button class="action-btn contact-btn" data-action="contact" data-id="${collab.id}">
            <i class="fas fa-envelope"></i>
            <span>問い合わせ</span>
          </button>
        </div>
      </div>
    `;
  }

  /**
   * デフォルトアイテムのレンダリング
   */
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

  /**
   * キーボードナビゲーション
   */
  handleKeyNavigation(event) {
    const dropdown = this.searchDropdown;
    if (!dropdown || !dropdown.classList.contains('show')) return;

    const items = dropdown.querySelectorAll('.suggestion-item, .history-item');
    if (!items.length) return;

    const currentHighlighted = dropdown.querySelector('.highlighted');
    let currentIndex = currentHighlighted ? 
      Array.from(items).indexOf(currentHighlighted) : -1;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        currentIndex = Math.min(currentIndex + 1, items.length - 1);
        this.highlightItem(items, currentIndex);
        break;
      case 'ArrowUp':
        event.preventDefault();
        currentIndex = Math.max(currentIndex - 1, 0);
        this.highlightItem(items, currentIndex);
        break;
      case 'Enter':
        event.preventDefault();
        if (currentHighlighted) {
          const suggestion = currentHighlighted.dataset.suggestion || 
                           currentHighlighted.dataset.query;
          if (suggestion) {
            this.selectSuggestion(suggestion);
          }
        } else {
          this.performSearch();
        }
        break;
      case 'Escape':
        this.hideSearchDropdown();
        break;
    }
  }

  /**
   * アイテムのハイライト
   */
  highlightItem(items, index) {
    items.forEach((item, i) => {
      item.classList.toggle('highlighted', i === index);
    });
  }

  /**
   * 候補選択
   */
  selectSuggestion(suggestion) {
    this.searchInput.value = suggestion;
    this.currentQuery = suggestion;
    this.performSearch(suggestion);
  }

  /**
   * 履歴アイテム選択
   */
  selectHistoryItem(query) {
    this.searchInput.value = query;
    this.currentQuery = query;
    this.performSearch(query);
  }

  /**
   * 検索クリア
   */
  clearSearch() {
    this.searchInput.value = '';
    this.currentQuery = '';
    this.clearResults();
    this.hideSearchDropdown();
    this.resetFilters();
    this.updateURL('', {});
  }

  /**
   * 結果クリア
   */
  clearResults() {
    const resultsGrid = document.getElementById('resultsGrid');
    const resultsContainer = this.resultsContainer;
    
    if (resultsGrid) {
      resultsGrid.innerHTML = '';
    } else if (resultsContainer) {
      resultsContainer.innerHTML = '';
    }
    
    this.updateResultsStats(0, 0);
    this.searchResults = [];
  }

  /**
   * フィルターリセット
   */
  resetFilters() {
    // チェックボックスをリセット
    document.querySelectorAll('input[type="checkbox"]').forEach(input => {
      input.checked = false;
    });
    
    // 入力フィールドをリセット
    document.querySelectorAll('input[type="text"], input[type="number"]').forEach(input => {
      if (input.id !== 'searchInput' && input.id !== 'mainSearchInput') {
        input.value = '';
      }
    });
    
    // スキルタグをクリア
    const skillTagsContainer = document.getElementById('selectedSkills');
    if (skillTagsContainer) {
      skillTagsContainer.innerHTML = '';
    }
    
    this.currentFilters = {};
    this.updateActiveFiltersCount();
  }

  /**
   * フィルターパネルトグル
   */
  toggleFilterPanel() {
    if (!this.filterPanel) return;
    
    const isVisible = this.filterPanel.classList.contains('show') || 
                     this.filterPanel.classList.contains('active');
    
    this.filterPanel.classList.toggle('show', !isVisible);
    this.filterPanel.classList.toggle('active', !isVisible);
    
    const toggleBtn = document.getElementById('filterToggleBtn') || 
                     document.getElementById('filterToggle');
    if (toggleBtn) {
      toggleBtn.classList.toggle('active', !isVisible);
    }
  }

  /**
   * 検索履歴トグル
   */
  toggleSearchHistory() {
    if (this.searchDropdown.classList.contains('show')) {
      this.hideSearchDropdown();
    } else {
      this.showSearchHistory();
      this.showSearchDropdown();
    }
  }

  /**
   * 検索ドロップダウン表示
   */
  showSearchDropdown() {
    if (this.searchDropdown) {
      this.searchDropdown.classList.add('show');
      this.searchDropdown.style.display = 'block';
    }
  }

  /**
   * 検索ドロップダウン非表示
   */
  hideSearchDropdown() {
    if (this.searchDropdown) {
      this.searchDropdown.classList.remove('show');
      setTimeout(() => {
        if (!this.searchDropdown.classList.contains('show')) {
          this.searchDropdown.style.display = 'none';
        }
      }, 200);
    }
  }

  /**
   * 外部クリック処理
   */
  handleOutsideClick(event) {
    const searchContainer = this.searchContainer || this.searchInput.parentElement;
    if (!searchContainer?.contains(event.target)) {
      this.hideSearchDropdown();
    }
  }

  /**
   * ローディング状態表示
   */
  showLoadingState() {
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) {
      loadingIndicator.style.display = 'flex';
    }
    
    if (this.searchContainer) {
      this.searchContainer.classList.add('searching');
    }
  }

  /**
   * ローディング状態非表示
   */
  hideLoadingState() {
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) {
      loadingIndicator.style.display = 'none';
    }
    
    if (this.searchContainer) {
      this.searchContainer.classList.remove('searching');
    }
  }

  /**
   * 検索エラー表示
   */
  showSearchError(message) {
    const resultsGrid = document.getElementById('resultsGrid') || this.resultsContainer;
    if (resultsGrid) {
      resultsGrid.innerHTML = `
        <div class="search-error error-message">
          <i class="fas fa-exclamation-triangle"></i>
          <h3>検索エラーが発生しました</h3>
          <p>${message}</p>
          <button class="retry-btn" onclick="location.reload()">再試行</button>
        </div>
      `;
    }
  }

  /**
   * 結果統計の更新
   */
  updateResultsStats(count, time) {
    if (this.resultsCount) {
      this.resultsCount.textContent = `${count.toLocaleString()}件の結果`;
    }
    if (this.searchTime && time > 0) {
      this.searchTime.textContent = `(${time}ms)`;
    }
  }

  /**
   * 検索履歴に追加
   */
  addToSearchHistory(query) {
    if (!query) return;

    // 重複を削除
    this.searchHistory = this.searchHistory.filter(item => {
      const itemQuery = typeof item === 'string' ? item : item.query;
      return itemQuery !== query;
    });

    // 先頭に追加
    this.searchHistory.unshift({
      query,
      timestamp: Date.now()
    });

    // 制限を適用
    if (this.searchHistory.length > this.options.maxHistoryItems) {
      this.searchHistory = this.searchHistory.slice(0, this.options.maxHistoryItems);
    }

    this.saveSearchHistory();
  }

  /**
   * 履歴から削除
   */
  removeFromHistory(index) {
    this.searchHistory.splice(index, 1);
    this.saveSearchHistory();
    this.showSearchHistory();
  }

  /**
   * 検索履歴クリア
   */
  clearSearchHistory() {
    this.searchHistory = [];
    this.saveSearchHistory();
    this.showSearchHistory();
  }

  /**
   * 現在の検索を保存
   */
  saveCurrentSearch() {
    if (!this.currentQuery) return;

    const searchData = {
      query: this.currentQuery,
      filters: { ...this.currentFilters },
      timestamp: Date.now(),
      name: `${this.currentQuery} - ${new Date().toLocaleDateString()}`
    };

    this.savedSearches.unshift(searchData);
    this.saveSavedSearches();
    
    // 成功フィードバック
    this.showNotification('検索を保存しました', 'success');
  }

  /**
   * URL更新
   */
  updateURL(query, filters) {
    const params = new URLSearchParams();
    
    if (query) {
      params.set('q', query);
    }
    
    Object.entries(filters).forEach(([key, value]) => {
      if (Array.isArray(value) && value.length > 0) {
        value.forEach(v => params.append(key, v));
      } else if (value && value !== 'all' && value !== '') {
        params.set(key, value);
      }
    });

    const newURL = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    window.history.pushState({ query, filters }, '', newURL);
  }

  /**
   * URLから読み込み
   */
  loadFromURL() {
    const params = new URLSearchParams(window.location.search);
    const query = params.get('q');
    
    if (query) {
      this.searchInput.value = query;
      this.currentQuery = query;
    }
    
    // フィルターを復元
    this.restoreFilters(params);
    
    // 初期検索を実行
    if (query || this.hasActiveFilters()) {
      this.performSearch(query);
    }
  }

  /**
   * フィルター復元
   */
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
    if (salaryMin) {
      const input = document.getElementById('salaryMin');
      if (input) input.value = salaryMin;
    }
    if (salaryMax) {
      const input = document.getElementById('salaryMax');
      if (input) input.value = salaryMax;
    }
    
    // リモート可
    const remoteOk = params.get('remoteOk') === 'true';
    if (remoteOk) {
      const input = document.getElementById('remoteOk');
      if (input) input.checked = true;
    }
    
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

  /**
   * アクティブフィルターがあるか
   */
  hasActiveFilters() {
    return Object.keys(this.currentFilters).some(key => {
      const value = this.currentFilters[key];
      return Array.isArray(value) ? value.length > 0 : !!value;
    });
  }

  /**
   * ローカルストレージから検索履歴読み込み
   */
  loadSearchHistory() {
    try {
      const stored = localStorage.getItem('searchHistory');
      this.searchHistory = stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('検索履歴読み込みエラー:', error);
      this.searchHistory = [];
    }
  }

  /**
   * 検索履歴保存
   */
  saveSearchHistory() {
    try {
      localStorage.setItem('searchHistory', JSON.stringify(this.searchHistory));
    } catch (error) {
      console.error('検索履歴保存エラー:', error);
    }
  }

  /**
   * 保存された検索読み込み
   */
  loadSavedSearches() {
    try {
      const stored = localStorage.getItem('savedSearches');
      this.savedSearches = stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('保存検索読み込みエラー:', error);
      this.savedSearches = [];
    }
  }

  /**
   * 保存された検索保存
   */
  saveSavedSearches() {
    try {
      localStorage.setItem('savedSearches', JSON.stringify(this.savedSearches));
    } catch (error) {
      console.error('保存検索保存エラー:', error);
    }
  }

  /**
   * 結果のアニメーション
   */
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

  /**
   * 日付フォーマット
   */
  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * HTMLエスケープ
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * クエリハイライト
   */
  highlightQuery(text, query) {
    if (!query) return text;
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  /**
   * 相対時間フォーマット
   */
  formatRelativeTime(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'たった今';
    if (minutes < 60) return `${minutes}分前`;
    if (hours < 24) return `${hours}時間前`;
    if (days < 7) return `${days}日前`;
    
    return new Date(timestamp).toLocaleDateString();
  }

  /**
   * 通知表示
   */
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <i class="fas ${type === 'success' ? 'fa-check' : 'fa-info-circle'}"></i>
      <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('show');
    }, 100);
    
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  /**
   * 破棄処理
   */
  destroy() {
    // イベントリスナーの削除
    if (this.searchInput) {
      this.searchInput.removeEventListener('input', this.handleSearchInput);
      this.searchInput.removeEventListener('focus', this.showSearchDropdown);
      this.searchInput.removeEventListener('keydown', this.handleKeyNavigation);
    }

    document.removeEventListener('click', this.handleOutsideClick);
    window.removeEventListener('popstate', this.loadFromURL);

    // Intersection Observer の削除
    if (this.infiniteScrollObserver) {
      this.infiniteScrollObserver.disconnect();
    }

    // 進行中の検索をキャンセル
    if (this.searchController) {
      this.searchController.abort();
    }

    // タイマーをクリア
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
  }
}

// グローバル初期化
window.AdvancedSearch = AdvancedSearch;

// DOM読み込み完了後に自動初期化
document.addEventListener('DOMContentLoaded', () => {
  if (document.querySelector('[data-search-container]') || document.getElementById('searchInput')) {
    window.advancedSearch = new AdvancedSearch({
      debounceDelay: 300,
      maxHistoryItems: 10,
      resultsPerPage: 20
    });
  }
});