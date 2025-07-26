// テンプレートエンジン設定ファイル
module.exports = {
  // 使用するテンプレートエンジンを指定（env変数またはデフォルト値）
  engine: process.env.TEMPLATE_ENGINE || 'ejs',
  
  // 各テンプレートエンジンの設定オプション
  options: {
    ejs: {
      cache: process.env.NODE_ENV === 'production',
      delimiter: '%',
      openDelimiter: '<%',
      closeDelimiter: '%>',
      strict: false
    },
    pug: {
      pretty: process.env.NODE_ENV !== 'production',
      cache: process.env.NODE_ENV === 'production',
      compileDebug: process.env.NODE_ENV !== 'production'
    },
    handlebars: {
      defaultLayout: 'main',
      extname: '.hbs',
      layoutsDir: 'views/handlebars/layouts/',
      partialsDir: 'views/handlebars/partials/',
      cache: process.env.NODE_ENV === 'production'
    },
    nunjucks: {
      autoescape: true,
      throwOnUndefined: false,
      trimBlocks: true,
      lstripBlocks: true,
      cache: process.env.NODE_ENV === 'production'
    }
  },
  
  // 各エンジンのファイル拡張子
  extensions: {
    ejs: '.ejs',
    pug: '.pug',
    handlebars: '.hbs',
    nunjucks: '.njk'
  },
  
  // 各エンジンのビューディレクトリ
  viewDirs: {
    ejs: 'views/ejs',
    pug: 'views/pug', 
    handlebars: 'views/handlebars',
    nunjucks: 'views/nunjucks'
  }
};