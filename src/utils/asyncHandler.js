// 非同期ルートハンドラー用のエラーキャッチャー

/**
 * 非同期関数を wrap してエラーハンドリングを自動化
 * @param {Function} fn - 非同期ルートハンドラー関数
 * @returns {Function} - エラーハンドリングが組み込まれた関数
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 複数の非同期ミドルウェアを連続で実行
 * @param {...Function} middlewares - 非同期ミドルウェア関数の配列
 * @returns {Array} - エラーハンドリングが組み込まれたミドルウェア配列
 */
const asyncMiddleware = (...middlewares) => {
  return middlewares.map(middleware => asyncHandler(middleware));
};

/**
 * try-catch ブロックを使った非同期処理のヘルパー
 * @param {Function} asyncFn - 実行する非同期関数
 * @param {*} defaultValue - エラー時のデフォルト値
 * @returns {Promise<[Error|null, *]>} - [error, result] のタプル
 */
const safeAsync = async (asyncFn, defaultValue = null) => {
  try {
    const result = await asyncFn();
    return [null, result];
  } catch (error) {
    return [error, defaultValue];
  }
};

/**
 * 複数の非同期処理を並行実行し、エラーを適切に処理
 * @param {Array<Promise>} promises - 実行するPromiseの配列
 * @param {boolean} failFast - 一つでも失敗したら即座に失敗とするか
 * @returns {Promise<Array>} - 結果の配列
 */
const parallelAsync = async (promises, failFast = false) => {
  if (failFast) {
    return Promise.all(promises);
  }

  const results = await Promise.allSettled(promises);
  
  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        error: result.reason,
        index
      };
    }
  });
};

/**
 * 非同期処理のリトライ機能
 * @param {Function} asyncFn - 実行する非同期関数
 * @param {number} maxRetries - 最大リトライ回数
 * @param {number} delay - リトライ間の遅延（ミリ秒）
 * @param {Function} shouldRetry - リトライすべきかを判定する関数
 * @returns {Promise<*>} - 関数の実行結果
 */
const retryAsync = async (asyncFn, maxRetries = 3, delay = 1000, shouldRetry = () => true) => {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await asyncFn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error;
      }
      
      // 指数バックオフ
      const backoffDelay = delay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
    }
  }
  
  throw lastError;
};

/**
 * タイムアウト付きの非同期処理
 * @param {Function} asyncFn - 実行する非同期関数
 * @param {number} timeout - タイムアウト時間（ミリ秒）
 * @param {string} timeoutMessage - タイムアウト時のエラーメッセージ
 * @returns {Promise<*>} - 関数の実行結果
 */
const timeoutAsync = async (asyncFn, timeout = 30000, timeoutMessage = 'Operation timed out') => {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeout);
  });
  
  return Promise.race([asyncFn(), timeoutPromise]);
};

/**
 * コントローラー関数を自動的にwrapするデコレーター
 */
const withAsyncHandler = (controllerClass) => {
  const prototype = controllerClass.prototype;
  const methodNames = Object.getOwnPropertyNames(prototype);
  
  methodNames.forEach(methodName => {
    const method = prototype[methodName];
    
    if (typeof method === 'function' && methodName !== 'constructor') {
      prototype[methodName] = asyncHandler(method);
    }
  });
  
  return controllerClass;
};

/**
 * Express ルーターでの使用を簡単にするヘルパー
 */
const route = {
  get: (path, ...handlers) => [path, ...handlers.map(asyncHandler)],
  post: (path, ...handlers) => [path, ...handlers.map(asyncHandler)],
  put: (path, ...handlers) => [path, ...handlers.map(asyncHandler)],
  patch: (path, ...handlers) => [path, ...handlers.map(asyncHandler)],
  delete: (path, ...handlers) => [path, ...handlers.map(asyncHandler)]
};

module.exports = {
  asyncHandler,
  asyncMiddleware,
  safeAsync,
  parallelAsync,
  retryAsync,
  timeoutAsync,
  withAsyncHandler,
  route
};