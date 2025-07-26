const swaggerJsdoc = require('swagger-jsdoc');

/**
 * Swagger設定オプション
 * APIドキュメントの自動生成のための設定
 */
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MVC Template API',
      version: '1.0.0',
      description: '原宿クリエイティブコミュニティプラットフォーム API ドキュメント',
      contact: {
        name: 'API Support',
        email: 'support@example.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000/api',
        description: '開発サーバー',
      },
      {
        url: 'https://production-domain.com/api',
        description: '本番サーバー',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'connect.sid',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            message: {
              type: 'string',
              example: 'エラーメッセージ',
            },
            error: {
              type: 'string',
              example: 'VALIDATION_ERROR',
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1,
            },
            username: {
              type: 'string',
              example: 'user123',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'user@example.com',
            },
            displayName: {
              type: 'string',
              example: '田中太郎',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Post: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1,
            },
            title: {
              type: 'string',
              example: '投稿タイトル',
            },
            content: {
              type: 'string',
              example: '投稿内容',
            },
            userId: {
              type: 'integer',
              example: 1,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        DesignCompany: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1,
            },
            name: {
              type: 'string',
              example: 'デザイン会社株式会社',
            },
            description: {
              type: 'string',
              example: '会社説明',
            },
            website: {
              type: 'string',
              format: 'uri',
              example: 'https://example.com',
            },
            location: {
              type: 'string',
              example: '東京都渋谷区',
            },
          },
        },
        DesignerJob: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1,
            },
            title: {
              type: 'string',
              example: 'UIデザイナー募集',
            },
            description: {
              type: 'string',
              example: '求人詳細',
            },
            company: {
              type: 'string',
              example: '株式会社Example',
            },
            location: {
              type: 'string',
              example: '東京都',
            },
            experienceLevel: {
              type: 'string',
              enum: ['entry', 'junior', 'mid', 'senior'],
              example: 'mid',
            },
            jobType: {
              type: 'string',
              enum: ['full-time', 'part-time', 'contract', 'freelance'],
              example: 'full-time',
            },
            salary: {
              type: 'string',
              example: '400万円〜600万円',
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Authentication',
        description: '認証関連のAPI',
      },
      {
        name: 'Users',
        description: 'ユーザー管理API',
      },
      {
        name: 'Posts',
        description: '投稿管理API',
      },
      {
        name: 'Design Companies',
        description: 'デザイン会社API',
      },
      {
        name: 'Apparel Brands',
        description: 'アパレルブランドAPI',
      },
      {
        name: 'Creative Events',
        description: 'クリエイティブイベントAPI',
      },
      {
        name: 'Designer Jobs',
        description: 'デザイナー求人API',
      },
      {
        name: 'Collaborations',
        description: 'コラボレーションAPI',
      },
      {
        name: 'Reviews',
        description: 'レビューAPI',
      },
      {
        name: 'Search',
        description: '検索API',
      },
      {
        name: 'Upload',
        description: 'ファイルアップロードAPI',
      },
    ],
  },
  apis: [
    './src/routes/*.js',
    './src/models/*.js',
    './src/controllers/*.js',
  ],
};

/**
 * Swagger仕様を生成
 */
const specs = swaggerJsdoc(options);

module.exports = {
  options,
  specs,
};