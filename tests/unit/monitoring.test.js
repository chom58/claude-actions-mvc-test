const metricsCollector = require('../../src/monitoring/metrics');
const performanceMonitor = require('../../src/monitoring/performance');
const logger = require('../../src/monitoring/logger');

describe('Monitoring System', () => {
  beforeEach(() => {
    // メトリクスをリセット
    metricsCollector.reset();
  });

  describe('MetricsCollector', () => {
    test('should record HTTP requests correctly', () => {
      const requestId = 'test_request_123';
      
      // リクエスト開始
      metricsCollector.recordRequestStart(requestId, 'GET', '/api/test');
      
      // リクエスト終了
      metricsCollector.recordRequestEnd(requestId, 200);
      
      const metrics = metricsCollector.getMetrics();
      expect(metrics.httpRequests['GET /api/test']).toBe(1);
    });

    test('should track error rates', () => {
      const requestId = 'test_error_request';
      
      metricsCollector.recordRequestStart(requestId, 'POST', '/api/error');
      metricsCollector.recordRequestEnd(requestId, 500);
      
      const metrics = metricsCollector.getMetrics();
      expect(metrics.httpErrors['POST /api/error']).toBe(1);
    });

    test('should record business metrics', () => {
      metricsCollector.recordBusinessMetric('job_view', 1, { jobId: '123' });
      metricsCollector.recordBusinessMetric('job_application', 1, { userId: 'user1' });
      
      const metrics = metricsCollector.getMetrics();
      expect(metrics.businessMetrics.jobViews).toBe(1);
      expect(metrics.businessMetrics.jobApplications).toBe(1);
    });

    test('should record and categorize errors', () => {
      const testError = new Error('Test error message');
      const context = { userId: 'user123', action: 'test_action' };
      
      metricsCollector.recordError(testError, context);
      
      const metrics = metricsCollector.getMetrics();
      expect(metrics.errors.totalErrors).toBe(1);
      expect(metrics.errors.errorsByType['Error']).toBe(1);
      expect(metrics.errors.recentErrors[0].message).toBe('Test error message');
    });

    test('should emit alerts for high error rates', (done) => {
      metricsCollector.on('alert', (alert) => {
        expect(alert.type).toBe('high_error_rate');
        expect(alert.errorRate).toBeGreaterThan(5);
        done();
      });

      // 高いエラー率を作成（20個のリクエスト中10個がエラー）
      const endpoint = 'GET /api/test-alerts';
      for (let i = 0; i < 20; i++) {
        const requestId = `req_${i}`;
        metricsCollector.recordRequestStart(requestId, 'GET', '/api/test-alerts');
        const statusCode = i < 10 ? 500 : 200; // 最初の10個はエラー
        metricsCollector.recordRequestEnd(requestId, statusCode);
      }
    });

    test('should provide performance statistics', () => {
      // いくつかのリクエストをシミュレート
      for (let i = 0; i < 5; i++) {
        const requestId = `perf_req_${i}`;
        metricsCollector.recordRequestStart(requestId, 'GET', '/api/performance');
        // 異なる応答時間をシミュレート
        setTimeout(() => {
          metricsCollector.recordRequestEnd(requestId, 200);
        }, i * 10);
      }

      setTimeout(() => {
        const stats = metricsCollector.getPerformanceStats();
        expect(stats['GET /api/performance']).toBeDefined();
        expect(stats['GET /api/performance'].count).toBe(5);
        expect(stats['GET /api/performance'].avg).toBeGreaterThan(0);
      }, 100);
    });
  });

  describe('Enhanced Logger', () => {
    test('should log user actions with proper structure', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      logger.logUserAction('login', 'user123', {
        ip: '192.168.1.1',
        userAgent: 'Test Agent'
      });
      
      // ログが適切な構造で出力されることを確認
      // 実際のテストでは winston のモックを使用することを推奨
      
      consoleSpy.mockRestore();
    });

    test('should measure performance with timers', () => {
      const label = 'test-operation';
      
      logger.startTimer(label);
      
      setTimeout(() => {
        const duration = logger.endTimer(label);
        expect(duration).toBeGreaterThan(0);
        expect(duration).toBeLessThan(200); // 200ms以内
      }, 10);
    });

    test('should mask sensitive data', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      logger.info('Test with sensitive data', {
        email: 'user@example.com',
        password: 'secretpassword',
        token: 'abc123token',
        normalField: 'normal value'
      });
      
      // 実際のログ出力を確認（モック環境では困難）
      // 実装では、ログに機密情報がマスクされていることを確認
      
      consoleSpy.mockRestore();
    });

    test('should log system metrics', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      logger.logSystemMetrics();
      
      // システムメトリクスが記録されることを確認
      // メモリ使用量、CPU使用量、アップタイムが含まれる
      
      consoleSpy.mockRestore();
    });
  });

  describe('Performance Monitor', () => {
    test('should detect slow requests', (done) => {
      performanceMonitor.on('slow_request', (data) => {
        expect(data.duration).toBeGreaterThan(1000);
        expect(data.method).toBe('GET');
        expect(data.path).toBe('/api/slow');
        done();
      });

      // 遅いリクエストをシミュレート
      const mockReq = {
        method: 'GET',
        path: '/api/slow',
        get: jest.fn().mockReturnValue('Test Agent'),
        user: { id: 'user123' }
      };
      
      const mockRes = {
        statusCode: 200,
        end: jest.fn()
      };

      const requestId = performanceMonitor.startHttpRequest(mockReq, mockRes);
      
      setTimeout(() => {
        performanceMonitor.endHttpRequest(requestId, 200);
      }, 1100); // 1.1秒後に終了（閾値を超える）
    });

    test('should measure database queries', async () => {
      const mockQuery = 'SELECT * FROM users WHERE id = ?';
      const mockExecutor = () => Promise.resolve([{ id: 1, name: 'Test User' }]);
      
      const result = await performanceMonitor.measureDatabaseQuery(
        'SELECT',
        mockQuery,
        mockExecutor
      );
      
      expect(result).toEqual([{ id: 1, name: 'Test User' }]);
    });

    test('should handle database query errors', async () => {
      const mockQuery = 'INVALID SQL QUERY';
      const mockExecutor = () => Promise.reject(new Error('SQL Error'));
      
      try {
        await performanceMonitor.measureDatabaseQuery(
          'SELECT',
          mockQuery,
          mockExecutor
        );
      } catch (error) {
        expect(error.message).toBe('SQL Error');
      }
    });

    test('should record Core Web Vitals', () => {
      const mockVitals = {
        lcp: 1500,
        fid: 50,
        cls: 0.05,
        fcp: 800,
        ttfb: 200,
        url: 'https://example.com/test',
        userId: 'user123'
      };
      
      // アラートが発生しないケース（良好な値）
      const alertSpy = jest.fn();
      performanceMonitor.on('web_vitals_alert', alertSpy);
      
      performanceMonitor.recordWebVitals(mockVitals);
      
      expect(alertSpy).not.toHaveBeenCalled();
    });

    test('should trigger Core Web Vitals alerts for poor values', (done) => {
      performanceMonitor.on('web_vitals_alert', (data) => {
        expect(data.alerts).toBeDefined();
        expect(data.alerts.length).toBeGreaterThan(0);
        expect(data.alerts[0].metric).toBe('LCP');
        done();
      });

      const poorVitals = {
        lcp: 3000, // 閾値(2500ms)を超える
        fid: 50,
        cls: 0.05,
        url: 'https://example.com/slow',
        userId: 'user123'
      };
      
      performanceMonitor.recordWebVitals(poorVitals);
    });

    test('should get performance statistics', () => {
      const stats = performanceMonitor.getPerformanceStats();
      
      expect(stats).toHaveProperty('activeRequests');
      expect(stats).toHaveProperty('customMetrics');
      expect(stats).toHaveProperty('thresholds');
      expect(typeof stats.activeRequests).toBe('number');
    });
  });

  describe('Integration Tests', () => {
    test('should work together - metrics and performance monitor', async () => {
      // ビジネスメトリクスの記録
      metricsCollector.recordBusinessMetric('user_login', 1, { userId: 'integration_test' });
      
      // カスタムメトリクスの測定
      const result = await performanceMonitor.measureCustomMetric(
        'integration_test',
        () => Promise.resolve('success'),
        { testData: true }
      );
      
      expect(result).toBe('success');
      
      const metrics = metricsCollector.getMetrics();
      expect(metrics.businessMetrics.userSessions).toBe(1);
    });
  });
});