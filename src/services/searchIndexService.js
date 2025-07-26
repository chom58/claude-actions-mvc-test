const fs = require('fs').promises;
const path = require('path');
const { Op } = require('sequelize');
const logger = require('../monitoring/logger');

/**
 * 全文検索インデックスサービス
 * 
 * SQLiteベースのシンプルな全文検索実装
 * 日本語の形態素解析と転置インデックスによる高速検索を提供
 */
class SearchIndexService {
  constructor() {
    this.indexPath = path.join(__dirname, '../../data/search-index');
    this.indexes = new Map();
    this.documentStore = new Map();
    this.stopWords = new Set([
      'の', 'に', 'は', 'を', 'た', 'が', 'で', 'て', 'と', 'し', 'れ', 'さ',
      'ある', 'いる', 'も', 'する', 'から', 'な', 'こと', 'として', 'い', 'や',
      'れる', 'など', 'なっ', 'ない', 'この', 'ため', 'その', 'あっ', 'よう',
      'また', 'もの', 'という', 'あり', 'まで', 'られ', 'なる', 'へ', 'か',
      'だ', 'これ', 'によって', 'により', 'おり', 'より', 'による', 'ず', 'なり',
      'られる', 'において', 'ば', 'なかっ', 'なく', 'しかし', 'について', 'せ', 'だっ',
      'その後', 'できる', 'それ', 'う', 'ので', 'なお', 'のみ', 'でき', 'き',
      'つ', 'における', 'および', 'いう', 'さらに', 'でも', 'ら', 'たり', 'その他',
      'に関する', 'たち', 'ます', 'ん', 'なら', 'に対して', '特に', 'せる', '及び',
      'これら', 'とき', 'では', 'にて', 'ほか', 'ながら', 'うち', 'そして', 'とともに',
      'ただし', 'かつて', 'それぞれ', 'または', 'お', 'ほど', 'ものの', 'に対する', 'ほとんど',
      'と共に', 'といった', 'です', 'とも', 'ところ', 'ここ'
    ]);
  }

  /**
   * インデックスの初期化
   */
  async initialize() {
    try {
      await fs.mkdir(this.indexPath, { recursive: true });
      await this.loadIndexes();
      logger.info('Search index service initialized');
    } catch (error) {
      logger.logError(error, { service: 'SearchIndexService', method: 'initialize' });
    }
  }

  /**
   * 既存のインデックスを読み込み
   */
  async loadIndexes() {
    try {
      const indexFile = path.join(this.indexPath, 'index.json');
      const exists = await fs.access(indexFile).then(() => true).catch(() => false);
      
      if (exists) {
        const data = await fs.readFile(indexFile, 'utf8');
        const parsed = JSON.parse(data);
        
        this.indexes = new Map(parsed.indexes);
        this.documentStore = new Map(parsed.documents);
      }
    } catch (error) {
      logger.logError(error, { service: 'SearchIndexService', method: 'loadIndexes' });
    }
  }

  /**
   * インデックスを保存
   */
  async saveIndexes() {
    try {
      const indexFile = path.join(this.indexPath, 'index.json');
      const data = {
        indexes: Array.from(this.indexes.entries()),
        documents: Array.from(this.documentStore.entries()),
        lastUpdated: new Date().toISOString()
      };
      
      await fs.writeFile(indexFile, JSON.stringify(data, null, 2));
    } catch (error) {
      logger.logError(error, { service: 'SearchIndexService', method: 'saveIndexes' });
    }
  }

