const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');

/**
 * プロジェクト初期化ジェネレーター
 */
class ProjectInitializer {
  constructor() {
    this.templates = {
      basic: {
        name: 'ベーシック',
        description: '最小限の構成でMVCアプリケーションを開始',
        features: ['Express', 'Sequelize', 'JWT認証', '基本的なルート']
      },
      full: {
        name: 'フルスタック',
        description: '全機能を含むMVCアプリケーション',
        features: ['Express', 'Sequelize', 'JWT認証', 'WebSocket', 'Redis', 'Docker', 'テスト環境']
      },
      api: {
        name: 'API専用',
        description: 'RESTful APIサーバー',
        features: ['Express', 'Sequelize', 'JWT認証', 'Swagger', 'レート制限', 'CORS']
      }
    };
  }

  /**
   * プロジェクトを初期化
   */
  async init(projectName, options = {}) {
    // プロジェクト名の決定
    const name = projectName || 'mvc-app';
    const projectPath = path.join(process.cwd(), name);
    
    // ディレクトリの作成
    await this.createProjectDirectory(projectPath);
    
    // テンプレートに基づいてファイルを生成
    const template = options.template || 'basic';
    await this.generateProjectFiles(projectPath, template, options);
    
    // package.jsonの生成
    await this.generatePackageJson(projectPath, name, template);
    
    // 環境変数ファイルの生成
    await this.generateEnvFiles(projectPath);
    
    // Gitの初期化（オプション）
    if (options.git) {
      await this.initGit(projectPath);
    }
    
    // 依存関係のインストール（オプション）
    if (!options.skipInstall) {
      await this.installDependencies(projectPath);
    }
    
    // 完了メッセージ
    this.displayCompletionMessage(name, projectPath, options);
  }

  /**
   * プロジェクトディレクトリの作成
   */
  async createProjectDirectory(projectPath) {
    try {
      await fs.access(projectPath);
      throw new Error(`ディレクトリ ${projectPath} は既に存在します`);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
    
    await fs.mkdir(projectPath, { recursive: true });
  }

  /**
   * プロジェクトファイルの生成
   */
  async generateProjectFiles(projectPath, template, options) {
    // ディレクトリ構造の作成
    const directories = [
      'src',
      'src/controllers',
      'src/models',
      'src/routes',
      'src/middleware',
      'src/config',
      'src/utils',
      'src/services',
      'public',
      'public/css',
      'public/js',
      'public/images',
      'views',
      'tests',
      'tests/unit',
      'tests/integration',
      'tests/e2e',
      'docs'
    ];
    
    if (template === 'full') {
      directories.push('src/websocket', 'src/jobs', 'src/migrations', 'src/seeders');
    }
    
    for (const dir of directories) {
      await fs.mkdir(path.join(projectPath, dir), { recursive: true });
    }
    
    // 基本ファイルの生成
    await this.generateAppFile(projectPath, template);
    await this.generateServerFile(projectPath);
    await this.generateRoutesIndex(projectPath);
    await this.generateModelsIndex(projectPath, template);
    await this.generateConfigFiles(projectPath, template);
    await this.generateMiddleware(projectPath, template);
    
    // テンプレート固有のファイル
    if (template === 'full') {
      await this.generateDockerFiles(projectPath);
      await this.generateWebSocketServer(projectPath);
    }
    
    if (template === 'api') {
      await this.generateSwaggerConfig(projectPath);
    }
    
    // 共通ファイル
    await this.generateReadme(projectPath, template);
    await this.generateGitignore(projectPath);
    await this.generateESLintConfig(projectPath);
  }

  /**
   * app.jsの生成
   */
  async generateAppFile(projectPath, template) {
    const content = `const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const cors = require('cors');
const helmet = require('helmet');
${template !== 'api' ? "const flash = require('connect-flash');" : ''}

// 環境変数の読み込み
require('dotenv').config();

// データベース接続
const { sequelize } = require('./models');

// ルート
const routes = require('./routes');

// ミドルウェア
const errorHandler = require('./middleware/errorHandler');
const { securityHeaders } = require('./middleware/security');
${template === 'full' || template === 'api' ? "const { rateLimit } = require('./middleware/rateLimit');" : ''}

const app = express();

// セキュリティ設定
app.use(helmet());
app.use(securityHeaders);

// CORS設定
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
  credentials: true
}));

// ボディパーサー
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// セッション設定
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 // 24時間
  }
}));

${template !== 'api' ? `// フラッシュメッセージ
app.use(flash());

// ビューエンジン設定
app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'ejs');

// 静的ファイル
app.use(express.static(path.join(__dirname, '../public')));` : ''}

${template === 'full' || template === 'api' ? '// レート制限\napp.use(rateLimit());' : ''}

// ルート設定
app.use('/api', routes);

${template !== 'api' ? `// ホームページ
app.get('/', (req, res) => {
  res.render('index', { title: 'Express MVC App' });
});` : ''}

// 404ハンドラー
app.use((req, res, next) => {
  const error = new Error('Not Found');
  error.status = 404;
  next(error);
});

// エラーハンドラー
app.use(errorHandler);

// データベース接続テスト
sequelize.authenticate()
  .then(() => console.log('✅ データベース接続成功'))
  .catch(err => console.error('❌ データベース接続エラー:', err));

module.exports = app;`;
    
    await fs.writeFile(path.join(projectPath, 'src/app.js'), content);
  }

