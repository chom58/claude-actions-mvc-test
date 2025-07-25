const performanceMonitor = require('../monitoring/performance');
const logger = require('../monitoring/logger');
const metricsCollector = require('../monitoring/metrics');

/**
 * リクエストロギングとパフォーマンス監視ミドルウェア
 * 
 * 機能:
 * - すべてのHTTPリクエストの記録
 * - レスポンス時間の測定
 * - エラーの自動記録
 * - ビジネスメトリクスの収集
 * - セキュリティイベントの検出
 */

/**
 * メインのリクエストロガーミドルウェア
 */
function requestLogger(req, res, next) {
  const startTime = Date.now();
  
  // リクエスト情報の取得
  const requestInfo = {
    method: req.method,
    url: req.url,
    path: req.path,
    ip: getClientIP(req),
    userAgent: req.get('User-Agent') || 'Unknown',
    referer: req.get('Referer') || null,
    userId: req.user?.id || null,
    sessionId: req.sessionID || null,
    requestId: generateRequestId()
  };
  
  // リクエストIDをレスポンスヘッダーに追加
  res.set('X-Request-ID', requestInfo.requestId);
  req.requestId = requestInfo.requestId;
  
  // パフォーマンス監視開始
  const performanceRequestId = performanceMonitor.startHttpRequest(req, res);
  
  // リクエスト開始ログ
  logger.info('HTTP request started', {
    ...requestInfo,
    category: 'http_request'
  });
  
  // ページビューのカウント（GETリクエストのみ）
  if (req.method === 'GET' && !req.path.startsWith('/api/')) {
    metricsCollector.recordBusinessMetric('page_view', 1, {
      path: req.path,
      userId: requestInfo.userId,
      userAgent: requestInfo.userAgent
    });
  }
  
  // ユーザーセッションの記録
  if (requestInfo.userId && !req.userSessionLogged) {
    metricsCollector.recordBusinessMetric('user_session', 1, {
      userId: requestInfo.userId
    });
    req.userSessionLogged = true;
  }
  
  // レスポンス終了時の処理
  const originalSend = res.send;
  const originalJson = res.json;
  let responseBody = null;
  
  // res.send の上書き
  res.send = function(body) {
    responseBody = body;
    return originalSend.call(this, body);
  };
  
  // res.json の上書き
  res.json = function(body) {
    responseBody = body;
    return originalJson.call(this, body);
  };
  
  // レスポンス完了イベント
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    
    // レスポンス完了ログ
    logger.info('HTTP request completed', {
      ...requestInfo,
      statusCode,
      duration,
      contentLength: res.get('Content-Length') || 0,
      category: 'http_request'
    });
    
    // エラーレスポンスの詳細ログ
    if (statusCode >= 400) {
      let errorDetails = null;
      
      if (responseBody) {
        try {
          const parsedBody = typeof responseBody === 'string' ? 
            JSON.parse(responseBody) : responseBody;
          errorDetails = {
            message: parsedBody.message || parsedBody.error,
            code: parsedBody.code,
            details: parsedBody.details
          };
        } catch (e) {
          errorDetails = { raw: responseBody.toString().substring(0, 200) };
        }
      }
      
      logger.warn('HTTP error response', {
        ...requestInfo,
        statusCode,
        duration,
        errorDetails,
        category: 'http_error'
      });
      
      // セキュリティ関連のエラーチェック
      checkSecurityEvents(req, statusCode, errorDetails);
    }
    
    // ビジネスメトリクスの記録
    recordBusinessMetrics(req, res, duration);
    
    // パフォーマンスアラートのチェック
    checkPerformanceAlerts(req, statusCode, duration);
  });
  
  // エラーハンドリング
  res.on('error', (error) => {
    const duration = Date.now() - startTime;
    
    logger.logError(error, {
      ...requestInfo,
      duration,
      category: 'http_response_error'
    });
    
    metricsCollector.recordError(error, {
      source: 'response',
      ...requestInfo
    });
  });
  
  next();
}

/**
 * API専用のロガーミドルウェア
 */
function apiRequestLogger(req, res, next) {
  const startTime = Date.now();
  
  // API キー、トークンの有無をチェック
  const hasAuth = req.headers.authorization || req.headers['x-api-key'];
  const authType = req.headers.authorization ? 
    req.headers.authorization.split(' ')[0] : 'API-Key';
  
  logger.info('API request', {
    method: req.method,
    endpoint: req.path,
    hasAuth: !!hasAuth,
    authType: hasAuth ? authType : null,
    userId: req.user?.id || null,
    ip: getClientIP(req),
    userAgent: req.get('User-Agent'),
    category: 'api_request'
  });
  
  // レスポンス完了時の処理
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    logger.logApiRequest(
      req.method,
      req.path,
      res.statusCode,
      duration,
      {
        hasAuth: !!hasAuth,
        authType: hasAuth ? authType : null,
        userId: req.user?.id || null
      }
    );
  });
  
  next();
}

/**
 * セキュリティイベントのチェック
 */
