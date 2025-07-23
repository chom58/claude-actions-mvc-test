const { MatchingRequest } = require('../models');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');

const matchingController = {
  // 全マッチングリクエストの取得
  async getAllRequests(req, res) {
    try {
      const { page = 1, limit = 12, requestType, targetType, status = 'active', priority } = req.query;
      const offset = (page - 1) * limit;

      const whereClause = {};
      if (requestType) whereClause.requestType = requestType;
      if (targetType) whereClause.targetType = targetType;
      if (status) whereClause.status = status;
      if (priority) whereClause.priority = priority;

      // 期限切れのリクエストを除外
      whereClause.expiryDate = {
        [Op.or]: [
          { [Op.is]: null },
          { [Op.gte]: new Date() }
        ]
      };

      const { count, rows: requests } = await MatchingRequest.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset: offset,
        order: [['priority', 'DESC'], ['createdAt', 'DESC']],
        attributes: [
          'id', 'title', 'description', 'requestType', 'requesterType',
          'requesterName', 'targetType', 'skillsNeeded', 'skillsOffered',
          'projectScope', 'budgetRange', 'timeline', 'location',
          'isRemoteOk', 'tags', 'priority', 'viewCount', 'responseCount',
          'createdAt'
        ]
      });

      res.json({
        success: true,
        data: requests,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit)
        }
      });
    } catch (error) {
      console.error('マッチングリクエスト取得エラー:', error);
      res.status(500).json({
        success: false,
        message: 'マッチングリクエストの取得に失敗しました'
      });
    }
  },

  // 人気・緊急のマッチングリクエスト取得
  async getHighPriorityRequests(req, res) {
    try {
      const { limit = 8, requestType, targetType } = req.query;

      const whereClause = {
        status: 'active',
        priority: { [Op.in]: ['high', 'urgent'] },
        expiryDate: {
          [Op.or]: [
            { [Op.is]: null },
            { [Op.gte]: new Date() }
          ]
        }
      };

      if (requestType) whereClause.requestType = requestType;
      if (targetType) whereClause.targetType = targetType;

      const requests = await MatchingRequest.findAll({
        where: whereClause,
        limit: parseInt(limit),
        order: [
          ['priority', 'DESC'],
          ['responseCount', 'ASC'],
          ['createdAt', 'DESC']
        ],
        attributes: [
          'id', 'title', 'description', 'requestType', 'requesterName',
          'targetType', 'skillsNeeded', 'projectScope', 'budgetRange',
          'timeline', 'location', 'isRemoteOk', 'tags', 'priority',
          'viewCount', 'responseCount', 'createdAt'
        ]
      });

      res.json({
        success: true,
        data: requests,
        total: requests.length
      });
    } catch (error) {
      console.error('高優先度マッチングリクエスト取得エラー:', error);
      res.status(500).json({
        success: false,
        message: '高優先度マッチングリクエストの取得に失敗しました'
      });
    }
  },

  // 特定マッチングリクエストの詳細取得
  async getRequestById(req, res) {
    try {
      const { id } = req.params;
      
      const request = await MatchingRequest.findByPk(id);

      if (!request) {
        return res.status(404).json({
          success: false,
          message: 'マッチングリクエストが見つかりませんでした'
        });
      }

      // 閲覧数を増加
      await MatchingRequest.update(
        { viewCount: request.viewCount + 1 },
        { where: { id } }
      );

      res.json({
        success: true,
        data: request
      });
    } catch (error) {
      console.error('マッチングリクエスト詳細取得エラー:', error);
      res.status(500).json({
        success: false,
        message: 'マッチングリクエストの詳細取得に失敗しました'
      });
    }
  },

  // 新規マッチングリクエストの作成
  async createRequest(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'バリデーションエラー',
          errors: errors.array()
        });
      }

      const requestData = req.body;

      // 期限が未来の日付かチェック（設定されている場合）
      if (requestData.expiryDate && new Date(requestData.expiryDate) <= new Date()) {
        return res.status(400).json({
          success: false,
          message: '有効期限は未来の日付を指定してください'
        });
      }

      const request = await MatchingRequest.create(requestData);

      res.status(201).json({
        success: true,
        message: 'マッチングリクエストが正常に作成されました',
        data: request
      });
    } catch (error) {
      console.error('マッチングリクエスト作成エラー:', error);
      res.status(500).json({
        success: false,
        message: 'マッチングリクエストの作成に失敗しました'
      });
    }
  },

  // マッチングリクエスト情報の更新
  async updateRequest(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'バリデーションエラー',
          errors: errors.array()
        });
      }

      const { id } = req.params;
      const updateData = req.body;

      const [updatedRowsCount] = await MatchingRequest.update(updateData, {
        where: { id }
      });

      if (updatedRowsCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'マッチングリクエストが見つかりませんでした'
        });
      }

      const updatedRequest = await MatchingRequest.findByPk(id);

      res.json({
        success: true,
        message: 'マッチングリクエストが正常に更新されました',
        data: updatedRequest
      });
    } catch (error) {
      console.error('マッチングリクエスト更新エラー:', error);
      res.status(500).json({
        success: false,
        message: 'マッチングリクエストの更新に失敗しました'
      });
    }
  },

  // マッチングリクエストの削除
  async deleteRequest(req, res) {
    try {
      const { id } = req.params;

      const deletedRowsCount = await MatchingRequest.destroy({
        where: { id }
      });

      if (deletedRowsCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'マッチングリクエストが見つかりませんでした'
        });
      }

      res.json({
        success: true,
        message: 'マッチングリクエストが正常に削除されました'
      });
    } catch (error) {
      console.error('マッチングリクエスト削除エラー:', error);
      res.status(500).json({
        success: false,
        message: 'マッチングリクエストの削除に失敗しました'
      });
    }
  },

  // スキル別マッチングリクエスト検索
  async searchBySkill(req, res) {
    try {
      const { skill } = req.params;
      const { limit = 10, requestType, targetType } = req.query;

      const whereClause = {
        status: 'active',
        expiryDate: {
          [Op.or]: [
            { [Op.is]: null },
            { [Op.gte]: new Date() }
          ]
        },
        [Op.or]: [
          {
            skillsNeeded: {
              [Op.contains]: [skill]
            }
          },
          {
            skillsOffered: {
              [Op.contains]: [skill]
            }
          }
        ]
      };

      if (requestType) whereClause.requestType = requestType;
      if (targetType) whereClause.targetType = targetType;

      const requests = await MatchingRequest.findAll({
        where: whereClause,
        limit: parseInt(limit),
        order: [['priority', 'DESC'], ['createdAt', 'DESC']],
        attributes: [
          'id', 'title', 'description', 'requestType', 'requesterName',
          'skillsNeeded', 'skillsOffered', 'projectScope', 'budgetRange',
          'location', 'tags', 'priority', 'createdAt'
        ]
      });

      res.json({
        success: true,
        data: requests,
        total: requests.length,
        searchSkill: skill
      });
    } catch (error) {
      console.error('スキル検索エラー:', error);
      res.status(500).json({
        success: false,
        message: 'スキルでの検索に失敗しました'
      });
    }
  },

  // マッチングリクエストへの応答（レスポンス数増加）
  async respondToRequest(req, res) {
    try {
      const { id } = req.params;
      const { responderName, responderEmail, message, contactMethod = 'email' } = req.body;

      if (!responderName || !responderEmail || !message) {
        return res.status(400).json({
          success: false,
          message: '応答者名、メールアドレス、メッセージは必須です'
        });
      }

      const request = await MatchingRequest.findByPk(id);

      if (!request) {
        return res.status(404).json({
          success: false,
          message: 'マッチングリクエストが見つかりませんでした'
        });
      }

      if (request.status !== 'active') {
        return res.status(400).json({
          success: false,
          message: 'このマッチングリクエストは現在受付停止中です'
        });
      }

      if (request.expiryDate && new Date() > request.expiryDate) {
        return res.status(400).json({
          success: false,
          message: 'このマッチングリクエストの期限が過ぎています'
        });
      }

      // レスポンス数を増加
      await MatchingRequest.update(
        { responseCount: request.responseCount + 1 },
        { where: { id } }
      );

      res.json({
        success: true,
        message: 'マッチングリクエストに正常に応答しました',
        data: {
          requestId: id,
          requestTitle: request.title,
          responderName,
          responderEmail,
          message,
          contactMethod
        }
      });
    } catch (error) {
      console.error('マッチングリクエスト応答エラー:', error);
      res.status(500).json({
        success: false,
        message: 'マッチングリクエストへの応答に失敗しました'
      });
    }
  },

  // リクエストタイプ別検索
  async searchByRequestType(req, res) {
    try {
      const { requestType } = req.params;
      const { limit = 10, priority, location } = req.query;

      const whereClause = {
        requestType,
        status: 'active',
        expiryDate: {
          [Op.or]: [
            { [Op.is]: null },
            { [Op.gte]: new Date() }
          ]
        }
      };

      if (priority) whereClause.priority = priority;
      if (location) whereClause.location = location;

      const requests = await MatchingRequest.findAll({
        where: whereClause,
        limit: parseInt(limit),
        order: [['priority', 'DESC'], ['responseCount', 'ASC'], ['createdAt', 'DESC']],
        attributes: [
          'id', 'title', 'description', 'requesterName', 'targetType',
          'skillsNeeded', 'projectScope', 'budgetRange', 'timeline',
          'location', 'isRemoteOk', 'tags', 'priority', 'viewCount',
          'responseCount', 'createdAt'
        ]
      });

      res.json({
        success: true,
        data: requests,
        total: requests.length,
        requestType
      });
    } catch (error) {
      console.error('リクエストタイプ検索エラー:', error);
      res.status(500).json({
        success: false,
        message: 'リクエストタイプでの検索に失敗しました'
      });
    }
  }
};

module.exports = matchingController;