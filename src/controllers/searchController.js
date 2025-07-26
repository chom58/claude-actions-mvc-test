const { Op } = require('sequelize');
const { 
  DesignerJob, 
  CreativeEvent, 
  Collaboration,
  DesignCompany,
  ApparelBrand
} = require('../models');
const logger = require('../monitoring/logger');
const searchIndexService = require('../services/searchIndexService');

/**
 * 統合検索コントローラー
 * 複数のリソースタイプを横断的に検索
 */
class SearchController {
  /**
   * メイン検索エンドポイント
   */
  async search(req, res) {
    try {
      const {
        q = '',
        page = 1,
        limit = 20,
        sort = 'relevance',
        experience = [],
        employment = [],
        location = [],
        salaryMin,
        salaryMax,
        remoteOk,
        skills = []
      } = req.query;

      logger.startTimer('search_request');

      // 全文検索を使用する場合
      if (q && q.length >= 2) {
        try {
          const fullTextResults = await searchIndexService.search(q, {
            types: this.getSearchTypes(req.query),
            limit: limit * 2, // 多めに取得してフィルタリング
            minScore: 0.3
          });

          // 全文検索結果にフィルターを適用
          const filteredResults = this.applyFilters(fullTextResults.results, {
            experience,
            employment,
            location,
            salaryMin,
            salaryMax,
            remoteOk,
            skills
          });

          // ソートとページネーション
          const sortedResults = this.sortResults(filteredResults, sort);
          const startIndex = (page - 1) * limit;
          const paginatedResults = sortedResults.slice(startIndex, startIndex + limit);

          const duration = logger.endTimer('search_request');

          logger.logUserAction('fulltext_search', req.user?.id, {
            query: q,
            filters: { experience, employment, location, salaryMin, salaryMax, remoteOk, skills },
            resultCount: paginatedResults.length,
            totalCount: filteredResults.length,
            duration
          });

          return res.json({
            success: true,
            results: paginatedResults,
            total: filteredResults.length,
            page,
            limit,
            hasMore: startIndex + limit < filteredResults.length,
            searchType: 'fulltext'
          });
        } catch (error) {
          logger.logError(error, { controller: 'search', method: 'fulltext_search' });
          // 全文検索が失敗した場合は通常の検索にフォールバック
        }
      }

      // 検索結果を格納する配列
      const results = [];
      let total = 0;

      // 基本的な検索条件
      const searchCondition = q ? {
        [Op.or]: [
          { title: { [Op.like]: `%${q}%` } },
          { description: { [Op.like]: `%${q}%` } },
          { company: { [Op.like]: `%${q}%` } },
          { name: { [Op.like]: `%${q}%` } }
        ]
      } : {};

      // 1. デザイナー求人を検索
      if (!experience.length || experience.some(exp => ['entry_level', 'new_graduate', 'experienced'].includes(exp))) {
        const jobConditions = { ...searchCondition };

        // 経験レベルフィルター
        if (experience.length > 0) {
          const expConditions = [];
          if (experience.includes('entry_level')) {
            expConditions.push({ isExperienceWelcome: true });
          }
          if (experience.includes('new_graduate')) {
            expConditions.push({ isNewGraduateWelcome: true });
          }
          if (experience.includes('experienced')) {
            expConditions.push({ 
              [Op.and]: [
                { isExperienceWelcome: false },
                { isNewGraduateWelcome: false }
              ]
            });
          }
          if (expConditions.length > 0) {
            jobConditions[Op.or] = expConditions;
          }
        }

        // 給与範囲フィルター
        if (salaryMin || salaryMax) {
          jobConditions.salaryMin = {};
          jobConditions.salaryMax = {};
          if (salaryMin) {
            jobConditions.salaryMin[Op.gte] = salaryMin;
          }
          if (salaryMax) {
            jobConditions.salaryMax[Op.lte] = salaryMax;
          }
        }

        // リモート可フィルター
        if (remoteOk === true) {
          jobConditions.isRemoteOk = true;
        }

        const jobs = await DesignerJob.findAll({
          where: jobConditions,
          limit: Math.min(limit, 10), // 各タイプで最大10件
          order: this.getOrderClause(sort, 'job')
        });

        jobs.forEach(job => {
          results.push({
            id: job.id,
            type: 'designer_job',
            title: job.title,
            company: job.company,
            description: job.description,
            location: job.location,
            salaryMin: job.salaryMin,
            salaryMax: job.salaryMax,
            isRemoteOk: job.isRemoteOk,
            isExperienceWelcome: job.isExperienceWelcome,
            isNewGraduateWelcome: job.isNewGraduateWelcome,
            tags: job.requirements ? job.requirements.split(',').map(r => r.trim()) : [],
            createdAt: job.createdAt,
            score: this.calculateRelevanceScore(job, q, skills)
          });
        });

        total += await DesignerJob.count({ where: jobConditions });
      }

      // 2. イベントを検索
      if (q || !experience.length) {
        const eventConditions = {
          ...searchCondition,
          date: { [Op.gte]: new Date() } // 未来のイベントのみ
        };

        // 場所フィルター
        if (location.length > 0) {
          eventConditions.location = { [Op.in]: location };
        }

        const events = await CreativeEvent.findAll({
          where: eventConditions,
          limit: Math.min(limit, 10),
          order: [['date', 'ASC']]
        });

        events.forEach(event => {
          results.push({
            id: event.id,
            type: 'event',
            name: event.name,
            title: event.name,
            description: event.description,
            location: event.location,
            date: event.date,
            createdAt: event.createdAt,
            score: this.calculateRelevanceScore(event, q, skills)
          });
        });

        total += await CreativeEvent.count({ where: eventConditions });
      }

      // 3. コラボレーションを検索
      if (q || !experience.length) {
        const collabConditions = {
          ...searchCondition,
          status: 'open'
        };

        const collaborations = await Collaboration.findAll({
          where: collabConditions,
          limit: Math.min(limit, 10),
          order: [['createdAt', 'DESC']]
        });

        collaborations.forEach(collab => {
          results.push({
            id: collab.id,
            type: 'collaboration',
            title: collab.title,
            description: collab.description,
            projectType: collab.projectType,
            budget: collab.budget,
            createdAt: collab.createdAt,
            score: this.calculateRelevanceScore(collab, q, skills)
          });
        });

        total += await Collaboration.count({ where: collabConditions });
      }

      // 結果をソート
      const sortedResults = this.sortResults(results, sort, page, limit);

      // ページネーション
      const startIndex = (page - 1) * limit;
      const paginatedResults = sortedResults.slice(startIndex, startIndex + limit);

      const duration = logger.endTimer('search_request');

      // 検索ログを記録
      logger.logUserAction('search', req.user?.id, {
        query: q,
        filters: { experience, employment, location, salaryMin, salaryMax, remoteOk, skills },
        resultCount: paginatedResults.length,
        totalCount: total,
        duration
      });

      res.json({
        success: true,
        results: paginatedResults,
        total,
        page,
        limit,
        hasMore: startIndex + limit < sortedResults.length
      });

    } catch (error) {
      logger.logError(error, { controller: 'search', method: 'search' });
      res.status(500).json({
        success: false,
        error: '検索中にエラーが発生しました'
      });
    }
  }