function checkSecurityEvents(req, statusCode, errorDetails) {
  const securityEvents = [];
  
  // 401 Unauthorized
  if (statusCode === 401) {
    securityEvents.push({
      type: 'unauthorized_access',
      path: req.path,
      method: req.method
    });
  }
  
  // 403 Forbidden
  if (statusCode === 403) {
    securityEvents.push({
      type: 'forbidden_access',
      path: req.path,
      method: req.method
    });
  }
  
  // 429 Too Many Requests
  if (statusCode === 429) {
    securityEvents.push({
      type: 'rate_limit_exceeded',
      path: req.path,
      method: req.method
    });
  }
  
  // SQL Injection の疑い
  if (errorDetails && errorDetails.message) {
    const sqlInjectionPatterns = [
      /sql/i, /select/i, /insert/i, /update/i, /delete/i,
      /drop/i, /union/i, /script/i
    ];
    
    if (sqlInjectionPatterns.some(pattern => pattern.test(errorDetails.message))) {
      securityEvents.push({
        type: 'potential_sql_injection',
        path: req.path,
        method: req.method,
        errorMessage: errorDetails.message
      });
    }
  }
  
  // セキュリティイベントのログ出力
  securityEvents.forEach(event => {
    logger.logSecurityEvent(event.type, req.user?.id || null, {
      ...event,
      ip: getClientIP(req),
      userAgent: req.get('User-Agent')
    });
  });
}

/**
 * ビジネスメトリクスの記録
 */
function recordBusinessMetrics(req, res, duration) {
  const path = req.path.toLowerCase();
  const method = req.method;
  const statusCode = res.statusCode;
  
  // 求人関連のメトリクス
  if (path.includes('/job') && method === 'GET' && statusCode === 200) {
    metricsCollector.recordBusinessMetric('job_view', 1, {
      jobId: req.params.id,
      userId: req.user?.id
    });
  }
  
  if (path.includes('/job') && path.includes('/apply') && method === 'POST' && statusCode === 201) {
    metricsCollector.recordBusinessMetric('job_application', 1, {
      jobId: req.params.id,
      userId: req.user?.id
    });
  }
  
  // ユーザー登録・ログイン
  if (path.includes('/register') && method === 'POST' && statusCode === 201) {
    metricsCollector.recordBusinessMetric('user_registration', 1, {
      ip: getClientIP(req)
    });
  }
  
  if (path.includes('/login') && method === 'POST' && statusCode === 200) {
    metricsCollector.recordBusinessMetric('user_login', 1, {
      userId: req.user?.id,
      ip: getClientIP(req)
    });
  }
  
  // コラボレーション関連
  if (path.includes('/collaboration') && method === 'POST' && statusCode === 201) {
    metricsCollector.recordBusinessMetric('collaboration_created', 1, {
      userId: req.user?.id
    });
  }
  
  // 画像アップロード
  if (path.includes('/upload') && method === 'POST' && statusCode === 200) {
    metricsCollector.recordBusinessMetric('image_upload', 1, {
      userId: req.user?.id,
      fileSize: req.file?.size
    });
  }
}

/**
 * パフォーマンスアラートのチェック
 */
function checkPerformanceAlerts(req, statusCode, duration) {
  // 遅いリクエストのビジネスインパクト評価
  if (duration > 2000) { // 2秒以上
    const businessCriticality = evaluateBusinessCriticality(req.path);
    
    if (businessCriticality === 'high') {
      logger.warn('Slow request on critical endpoint', {
        path: req.path,
        method: req.method,
        duration,
        businessCriticality,
        category: 'business_performance_alert'
      });
    }
  }
  
  // 高エラー率の検出
  if (statusCode >= 500) {
    logger.error('Server error detected', {
      path: req.path,
      method: req.method,
      statusCode,
      duration,
      category: 'server_error_alert'
    });
  }
}

/**
 * エンドポイントのビジネス重要度評価
 */
function evaluateBusinessCriticality(path) {
  const highCriticalityPaths = [
    '/api/login', '/api/register', '/api/jobs', 
    '/api/apply', '/api/payment', '/api/profile'
  ];
  
  const mediumCriticalityPaths = [
    '/api/collaboration', '/api/upload', '/api/search'
  ];
  
  if (highCriticalityPaths.some(criticalPath => path.includes(criticalPath))) {
    return 'high';
  }
  
  if (mediumCriticalityPaths.some(criticalPath => path.includes(criticalPath))) {
    return 'medium';
  }
  
  return 'low';
}

/**
 * クライアントIPアドレスの取得
 */
function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         req.connection.remoteAddress ||
         req.socket.remoteAddress ||
         (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
         'unknown';
}

/**
 * リクエストIDの生成
 */
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * エラーロギングミドルウェア
 */
function errorLogger(error, req, res, next) {
  const duration = Date.now() - (req.startTime || Date.now());
  
  logger.logError(error, {
    method: req.method,
    url: req.url,
    path: req.path,
    ip: getClientIP(req),
    userAgent: req.get('User-Agent'),
    userId: req.user?.id || null,
    requestId: req.requestId,
    duration,
    category: 'middleware_error'
  });
  
  metricsCollector.recordError(error, {
    source: 'middleware',
    method: req.method,
    path: req.path,
    userId: req.user?.id || null,
    requestId: req.requestId
  });
  
  next(error);
}

/**
 * ヘルスチェック用の軽量ログ
 */
function healthCheckLogger(req, res, next) {
  // ヘルスチェックは簡略化ログ
  if (req.path === '/health' || req.path === '/ping') {
    logger.debug('Health check request', {
      path: req.path,
      ip: getClientIP(req),
      category: 'health_check'
    });
  }
  next();
}

module.exports = {
  requestLogger,
  apiRequestLogger,
  errorLogger,
  healthCheckLogger
};