  /**
   * server.jsの生成
   */
  async generateServerFile(projectPath) {
    const content = `#!/usr/bin/env node

const app = require('./app');
const http = require('http');

// ポート設定
const port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

// HTTPサーバーの作成
const server = http.createServer(app);

// サーバーの起動
server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

// ポートの正規化
function normalizePort(val) {
  const port = parseInt(val, 10);

  if (isNaN(port)) {
    return val;
  }

  if (port >= 0) {
    return port;
  }

  return false;
}

// エラーハンドラー
function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

// リスニングイベントハンドラー
function onListening() {
  const addr = server.address();
  const bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  console.log('🚀 サーバー起動: ' + bind);
}`;
    
    await fs.writeFile(path.join(projectPath, 'src/server.js'), content);
  }

  /**
   * package.jsonの生成
   */
  async generatePackageJson(projectPath, name, template) {
    const packageJson = {
      name,
      version: '1.0.0',
      description: 'Express MVC Application',
      main: 'src/server.js',
      scripts: {
        start: 'node src/server.js',
        dev: 'nodemon src/server.js',
        test: 'jest',
        'test:watch': 'jest --watch',
        'test:coverage': 'jest --coverage',
        lint: 'eslint src/**/*.js',
        'lint:fix': 'eslint src/**/*.js --fix'
      },
      keywords: ['express', 'mvc', 'nodejs'],
      author: '',
      license: 'MIT',
      dependencies: {
        express: '^4.18.2',
        sequelize: '^6.35.0',
        'sqlite3': '^5.1.6',
        dotenv: '^16.3.1',
        cors: '^2.8.5',
        helmet: '^7.1.0',
        'cookie-parser': '^1.4.6',
        'express-session': '^1.17.3',
        'jsonwebtoken': '^9.0.2',
        bcryptjs: '^2.4.3',
        'express-validator': '^7.0.1'
      },
      devDependencies: {
        nodemon: '^3.0.2',
        jest: '^29.7.0',
        supertest: '^6.3.3',
        eslint: '^8.56.0'
      }
    };
    
    // テンプレート固有の依存関係
    if (template !== 'api') {
      packageJson.dependencies['ejs'] = '^3.1.9';
      packageJson.dependencies['connect-flash'] = '^0.1.1';
    }
    
    if (template === 'full') {
      packageJson.dependencies['socket.io'] = '^4.7.0';
      packageJson.dependencies['redis'] = '^4.6.0';
      packageJson.dependencies['connect-redis'] = '^7.1.0';
      packageJson.dependencies['multer'] = '^1.4.5-lts.1';
      packageJson.devDependencies['@playwright/test'] = '^1.40.0';
    }
    
    if (template === 'api') {
      packageJson.dependencies['swagger-ui-express'] = '^5.0.0';
      packageJson.dependencies['swagger-jsdoc'] = '^6.2.8';
    }
    
    await fs.writeFile(
      path.join(projectPath, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );
  }

  /**
   * 環境変数ファイルの生成
   */
  async generateEnvFiles(projectPath) {
    const envExample = `# アプリケーション設定
NODE_ENV=development
PORT=3000

# データベース設定
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mvc_dev
DB_USER=developer
DB_PASSWORD=password

# セッション設定
SESSION_SECRET=your-session-secret-here

# JWT設定
JWT_SECRET=your-jwt-secret-here
JWT_REFRESH_SECRET=your-jwt-refresh-secret-here
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# CORS設定
CORS_ORIGIN=http://localhost:3000

# メール設定（オプション）
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your-email@gmail.com
MAIL_PASS=your-app-password`;
    
    await fs.writeFile(path.join(projectPath, '.env.example'), envExample);
    await fs.writeFile(path.join(projectPath, '.env'), envExample);
  }

  /**
   * READMEの生成
   */
  async generateReadme(projectPath, template) {
    const templateInfo = this.templates[template];
    const content = `# ${path.basename(projectPath)}

${templateInfo.description}

## 機能

${templateInfo.features.map(f => `- ${f}`).join('\n')}

## セットアップ

### 必要な環境

- Node.js 16以上
- npm または yarn

### インストール

\`\`\`bash
# 依存関係のインストール
npm install

# 環境変数の設定
cp .env.example .env
# .envファイルを編集して設定を行う
\`\`\`

### 開発サーバーの起動

\`\`\`bash
npm run dev
\`\`\`

アプリケーションは http://localhost:3000 で起動します。

## スクリプト

- \`npm start\` - 本番サーバーの起動
- \`npm run dev\` - 開発サーバーの起動（ホットリロード）
- \`npm test\` - テストの実行
- \`npm run test:watch\` - テストの監視モード
- \`npm run lint\` - ESLintの実行
- \`npm run lint:fix\` - ESLintの自動修正

## ディレクトリ構造

\`\`\`
.
├── src/
│   ├── app.js          # Expressアプリケーション
│   ├── server.js       # サーバーエントリーポイント
│   ├── controllers/    # コントローラー
│   ├── models/         # Sequelizeモデル
│   ├── routes/         # ルート定義
│   ├── middleware/     # カスタムミドルウェア
│   ├── config/         # 設定ファイル
│   ├── utils/          # ユーティリティ関数
│   └── services/       # ビジネスロジック
├── public/             # 静的ファイル
├── views/              # ビューテンプレート
├── tests/              # テストファイル
└── docs/               # ドキュメント
\`\`\`

## CLI コマンド

このプロジェクトには便利なCLIツールが含まれています：

\`\`\`bash
# コントローラーの生成
npx mvc-cli generate:controller User --resource

# モデルの生成
npx mvc-cli generate:model User -a name:string email:string:unique

# ルートの生成
npx mvc-cli generate:route users

# テストの生成
npx mvc-cli generate:test controller User
\`\`\`

## ライセンス

MIT`;
    
    await fs.writeFile(path.join(projectPath, 'README.md'), content);
  }

  /**
   * .gitignoreの生成
   */
  async generateGitignore(projectPath) {
    const content = `# 依存関係
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# 環境変数
.env
.env.local
.env.*.local

# ログ
logs/
*.log

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo

# ビルド
dist/
build/

# テスト
coverage/
.nyc_output/

# データベース
*.sqlite
*.sqlite3
*.db

# アップロード
uploads/
public/uploads/

# その他
.cache/
tmp/
temp/`;
    
    await fs.writeFile(path.join(projectPath, '.gitignore'), content);
  }

  /**
   * ESLint設定の生成
   */
  async generateESLintConfig(projectPath) {
    const config = {
      env: {
        browser: true,
        es2021: true,
        node: true,
        jest: true
      },
      extends: 'eslint:recommended',
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
      },
      rules: {
        indent: ['error', 2],
        'linebreak-style': ['error', 'unix'],
        quotes: ['error', 'single'],
        semi: ['error', 'always']
      }
    };
    
    await fs.writeFile(
      path.join(projectPath, '.eslintrc.json'),
      JSON.stringify(config, null, 2)
    );
  }

