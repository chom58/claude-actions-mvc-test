// シンプルなレート制限ミドルウェア（メモリベース）
// 本番環境ではRedisベースの実装を推奨

const rateLimitMap = new Map();

const createRateLimit = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15分
    max = 100, // 最大リクエスト数
    message = 'リクエストが多すぎます。しばらく待ってから再試行してください。',
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    keyGenerator = (req) => req.ip || req.connection.remoteAddress
  } = options;

  return (req, res, next) => {
    const key = keyGenerator(req);
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // 古いエントリを削除
    const clientData = rateLimitMap.get(key) || [];
    const filteredData = clientData.filter(timestamp => timestamp > windowStart);
    
    if (filteredData.length >= max) {
      return res.status(429).json({
        error: message,
        retryAfter: Math.ceil((filteredData[0] - windowStart) / 1000)
      });
    }
    
    // リクエストを記録
    filteredData.push(now);
    rateLimitMap.set(key, filteredData);
    
    // レスポンス後にクリーンアップ（成功/失敗時の設定に応じて）
    const originalSend = res.send;
    res.send = function(data) {
      const statusCode = res.statusCode;
      const isSuccess = statusCode >= 200 && statusCode < 300;
      const isFailure = statusCode >= 400;
      
      if ((skipSuccessfulRequests && isSuccess) || (skipFailedRequests && isFailure)) {
        // このリクエストをカウントから除外
        const currentData = rateLimitMap.get(key) || [];
        const updatedData = currentData.slice(0, -1); // 最後のエントリを削除
        if (updatedData.length > 0) {
          rateLimitMap.set(key, updatedData);
        } else {
          rateLimitMap.delete(key);
        }
      }
      
      originalSend.call(this, data);
    };
    
    next();
  };
};

// プリセット設定
const strictRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 5, // 厳しい制限（認証試行など）
  message: '認証試行回数が上限に達しました。15分後に再試行してください。'
});

const generalRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 100 // 一般的な制限
});

const passwordResetRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000, // 1時間
  max: 3, // パスワードリセットは1時間に3回まで
  message: 'パスワードリセット要求回数が上限に達しました。1時間後に再試行してください。'
});

// 定期的なクリーンアップ（メモリリーク防止）
setInterval(() => {
  const now = Date.now();
  const maxAge = 60 * 60 * 1000; // 1時間
  
  for (const [key, timestamps] of rateLimitMap.entries()) {
    const filtered = timestamps.filter(timestamp => now - timestamp < maxAge);
    if (filtered.length === 0) {
      rateLimitMap.delete(key);
    } else {
      rateLimitMap.set(key, filtered);
    }
  }
}, 10 * 60 * 1000); // 10分ごとに実行

module.exports = {
  createRateLimit,
  strictRateLimit,
  generalRateLimit,
  passwordResetRateLimit
};