  /**
   * サジェスト（オートコンプリート）
   */
  async suggest(req, res) {
    try {
      const { q } = req.query;
      const suggestions = [];

      // 求人タイトルからサジェスト
      const jobSuggestions = await DesignerJob.findAll({
        where: {
          title: { [Op.like]: `%${q}%` }
        },
        attributes: ['title'],
        limit: 5,
        group: ['title']
      });

      jobSuggestions.forEach(job => {
        suggestions.push({
          text: job.title,
          type: 'job_title'
        });
      });

      // 会社名からサジェスト
      const companySuggestions = await DesignerJob.findAll({
        where: {
          company: { [Op.like]: `%${q}%` }
        },
        attributes: ['company'],
        limit: 5,
        group: ['company']
      });

      companySuggestions.forEach(job => {
        suggestions.push({
          text: job.company,
          type: 'company'
        });
      });

      // イベント名からサジェスト
      const eventSuggestions = await CreativeEvent.findAll({
        where: {
          name: { [Op.like]: `%${q}%` },
          date: { [Op.gte]: new Date() }
        },
        attributes: ['name'],
        limit: 3
      });

      eventSuggestions.forEach(event => {
        suggestions.push({
          text: event.name,
          type: 'event'
        });
      });

      res.json({
        success: true,
        suggestions
      });

    } catch (error) {
      logger.logError(error, { controller: 'search', method: 'suggest' });
      res.status(500).json({
        success: false,
        error: 'サジェスト取得中にエラーが発生しました'
      });
    }
  }

  /**
   * 人気の検索キーワード取得
   */
  async getPopularSearches(req, res) {
    try {
      // 実際の実装では検索ログから集計する
      // ここではデモ用の固定データを返す
      const popularSearches = [
        { keyword: 'UI/UXデザイナー', count: 1523 },
        { keyword: '未経験歓迎', count: 1342 },
        { keyword: 'リモートワーク', count: 987 },
        { keyword: 'Figma', count: 856 },
        { keyword: '原宿', count: 743 },
        { keyword: 'グラフィックデザイン', count: 652 },
        { keyword: '新卒', count: 589 },
        { keyword: 'イラストレーター', count: 478 }
      ];

      res.json({
        success: true,
        searches: popularSearches
      });

    } catch (error) {
      logger.logError(error, { controller: 'search', method: 'getPopularSearches' });
      res.status(500).json({
        success: false,
        error: '人気検索キーワード取得中にエラーが発生しました'
      });
    }
  }

