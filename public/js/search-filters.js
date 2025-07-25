/**
 * 検索フィルター機能
 * フィルターパネルUI、フィルター状態管理、URLパラメータ同期
 */

class SearchFilters {
  constructor(advancedSearch = null) {
    this.advancedSearch = advancedSearch;
    
    // DOM要素の参照
    this.filterPanel = null;
    this.filterSections = [];
    
    // フィルター状態
    this.activeFilters = {};
    this.defaultFilters = {
      contentType: ['designer-job', 'creative-event', 'collaboration'],
      sortBy: 'relevance',
      viewMode: 'grid'
    };

    // 地域データ
    this.locationData = [
      '東京都', '大阪府', '神奈川県', '愛知県', '福岡県', '北海道', '宮城県', '広島県',
      '渋谷区', '新宿区', '港区', '品川区', '世田谷区', '目黒区', '原宿', '表参道',
      '青山', '恵比寿', '六本木', '銀座', '丸の内', '秋葉原', '池袋', '吉祥寺'
    ];

    this.init();
  }

  /**
   * 初期化処理
   */
  init() {
    this.initializeDOM();
    this.initializeFilters();
    this.bindEvents();
    this.loadFromURL();
  }

  /**
   * DOM要素の初期化
   */
  initializeDOM() {
    this.filterPanel = document.getElementById('filterPanel');
    if (!this.filterPanel) {
      console.error('フィルターパネルが見つかりません');
      return;
    }

    this.filterSections = Array.from(this.filterPanel.querySelectorAll('[data-filter-section]'));
    this.initializeDefaultExpanded();
  }

  /**
   * デフォルト展開セクションの初期化
   */
  initializeDefaultExpanded() {
    // コンテンツタイプとソートセクションをデフォルトで展開
    const defaultExpanded = ['content-type', 'display'];
    
    this.filterSections.forEach(section => {
      const sectionName = section.dataset.filterSection;
      if (defaultExpanded.includes(sectionName)) {
        section.classList.add('expanded');
      }
    });
  }

  /**
   * フィルターの初期化
   */
  initializeFilters() {
    this.activeFilters = { ...this.defaultFilters };
    this.initializeSalaryRange();
    this.initializeDurationRange();
    this.initializeLocationAutocomplete();
    this.updateFilterCounts();
  }

  /**
   * 給与範囲スライダーの初期化
   */
  initializeSalaryRange() {
    const salaryMin = document.getElementById('salaryMin');
    const salaryMax = document.getElementById('salaryMax');
    const minLabel = document.getElementById('salaryMinLabel');
    const maxLabel = document.getElementById('salaryMaxLabel');

    if (!salaryMin || !salaryMax) return;

    const updateSalaryLabels = () => {
      const minValue = parseInt(salaryMin.value);
      const maxValue = parseInt(salaryMax.value);
      
      // 最小値が最大値を超えないように調整
      if (minValue > maxValue) {
        salaryMin.value = maxValue;
      }
      if (maxValue < minValue) {
        salaryMax.value = minValue;
      }

      if (minLabel) minLabel.textContent = `${salaryMin.value}万円`;
      if (maxLabel) maxLabel.textContent = `${salaryMax.value}万円`;
      
      this.activeFilters.salaryMin = salaryMin.value;
      this.activeFilters.salaryMax = salaryMax.value;
    };

    salaryMin.addEventListener('input', updateSalaryLabels);
    salaryMax.addEventListener('input', updateSalaryLabels);
    updateSalaryLabels();
  }

  /**
   * 期間範囲スライダーの初期化
   */
  initializeDurationRange() {
    const durationMin = document.getElementById('durationMin');
    const durationMax = document.getElementById('durationMax');
    const minLabel = document.getElementById('durationMinLabel');
    const maxLabel = document.getElementById('durationMaxLabel');

    if (!durationMin || !durationMax) return;

    const updateDurationLabels = () => {
      const minValue = parseInt(durationMin.value);
      const maxValue = parseInt(durationMax.value);
      
      if (minValue > maxValue) {
        durationMin.value = maxValue;
      }
      if (maxValue < minValue) {
        durationMax.value = minValue;
      }

      if (minLabel) minLabel.textContent = `${durationMin.value}ヶ月`;
      if (maxLabel) maxLabel.textContent = `${durationMax.value}ヶ月`;
      
      this.activeFilters.durationMin = durationMin.value;
      this.activeFilters.durationMax = durationMax.value;
    };

    durationMin.addEventListener('input', updateDurationLabels);
    durationMax.addEventListener('input', updateDurationLabels);
    updateDurationLabels();
  }

