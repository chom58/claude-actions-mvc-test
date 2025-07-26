const EventEmitter = require('events');
const metricsCollector = require('./metrics');
const logger = require('./logger');

/**
 * パフォーマンス測定とCore Web Vitals監視システム
 * 
 * 機能:
 * - リクエスト/レスポンス時間測定
 * - データベースクエリ性能監視
 * - メモリ使用量追跡
 * - Core Web Vitals収集
 * - リアルタイムパフォーマンスアラート
 */
class PerformanceMonitor extends EventEmitter {
  constructor() {
    super();
    
    this.measurements = {
      httpRequests: new Map(),
      databaseQueries: new Map(),
      customMetrics: new Map()
    };
    
    this.thresholds = {
      slowRequest: 1000, // 1秒
      slowQuery: 500,    // 0.5秒
      highMemory: 80,    // 80%
      errorRate: 5       // 5%
    };
    
    this.startMonitoring();
  }

  /**
   * HTTPリクエストの測定開始
   */
  startHttpRequest(req, res) {
    const requestId = `${req.method}_${req.path}_${Date.now()}_${Math.random()}`;
    const startTime = process.hrtime.bigint();
    
    // メトリクス収集に記録
    metricsCollector.recordRequestStart(requestId, req.method, req.path);
    
    // パフォーマンス測定データ
    this.measurements.httpRequests.set(requestId, {
      method: req.method,
      path: req.path,
      startTime,
      userAgent: req.get('User-Agent'),
      ip: this.getClientIP(req),
      userId: req.user?.id || null
    });
    
    // レスポンス完了時の処理
    const originalEnd = res.end;
    res.end = (...args) => {
      this.endHttpRequest(requestId, res.statusCode);
      originalEnd.apply(res, args);
    };
    
    return requestId;
  }

  /**
   * HTTPリクエストの測定終了
   */
  endHttpRequest(requestId, statusCode) {
    const measurement = this.measurements.httpRequests.get(requestId);
    if (!measurement) return;
    
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - measurement.startTime) / 1000000; // ナノ秒からミリ秒に変換
    
    // メトリクス収集に記録
    metricsCollector.recordRequestEnd(requestId, statusCode);
    
    // ログ出力
    logger.logApiRequest(
      measurement.method,
      measurement.path,
      statusCode,
      Math.round(duration),
      {
        userAgent: measurement.userAgent,
        ip: measurement.ip,
        userId: measurement.userId
      }
    );
    
    // 遅いリクエストのアラート
    if (duration > this.thresholds.slowRequest) {
      this.emit('slow_request', {
        requestId,
        method: measurement.method,
        path: measurement.path,
        duration: Math.round(duration),
        statusCode,
        threshold: this.thresholds.slowRequest
      });
      
      logger.warn('Slow HTTP request detected', {
        method: measurement.method,
        path: measurement.path,
        duration: Math.round(duration),
        statusCode,
        category: 'performance_alert'
      });
    }
    
