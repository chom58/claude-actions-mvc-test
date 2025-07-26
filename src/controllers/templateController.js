// テンプレートエンジンデモ用コントローラー
const { getTemplateEngineInfo } = require('../middleware/templateEngine');

/**
 * ホームページを表示
 */
const renderHome = (req, res) => {
  try {
    const sampleUsers = [
      { 
        name: '田中太郎', 
        email: 'tanaka@example.com',
        role: 'デザイナー',
        joinDate: new Date('2023-01-15')
      },
      { 
        name: '佐藤花子', 
        email: 'sato@example.com',
        role: 'デベロッパー',
        joinDate: new Date('2023-03-20')
      },
      { 
        name: '鈴木一郎', 
        email: 'suzuki@example.com',
        role: 'プロジェクトマネージャー',
        joinDate: new Date('2023-02-10')
      }
    ];
    
    const templateInfo = getTemplateEngineInfo();
    
    res.render('index', {
      title: `テンプレートエンジンデモ - ${templateInfo.current.toUpperCase()}`,
      users: sampleUsers,
      currentTime: new Date().toLocaleString('ja-JP'),
      sampleData: {
        items: ['項目1', '項目2', '項目3', '項目4']
      }
    });
  } catch (error) {
    console.error('テンプレート表示エラー:', error);
    res.status(500).json({
      error: 'テンプレートの表示中にエラーが発生しました',
      details: error.message
    });
  }
};

/**
 * テンプレートエンジンの情報を表示
 */
const getEngineInfo = (req, res) => {
  try {
    const info = getTemplateEngineInfo();
    res.json({
      success: true,
      data: info
    });
  } catch (error) {
    console.error('テンプレートエンジン情報取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'テンプレートエンジン情報の取得中にエラーが発生しました',
      details: error.message
    });
  }
};

/**
 * パフォーマンステスト用ルート
 */
const performanceTest = (req, res) => {
  try {
    const startTime = process.hrtime();
    
    // 大量のデータでテスト
    const testData = {
      title: 'パフォーマンステスト',
      items: Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        name: `アイテム${i + 1}`,
        description: `これは${i + 1}番目のテストアイテムです。`,
        value: Math.random() * 100
      })),
      timestamp: new Date().toISOString()
    };
    
    const templateInfo = getTemplateEngineInfo();
    
    res.render('index', testData, (err, html) => {
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const renderTime = seconds * 1000 + nanoseconds / 1000000; // ミリ秒
      
      if (err) {
        return res.status(500).json({
          error: 'レンダリングエラー',
          details: err.message
        });
      }
      
      res.json({
        success: true,
        engine: templateInfo.current,
        renderTime: `${renderTime.toFixed(2)}ms`,
        dataSize: testData.items.length,
        htmlLength: html.length
      });
    });
  } catch (error) {
    console.error('パフォーマンステストエラー:', error);
    res.status(500).json({
      error: 'パフォーマンステスト中にエラーが発生しました',
      details: error.message
    });
  }
};

module.exports = {
  renderHome,
  getEngineInfo,
  performanceTest
};