  /**
   * その他の必要なファイルを生成
   */
  async generateRoutesIndex(projectPath) {
    const content = `const express = require('express');
const router = express.Router();

// ルートのインポート
// const userRoutes = require('./userRoutes');

// ルートの登録
// router.use('/users', userRoutes);

// APIルート情報
router.get('/', (req, res) => {
  res.json({
    message: 'API is running',
    version: '1.0.0',
    endpoints: {
      // users: '/api/users'
    }
  });
});

module.exports = router;`;
    
    await fs.writeFile(path.join(projectPath, 'src/routes/index.js'), content);
  }

  async generateModelsIndex(projectPath, template) {
    const content = `const { Sequelize } = require('sequelize');
const path = require('path');

// データベース設定
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '../../database.sqlite'),
  logging: process.env.NODE_ENV === 'development' ? console.log : false
});

// モデルの定義
const models = {
  // User: require('./User')(sequelize),
};

// アソシエーションの設定
Object.values(models).forEach(model => {
  if (model.associate) {
    model.associate(models);
  }
});

module.exports = {
  sequelize,
  ...models
};`;
    
    await fs.writeFile(path.join(projectPath, 'src/models/index.js'), content);
  }

  async generateConfigFiles(projectPath, template) {
    // データベース設定
    const dbConfig = `module.exports = {
  development: {
    dialect: 'sqlite',
    storage: './database.sqlite'
  },
  test: {
    dialect: 'sqlite',
    storage: ':memory:'
  },
  production: {
    dialect: 'postgres',
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  }
};`;
    
    await fs.writeFile(path.join(projectPath, 'src/config/database.js'), dbConfig);
  }

