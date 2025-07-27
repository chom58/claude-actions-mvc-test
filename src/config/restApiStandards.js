// RESTful API設計標準ガイドライン

const HTTP_METHODS = {
  GET: 'GET',       // リソースの取得
  POST: 'POST',     // リソースの作成
  PUT: 'PUT',       // リソースの全体更新
  PATCH: 'PATCH',   // リソースの部分更新
  DELETE: 'DELETE'  // リソースの削除
};

const HTTP_STATUS_CODES = {
  // 成功レスポンス
  OK: 200,                    // GET、PUT、PATCH成功
  CREATED: 201,              // POST成功（新規作成）
  ACCEPTED: 202,             // 非同期処理受付
  NO_CONTENT: 204,           // DELETE成功、または内容なし
  
  // リダイレクト
  NOT_MODIFIED: 304,         // キャッシュ有効
  
  // クライアントエラー
  BAD_REQUEST: 400,          // 不正なリクエスト
  UNAUTHORIZED: 401,         // 認証が必要
  FORBIDDEN: 403,            // 権限なし
  NOT_FOUND: 404,            // リソースが見つからない
  METHOD_NOT_ALLOWED: 405,   // メソッドが許可されていない
  CONFLICT: 409,             // リソースの競合
  UNPROCESSABLE_ENTITY: 422, // バリデーションエラー
  TOO_MANY_REQUESTS: 429,    // レート制限
  
  // サーバーエラー
  INTERNAL_SERVER_ERROR: 500, // サーバー内部エラー
  BAD_GATEWAY: 502,          // ゲートウェイエラー
  SERVICE_UNAVAILABLE: 503,  // サービス利用不可
  GATEWAY_TIMEOUT: 504       // ゲートウェイタイムアウト
};

// RESTful URLパターンのガイドライン
const URL_PATTERNS = {
  // 基本的なCRUD操作
  COLLECTION: {
    GET: '/api/resources',           // リソース一覧取得
    POST: '/api/resources'           // リソース作成
  },
  RESOURCE: {
    GET: '/api/resources/:id',       // 特定リソース取得
    PUT: '/api/resources/:id',       // リソース全体更新
    PATCH: '/api/resources/:id',     // リソース部分更新
    DELETE: '/api/resources/:id'     // リソース削除
  },
  
  // ネストしたリソース
  NESTED_COLLECTION: {
    GET: '/api/resources/:id/subresources',    // サブリソース一覧
    POST: '/api/resources/:id/subresources'    // サブリソース作成
  },
  NESTED_RESOURCE: {
    GET: '/api/resources/:id/subresources/:subId',    // 特定サブリソース取得
    PUT: '/api/resources/:id/subresources/:subId',    // サブリソース更新
    DELETE: '/api/resources/:id/subresources/:subId'  // サブリソース削除
  },
  
  // アクション（動詞的な操作）
  ACTIONS: {
    POST: '/api/resources/:id/actions/actionName'  // 特定のアクション実行
  }
};

// クエリパラメータの標準化
const QUERY_PARAMETERS = {
  // ページネーション
  PAGE: 'page',           // ページ番号 (デフォルト: 1)
  LIMIT: 'limit',         // 1ページあたりの件数 (デフォルト: 10)
  OFFSET: 'offset',       // オフセット
  
  // ソート
  SORT: 'sort',           // ソートフィールド
  ORDER: 'order',         // ソート順 (asc, desc)
  
  // フィルタリング
  FILTER: 'filter',       // フィルター条件
  SEARCH: 'q',            // 検索クエリ
  
  // フィールド選択
  FIELDS: 'fields',       // 取得するフィールドの指定
  INCLUDE: 'include',     // 関連データの取得
  EXCLUDE: 'exclude'      // 除外するフィールド
};

