/**
 * レコメンド機能のフロントエンドJavaScript
 */

class RecommendationManager {
  constructor() {
    this.apiBaseUrl = '/api/recommendations';
    this.container = null;
    this.currentRecommendations = [];
    this.isLoading = false;
  }

  /**
   * 初期化
   */
  init(containerId = 'recommendations-container') {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.warn(`レコメンドコンテナ '${containerId}' が見つかりません`);
      return;
    }

    this.createLoadingSpinner();
    this.loadRecommendations();
    this.bindEvents();
  }

  /**
   * イベントのバインド
   */
  bindEvents() {
    // リフレッシュボタン
    const refreshBtn = document.getElementById('refresh-recommendations');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.refreshRecommendations());
    }

    // アルゴリズム切り替え
    const algorithmSelect = document.getElementById('recommendation-algorithm');
    if (algorithmSelect) {
      algorithmSelect.addEventListener('change', (e) => {
        this.loadRecommendations(e.target.value);
      });
    }
  }

  /**
   * ローディングスピナーを作成
   */
  createLoadingSpinner() {
    const spinner = document.createElement('div');
    spinner.className = 'recommendation-spinner';
    spinner.innerHTML = `
      <div class="spinner-border" role="status">
        <span class="sr-only">読込中...</span>
      </div>
      <p class="mt-2">レコメンドを取得中...</p>
    `;
    spinner.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    `;
    return spinner;
  }

  /**
   * レコメンドを読み込み
   */
  async loadRecommendations(algorithm = 'hybrid', limit = 10) {
    if (this.isLoading) return;
    
    this.isLoading = true;
    this.showLoading();

    try {
      const response = await fetch(`${this.apiBaseUrl}?algorithm=${algorithm}&limit=${limit}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        this.currentRecommendations = data.data.recommendations;
        this.renderRecommendations();
      } else {
        throw new Error(data.message || 'レコメンドの取得に失敗しました');
      }
    } catch (error) {
      console.error('レコメンド取得エラー:', error);
      this.showError('レコメンドの取得に失敗しました。しばらく後にもう一度お試しください。');
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * レコメンドを強制的に再生成
   */
  async refreshRecommendations(algorithm = 'hybrid') {
    if (this.isLoading) return;
    
    this.isLoading = true;
    this.showLoading();

    try {
      const response = await fetch(`${this.apiBaseUrl}/regenerate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({ algorithm, limit: 10 })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        // 新しいレコメンドを再取得
        await this.loadRecommendations(algorithm);
        this.showSuccess('新しいレコメンドを生成しました！');
      } else {
        throw new Error(data.message || 'レコメンドの再生成に失敗しました');
      }
    } catch (error) {
      console.error('レコメンド再生成エラー:', error);
      this.showError('レコメンドの再生成に失敗しました。');
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * レコメンドを描画
   */
  renderRecommendations() {
    if (!this.container) return;

    this.container.innerHTML = '';

    if (this.currentRecommendations.length === 0) {
      this.container.innerHTML = `
        <div class="empty-recommendations text-center p-4">
          <h5>レコメンドがありません</h5>
          <p class="text-muted">プロフィールを完成させ、投稿を閲覧することでレコメンドが表示されます。</p>
          <button class="btn btn-primary" onclick="window.recommendationManager.refreshRecommendations()">
            レコメンドを生成
          </button>
        </div>
      `;
      return;
    }

    const recommendationsHtml = this.currentRecommendations.map(rec => 
      this.renderRecommendationCard(rec)
    ).join('');

    this.container.innerHTML = `
      <div class="recommendations-grid">
        ${recommendationsHtml}
      </div>
    `;

    // カードのイベントリスナーを設定
    this.bindRecommendationEvents();
  }

  /**
   * レコメンドカードを描画
   */
  renderRecommendationCard(recommendation) {
    const { post, score, reason } = recommendation;
    const publishedAt = new Date(post.publishedAt || post.createdAt).toLocaleDateString('ja-JP');
    const reasonText = this.formatReasonText(reason);
    const scorePercentage = Math.round(score * 100);

    return `
      <div class="recommendation-card" data-recommendation-id="${recommendation.id}" data-post-id="${post.id}">
        <div class="card h-100">
          <div class="card-header d-flex justify-between align-items-center">
            <small class="text-muted">
              <i class="bi bi-star-fill text-warning"></i>
              マッチ度 ${scorePercentage}%
            </small>
            <div class="recommendation-actions">
              <button class="btn btn-sm btn-outline-secondary dismiss-btn" 
                      onclick="window.recommendationManager.dismissRecommendation(${recommendation.id})"
                      title="このレコメンドを非表示">
                <i class="bi bi-x"></i>
              </button>
            </div>
          </div>
          
          <div class="card-body">
            <h6 class="card-title">
              <a href="/posts/${post.id}" 
                 onclick="window.recommendationManager.handleClick(${recommendation.id}, ${post.id})"
                 class="text-decoration-none">
                ${this.escapeHtml(post.title)}
              </a>
            </h6>
            
            <p class="card-text text-muted small">
              ${this.truncateText(post.content, 100)}
            </p>
            
            ${post.author ? `
              <div class="author-info mb-2">
                <small class="text-muted">
                  <i class="bi bi-person"></i>
                  ${this.escapeHtml(post.author.username)}
                </small>
              </div>
            ` : ''}
            
            <div class="recommendation-reason">
              <small class="text-primary">
                <i class="bi bi-lightbulb"></i>
                ${reasonText}
              </small>
            </div>
          </div>
          
          <div class="card-footer">
            <small class="text-muted">
              <i class="bi bi-calendar"></i>
              ${publishedAt} ・
              <i class="bi bi-eye"></i>
              ${post.viewCount || 0} 回閲覧
            </small>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * レコメンドカードのイベントバインド
   */
  bindRecommendationEvents() {
    // カードが表示されたことを記録
    const cards = this.container.querySelectorAll('.recommendation-card');
    cards.forEach(card => {
      const recommendationId = card.dataset.recommendationId;
      this.handleView(recommendationId);
    });
  }

  /**
   * レコメンド理由のテキストをフォーマット
   */
  formatReasonText(reason) {
    if (!reason) return 'おすすめの内容です';
    
    if (reason.message) {
      return reason.message;
    }
    
    if (reason.type === 'content-based' && reason.matchedSkills && reason.matchedSkills.length > 0) {
      return `「${reason.matchedSkills.join(', ')}」に関連`;
    }
    
    if (reason.type === 'collaborative') {
      return '類似ユーザーが高く評価';
    }
    
    return 'おすすめの内容です';
  }

  /**
   * クリックイベントを処理
   */
  async handleClick(recommendationId, postId) {
    try {
      // フィードバックを送信
      await this.sendFeedback(recommendationId, 'click');
      
      // インタラクションを記録
      await this.recordInteraction(postId, 'post', 'view');
    } catch (error) {
      console.error('クリックイベント処理エラー:', error);
    }
  }

  /**
   * ビューイベントを処理
   */
  async handleView(recommendationId) {
    try {
      await this.sendFeedback(recommendationId, 'view');
    } catch (error) {
      console.error('ビューイベント処理エラー:', error);
    }
  }

  /**
   * レコメンドを却下
   */
  async dismissRecommendation(recommendationId) {
    try {
      await this.sendFeedback(recommendationId, 'dismiss');
      
      // カードを非表示
      const card = this.container.querySelector(`[data-recommendation-id="${recommendationId}"]`);
      if (card) {
        card.style.opacity = '0.5';
        card.style.pointerEvents = 'none';
        
        setTimeout(() => {
          card.remove();
        }, 300);
      }
      
      this.showSuccess('レコメンドを非表示にしました');
    } catch (error) {
      console.error('レコメンド却下エラー:', error);
      this.showError('レコメンドの却下に失敗しました');
    }
  }

  /**
   * フィードバックを送信
   */
  async sendFeedback(recommendationId, action) {
    const response = await fetch(`${this.apiBaseUrl}/${recommendationId}/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify({ action })
    });

    if (!response.ok) {
      throw new Error(`フィードバック送信エラー: ${response.status}`);
    }

    return response.json();
  }

  /**
   * インタラクションを記録
   */
  async recordInteraction(targetId, targetType, interactionType, metadata = null) {
    const response = await fetch(`${this.apiBaseUrl}/interactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify({
        targetId,
        targetType,
        interactionType,
        metadata
      })
    });

    if (!response.ok) {
      throw new Error(`インタラクション記録エラー: ${response.status}`);
    }

    return response.json();
  }

  /**
   * 認証トークンを取得
   */
  getAuthToken() {
    // セッションストレージやローカルストレージからトークンを取得
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || '';
  }

  /**
   * ローディング表示
   */
  showLoading() {
    if (!this.container) return;
    this.container.innerHTML = this.createLoadingSpinner().outerHTML;
  }

  /**
   * エラー表示
   */
  showError(message) {
    if (!this.container) return;
    this.container.innerHTML = `
      <div class="alert alert-danger text-center">
        <i class="bi bi-exclamation-triangle"></i>
        ${message}
      </div>
    `;
  }

  /**
   * 成功メッセージ表示
   */
  showSuccess(message) {
    // トーストまたは一時的な成功メッセージを表示
    const toast = document.createElement('div');
    toast.className = 'alert alert-success alert-dismissible fade show position-fixed';
    toast.style.cssText = 'top: 20px; right: 20px; z-index: 1050; min-width: 300px;';
    toast.innerHTML = `
      <i class="bi bi-check-circle"></i>
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(toast);
    
    // 3秒後に自動削除
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 3000);
  }

  /**
   * テキストをトランケート
   */
  truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  /**
   * HTMLエスケープ
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// グローバルインスタンスを作成
window.recommendationManager = new RecommendationManager();