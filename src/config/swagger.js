const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '原宿クリエイティブコミュニティAPI',
      version: '2.0.0',
      description: 'デザインとファッションが融合するクリエイティブハブのAPI仕様書',
      contact: {
        name: 'API Support',
        email: 'support@harajuku-creative.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000/api',
        description: 'Development server'
      },
      {
        url: 'https://api.harajuku-creative.com/api',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        },
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'token'
        }
      },
      schemas: {
        // 共通レスポンス形式
        SuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            data: {
              type: 'object',
              description: 'レスポンスデータ'
            },
            message: {
              type: 'string',
              description: 'メッセージ'
            }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'string',
              description: 'エラーメッセージ'
            },
            code: {
              type: 'string',
              description: 'エラーコード'
            },
            statusCode: {
              type: 'integer',
              description: 'HTTPステータスコード'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'エラー発生時刻'
            },
            details: {
              type: 'object',
              description: '詳細情報（開発環境のみ）'
            }
          }
        },
        ValidationErrorResponse: {
          type: 'object',
          properties: {
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: {
                    type: 'string',
                    example: 'field'
                  },
                  msg: {
                    type: 'string',
                    example: 'タイトルは3〜200文字で入力してください'
                  },
                  path: {
                    type: 'string',
                    example: 'title'
                  },
                  location: {
                    type: 'string',
                    example: 'body'
                  },
                  value: {
                    description: '入力値'
                  }
                }
              }
            }
          }
        },
        // ページネーション
        Pagination: {
          type: 'object',
          properties: {
            total: {
              type: 'integer',
              description: '総件数'
            },
            totalPages: {
              type: 'integer',
              description: '総ページ数'
            },
            currentPage: {
              type: 'integer',
              description: '現在のページ'
            },
            perPage: {
              type: 'integer',
              description: '1ページあたりの件数'
            },
            hasNext: {
              type: 'boolean',
              description: '次のページがあるか'
            },
            hasPrev: {
              type: 'boolean',
              description: '前のページがあるか'
            }
          }
        },
        // ユーザー関連
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'ユーザーID'
            },
            username: {
              type: 'string',
              description: 'ユーザー名'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'メールアドレス'
            },
            isActive: {
              type: 'boolean',
              description: 'アクティブ状態'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: '作成日時'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: '更新日時'
            }
          }
        },
        UserRegistration: {
          type: 'object',
          required: ['username', 'email', 'password'],
          properties: {
            username: {
              type: 'string',
              minLength: 3,
              maxLength: 50,
              description: 'ユーザー名'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'メールアドレス'
            },
            password: {
              type: 'string',
              minLength: 8,
              description: 'パスワード'
            }
          }
        },
        UserLogin: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'メールアドレス'
            },
            password: {
              type: 'string',
              description: 'パスワード'
            }
          }
        },
        // 投稿関連
        Post: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: '投稿ID'
            },
            title: {
              type: 'string',
              description: 'タイトル'
            },
            content: {
              type: 'string',
              description: '内容'
            },
            slug: {
              type: 'string',
              description: 'スラッグ'
            },
            published: {
              type: 'boolean',
              description: '公開状態'
            },
            publishedAt: {
              type: 'string',
              format: 'date-time',
              description: '公開日時'
            },
            viewCount: {
              type: 'integer',
              description: '閲覧数'
            },
            author: {
              $ref: '#/components/schemas/User'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: '作成日時'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: '更新日時'
            }
          }
        },
        PostCreate: {
          type: 'object',
          required: ['title', 'content'],
          properties: {
            title: {
              type: 'string',
              minLength: 3,
              maxLength: 200,
              description: 'タイトル'
            },
            content: {
              type: 'string',
              minLength: 10,
              description: '内容'
            },
            slug: {
              type: 'string',
              maxLength: 200,
              description: 'スラッグ（自動生成可）'
            }
          }
        },
        // デザイナー求人関連
        DesignerJob: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: '求人ID'
            },
            title: {
              type: 'string',
              description: '求人タイトル'
            },
            company: {
              type: 'string',
              description: '会社名'
            },
            description: {
              type: 'string',
              description: '求人詳細'
            },
            originalUrl: {
              type: 'string',
              format: 'uri',
              description: '元の求人URL'
            },
            jobType: {
              type: 'string',
              enum: ['full_time', 'part_time', 'contract', 'freelance', 'internship'],
              description: '雇用形態'
            },
            experienceLevel: {
              type: 'string',
              enum: ['entry_level', 'mid_level', 'senior_level', 'executive'],
              description: '経験レベル'
            },
            isExperienceWelcome: {
              type: 'boolean',
              description: '未経験歓迎'
            },
            isNewGraduateWelcome: {
              type: 'boolean',
              description: '新卒歓迎'
            },
            designCategories: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'デザインカテゴリー'
            },
            skills: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: '必要スキル'
            },
            tools: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: '使用ツール'
            },
            location: {
              type: 'string',
              description: '勤務地'
            },
            isRemoteOk: {
              type: 'boolean',
              description: 'リモート可'
            },
            salaryMin: {
              type: 'integer',
              description: '最低給与'
            },
            salaryMax: {
              type: 'integer',
              description: '最高給与'
            },
            salaryType: {
              type: 'string',
              enum: ['hourly', 'daily', 'monthly', 'annual'],
              description: '給与タイプ'
            },
            clickCount: {
              type: 'integer',
              description: 'クリック数'
            },
            tags: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'タグ'
            },
            jobSite: {
              $ref: '#/components/schemas/JobSite'
            },
            postedAt: {
              type: 'string',
              format: 'date-time',
              description: '投稿日時'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: '作成日時'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: '更新日時'
            }
          }
        },
        // 求人サイト関連
        JobSite: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: '求人サイトID'
            },
            name: {
              type: 'string',
              description: 'サイト名'
            },
            domain: {
              type: 'string',
              description: 'ドメイン'
            },
            baseUrl: {
              type: 'string',
              format: 'uri',
              description: 'ベースURL'
            },
            description: {
              type: 'string',
              description: 'サイト説明'
            },
            category: {
              type: 'string',
              enum: ['general', 'design_specialized', 'creative_focused', 'freelance'],
              description: 'カテゴリー'
            },
            totalJobs: {
              type: 'integer',
              description: '総求人数'
            },
            totalClicks: {
              type: 'integer',
              description: '総クリック数'
            },
            priority: {
              type: 'integer',
              description: '優先度'
            },
            isActive: {
              type: 'boolean',
              description: 'アクティブ状態'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: '作成日時'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: '更新日時'
            }
          }
        }
      },
      responses: {
        UnauthorizedError: {
          description: '認証が必要です',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              },
              example: {
                success: false,
                error: '認証トークンが無効です',
                code: 'INVALID_TOKEN',
                statusCode: 401,
                timestamp: '2024-01-01T00:00:00.000Z'
              }
            }
          }
        },
        ValidationError: {
          description: 'バリデーションエラー',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ValidationErrorResponse'
              }
            }
          }
        },
        NotFoundError: {
          description: 'リソースが見つかりません',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              },
              example: {
                success: false,
                error: 'リソースが見つかりません',
                code: 'RESOURCE_NOT_FOUND',
                statusCode: 404,
                timestamp: '2024-01-01T00:00:00.000Z'
              }
            }
          }
        },
        InternalServerError: {
          description: 'サーバーエラー',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              },
              example: {
                success: false,
                error: 'サーバーエラーが発生しました',
                code: 'INTERNAL_SERVER_ERROR',
                statusCode: 500,
                timestamp: '2024-01-01T00:00:00.000Z'
              }
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: [
    './src/routes/*.js',
    './src/controllers/*.js',
    './src/models/*.js'
  ]
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = {
  swaggerSpec,
  swaggerUi,
  swaggerOptions: {
    explorer: true,
    customSiteTitle: '原宿クリエイティブコミュニティAPI',
    customCss: `
      .swagger-ui .topbar { 
        background-color: #2c3e50; 
      }
      .swagger-ui .info .title {
        color: #e74c3c;
      }
    `
  }
};