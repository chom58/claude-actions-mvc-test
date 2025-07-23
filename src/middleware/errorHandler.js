module.exports = (err, req, res, next) => {
  console.error('Error:', err);

  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      error: 'バリデーションエラー',
      details: err.errors.map(e => ({
        field: e.path,
        message: e.message
      }))
    });
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({
      error: '重複エラー',
      details: err.errors.map(e => ({
        field: e.path,
        message: `${e.path}は既に使用されています`
      }))
    });
  }

  if (err.name === 'SequelizeDatabaseError') {
    return res.status(500).json({
      error: 'データベースエラーが発生しました'
    });
  }

  const status = err.status || 500;
  const message = err.message || 'サーバーエラーが発生しました';

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};