// レスポンス形式の標準化
const RESPONSE_FORMATS = {
  SUCCESS: {
    structure: {
      success: true,
      data: 'object | array',
      message: 'string (optional)',
      pagination: 'object (optional for collections)'
    },
    example: {
      success: true,
      data: {
        id: 1,
        name: 'Example Resource'
      },
      message: 'リソースが正常に取得されました'
    }
  },
  
  COLLECTION: {
    structure: {
      success: true,
      data: 'array',
      pagination: {
        total: 'number',
        totalPages: 'number',
        currentPage: 'number',
        perPage: 'number',
        hasNext: 'boolean',
        hasPrev: 'boolean'
      }
    },
    example: {
      success: true,
      data: [
        { id: 1, name: 'Resource 1' },
        { id: 2, name: 'Resource 2' }
      ],
      pagination: {
        total: 100,
        totalPages: 10,
        currentPage: 1,
        perPage: 10,
        hasNext: true,
        hasPrev: false
      }
    }
  },
  
  ERROR: {
    structure: {
      success: false,
      error: 'string',
      code: 'string',
      statusCode: 'number',
      timestamp: 'string (ISO8601)',
      details: 'object (optional)'
    },
    example: {
      success: false,
      error: 'リソースが見つかりません',
      code: 'RESOURCE_NOT_FOUND',
      statusCode: 404,
      timestamp: '2024-01-01T00:00:00.000Z'
    }
  },
  
  VALIDATION_ERROR: {
    structure: {
      errors: 'array of validation errors'
    },
    example: {
      errors: [
        {
          type: 'field',
          msg: 'タイトルは必須です',
          path: 'title',
          location: 'body',
          value: ''
        }
      ]
    }
  }
};

// HTTPヘッダーの標準化
const STANDARD_HEADERS = {
  REQUEST: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': 'Bearer <token>',
    'X-API-Version': 'v1',
    'X-Request-ID': '<unique-request-id>'
  },
  
  RESPONSE: {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Response-Time': '<milliseconds>ms',
    'X-Rate-Limit-Limit': '<requests>',
    'X-Rate-Limit-Remaining': '<remaining>',
    'X-Rate-Limit-Reset': '<unix-timestamp>',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block'
  }
};

// API バージョニング戦略
const VERSIONING = {
  URL_PATH: '/api/v1/resources',           // URLパスによるバージョニング（推奨）
  HEADER: 'X-API-Version: v1',             // ヘッダーによるバージョニング
  QUERY_PARAM: '/api/resources?version=v1', // クエリパラメータによるバージョニング
  ACCEPT_HEADER: 'Accept: application/vnd.api.v1+json' // Accept ヘッダーによるバージョニング
};

// エラーコードの標準化
const ERROR_CODES = {
  // 認証・認可
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  FORBIDDEN: 'FORBIDDEN',
  
  // バリデーション
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  REQUIRED_FIELD_MISSING: 'REQUIRED_FIELD_MISSING',
  INVALID_FORMAT: 'INVALID_FORMAT',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  
  // リソース
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',
  
  // レート制限
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  
  // サーバー
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR'
};

// REST API設計のベストプラクティス
const BEST_PRACTICES = {
  NAMING: {
    // URLは小文字とハイフンを使用
    GOOD: '/api/user-profiles',
    BAD: '/api/userProfiles',
    
    // 複数形を使用（コレクション）
    COLLECTION_GOOD: '/api/users',
    COLLECTION_BAD: '/api/user',
    
    // 動詞は使用しない
    ACTION_GOOD: 'POST /api/orders',
    ACTION_BAD: 'POST /api/create-order'
  },
  
  FILTERING: {
    // クエリパラメータでフィルタリング
    EXAMPLE: '/api/jobs?experience=entry_level&location=tokyo&remote=true'
  },
  
  SORTING: {
    // ソートの指定
    SINGLE: '/api/jobs?sort=created_at&order=desc',
    MULTIPLE: '/api/jobs?sort=priority,-created_at' // - は降順を示す
  },
  
  PAGINATION: {
    // ページベース
    PAGE_BASED: '/api/jobs?page=2&limit=20',
    
    // オフセットベース
    OFFSET_BASED: '/api/jobs?offset=20&limit=20',
    
    // カーソルベース（大規模データ）
    CURSOR_BASED: '/api/jobs?cursor=eyJpZCI6MTAwfQ&limit=20'
  }
};

module.exports = {
  HTTP_METHODS,
  HTTP_STATUS_CODES,
  URL_PATTERNS,
  QUERY_PARAMETERS,
  RESPONSE_FORMATS,
  STANDARD_HEADERS,
  VERSIONING,
  ERROR_CODES,
  BEST_PRACTICES
};