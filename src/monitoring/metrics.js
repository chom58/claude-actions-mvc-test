const EventEmitter = require('events');

/**
 * パフォーマンスメトリクス収集システム
 * Core Web Vitals、API レスポンスタイム、エラー率などを追跡
 */
class MetricsCollector extends EventEmitter {
  constructor() {
    super();
    this.metrics = {
      // API メトリクス
      httpRequests: new Map(),
      httpRequestDuration: new Map(),
      httpErrors: new Map(),
      
      // システムメトリクス
      memoryUsage: [],
      cpuUsage: [],
      
      // ビジネスメトリクス
      jobViews: 0,
      jobApplications: 0,
      userSessions: 0,
      pageViews: 0,
      activeUsers: new Set(),
      
      // エラートラッキング
      errors: [],
      errorsByType: new Map()
    };
    
    this.startTime = Date.now();
    this.requestStartTimes = new Map();
    
    // システムメトリクスの定期収集を開始
    this.startSystemMetricsCollection();
  }

  /**
   * HTTPリクエストの開始を記録
   */
  recordRequestStart(requestId, method, path) {
    const startTime = Date.now();
    this.requestStartTimes.set(requestId, {
      startTime,
      method,
      path
    });
  }

  /**
   * HTTPリクエストの完了を記録
   */
  recordRequestEnd(requestId, statusCode) {
    const requestData = this.requestStartTimes.get(requestId);
    if (!requestData) return;

    const duration = Date.now() - requestData.startTime;
    const { method, path } = requestData;
    
    // リクエスト数をカウント
    const key = `${method} ${path}`;
    this.metrics.httpRequests.set(key, (this.metrics.httpRequests.get(key) || 0) + 1);
    
    // レスポンス時間を記録
    if (!this.metrics.httpRequestDuration.has(key)) {
      this.metrics.httpRequestDuration.set(key, []);
    }
    this.metrics.httpRequestDuration.get(key).push(duration);
    
    // エラー率を追跡
    if (statusCode >= 400) {
      this.metrics.httpErrors.set(key, (this.metrics.httpErrors.get(key) || 0) + 1);
    }
    
    this.requestStartTimes.delete(requestId);
    
    // アラートチェック
    this.checkAlerts(key, statusCode, duration);
  }

  /**
   * ビジネスメトリクスを記録
   */
  recordBusinessMetric(type, value = 1, metadata = {}) {
    switch (type) {
      case 'job_view':
        this.metrics.jobViews += value;
        break;
      case 'job_application':
        this.metrics.jobApplications += value;
        break;
      case 'user_session':
        this.metrics.userSessions += value;
        if (metadata.userId) {
          this.metrics.activeUsers.add(metadata.userId);
        }
        break;
      case 'page_view':
        this.metrics.pageViews += value;
        break;
    }
    
    this.emit('business_metric', { type, value, metadata, timestamp: Date.now() });
  }

  /**
   * エラーを記録
   */
  recordError(error, context = {}) {
    const errorRecord = {
      message: error.message,
      stack: error.stack,
      type: error.constructor.name,
      context,
      timestamp: Date.now()
    };
    
    this.metrics.errors.push(errorRecord);
    
    // エラータイプ別カウント
    const errorType = error.constructor.name;
    this.metrics.errorsByType.set(errorType, (this.metrics.errorsByType.get(errorType) || 0) + 1);
    
    // 古いエラーログを削除（最新1000件のみ保持）
    if (this.metrics.errors.length > 1000) {
      this.metrics.errors = this.metrics.errors.slice(-1000);
    }
    
    this.emit('error_recorded', errorRecord);
  }

  /**
   * システムメトリクスの定期収集
   */
  startSystemMetricsCollection() {
    setInterval(() => {
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      this.metrics.memoryUsage.push({
        timestamp: Date.now(),
        rss: memUsage.rss,
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external
      });
      
      this.metrics.cpuUsage.push({
        timestamp: Date.now(),
        user: cpuUsage.user,
        system: cpuUsage.system
      });
      
      // 古いデータを削除（最新100件のみ保持）
      if (this.metrics.memoryUsage.length > 100) {
        this.metrics.memoryUsage = this.metrics.memoryUsage.slice(-100);
      }
      if (this.metrics.cpuUsage.length > 100) {
        this.metrics.cpuUsage = this.metrics.cpuUsage.slice(-100);
      }
      
      // アクティブユーザーのクリーンアップ（1時間後に削除）
      // 実際の実装では Redis や データベースでセッション管理が必要
      
    }, 30000); // 30秒間隔
  }