    this.measurements.httpRequests.delete(requestId);
  }

  /**
   * データベースクエリの測定
   */
  measureDatabaseQuery(queryType, query, executor) {
    const queryId = `${queryType}_${Date.now()}_${Math.random()}`;
    const startTime = process.hrtime.bigint();
    
    logger.startTimer(`db_query_${queryId}`);
    
    return Promise.resolve(executor())
      .then(result => {
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000;
        
        logger.endTimer(`db_query_${queryId}`);
        logger.logDatabaseQuery(query, Math.round(duration), { queryType });
        
        // 遅いクエリのアラート
        if (duration > this.thresholds.slowQuery) {
          this.emit('slow_query', {
            queryId,
            queryType,
            query: query.substring(0, 100) + '...',
            duration: Math.round(duration),
            threshold: this.thresholds.slowQuery
          });
          
          logger.warn('Slow database query detected', {
            queryType,
            query: query.substring(0, 100) + '...',
            duration: Math.round(duration),
            category: 'performance_alert'
          });
        }
        
        return result;
      })
      .catch(error => {
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000;
        
        logger.endTimer(`db_query_${queryId}`);
        logger.logError(error, {
          queryType,
          query: query.substring(0, 100) + '...',
          duration: Math.round(duration),
          category: 'database_error'
        });
        
        throw error;
      });
  }

  /**
   * カスタムメトリクスの測定
   */
  measureCustomMetric(name, executor, metadata = {}) {
    const metricId = `${name}_${Date.now()}_${Math.random()}`;
    const startTime = process.hrtime.bigint();
    
    logger.startTimer(`custom_${metricId}`);
    
    return Promise.resolve(executor())
      .then(result => {
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000;
        
        logger.endTimer(`custom_${metricId}`);
        logger.info('Custom metric measured', {
          name,
          duration: Math.round(duration),
          metadata,
          category: 'custom_metric'
        });
        
        // カスタムメトリクスの記録
        if (!this.measurements.customMetrics.has(name)) {
          this.measurements.customMetrics.set(name, []);
        }
        this.measurements.customMetrics.get(name).push({
          duration: Math.round(duration),
          timestamp: Date.now(),
          metadata
        });
        
        return result;
      })
      .catch(error => {
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000;
        
        logger.endTimer(`custom_${metricId}`);
        logger.logError(error, {
          metricName: name,
          duration: Math.round(duration),
          metadata,
          category: 'custom_metric_error'
        });
        
        throw error;
      });
  }

  /**
   * Core Web Vitals の記録（クライアントサイドから送信されるデータ）
   */
  recordWebVitals(vitals) {
    const {
      lcp, // Largest Contentful Paint
      fid, // First Input Delay
      cls, // Cumulative Layout Shift
      fcp, // First Contentful Paint
      ttfb, // Time to First Byte
      url,
      userId
    } = vitals;
    
    logger.info('Core Web Vitals recorded', {
      lcp,
      fid,
      cls,
      fcp,
      ttfb,
      url,
      userId,
      category: 'web_vitals'
    });
    
    // アラートチェック
    const alerts = [];
    
    if (lcp > 2500) {
      alerts.push({ metric: 'LCP', value: lcp, threshold: 2500 });
    }
    
    if (fid > 100) {
      alerts.push({ metric: 'FID', value: fid, threshold: 100 });
    }
    
    if (cls > 0.1) {
      alerts.push({ metric: 'CLS', value: cls, threshold: 0.1 });
    }
    
    if (alerts.length > 0) {
      this.emit('web_vitals_alert', {
        url,
        userId,
        alerts,
        timestamp: Date.now()
      });
      
      logger.warn('Core Web Vitals threshold exceeded', {
        url,
        userId,
        alerts,
        category: 'performance_alert'
      });
    }
  }

  /**
   * JavaScript エラーの記録（クライアントサイドから送信）
   */
  recordJavaScriptError(errorData) {
    const {
      message,
      filename,
      lineno,
      colno,
      stack,
      url,
      userAgent,
      userId
    } = errorData;
    
    logger.error('JavaScript error recorded', {
      message,
      filename,
      lineno,
      colno,
      stack,
      url,
      userAgent,
      userId,
      category: 'javascript_error'
    });
    
    // メトリクス収集にエラーを記録
    const error = new Error(message);
    error.stack = stack;
    metricsCollector.recordError(error, {
      source: 'client',
      filename,
      lineno,
      colno,
      url,
      userAgent,
      userId
    });
  }

  /**
   * システム監視の開始
   */
  startMonitoring() {
    // メモリ使用量の監視
    setInterval(() => {
      const memUsage = process.memoryUsage();
      const memoryUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
      
      if (memoryUsagePercent > this.thresholds.highMemory) {
        this.emit('high_memory_usage', {
          memoryUsagePercent: Math.round(memoryUsagePercent),
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
          threshold: this.thresholds.highMemory
        });
        
        logger.warn('High memory usage detected', {
          memoryUsagePercent: Math.round(memoryUsagePercent),
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
          category: 'performance_alert'
        });
      }
    }, 30000); // 30秒間隔
    
    // 古いカスタムメトリクスのクリーンアップ
    setInterval(() => {
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      
      for (const [name, metrics] of this.measurements.customMetrics.entries()) {
        const filteredMetrics = metrics.filter(m => m.timestamp > oneHourAgo);
        this.measurements.customMetrics.set(name, filteredMetrics);
      }
    }, 300000); // 5分間隔
  }

  /**
   * クライアントIPアドレスの取得
   */
  getClientIP(req) {
    return req.headers['x-forwarded-for'] ||
           req.headers['x-real-ip'] ||
           req.connection.remoteAddress ||
           req.socket.remoteAddress ||
           (req.connection.socket ? req.connection.socket.remoteAddress : null);
  }

  /**
   * パフォーマンス統計の取得
   */
  getPerformanceStats() {
    const customMetricsStats = {};
    
    for (const [name, metrics] of this.measurements.customMetrics.entries()) {
      if (metrics.length > 0) {
        const durations = metrics.map(m => m.duration).sort((a, b) => a - b);
        const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length;
        
        customMetricsStats[name] = {
          count: durations.length,
          avg: Math.round(avg),
          min: durations[0],
          max: durations[durations.length - 1],
          recent: metrics.slice(-10) // 最新10件
        };
      }
    }
    
    return {
      activeRequests: this.measurements.httpRequests.size,
      customMetrics: customMetricsStats,
      thresholds: this.thresholds
    };
  }

  /**
   * 閾値の更新
   */
  updateThresholds(newThresholds) {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    logger.info('Performance thresholds updated', {
      thresholds: this.thresholds,
      category: 'configuration'
    });
  }
}

// シングルトンインスタンス
const performanceMonitor = new PerformanceMonitor();

// アラートイベントのログ出力
performanceMonitor.on('slow_request', (data) => {
  logger.warn('Performance Alert: Slow HTTP Request', data);
});

performanceMonitor.on('slow_query', (data) => {
  logger.warn('Performance Alert: Slow Database Query', data);
});

performanceMonitor.on('high_memory_usage', (data) => {
  logger.warn('Performance Alert: High Memory Usage', data);
});

performanceMonitor.on('web_vitals_alert', (data) => {
  logger.warn('Performance Alert: Core Web Vitals Threshold Exceeded', data);
});

module.exports = performanceMonitor;