  /**
   * フィルター統計情報の取得
   */
  async getFilterStats(req, res) {
    try {
      const stats = {
        experience: {
          entry_level: await DesignerJob.count({ where: { isExperienceWelcome: true } }),
          new_graduate: await DesignerJob.count({ where: { isNewGraduateWelcome: true } }),
          experienced: await DesignerJob.count({ 
            where: { 
              isExperienceWelcome: false,
              isNewGraduateWelcome: false
            } 
          })
        },
        location: {
          harajuku: 85,
          shibuya: 72,
          omotesando: 43
        },
        remoteOk: await DesignerJob.count({ where: { isRemoteOk: true } }),
        totalJobs: await DesignerJob.count(),
        totalEvents: await CreativeEvent.count({ 
          where: { date: { [Op.gte]: new Date() } }
        }),
        totalCollaborations: await Collaboration.count({ 
          where: { status: 'open' }
        })
      };

      res.json({
        success: true,
        stats
      });

    } catch (error) {
      logger.logError(error, { controller: 'search', method: 'getFilterStats' });
      res.status(500).json({
        success: false,
        error: 'フィルター統計取得中にエラーが発生しました'
      });
    }
  }

  /**
   * ソート条件を取得
   */
  getOrderClause(sort, type) {
    switch (sort) {
      case 'date_desc':
        return [['createdAt', 'DESC']];
      case 'date_asc':
        return [['createdAt', 'ASC']];
      case 'salary_desc':
        return type === 'job' ? [['salaryMax', 'DESC']] : [['createdAt', 'DESC']];
      case 'salary_asc':
        return type === 'job' ? [['salaryMin', 'ASC']] : [['createdAt', 'DESC']];
      default:
        return [['createdAt', 'DESC']];
    }
  }

  /**
   * 関連度スコアを計算
   */
  calculateRelevanceScore(item, query, skills) {
    let score = 0;

    if (!query) return score;

    const searchFields = ['title', 'description', 'company', 'name'];
    const queryLower = query.toLowerCase();

    // タイトルでの一致は高スコア
    searchFields.forEach(field => {
      if (item[field]) {
        const fieldValue = item[field].toLowerCase();
        if (fieldValue.includes(queryLower)) {
          score += field === 'title' || field === 'name' ? 10 : 5;
        }
      }
    });

    // スキルの一致
    if (skills.length > 0 && item.requirements) {
      const itemSkills = item.requirements.toLowerCase();
      skills.forEach(skill => {
        if (itemSkills.includes(skill.toLowerCase())) {
          score += 3;
        }
      });
    }

    return score;
  }

  /**
   * 結果をソート
   */
  sortResults(results, sort, page, limit) {
    switch (sort) {
      case 'relevance':
        return results.sort((a, b) => b.score - a.score || b.createdAt - a.createdAt);
      case 'date_desc':
        return results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      case 'date_asc':
        return results.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      case 'salary_desc':
        return results.sort((a, b) => (b.salaryMax || 0) - (a.salaryMax || 0));
      case 'salary_asc':
        return results.sort((a, b) => (a.salaryMin || 0) - (b.salaryMin || 0));
      default:
        return results;
    }
  }

  /**
   * 検索タイプを取得
   */
  getSearchTypes(query) {
    const types = [];
    
    if (query.type) {
      if (Array.isArray(query.type)) {
        types.push(...query.type);
      } else {
        types.push(query.type);
      }
    }
    
    return types;
  }

  /**
   * 全文検索結果にフィルターを適用
   */
  applyFilters(results, filters) {
    return results.filter(result => {
      // 経験レベルフィルター
      if (filters.experience && filters.experience.length > 0 && result._type === 'designer_job') {
        const matchesExperience = filters.experience.some(exp => {
          switch(exp) {
            case 'entry_level':
              return result.isExperienceWelcome;
            case 'new_graduate':
              return result.isNewGraduateWelcome;
            case 'experienced':
              return !result.isExperienceWelcome && !result.isNewGraduateWelcome;
            default:
              return false;
          }
        });
        if (!matchesExperience) return false;
      }

      // 給与フィルター
      if (result._type === 'designer_job') {
        if (filters.salaryMin && result.salaryMax && result.salaryMax < filters.salaryMin) {
          return false;
        }
        if (filters.salaryMax && result.salaryMin && result.salaryMin > filters.salaryMax) {
          return false;
        }
      }

      // リモート可フィルター
      if (filters.remoteOk === true && result._type === 'designer_job' && !result.isRemoteOk) {
        return false;
      }

      // 場所フィルター
      if (filters.location && filters.location.length > 0) {
        if (!result.location || !filters.location.includes(result.location)) {
          return false;
        }
      }

      return true;
    });
  }
}

module.exports = new SearchController();