  /**
   * アラートをチェック
   */
  checkAlerts(endpoint, statusCode, duration) {
    // エラー率チェック（5%以上）
    const totalRequests = this.metrics.httpRequests.get(endpoint) || 0;
    const errorCount = this.metrics.httpErrors.get(endpoint) || 0;
    const errorRate = totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0;
    
    if (errorRate > 5 && totalRequests > 10) {
      this.emit('alert', {
        type: 'high_error_rate',
        endpoint,
        errorRate,
        threshold: 5,
        timestamp: Date.now()
      });
    }
    
    // レスポンス時間チェック（1000ms以上）
    if (duration > 1000) {
      this.emit('alert', {
        type: 'slow_response',
        endpoint,
        duration,
        threshold: 1000,
        timestamp: Date.now()
      });
    }
    
    // メモリ使用量チェック（80%以上）
    const memUsage = process.memoryUsage();
    const memoryUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    
    if (memoryUsagePercent > 80) {
      this.emit('alert', {
        type: 'high_memory_usage',
        memoryUsagePercent,
        threshold: 80,
        timestamp: Date.now()
      });
    }
  }

  /**
   * 現在のメトリクスを取得
   */
  getMetrics() {
    return {
      uptime: Date.now() - this.startTime,
      httpRequests: Object.fromEntries(this.metrics.httpRequests),
      httpErrors: Object.fromEntries(this.metrics.httpErrors),
      businessMetrics: {
        jobViews: this.metrics.jobViews,
        jobApplications: this.metrics.jobApplications,
        userSessions: this.metrics.userSessions,
        pageViews: this.metrics.pageViews,
        activeUsers: this.metrics.activeUsers.size
      },
      systemMetrics: {
        memoryUsage: this.metrics.memoryUsage.slice(-10), // 最新10件
        cpuUsage: this.metrics.cpuUsage.slice(-10) // 最新10件
      },
      errors: {
        totalErrors: this.metrics.errors.length,
        errorsByType: Object.fromEntries(this.metrics.errorsByType),
        recentErrors: this.metrics.errors.slice(-10) // 最新10件
      }
    };
  }

  /**
   * パフォーマンス統計を取得
   */
  getPerformanceStats() {
    const stats = {};
    
    for (const [endpoint, durations] of this.metrics.httpRequestDuration.entries()) {
      if (durations.length > 0) {
        durations.sort((a, b) => a - b);
        const p50 = durations[Math.floor(durations.length * 0.5)];
        const p95 = durations[Math.floor(durations.length * 0.95)];
        const p99 = durations[Math.floor(durations.length * 0.99)];
        const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length;
        
        stats[endpoint] = {
          count: durations.length,
          avg: Math.round(avg),
          p50: Math.round(p50),
          p95: Math.round(p95),
          p99: Math.round(p99),
          min: durations[0],
          max: durations[durations.length - 1]
        };
      }
    }
    
    return stats;
  }

  /**
   * メトリクスをリセット
   */
  reset() {
    this.metrics.httpRequests.clear();
    this.metrics.httpRequestDuration.clear();
    this.metrics.httpErrors.clear();
    this.metrics.memoryUsage = [];
    this.metrics.cpuUsage = [];
    this.metrics.jobViews = 0;
    this.metrics.jobApplications = 0;
    this.metrics.userSessions = 0;
    this.metrics.pageViews = 0;
    this.metrics.activeUsers.clear();
    this.metrics.errors = [];
    this.metrics.errorsByType.clear();
    this.startTime = Date.now();
  }
}

// シングルトンインスタンス
const metricsCollector = new MetricsCollector();

module.exports = metricsCollector;