  /**
   * ドキュメントをインデックスに追加
   */
  async indexDocument(type, id, document) {
    const docId = `${type}:${id}`;
    
    // ドキュメントを保存
    this.documentStore.set(docId, {
      type,
      id,
      document,
      indexedAt: new Date().toISOString()
    });

    // インデックス可能なフィールドを抽出
    const indexableText = this.extractIndexableText(document);
    const tokens = this.tokenize(indexableText);

    // 各トークンをインデックスに追加
    tokens.forEach(token => {
      if (!this.indexes.has(token)) {
        this.indexes.set(token, new Set());
      }
      this.indexes.get(token).add(docId);
    });

    // N-gramインデックスも作成（部分一致検索用）
    const ngrams = this.generateNgrams(indexableText, 2);
    ngrams.forEach(ngram => {
      const ngramKey = `ngram:${ngram}`;
      if (!this.indexes.has(ngramKey)) {
        this.indexes.set(ngramKey, new Set());
      }
      this.indexes.get(ngramKey).add(docId);
    });

    await this.saveIndexes();
  }

  /**
   * バッチインデックス作成
   */
  async batchIndex(documents) {
    logger.startTimer('batch_indexing');
    
    for (const doc of documents) {
      await this.indexDocument(doc.type, doc.id, doc.data);
    }
    
    const duration = logger.endTimer('batch_indexing');
    logger.info(`Batch indexed ${documents.length} documents in ${duration}ms`);
  }

  /**
   * ドキュメントをインデックスから削除
   */
  async removeDocument(type, id) {
    const docId = `${type}:${id}`;
    
    // ドキュメントストアから削除
    const doc = this.documentStore.get(docId);
    if (!doc) return;
    
    this.documentStore.delete(docId);

    // インデックスから削除
    for (const [token, docs] of this.indexes.entries()) {
      docs.delete(docId);
      if (docs.size === 0) {
        this.indexes.delete(token);
      }
    }

    await this.saveIndexes();
  }

  /**
   * 全文検索の実行
   */
  async search(query, options = {}) {
    const {
      types = [],
      limit = 20,
      offset = 0,
      minScore = 0.1
    } = options;

    logger.startTimer('fulltext_search');

    // クエリをトークン化
    const queryTokens = this.tokenize(query);
    const queryNgrams = this.generateNgrams(query, 2);

    // 各ドキュメントのスコアを計算
    const scores = new Map();

    // 完全一致トークンの検索
    queryTokens.forEach(token => {
      const docs = this.indexes.get(token);
      if (docs) {
        docs.forEach(docId => {
          const currentScore = scores.get(docId) || 0;
          scores.set(docId, currentScore + 1.0);
        });
      }
    });

    // N-gram部分一致の検索（スコアは低め）
    queryNgrams.forEach(ngram => {
      const docs = this.indexes.get(`ngram:${ngram}`);
      if (docs) {
        docs.forEach(docId => {
          const currentScore = scores.get(docId) || 0;
          scores.set(docId, currentScore + 0.3);
        });
      }
    });

    // タイプでフィルタリング
    let results = Array.from(scores.entries())
      .filter(([docId, score]) => {
        if (types.length === 0) return true;
        const doc = this.documentStore.get(docId);
        return doc && types.includes(doc.type);
      })
      .filter(([_, score]) => score >= minScore);

    // スコアで降順ソート
    results.sort((a, b) => b[1] - a[1]);

    // ページネーション
    const paginatedResults = results.slice(offset, offset + limit);

    // 結果を整形
    const formattedResults = paginatedResults.map(([docId, score]) => {
      const doc = this.documentStore.get(docId);
      return {
        ...doc.document,
        _score: score,
        _type: doc.type,
        _id: doc.id,
        _highlight: this.generateHighlight(doc.document, queryTokens)
      };
    });

    const duration = logger.endTimer('fulltext_search');

    logger.info('Fulltext search completed', {
      query,
      totalResults: results.length,
      returnedResults: formattedResults.length,
      duration
    });

    return {
      results: formattedResults,
      total: results.length,
      hasMore: offset + limit < results.length
    };
  }

