const BasePage = require('./BasePage');

/**
 * ダッシュボードページのPage Object Model
 */
class DashboardPage extends BasePage {
  constructor(page) {
    super(page);
    
    // セレクタ定義
    this.selectors = {
      welcomeMessage: '.welcome-message',
      userProfile: '.user-profile',
      navigationMenu: '.navigation-menu',
      logoutButton: '.logout-button',
      profileEditButton: '.profile-edit-button',
      statsCards: '.stats-card',
      recentActivity: '.recent-activity',
      quickActions: '.quick-actions',
      notifications: '.notifications',
      jobRecommendations: '.job-recommendations',
      eventsSection: '.events-section',
      collaborationRequests: '.collaboration-requests'
    };
  }

  /**
   * ダッシュボードページに移動
   */
  async navigateToDashboard() {
    await this.goto('/dashboard');
    await this.waitForElement(this.selectors.welcomeMessage);
  }

  /**
   * ユーザーがログイン済みかチェック
   * @returns {boolean} ログイン済みかどうか
   */
  async isUserLoggedIn() {
    return await this.isVisible(this.selectors.welcomeMessage) &&
           await this.isVisible(this.selectors.userProfile);
  }

  /**
   * ウェルカムメッセージを取得
   * @returns {string} ウェルカムメッセージ
   */
  async getWelcomeMessage() {
    return await this.getText(this.selectors.welcomeMessage);
  }

  /**
   * ユーザープロフィール情報を取得
   * @returns {object} プロフィール情報
   */
  async getUserProfile() {
    const profileElement = this.selectors.userProfile;
    
    if (!await this.isVisible(profileElement)) {
      return null;
    }

    const username = await this.getText(`${profileElement} .username`);
    const email = await this.getText(`${profileElement} .email`);
    const profileType = await this.getText(`${profileElement} .profile-type`);
    
    return {
      username,
      email,
      profileType
    };
  }

  /**
   * ログアウト実行
   */
  async logout() {
    await this.click(this.selectors.logoutButton);
    await this.waitForLoadState();
  }

  /**
   * プロフィール編集ページに移動
   */
  async goToProfileEdit() {
    await this.click(this.selectors.profileEditButton);
    await this.waitForLoadState();
  }

  /**
   * 統計カードの情報を取得
   * @returns {Array} 統計情報の配列
   */
  async getStatsCards() {
    const cards = await this.page.$$eval(this.selectors.statsCards, elements => 
      elements.map(el => ({
        title: el.querySelector('.card-title')?.textContent.trim(),
        value: el.querySelector('.card-value')?.textContent.trim(),
        description: el.querySelector('.card-description')?.textContent.trim()
      }))
    );
    return cards;
  }

  /**
   * 最近のアクティビティを取得
   * @returns {Array} アクティビティの配列
   */
  async getRecentActivity() {
    const activities = await this.page.$$eval(`${this.selectors.recentActivity} .activity-item`, elements =>
      elements.map(el => ({
        title: el.querySelector('.activity-title')?.textContent.trim(),
        description: el.querySelector('.activity-description')?.textContent.trim(),
        timestamp: el.querySelector('.activity-timestamp')?.textContent.trim()
      }))
    );
    return activities;
  }

  /**
   * 通知数を取得
   * @returns {number} 通知数
   */
  async getNotificationCount() {
    const notificationBadge = `${this.selectors.notifications} .notification-badge`;
    
    if (await this.isVisible(notificationBadge)) {
      const count = await this.getText(notificationBadge);
      return parseInt(count) || 0;
    }
    
    return 0;
  }

  /**
   * おすすめ求人を取得
   * @returns {Array} 求人情報の配列
   */
  async getJobRecommendations() {
    const jobs = await this.page.$$eval(`${this.selectors.jobRecommendations} .job-card`, elements =>
      elements.map(el => ({
        title: el.querySelector('.job-title')?.textContent.trim(),
        company: el.querySelector('.job-company')?.textContent.trim(),
        location: el.querySelector('.job-location')?.textContent.trim(),
        salary: el.querySelector('.job-salary')?.textContent.trim()
      }))
    );
    return jobs;
  }

  /**
   * イベント情報を取得
   * @returns {Array} イベント情報の配列
   */
  async getUpcomingEvents() {
    const events = await this.page.$$eval(`${this.selectors.eventsSection} .event-card`, elements =>
      elements.map(el => ({
        title: el.querySelector('.event-title')?.textContent.trim(),
        date: el.querySelector('.event-date')?.textContent.trim(),
        location: el.querySelector('.event-location')?.textContent.trim(),
        participants: el.querySelector('.event-participants')?.textContent.trim()
      }))
    );
    return events;
  }

  /**
   * コラボレーション申請を取得
   * @returns {Array} コラボレーション申請の配列
   */
  async getCollaborationRequests() {
    const requests = await this.page.$$eval(`${this.selectors.collaborationRequests} .collaboration-card`, elements =>
      elements.map(el => ({
        title: el.querySelector('.collaboration-title')?.textContent.trim(),
        requester: el.querySelector('.collaboration-requester')?.textContent.trim(),
        description: el.querySelector('.collaboration-description')?.textContent.trim(),
        status: el.querySelector('.collaboration-status')?.textContent.trim()
      }))
    );
    return requests;
  }

  /**
   * ナビゲーションメニューから指定ページに移動
   * @param {string} menuItem - メニュー項目名
   */
  async navigateToPage(menuItem) {
    await this.click(`${this.selectors.navigationMenu} [data-menu="${menuItem}"]`);
    await this.waitForLoadState();
  }

  /**
   * クイックアクションを実行
   * @param {string} action - アクション名
   */
  async performQuickAction(action) {
    await this.click(`${this.selectors.quickActions} [data-action="${action}"]`);
    await this.waitForLoadState();
  }
}

module.exports = DashboardPage;