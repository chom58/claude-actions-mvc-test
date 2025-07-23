/**
 * ページネーション用ヘルパー関数
 */

/**
 * ページネーション情報を計算
 * @param {number} page - 現在のページ番号
 * @param {number} limit - 1ページあたりの件数
 * @param {number} total - 総件数
 * @returns {Object} ページネーション情報
 */
const calculatePagination = (page, limit, total) => {
  const currentPage = parseInt(page) || 1;
  const perPage = parseInt(limit) || 10;
  const offset = (currentPage - 1) * perPage;
  const totalPages = Math.ceil(total / perPage);

  return {
    currentPage,
    perPage,
    offset,
    totalPages,
    total,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
    nextPage: currentPage < totalPages ? currentPage + 1 : null,
    prevPage: currentPage > 1 ? currentPage - 1 : null
  };
};

/**
 * ページネーションメタデータを生成
 * @param {Object} pagination - ページネーション情報
 * @param {string} baseUrl - ベースURL
 * @returns {Object} メタデータ
 */
const generatePaginationMeta = (pagination, baseUrl) => {
  const { currentPage, totalPages, hasNextPage, hasPrevPage, nextPage, prevPage } = pagination;

  const meta = {
    currentPage,
    totalPages,
    hasNextPage,
    hasPrevPage
  };

  if (baseUrl) {
    const url = new URL(baseUrl);
    
    if (hasNextPage) {
      url.searchParams.set('page', nextPage);
      meta.nextPageUrl = url.toString();
    }

    if (hasPrevPage) {
      url.searchParams.set('page', prevPage);
      meta.prevPageUrl = url.toString();
    }

    url.searchParams.set('page', 1);
    meta.firstPageUrl = url.toString();

    url.searchParams.set('page', totalPages);
    meta.lastPageUrl = url.toString();
  }

  return meta;
};

/**
 * クエリパラメータからページネーション情報を抽出
 * @param {Object} query - リクエストクエリパラメータ
 * @param {Object} options - オプション設定
 * @returns {Object} ページネーション設定
 */
const extractPaginationParams = (query, options = {}) => {
  const {
    defaultLimit = 10,
    maxLimit = 100,
    minLimit = 1
  } = options;

  let page = parseInt(query.page) || 1;
  let limit = parseInt(query.limit) || defaultLimit;

  // バリデーション
  page = Math.max(1, page);
  limit = Math.max(minLimit, Math.min(maxLimit, limit));

  const sort = query.sort || 'createdAt';
  const order = query.order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  return {
    page,
    limit,
    sort,
    order
  };
};

module.exports = {
  calculatePagination,
  generatePaginationMeta,
  extractPaginationParams
};