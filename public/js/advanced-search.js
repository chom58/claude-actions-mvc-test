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
    this.searchInput = document.getElementById('mainSearchInput');
    this.searchDropdown = document.getElementById('searchDropdown');
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
    `;

    // 検索コンテナの後に挿入
    this.searchContainer.parentNode.insertBefore(container, this.searchContainer.nextSibling);
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
    const clearBtn = document.getElementById('searchClearBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', this.clearSearch.bind(this));
    }

    // フィルタートグル
    const filterToggle = document.getElementById('filterToggleBtn');
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
  }

  /**
   * 検索実行
   */
  async performSearch(query, page = 1) {
    if (this.isSearching) {
      this.searchController?.abort();
    }

    this.isSearching = true;
    this.searchController = new AbortController();
    
    const startTime = performance.now();
    
    try {
      this.showLoadingState();
      
      const searchParams = new URLSearchParams({
        q: query,
        page: page,
        ...this.currentFilters
      });

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

      if (page === 1) {
        this.searchResults = data.results || [];
        this.renderSearchResults(this.searchResults);
      } else {
        this.searchResults.push(...(data.results || []));
        this.appendSearchResults(data.results || []);
      }

      this.hasMoreResults = data.hasMore || false;
      this.currentPage = page;

      this.updateResultsStats(data.total || this.searchResults.length, searchTime);
      this.addToSearchHistory(query);
      this.updateURL(query, this.currentFilters);
      this.hideSearchDropdown();

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
   * より多くの結果を読み込み
   */
  async loadMoreResults() {
    if (!this.currentQuery || !this.hasMoreResults) return;
    await this.performSearch(this.currentQuery, this.currentPage + 1);
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
    const historyList = document.getElementById('historyList');
    if (!historyList || !this.searchHistory.length) return;

    historyList.innerHTML = this.searchHistory.map((item, index) => `
      <div class="history-item" data-query="${item.query}" data-index="${index}">
        <i class="fas fa-history"></i>
        <span class="history-text">${item.query}</span>
        <span class="history-time">${this.formatRelativeTime(item.timestamp)}</span>
        <button class="remove-history-btn" data-remove-index="${index}">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `).join('');

    // イベントリスナー
    historyList.addEventListener('click', (e) => {
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
  }

  /**
   * 検索結果のレンダリング
   */
  renderSearchResults(results) {
    const resultsGrid = document.getElementById('resultsGrid');
    if (!resultsGrid) return;

    if (!results.length) {
      resultsGrid.innerHTML = `
        <div class="no-results">
          <i class="fas fa-search"></i>
          <h3>検索結果がありません</h3>
          <p>別のキーワードで検索してみてください</p>
        </div>
      `;
      return;
    }

    resultsGrid.innerHTML = results.map(item => this.renderResultItem(item)).join('');
  }

  /**
   * 検索結果の追加レンダリング（無限スクロール用）
   */
  appendSearchResults(results) {
    const resultsGrid = document.getElementById('resultsGrid');
    if (!resultsGrid || !results.length) return;

    const fragment = document.createDocumentFragment();
    results.forEach(item => {
      const div = document.createElement('div');
      div.innerHTML = this.renderResultItem(item);
      fragment.appendChild(div.firstChild);
    });

    resultsGrid.appendChild(fragment);
  }

  /**
   * 個別結果アイテムのレンダリング
   */
  renderResultItem(item) {
    const baseClass = 'result-item';
    const typeClass = `result-${item.type}`;
    
    return `
      <div class="${baseClass} ${typeClass}" data-id="${item.id}" data-type="${item.type}">
        <div class="result-image">
          <img src="${item.image || '/images/placeholder.jpg'}" alt="${item.title}" loading="lazy">
          <div class="result-type-badge">${this.getTypeBadge(item.type)}</div>
        </div>
        <div class="result-content">
          <h3 class="result-title">${item.title}</h3>
          <div class="result-meta">
            ${this.renderResultMeta(item)}
          </div>
          <p class="result-description">${item.description || ''}</p>
          <div class="result-tags">
            ${(item.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('')}
          </div>
          <div class="result-actions">
            ${this.renderResultActions(item)}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 結果タイプバッジの取得
   */
  getTypeBadge(type) {
    const badges = {
      'designer-job': '求人',
      'creative-event': 'イベント',
      'collaboration': 'コラボ'
    };
    return badges[type] || type;
  }

  /**
   * 結果メタ情報のレンダリング
   */
  renderResultMeta(item) {
    switch (item.type) {
      case 'designer-job':
        return `
          <span class="meta-item"><i class="fas fa-building"></i> ${item.company}</span>
          <span class="meta-item"><i class="fas fa-map-marker-alt"></i> ${item.location}</span>
          <span class="meta-item"><i class="fas fa-yen-sign"></i> ${item.salary}</span>
        `;
      case 'creative-event':
        return `
          <span class="meta-item"><i class="fas fa-calendar"></i> ${item.date}</span>
          <span class="meta-item"><i class="fas fa-map-marker-alt"></i> ${item.location}</span>
          <span class="meta-item"><i class="fas fa-users"></i> ${item.capacity}</span>
        `;
      case 'collaboration':
        return `
          <span class="meta-item"><i class="fas fa-clock"></i> ${item.duration}</span>
          <span class="meta-item"><i class="fas fa-yen-sign"></i> ${item.budget}</span>
          <span class="meta-item"><i class="fas fa-user"></i> ${item.client}</span>
        `;
      default:
        return '';
    }
  }

  /**
   * 結果アクションボタンのレンダリング
   */
  renderResultActions(item) {
    const baseActions = `
      <button class="action-btn bookmark-btn" data-action="bookmark" data-id="${item.id}">
        <i class="fas fa-bookmark"></i>
      </button>
      <button class="action-btn share-btn" data-action="share" data-id="${item.id}">
        <i class="fas fa-share"></i>
      </button>
    `;

    switch (item.type) {
      case 'designer-job':
        return `
          ${baseActions}
          <button class="action-btn apply-btn" data-action="apply" data-id="${item.id}">
            <i class="fas fa-paper-plane"></i>
            <span>応募する</span>
          </button>
        `;
      case 'creative-event':
        return `
          ${baseActions}
          <button class="action-btn register-btn" data-action="register" data-id="${item.id}">
            <i class="fas fa-calendar-plus"></i>
            <span>参加登録</span>
          </button>
        `;
      case 'collaboration':
        return `
          ${baseActions}
          <button class="action-btn contact-btn" data-action="contact" data-id="${item.id}">
            <i class="fas fa-envelope"></i>
            <span>問い合わせ</span>
          </button>
        `;
      default:
        return baseActions;
    }
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
    this.updateURL('', {});
  }

  /**
   * 結果クリア
   */
  clearResults() {
    const resultsGrid = document.getElementById('resultsGrid');
    if (resultsGrid) {
      resultsGrid.innerHTML = '';
    }
    this.updateResultsStats(0, 0);
    this.searchResults = [];
  }

  /**
   * フィルターパネルトグル
   */
  toggleFilterPanel() {
    if (!this.filterPanel) return;
    
    const isVisible = this.filterPanel.classList.contains('show');
    this.filterPanel.classList.toggle('show', !isVisible);
    
    const toggleBtn = document.getElementById('filterToggleBtn');
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
    }
  }

  /**
   * 検索ドロップダウン非表示
   */
  hideSearchDropdown() {
    if (this.searchDropdown) {
      this.searchDropdown.classList.remove('show');
    }
  }

  /**
   * 外部クリック処理
   */
  handleOutsideClick(event) {
    if (!this.searchContainer?.contains(event.target)) {
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
    const resultsGrid = document.getElementById('resultsGrid');
    if (resultsGrid) {
      resultsGrid.innerHTML = `
        <div class="search-error">
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
    if (!query || this.searchHistory.some(item => item.query === query)) return;

    this.searchHistory.unshift({
      query,
      timestamp: Date.now()
    });

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
      if (value && value !== 'all') {
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
      
      // フィルターも復元
      this.currentFilters = {};
      params.forEach((value, key) => {
        if (key !== 'q') {
          this.currentFilters[key] = value;
        }
      });
      
      this.performSearch(query);
    }
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
   * フィルター更新
   */
  updateFilters(filters) {
    this.currentFilters = { ...this.currentFilters, ...filters };
    
    if (this.currentQuery) {
      this.performSearch(this.currentQuery);
    }
    
    this.updateFilterCount();
  }

  /**
   * フィルター数更新
   */
  updateFilterCount() {
    const filterCount = document.getElementById('filterCount');
    if (!filterCount) return;

    const activeFilters = Object.values(this.currentFilters).filter(
      value => value && value !== 'all' && value !== ''
    ).length;

    if (activeFilters > 0) {
      filterCount.textContent = activeFilters;
      filterCount.classList.add('show');
    } else {
      filterCount.classList.remove('show');
    }
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
  if (document.querySelector('[data-search-container]')) {
    window.advancedSearch = new AdvancedSearch();
  }
});