  /**
   * インデックス可能なテキストを抽出
   */
  extractIndexableText(document) {
    const texts = [];

    // 各フィールドからテキストを抽出
    const extractFields = ['title', 'name', 'description', 'company', 'requirements', 'benefits'];
    
    extractFields.forEach(field => {
      if (document[field]) {
        texts.push(String(document[field]));
      }
    });

    // タグやスキルも含める
    if (document.tags && Array.isArray(document.tags)) {
      texts.push(...document.tags);
    }
    if (document.skills && Array.isArray(document.skills)) {
      texts.push(...document.skills);
    }

    return texts.join(' ');
  }

  /**
   * テキストをトークン化
   */
  tokenize(text) {
    if (!text) return [];

    // 小文字化
    text = text.toLowerCase();

    // 日本語と英語の単語を抽出
    const tokens = [];
    
    // 英数字の単語
    const alphanumericWords = text.match(/[a-z0-9]+/g) || [];
    tokens.push(...alphanumericWords);

    // 日本語の単語（簡易的な実装）
    // 実際のプロダクションではMeCabなどの形態素解析器を使用
    const japaneseWords = this.extractJapaneseWords(text);
    tokens.push(...japaneseWords);

    // ストップワードを除去
    return tokens.filter(token => 
      token.length > 1 && !this.stopWords.has(token)
    );
  }

  /**
   * 日本語の単語を抽出（簡易実装）
   */
  extractJapaneseWords(text) {
    const words = [];
    
    // ひらがな、カタカナ、漢字の連続を抽出
    const japanesePattern = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+/g;
    const matches = text.match(japanesePattern) || [];
    
    matches.forEach(match => {
      // 2文字以上の単語を抽出
      if (match.length >= 2) {
        words.push(match);
        
        // 3文字以上の場合は2-gramも生成
        if (match.length >= 3) {
          for (let i = 0; i < match.length - 1; i++) {
            words.push(match.substring(i, i + 2));
          }
        }
      }
    });

    return words;
  }

  /**
   * N-gramを生成
   */
  generateNgrams(text, n) {
    if (!text || text.length < n) return [];
    
    const ngrams = [];
    const cleanText = text.toLowerCase().replace(/\s+/g, '');
    
    for (let i = 0; i <= cleanText.length - n; i++) {
      ngrams.push(cleanText.substring(i, i + n));
    }
    
    return [...new Set(ngrams)];
  }

  /**
   * 検索結果のハイライトを生成
   */
  generateHighlight(document, queryTokens) {
    const highlights = {};
    const highlightFields = ['title', 'description', 'company'];

    highlightFields.forEach(field => {
      if (document[field]) {
        let highlighted = document[field];
        
        // クエリトークンをハイライト
        queryTokens.forEach(token => {
          const regex = new RegExp(`(${token})`, 'gi');
          highlighted = highlighted.replace(regex, '<mark>$1</mark>');
        });

        if (highlighted !== document[field]) {
          highlights[field] = highlighted;
        }
      }
    });

    return highlights;
  }

  /**
   * インデックスの統計情報を取得
   */
  getStats() {
    return {
      totalDocuments: this.documentStore.size,
      totalTokens: this.indexes.size,
      indexSizeBytes: JSON.stringify(Array.from(this.indexes.entries())).length,
      documentTypes: this.getDocumentTypeStats()
    };
  }

  /**
   * ドキュメントタイプ別の統計
   */
  getDocumentTypeStats() {
    const stats = {};
    
    for (const [_, doc] of this.documentStore) {
      if (!stats[doc.type]) {
        stats[doc.type] = 0;
      }
      stats[doc.type]++;
    }
    
    return stats;
  }

  /**
   * インデックスの再構築
   */
  async rebuildIndex() {
    logger.info('Starting index rebuild');
    
    // 既存のインデックスをクリア
    this.indexes.clear();
    const documents = Array.from(this.documentStore.values());
    this.documentStore.clear();

    // 全ドキュメントを再インデックス
    for (const doc of documents) {
      await this.indexDocument(doc.type, doc.id, doc.document);
    }

    logger.info(`Index rebuild completed. Reindexed ${documents.length} documents`);
  }
}

// シングルトンインスタンスをエクスポート
module.exports = new SearchIndexService();