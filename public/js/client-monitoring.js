/**
 * クライアントサイドパフォーマンス監視システム
 * 
 * 機能:
 * - Core Web Vitals の測定と送信
 * - JavaScript エラーの自動収集
 * - ユーザーインタラクションの追跡
 * - ページ読み込み時間の測定
 * - リソース読み込み時間の監視
 */

(function() {
  'use strict';
  
  // 設定
  const CONFIG = {
    // 送信エンドポイント
    endpoints: {
      webVitals: '/api/monitoring/web-vitals',
      jsErrors: '/api/monitoring/js-errors',
      pageLoad: '/api/monitoring/page-load',
      userAction: '/api/monitoring/user-action'
    },
    
    // 送信間隔設定
    batchSize: 10,
    sendInterval: 5000, // 5秒
    
    // サンプリング率（0-1）
    samplingRate: 1.0,
    
    // デバッグモード
    debug: window.location.search.includes('monitor_debug=true')
  };
  
  // データ収集用の配列
  const dataQueue = {
    webVitals: [],
    jsErrors: [],
    pageLoad: [],
    userActions: []
  };
  
  let userId = null;
  let sessionId = null;
  
  /**
   * 初期化
   */
  function init() {
    // ユーザーIDとセッションIDの取得
    userId = getUserId();
    sessionId = getSessionId();
    
    // Core Web Vitals の監視開始
    initWebVitalsMonitoring();
    
    // JavaScript エラーハンドリング
    initErrorHandling();
    
    // ページ読み込み時間の測定
    initPageLoadMonitoring();
    
    // ユーザーインタラクションの監視
    initUserInteractionMonitoring();
    
    // リソース読み込み時間の監視
    initResourceMonitoring();
    
    // 定期的なデータ送信
    initDataSending();
    
    // ページ離脱時のデータ送信
    initBeaconSending();
    
    if (CONFIG.debug) {
      console.log('Client monitoring initialized', { userId, sessionId });
    }
  }
  
  /**
   * Core Web Vitals の監視
   */
  function initWebVitalsMonitoring() {
    // Web Vitals ライブラリが利用可能な場合
    if (typeof webVitals !== 'undefined') {
      webVitals.getLCP(onLCP);
      webVitals.getFID(onFID);
      webVitals.getCLS(onCLS);
      webVitals.getFCP(onFCP);
      webVitals.getTTFB(onTTFB);
    } else {
      // 手動実装
      measureCoreWebVitals();
    }
  }
  
  /**
   * LCP (Largest Contentful Paint) の記録
   */
  function onLCP(metric) {
    recordWebVital('LCP', metric.value, metric);
  }
  
  /**
   * FID (First Input Delay) の記録
   */
  function onFID(metric) {
    recordWebVital('FID', metric.value, metric);
  }
  
  /**
   * CLS (Cumulative Layout Shift) の記録
   */
  function onCLS(metric) {
    recordWebVital('CLS', metric.value, metric);
  }
  
  /**
   * FCP (First Contentful Paint) の記録
   */
  function onFCP(metric) {
    recordWebVital('FCP', metric.value, metric);
  }
  
  /**
   * TTFB (Time to First Byte) の記録
   */
  function onTTFB(metric) {
    recordWebVital('TTFB', metric.value, metric);
  }
  
  /**
   * Web Vital の記録
   */
  function recordWebVital(name, value, metric) {
    const data = {
      name,
      value: Math.round(value),
      delta: metric.delta,
      id: metric.id,
      url: window.location.href,
      userId,
      sessionId,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      connection: getConnectionInfo()
    };
    
    dataQueue.webVitals.push(data);
    
    if (CONFIG.debug) {
      console.log('Web Vital recorded:', data);
    }
  }
  
  /**
   * 手動 Core Web Vitals 測定
   */
  function measureCoreWebVitals() {
    // Performance Observer による測定
    if ('PerformanceObserver' in window) {
      // LCP の測定
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        recordWebVital('LCP', lastEntry.startTime, {
          delta: lastEntry.startTime,
          id: 'manual_lcp'
        });
      });
      
      try {
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (e) {
        // LCP not supported
      }
      
      // FID の測定
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          recordWebVital('FID', entry.processingStart - entry.startTime, {
            delta: entry.processingStart - entry.startTime,
            id: 'manual_fid'
          });
        });
      });
      
      try {
        fidObserver.observe({ entryTypes: ['first-input'] });
      } catch (e) {
        // FID not supported
      }
      
      // CLS の測定
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        recordWebVital('CLS', clsValue, {
          delta: clsValue,
          id: 'manual_cls'
        });
      });
      
      try {
        clsObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (e) {
        // CLS not supported
      }
    }
  }
  
  /**
   * JavaScript エラーハンドリング
   */
  function initErrorHandling() {
    // グローバルエラーハンドラー
    window.addEventListener('error', (event) => {
      recordJavaScriptError({
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error ? event.error.stack : null,
        type: 'javascript_error'
      });
    });
    
    // Promise rejection ハンドラー
    window.addEventListener('unhandledrejection', (event) => {
      recordJavaScriptError({
        message: event.reason ? event.reason.toString() : 'Unhandled Promise Rejection',
        filename: null,
        lineno: null,
        colno: null,
        stack: event.reason && event.reason.stack ? event.reason.stack : null,
        type: 'promise_rejection'
      });
    });
  }
  
  /**
   * JavaScript エラーの記録
   */
  function recordJavaScriptError(errorData) {
    const data = {
      ...errorData,
      url: window.location.href,
      userId,
      sessionId,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      viewportSize: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    };
    
    dataQueue.jsErrors.push(data);
    
    if (CONFIG.debug) {
      console.log('JavaScript error recorded:', data);
    }
  }
  
  /**
   * ページ読み込み時間の監視
   */
  function initPageLoadMonitoring() {
    window.addEventListener('load', () => {
      setTimeout(() => {
        measurePageLoadTime();
      }, 100);
    });
  }
  
  /**
   * ページ読み込み時間の測定
   */
  function measurePageLoadTime() {
    if (!performance.timing) return;
    
    const timing = performance.timing;
    const navigation = performance.navigation;
    
    const data = {
      // ページ読み込み時間
      pageLoadTime: timing.loadEventEnd - timing.navigationStart,
      domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
      domComplete: timing.domComplete - timing.navigationStart,
      
      // ネットワーク時間
      dnsLookup: timing.domainLookupEnd - timing.domainLookupStart,
      tcpConnection: timing.connectEnd - timing.connectStart,
      serverResponse: timing.responseEnd - timing.requestStart,
      
      // レンダリング時間
      domProcessing: timing.domComplete - timing.responseEnd,
      
      // ナビゲーション情報
      navigationType: navigation.type,
      redirectCount: navigation.redirectCount,
      
      // メタデータ
      url: window.location.href,
      userId,
      sessionId,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      connection: getConnectionInfo()
    };
    
    dataQueue.pageLoad.push(data);
    
    if (CONFIG.debug) {
      console.log('Page load time recorded:', data);
    }
  }
  
  /**
   * ユーザーインタラクションの監視
   */
  function initUserInteractionMonitoring() {
    // クリックイベント
    document.addEventListener('click', (event) => {
      recordUserAction('click', {
        element: getElementInfo(event.target),
        coordinates: { x: event.clientX, y: event.clientY }
      });
    });
    
    // フォーム送信
    document.addEventListener('submit', (event) => {
      recordUserAction('form_submit', {
        formAction: event.target.action,
        formMethod: event.target.method,
        element: getElementInfo(event.target)
      });
    });
    
    // スクロール（スロットル）
    let scrollTimeout;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        recordUserAction('scroll', {
          scrollY: window.scrollY,
          scrollX: window.scrollX,
          documentHeight: document.documentElement.scrollHeight,
          windowHeight: window.innerHeight
        });
      }, 500);
    });
  }
  
  /**
   * ユーザーアクションの記録
   */
  function recordUserAction(action, details) {
    // サンプリング
    if (Math.random() > CONFIG.samplingRate) return;
    
    const data = {
      action,
      details,
      url: window.location.href,
      userId,
      sessionId,
      timestamp: Date.now()
    };
    
    dataQueue.userActions.push(data);
    
    if (CONFIG.debug) {
      console.log('User action recorded:', data);
    }
  }
  
  /**
   * リソース読み込み時間の監視
   */
  function initResourceMonitoring() {
    if (!('PerformanceObserver' in window)) return;
    
    const resourceObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.duration > 1000) { // 1秒以上のリソースのみ記録
          recordSlowResource(entry);
        }
      });
    });
    
    try {
      resourceObserver.observe({ entryTypes: ['resource'] });
    } catch (e) {
      // Resource timing not supported
    }
  }
  
  /**
   * 遅いリソースの記録
   */
  function recordSlowResource(entry) {
    const data = {
      name: entry.name,
      type: entry.initiatorType,
      duration: Math.round(entry.duration),
      size: entry.transferSize || entry.decodedBodySize,
      url: window.location.href,
      userId,
      sessionId,
      timestamp: Date.now()
    };
    
    // ページ読み込みデータに追加
    dataQueue.pageLoad.push({
      type: 'slow_resource',
      ...data
    });
    
    if (CONFIG.debug) {
      console.log('Slow resource recorded:', data);
    }
  }
  
  /**
   * 定期的なデータ送信
   */
  function initDataSending() {
    setInterval(() => {
      sendQueuedData();
    }, CONFIG.sendInterval);
  }
  
  /**
   * ページ離脱時のデータ送信
   */
  function initBeaconSending() {
    // beforeunload でのデータ送信
    window.addEventListener('beforeunload', () => {
      sendQueuedDataBeacon();
    });
    
    // visibility change でのデータ送信
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        sendQueuedDataBeacon();
      }
    });
  }
  
  /**
   * キューイングされたデータの送信
   */
  function sendQueuedData() {
    Object.keys(dataQueue).forEach(key => {
      const queue = dataQueue[key];
      if (queue.length === 0) return;
      
      const dataToSend = queue.splice(0, CONFIG.batchSize);
      const endpoint = CONFIG.endpoints[key] || CONFIG.endpoints.webVitals;
      
      sendData(endpoint, dataToSend)
        .catch(error => {
          // 送信失敗時はキューに戻す
          dataQueue[key].unshift(...dataToSend);
          if (CONFIG.debug) {
            console.error('Failed to send monitoring data:', error);
          }
        });
    });
  }
  
  /**
   * Beacon API を使用したデータ送信
   */
  function sendQueuedDataBeacon() {
    Object.keys(dataQueue).forEach(key => {
      const queue = dataQueue[key];
      if (queue.length === 0) return;
      
      const endpoint = CONFIG.endpoints[key] || CONFIG.endpoints.webVitals;
      const data = JSON.stringify(queue);
      
      if (navigator.sendBeacon) {
        navigator.sendBeacon(endpoint, data);
      } else {
        // Fallback to synchronous request
        const xhr = new XMLHttpRequest();
        xhr.open('POST', endpoint, false);
        xhr.setRequestHeader('Content-Type', 'application/json');
        try {
          xhr.send(data);
        } catch (e) {
          // Ignore errors during page unload
        }
      }
      
      // キューをクリア
      dataQueue[key] = [];
    });
  }
  
  /**
   * データの送信
   */
  function sendData(endpoint, data) {
    return fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    }).then(response => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    });
  }
  
  /**
   * ユーティリティ関数
   */
  
  function getUserId() {
    // メタタグからユーザーIDを取得
    const userIdMeta = document.querySelector('meta[name="user-id"]');
    if (userIdMeta) return userIdMeta.content;
    
    // ローカルストレージから取得
    return localStorage.getItem('userId') || null;
  }
  
  function getSessionId() {
    // セッションストレージから取得、なければ生成
    let sessionId = sessionStorage.getItem('sessionId');
    if (!sessionId) {
      sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('sessionId', sessionId);
    }
    return sessionId;
  }
  
  function getConnectionInfo() {
    if (!navigator.connection) return null;
    
    return {
      effectiveType: navigator.connection.effectiveType,
      downlink: navigator.connection.downlink,
      rtt: navigator.connection.rtt,
      saveData: navigator.connection.saveData
    };
  }
  
  function getElementInfo(element) {
    return {
      tagName: element.tagName,
      id: element.id || null,
      className: element.className || null,
      text: (element.textContent || '').substring(0, 50),
      href: element.href || null,
      src: element.src || null
    };
  }
  
  // DOM準備完了後に初期化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  // グローバルにAPIを公開（デバッグ用）
  if (CONFIG.debug) {
    window.ClientMonitoring = {
      recordWebVital,
      recordJavaScriptError,
      recordUserAction,
      getDataQueue: () => dataQueue,
      sendQueuedData,
      config: CONFIG
    };
  }
  
})();