  async generateMiddleware(projectPath, template) {
    // エラーハンドラー
    const errorHandler = `module.exports = (err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  
  // ログ出力
  console.error(err.stack);
  
  // レスポンス
  if (req.accepts('json')) {
    res.status(status).json({
      success: false,
      error: {
        message,
        status,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
      }
    });
  } else {
    res.status(status).render('error', {
      message,
      error: process.env.NODE_ENV === 'development' ? err : {}
    });
  }
};`;
    
    await fs.writeFile(path.join(projectPath, 'src/middleware/errorHandler.js'), errorHandler);
    
    // セキュリティミドルウェア
    const security = `exports.securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
};`;
    
    await fs.writeFile(path.join(projectPath, 'src/middleware/security.js'), security);
  }

  async generateDockerFiles(projectPath) {
    // Dockerfile
    const dockerfile = `FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["node", "src/server.js"]`;
    
    await fs.writeFile(path.join(projectPath, 'Dockerfile'), dockerfile);
    
    // docker-compose.yml
    const dockerCompose = `version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    volumes:
      - .:/app
      - /app/node_modules`;
    
    await fs.writeFile(path.join(projectPath, 'docker-compose.yml'), dockerCompose);
  }

  async generateWebSocketServer(projectPath) {
    const content = `const socketIO = require('socket.io');

module.exports = (server) => {
  const io = socketIO(server, {
    cors: {
      origin: process.env.CORS_ORIGIN?.split(',') || '*',
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });

    // カスタムイベントハンドラー
    // socket.on('message', (data) => {
    //   io.emit('message', data);
    // });
  });

  return io;
};`;
    
    await fs.writeFile(path.join(projectPath, 'src/websocket/server.js'), content);
  }

  async generateSwaggerConfig(projectPath) {
    const content = `const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Documentation',
      version: '1.0.0',
      description: 'API documentation for Express MVC application'
    },
    servers: [
      {
        url: 'http://localhost:3000/api',
        description: 'Development server'
      }
    ]
  },
  apis: ['./src/routes/*.js']
};

const specs = swaggerJsdoc(options);

module.exports = (app) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
};`;
    
    await fs.writeFile(path.join(projectPath, 'src/config/swagger.js'), content);
  }

  /**
   * Gitの初期化
   */
  async initGit(projectPath) {
    try {
      execSync('git init', { cwd: projectPath });
      execSync('git add .', { cwd: projectPath });
      execSync('git commit -m "Initial commit"', { cwd: projectPath });
      console.log(chalk.green('✅ Gitリポジトリを初期化しました'));
    } catch (error) {
      console.warn(chalk.yellow('⚠️  Git初期化に失敗しました:', error.message));
    }
  }

  /**
   * 依存関係のインストール
   */
  async installDependencies(projectPath) {
    console.log(chalk.blue('📦 依存関係をインストール中...'));
    
    try {
      execSync('npm install', { cwd: projectPath, stdio: 'inherit' });
      console.log(chalk.green('✅ 依存関係のインストールが完了しました'));
    } catch (error) {
      console.error(chalk.red('❌ 依存関係のインストールに失敗しました'));
      throw error;
    }
  }

  /**
   * 完了メッセージの表示
   */
  displayCompletionMessage(name, projectPath, options) {
    console.log(chalk.green(`
✨ プロジェクト "${name}" の作成が完了しました！

次のステップ:

  ${chalk.cyan(`cd ${name}`)}
  ${options.skipInstall ? chalk.cyan('npm install') : ''}
  ${chalk.cyan('npm run dev')}

便利なコマンド:

  ${chalk.gray('# 開発サーバーの起動')}
  npm run dev

  ${chalk.gray('# コントローラーの生成')}
  npx mvc-cli generate:controller User --resource

  ${chalk.gray('# モデルの生成')}
  npx mvc-cli generate:model User -a name:string email:string

  ${chalk.gray('# テストの実行')}
  npm test

詳細は README.md を参照してください。

Happy coding! 🚀
`));
  }
}

module.exports = ProjectInitializer;