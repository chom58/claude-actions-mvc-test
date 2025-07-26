// テンプレートエンジン切り替えミドルウェア
const templateConfig = require('../config/template');
const path = require('path');

/**
 * テンプレートエンジンを設定する関数
 * @param {Object} app - Expressアプリケーションインスタンス
 */
function setupTemplateEngine(app) {
  const engine = templateConfig.engine;
  const options = templateConfig.options[engine];
  const viewDir = templateConfig.viewDirs[engine];
  const extension = templateConfig.extensions[engine];
  
  console.log(`テンプレートエンジンを設定中: ${engine}`);
  
  try {
    switch (engine) {
      case 'ejs':
        app.set('view engine', 'ejs');
        app.set('views', path.join(__dirname, '../../', viewDir));
        // EJSの設定オプションを適用
        if (options) {
          Object.keys(options).forEach(key => {
            app.locals[key] = options[key];
          });
        }
        break;
        
      case 'pug':
        app.set('view engine', 'pug');
        app.set('views', path.join(__dirname, '../../', viewDir));
        // Pugの設定オプションを適用
        if (options) {
          Object.keys(options).forEach(key => {
            app.locals[key] = options[key];
          });
        }
        break;
        
      case 'handlebars':
        const exphbs = require('express-handlebars');
        const hbsOptions = {
          extname: extension,
          defaultLayout: options.defaultLayout,
          layoutsDir: path.join(__dirname, '../../', options.layoutsDir),
          partialsDir: path.join(__dirname, '../../', options.partialsDir),
          cache: options.cache,
          helpers: {
            // 配列を文字列で結合するヘルパー
            join: function(array, separator) {
              return array && array.length ? array.join(separator) : '';
            },
            // 数値を足し算するヘルパー
            add: function(a, b) {
              return a + b;
            },
            // 数値を掛け算するヘルパー
            multiply: function(a, b) {
              return a * b;
            },
            // 日付をフォーマットするヘルパー
            formatDate: function(date) {
              return new Date(date).toLocaleDateString('ja-JP');
            },
            // JSONを文字列に変換するヘルパー
            json: function(context) {
              return JSON.stringify(context);
            }
          }
        };
        
        app.engine('hbs', exphbs.engine(hbsOptions));
        app.set('view engine', 'hbs');
        app.set('views', path.join(__dirname, '../../', viewDir));
        break;
        
      case 'nunjucks':
        const nunjucks = require('nunjucks');
        const nunjucksEnv = nunjucks.configure(path.join(__dirname, '../../', viewDir), {
          autoescape: options.autoescape,
          throwOnUndefined: options.throwOnUndefined,
          trimBlocks: options.trimBlocks,
          lstripBlocks: options.lstripBlocks,
          cache: options.cache,
          express: app
        });
        
        app.set('view engine', 'njk');
        // Nunjucksの場合はカスタムレンダー関数を設定
        app.engine('njk', nunjucksEnv.render.bind(nunjucksEnv));
        break;
        
      default:
        throw new Error(`サポートされていないテンプレートエンジンです: ${engine}`);
    }
    
    console.log(`テンプレートエンジン ${engine} が正常に設定されました`);
    console.log(`ビューディレクトリ: ${viewDir}`);
    
  } catch (error) {
    console.error(`テンプレートエンジンの設定でエラーが発生しました:`, error.message);
    console.error('EJSにフォールバックします...');
    
    // エラーが発生した場合はEJSにフォールバック
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, '../../views/ejs'));
  }
}

/**
 * テンプレートエンジンの情報を取得するヘルパー関数
 */
function getTemplateEngineInfo() {
  return {
    current: templateConfig.engine,
    available: Object.keys(templateConfig.options),
    viewDir: templateConfig.viewDirs[templateConfig.engine],
    extension: templateConfig.extensions[templateConfig.engine]
  };
}

/**
 * レスポンス用のヘルパーミドルウェア
 * テンプレートエンジンの情報をローカル変数として追加
 */
function templateEngineInfo(req, res, next) {
  res.locals.templateEngine = getTemplateEngineInfo();
  next();
}

module.exports = {
  setupTemplateEngine,
  getTemplateEngineInfo,
  templateEngineInfo
};