  /**
   * 場所自動補完の初期化
   */
  initializeLocationAutocomplete() {
    const locationInput = document.getElementById('locationInput');
    const locationSuggestions = document.getElementById('locationSuggestions');

    if (!locationInput || !locationSuggestions) return;

    locationInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      
      if (query.length < 1) {
        locationSuggestions.style.display = 'none';
        return;
      }

      const filtered = this.locationData.filter(location => 
        location.toLowerCase().includes(query)
      );

      if (filtered.length > 0) {
        locationSuggestions.innerHTML = filtered.map(location => `
          <div class="location-suggestion" data-location="${location}">
            <i class="fas fa-map-marker-alt"></i>
            <span>${location}</span>
          </div>
        `).join('');
        locationSuggestions.style.display = 'block';
      } else {
        locationSuggestions.style.display = 'none';
      }
    });

    // 候補選択
    locationSuggestions.addEventListener('click', (e) => {
      const suggestion = e.target.closest('.location-suggestion');
      if (suggestion) {
        const location = suggestion.dataset.location;
        locationInput.value = location;
        locationSuggestions.style.display = 'none';
        this.activeFilters.location = location;
        this.updateFilters();
      }
    });

    // 外部クリックで候補を閉じる
    document.addEventListener('click', (e) => {
      if (!locationInput.contains(e.target) && !locationSuggestions.contains(e.target)) {
        locationSuggestions.style.display = 'none';
      }
    });
  }

  /**
   * イベントバインディング
   */
  bindEvents() {
    if (!this.filterPanel) return;

    // セクション展開/折りたたみ
    this.filterPanel.addEventListener('click', (e) => {
      const sectionToggle = e.target.closest('[data-section-toggle]');
      if (sectionToggle) {
        const section = sectionToggle.closest('[data-filter-section]');
        this.toggleSection(section);
      }
    });

    // チェックボックス変更
    this.filterPanel.addEventListener('change', (e) => {
      if (e.target.type === 'checkbox') {
        this.handleCheckboxChange(e.target);
      } else if (e.target.type === 'radio') {
        this.handleRadioChange(e.target);
      } else if (e.target.tagName === 'SELECT') {
        this.handleSelectChange(e.target);
      }
    });

    // スキルタグクリック
    this.filterPanel.addEventListener('click', (e) => {
      const skillTag = e.target.closest('.skill-tag');
      if (skillTag) {
        this.toggleSkillTag(skillTag);
      }
    });

    // 表示モード切り替え
    this.filterPanel.addEventListener('click', (e) => {
      const viewBtn = e.target.closest('[data-view]');
      if (viewBtn) {
        this.switchViewMode(viewBtn);
      }
    });

    // フィルターアクション
    this.bindFilterActions();
  }

  /**
   * フィルターアクションのバインディング
   */
  bindFilterActions() {
    // フィルターリセット
    const clearFilters = document.getElementById('clearFiltersBtn');
    if (clearFilters) {
      clearFilters.addEventListener('click', this.clearAllFilters.bind(this));
    }

    // フィルター適用
    const applyFilters = document.getElementById('applyFiltersBtn');
    if (applyFilters) {
      applyFilters.addEventListener('click', this.applyFilters.bind(this));
    }

    // フィルター保存
    const saveFilter = document.getElementById('saveFilterBtn');
    if (saveFilter) {
      saveFilter.addEventListener('click', this.saveCurrentFilters.bind(this));
    }

    // パネル閉じる
    const closePanel = document.getElementById('closePanelBtn');
    if (closePanel) {
      closePanel.addEventListener('click', this.closeFilterPanel.bind(this));
    }
  }

  /**
   * セクション展開/折りたたみ
   */
  toggleSection(section) {
    if (!section) return;
    
    const isExpanded = section.classList.contains('expanded');
    section.classList.toggle('expanded', !isExpanded);
    
    // アニメーション効果
    const content = section.querySelector('.section-content');
    if (content) {
      if (!isExpanded) {
        content.style.maxHeight = content.scrollHeight + 'px';
        section.classList.add('expanding');
        setTimeout(() => section.classList.remove('expanding'), 300);
      } else {
        content.style.maxHeight = '0';
      }
    }
  }

  /**
   * チェックボックス変更処理
   */
  handleCheckboxChange(checkbox) {
    const name = checkbox.name;
    const value = checkbox.value;
    
    if (!this.activeFilters[name]) {
      this.activeFilters[name] = [];
    }

    if (checkbox.checked) {
      if (!this.activeFilters[name].includes(value)) {
        this.activeFilters[name].push(value);
      }
    } else {
      this.activeFilters[name] = this.activeFilters[name].filter(v => v !== value);
    }

    this.updateFilters();
  }

  /**
   * ラジオボタン変更処理
   */
  handleRadioChange(radio) {
    const name = radio.name;
    const value = radio.value;
    
    this.activeFilters[name] = value;
    this.updateFilters();
  }

  /**
   * セレクト変更処理
   */
  handleSelectChange(select) {
    const name = select.name;
    const value = select.value;
    
    this.activeFilters[name] = value;
    this.updateFilters();
  }

  /**
   * スキルタグ切り替え
   */
  toggleSkillTag(skillTag) {
    const skill = skillTag.dataset.skill;
    const isSelected = skillTag.classList.contains('selected');
    
    skillTag.classList.toggle('selected', !isSelected);
    
    if (!this.activeFilters.skills) {
      this.activeFilters.skills = [];
    }

    if (!isSelected) {
      if (!this.activeFilters.skills.includes(skill)) {
        this.activeFilters.skills.push(skill);
      }
    } else {
      this.activeFilters.skills = this.activeFilters.skills.filter(s => s !== skill);
    }

    this.updateFilters();
  }

  /**
   * 表示モード切り替え
   */
  switchViewMode(viewBtn) {
    const viewMode = viewBtn.dataset.view;
    
    // ボタンの状態更新
    this.filterPanel.querySelectorAll('[data-view]').forEach(btn => {
      btn.classList.remove('active');
    });
    viewBtn.classList.add('active');
    
    this.activeFilters.viewMode = viewMode;
    this.updateResultsView(viewMode);
  }

  /**
   * 結果表示の更新
   */
  updateResultsView(viewMode) {
    const resultsGrid = document.getElementById('resultsGrid');
    if (!resultsGrid) return;

    resultsGrid.className = `results-grid results-${viewMode}`;
    
    // ビューモード変更をmain searchに通知
    if (this.advancedSearch) {
      this.advancedSearch.currentFilters.viewMode = viewMode;
    }
  }

  /**
   * フィルター更新
   */
  updateFilters() {
    this.updateFilterCounts();
    this.updateFilterSummary();
    
    // メイン検索システムにフィルター変更を通知
    if (this.advancedSearch) {
      this.advancedSearch.updateFilters(this.activeFilters);
    }
  }

  /**
   * フィルター件数の更新
   */
  updateFilterCounts() {
    // 実際のAPI呼び出しで件数を取得する場合の例
    this.fetchFilterCounts().then(counts => {
      Object.entries(counts).forEach(([key, count]) => {
        const countElement = document.querySelector(`[data-count="${key}"]`);
        if (countElement) {
          countElement.textContent = count;
        }
      });
    }).catch(error => {
      console.error('フィルター件数取得エラー:', error);
    });
  }

  /**
   * フィルター件数取得（API呼び出し）
   */
  async fetchFilterCounts() {
    try {
      const params = new URLSearchParams(this.activeFilters);
      const response = await fetch(`/api/search/counts?${params}`);
      
      if (!response.ok) {
        throw new Error(`件数取得エラー: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      // フォールバックとしてダミーデータを返す
      return {
        'designer-job': Math.floor(Math.random() * 100) + 10,
        'creative-event': Math.floor(Math.random() * 50) + 5,
        'collaboration': Math.floor(Math.random() * 30) + 3
      };
    }
  }

  /**
   * フィルター概要の更新
   */
  updateFilterSummary() {
    const summary = document.getElementById('filterSummary');
    if (!summary) return;

    const activeCount = this.getActiveFilterCount();
    const countText = summary.querySelector('.active-filters-count');
    
    if (countText) {
      countText.textContent = `${activeCount}個のフィルターが適用中`;
    }
  }

  /**
   * アクティブフィルター数の取得
   */
  getActiveFilterCount() {
    let count = 0;
    
    Object.entries(this.activeFilters).forEach(([key, value]) => {
      if (key === 'contentType' || key === 'sortBy' || key === 'viewMode') {
        return; // デフォルトフィルターは除外
      }
      
      if (Array.isArray(value)) {
        count += value.length;
      } else if (value && value !== 'all' && value !== '') {
        count++;
      }
    });
    
    return count;
  }

  /**
   * すべてのフィルターをクリア
   */
  clearAllFilters() {
    // フォーム要素をリセット
    const form = this.filterPanel.querySelector('form') || this.filterPanel;
    const inputs = form.querySelectorAll('input[type="checkbox"], input[type="radio"]');
    
    inputs.forEach(input => {
      if (input.type === 'checkbox') {
        // コンテンツタイプのデフォルトはチェックを維持
        if (input.name === 'contentType') {
          input.checked = true;
        } else {
          input.checked = false;
        }
      } else if (input.type === 'radio') {
        // デフォルト値に戻す
        if (input.value === 'all') {
          input.checked = true;
        } else {
          input.checked = false;
        }
      }
    });

    // セレクト要素をリセット
    const selects = form.querySelectorAll('select');
    selects.forEach(select => {
      select.selectedIndex = 0;
    });

    // レンジスライダーをリセット
    this.resetRangeSliders();

    // スキルタグをリセット
    this.resetSkillTags();

    // 場所入力をクリア
    const locationInput = document.getElementById('locationInput');
    if (locationInput) {
      locationInput.value = '';
    }

    // フィルター状態をリセット
    this.activeFilters = { ...this.defaultFilters };
    this.updateFilters();
    
    this.showNotification('フィルターをリセットしました', 'info');
  }

  /**
   * レンジスライダーのリセット
   */
  resetRangeSliders() {
    const salaryMin = document.getElementById('salaryMin');
    const salaryMax = document.getElementById('salaryMax');
    const durationMin = document.getElementById('durationMin');
    const durationMax = document.getElementById('durationMax');

    if (salaryMin && salaryMax) {
      salaryMin.value = 300;
      salaryMax.value = 600;
      this.initializeSalaryRange();
    }

    if (durationMin && durationMax) {
      durationMin.value = 3;
      durationMax.value = 6;
      this.initializeDurationRange();
    }
  }

  /**
   * スキルタグのリセット
   */
  resetSkillTags() {
    const skillTags = this.filterPanel.querySelectorAll('.skill-tag');
    skillTags.forEach(tag => {
      tag.classList.remove('selected');
    });
  }

  /**
   * フィルター適用
   */
  applyFilters() {
    if (this.advancedSearch && this.advancedSearch.currentQuery) {
      this.advancedSearch.performSearch(this.advancedSearch.currentQuery);
    }
    
    this.closeFilterPanel();
    this.showNotification('フィルターを適用しました', 'success');
  }

  /**
   * 現在のフィルターを保存
   */
  saveCurrentFilters() {
    const name = prompt('フィルター設定の名前を入力してください:');
    if (!name) return;

    const filterData = {
      name,
      filters: { ...this.activeFilters },
      timestamp: Date.now()
    };

    try {
      const saved = JSON.parse(localStorage.getItem('savedFilters') || '[]');
      saved.unshift(filterData);
      
      // 最大10件まで保存
      if (saved.length > 10) {
        saved.splice(10);
      }
      
      localStorage.setItem('savedFilters', JSON.stringify(saved));
      this.showNotification('フィルターを保存しました', 'success');
    } catch (error) {
      console.error('フィルター保存エラー:', error);
      this.showNotification('フィルターの保存に失敗しました', 'error');
    }
  }

  /**
   * フィルターパネルを閉じる
   */
  closeFilterPanel() {
    if (this.filterPanel) {
      this.filterPanel.classList.remove('show');
    }
    
    const toggleBtn = document.getElementById('filterToggleBtn');
    if (toggleBtn) {
      toggleBtn.classList.remove('active');
    }
  }

  /**
   * URLからフィルターを読み込み
   */
  loadFromURL() {
    const params = new URLSearchParams(window.location.search);
    
    params.forEach((value, key) => {
      if (key === 'q') return; // クエリは除外
      
      // 配列値の処理
      if (key.endsWith('[]') || ['contentType', 'skills', 'experienceLevel', 'employmentType'].includes(key)) {
        if (!this.activeFilters[key]) {
          this.activeFilters[key] = [];
        }
        this.activeFilters[key].push(value);
      } else {
        this.activeFilters[key] = value;
      }
    });

    this.applyFiltersToDOM();
  }

  /**
   * DOMにフィルター状態を適用
   */
  applyFiltersToDOM() {
    Object.entries(this.activeFilters).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach(v => {
          const checkbox = this.filterPanel.querySelector(`input[name="${key}"][value="${v}"]`);
          if (checkbox) {
            checkbox.checked = true;
          }
        });
      } else {
        const input = this.filterPanel.querySelector(`input[name="${key}"][value="${value}"], select[name="${key}"]`);
        if (input) {
          if (input.type === 'radio' || input.type === 'checkbox') {
            input.checked = true;
          } else {
            input.value = value;
          }
        }
      }
    });

    this.updateFilters();
  }

  /**
   * 通知表示
   */
  showNotification(message, type = 'info') {
    // advanced-search.jsの通知機能を利用
    if (this.advancedSearch && this.advancedSearch.showNotification) {
      this.advancedSearch.showNotification(message, type);
    } else {
      // フォールバック
      console.log(`${type.toUpperCase()}: ${message}`);
    }
  }

  /**
   * フィルター状態の取得
   */
  getActiveFilters() {
    return { ...this.activeFilters };
  }

  /**
   * フィルター状態の設定
   */
  setActiveFilters(filters) {
    this.activeFilters = { ...this.activeFilters, ...filters };
    this.applyFiltersToDOM();
    this.updateFilters();
  }

  /**
   * 特定フィルターの取得
   */
  getFilter(key) {
    return this.activeFilters[key];
  }

  /**
   * 特定フィルターの設定
   */
  setFilter(key, value) {
    this.activeFilters[key] = value;
    this.updateFilters();
  }

  /**
   * フィルターが適用されているかチェック
   */
  hasActiveFilters() {
    return this.getActiveFilterCount() > 0;
  }

  /**
   * 破棄処理
   */
  destroy() {
    // イベントリスナーの削除は自動的に行われる（要素削除時）
    this.activeFilters = {};
    this.advancedSearch = null;
  }
}

// グローバル変数として公開
window.SearchFilters = SearchFilters;

// DOM読み込み完了後の初期化
document.addEventListener('DOMContentLoaded', () => {
  // advanced-searchが先に読み込まれている場合は連携
  const advancedSearchInstance = window.advancedSearch;
  
  if (document.getElementById('filterPanel')) {
    window.searchFilters = new SearchFilters(advancedSearchInstance);
    
    // advanced-searchに検索フィルターインスタンスを渡す
    if (advancedSearchInstance) {
      advancedSearchInstance.searchFilters = window.searchFilters;
    }
  }
});

// CSS for notifications and additional styling
const filterCSS = `
<style>
/* 検索結果グリッドスタイル */
.search-results {
  margin-top: 2rem;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 0;
  border-bottom: 1px solid var(--color-border, #333);
  margin-bottom: 1.5rem;
}

.results-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  color: var(--text-secondary, #f0f0f0);
  font-size: 0.9rem;
}

.results-count {
  font-weight: 600;
  color: var(--text-primary, #ffffff);
}

.search-time {
  opacity: 0.7;
}

.results-actions {
  display: flex;
  gap: 0.5rem;
}

.save-search-btn {
  background: none;
  border: 1px solid var(--color-border, #333);
  color: var(--text-primary, #ffffff);
  padding: 0.375rem 0.75rem;
  border-radius: 8px;
  cursor: pointer;
  transition: var(--transition, all 0.3s ease);
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.875rem;
}

.save-search-btn:hover {
  background: var(--neon-green, #00FF00);
  border-color: var(--neon-green, #00FF00);
  color: var(--color-background, #0a0a0a);
}

/* 結果グリッド */
.results-grid {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
}

.results-grid.results-list {
  grid-template-columns: 1fr;
}

.results-grid.results-list .result-item {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.results-grid.results-list .result-image {
  width: 150px;
  height: 100px;
  flex-shrink: 0;
}

.results-grid.results-list .result-content {
  flex: 1;
}

/* 結果アイテム */
.result-item {
  background: var(--card-bg, #1a1a1a);
  border: 1px solid var(--color-border, #333);
  border-radius: 12px;
  overflow: hidden;
  transition: var(--transition, all 0.3s ease);
  cursor: pointer;
}

.result-item:hover {
  border-color: var(--neon-blue, #00FFFF);
  box-shadow: 0 5px 20px rgba(0, 255, 255, 0.2);
  transform: translateY(-2px);
}

.result-image {
  position: relative;
  width: 100%;
  height: 200px;
  overflow: hidden;
}

.result-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: var(--transition, all 0.3s ease);
}

.result-item:hover .result-image img {
  transform: scale(1.05);
}

.result-type-badge {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  background: var(--neon-pink, #FF1493);
  color: var(--color-background, #0a0a0a);
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
}

.result-content {
  padding: 1rem;
}

.result-title {
  color: var(--text-primary, #ffffff);
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  line-height: 1.3;
}

.result-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: var(--text-secondary, #f0f0f0);
  font-size: 0.8rem;
}

.meta-item i {
  color: var(--neon-blue, #00FFFF);
}

.result-description {
  color: var(--text-secondary, #f0f0f0);
  font-size: 0.875rem;
  line-height: 1.4;
  margin-bottom: 0.75rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.result-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-bottom: 1rem;
}

.tag {
  background: var(--color-surface, #2a2a2a);
  color: var(--text-primary, #ffffff);
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 500;
}

.result-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.action-btn {
  background: none;
  border: 1px solid var(--color-border, #333);
  color: var(--text-primary, #ffffff);
  padding: 0.375rem;
  border-radius: 6px;
  cursor: pointer;
  transition: var(--transition, all 0.3s ease);
  font-size: 0.875rem;
}

.action-btn:hover {
  border-color: var(--neon-blue, #00FFFF);
  color: var(--neon-blue, #00FFFF);
}

.apply-btn,
.register-btn,
.contact-btn {
  background: var(--neon-pink, #FF1493);
  border-color: var(--neon-pink, #FF1493);
  color: var(--color-background, #0a0a0a);
  padding: 0.5rem 1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.apply-btn:hover,
.register-btn:hover,
.contact-btn:hover {
  background: var(--neon-blue, #00FFFF);
  border-color: var(--neon-blue, #00FFFF);
  transform: translateY(-1px);
}

/* 空の結果 */
.no-results {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--text-secondary, #f0f0f0);
}

.no-results i {
  font-size: 3rem;
  color: var(--neon-blue, #00FFFF);
  margin-bottom: 1rem;
}

.no-results h3 {
  color: var(--text-primary, #ffffff);
  font-size: 1.25rem;
  margin-bottom: 0.5rem;
}

/* 検索エラー */
.search-error {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--text-secondary, #f0f0f0);
}

.search-error i {
  font-size: 3rem;
  color: var(--neon-pink, #FF1493);
  margin-bottom: 1rem;
}

.search-error h3 {
  color: var(--text-primary, #ffffff);
  font-size: 1.25rem;
  margin-bottom: 0.5rem;
}

.retry-btn {
  background: var(--neon-pink, #FF1493);
  border: none;
  color: var(--color-background, #0a0a0a);
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  margin-top: 1rem;
  transition: var(--transition, all 0.3s ease);
}

.retry-btn:hover {
  background: var(--neon-blue, #00FFFF);
  transform: translateY(-2px);
}

/* ローディング */
.loading-indicator {
  display: none;
  justify-content: center;
  align-items: center;
  gap: 0.75rem;
  padding: 2rem;
  color: var(--text-secondary, #f0f0f0);
  font-size: 0.9rem;
}

.loading-indicator i {
  color: var(--neon-blue, #00FFFF);
  font-size: 1.25rem;
}

/* 無限スクロールトリガー */
.load-more-trigger {
  height: 50px;
  margin-top: 2rem;
}

/* 通知 */
.notification {
  position: fixed;
  top: 20px;
  right: 20px;
  background: var(--card-bg, #1a1a1a);
  border: 1px solid var(--color-border, #333);
  border-radius: 8px;
  padding: 1rem 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: var(--text-primary, #ffffff);
  font-size: 0.9rem;
  z-index: 10000;
  opacity: 0;
  transform: translateX(100%);
  transition: var(--transition, all 0.3s ease);
  max-width: 300px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
}

.notification.show {
  opacity: 1;
  transform: translateX(0);
}

.notification-success {
  border-color: var(--neon-green, #00FF00);
}

.notification-success i {
  color: var(--neon-green, #00FF00);
}

.notification-error {
  border-color: var(--neon-pink, #FF1493);
}

.notification-error i {
  color: var(--neon-pink, #FF1493);
}

.notification-info {
  border-color: var(--neon-blue, #00FFFF);
}

.notification-info i {
  color: var(--neon-blue, #00FFFF);
}

/* レスポンシブデザイン */
@media (max-width: 768px) {
  .results-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .results-header {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }
  
  .result-actions {
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .apply-btn,
  .register-btn,
  .contact-btn {
    width: 100%;
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .result-meta {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .notification {
    right: 10px;
    left: 10px;
    max-width: none;
  }
}
</style>
`;

// CSSを動的に追加
if (typeof document !== 'undefined') {
  document.head.insertAdjacentHTML('beforeend', filterCSS);
}