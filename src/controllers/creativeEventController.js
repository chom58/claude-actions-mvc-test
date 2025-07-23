const { CreativeEvent } = require('../models');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');

const creativeEventController = {
  // 全イベントの取得
  async getAllEvents(req, res) {
    try {
      const { page = 1, limit = 10, eventType, status = 'upcoming', venue } = req.query;
      const offset = (page - 1) * limit;

      const whereClause = {};
      if (eventType) whereClause.eventType = eventType;
      if (status) whereClause.status = status;
      if (venue) whereClause.venue = { [Op.iLike]: `%${venue}%` };
      
      // 過去のイベントを除外
      if (status === 'upcoming') {
        whereClause.eventDate = { [Op.gte]: new Date() };
      }

      const { count, rows: events } = await CreativeEvent.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset: offset,
        order: [['eventDate', 'ASC']]
      });

      res.json({
        success: true,
        data: events,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit)
        }
      });
    } catch (error) {
      console.error('イベント取得エラー:', error);
      res.status(500).json({
        success: false,
        message: 'イベントの取得に失敗しました'
      });
    }
  },

  // 近日開催イベントの取得
  async getUpcomingEvents(req, res) {
    try {
      const { limit = 6, eventType, targetAudience } = req.query;

      const whereClause = {
        status: 'upcoming',
        eventDate: { [Op.gte]: new Date() },
        isActive: true
      };

      if (eventType) whereClause.eventType = eventType;
      if (targetAudience) {
        whereClause.targetAudience = {
          [Op.contains]: [targetAudience]
        };
      }

      const events = await CreativeEvent.findAll({
        where: whereClause,
        limit: parseInt(limit),
        order: [['eventDate', 'ASC']],
        attributes: [
          'id', 'title', 'description', 'eventType', 'venue', 
          'eventDate', 'startTime', 'endTime', 'capacity', 
          'currentParticipants', 'registrationFee', 'isOnline',
          'organizerName', 'imageUrl', 'tags'
        ]
      });

      res.json({
        success: true,
        data: events,
        total: events.length
      });
    } catch (error) {
      console.error('近日開催イベント取得エラー:', error);
      res.status(500).json({
        success: false,
        message: '近日開催イベントの取得に失敗しました'
      });
    }
  },

  // 特定イベントの詳細取得
  async getEventById(req, res) {
    try {
      const { id } = req.params;
      
      const event = await CreativeEvent.findByPk(id);

      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'イベントが見つかりませんでした'
        });
      }

      res.json({
        success: true,
        data: event
      });
    } catch (error) {
      console.error('イベント詳細取得エラー:', error);
      res.status(500).json({
        success: false,
        message: 'イベントの詳細取得に失敗しました'
      });
    }
  },

  // 新規イベントの作成
  async createEvent(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'バリデーションエラー',
          errors: errors.array()
        });
      }

      const eventData = req.body;
      
      // イベント日時が未来の日付かチェック
      if (new Date(eventData.eventDate) <= new Date()) {
        return res.status(400).json({
          success: false,
          message: 'イベント日時は未来の日付を指定してください'
        });
      }

      const event = await CreativeEvent.create(eventData);

      res.status(201).json({
        success: true,
        message: 'イベントが正常に作成されました',
        data: event
      });
    } catch (error) {
      console.error('イベント作成エラー:', error);
      res.status(500).json({
        success: false,
        message: 'イベントの作成に失敗しました'
      });
    }
  },

  // イベント情報の更新
  async updateEvent(req, res) {
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

      const [updatedRowsCount] = await CreativeEvent.update(updateData, {
        where: { id }
      });

      if (updatedRowsCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'イベントが見つかりませんでした'
        });
      }

      const updatedEvent = await CreativeEvent.findByPk(id);

      res.json({
        success: true,
        message: 'イベント情報が正常に更新されました',
        data: updatedEvent
      });
    } catch (error) {
      console.error('イベント更新エラー:', error);
      res.status(500).json({
        success: false,
        message: 'イベントの更新に失敗しました'
      });
    }
  },

  // イベントの削除
  async deleteEvent(req, res) {
    try {
      const { id } = req.params;

      const deletedRowsCount = await CreativeEvent.destroy({
        where: { id }
      });

      if (deletedRowsCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'イベントが見つかりませんでした'
        });
      }

      res.json({
        success: true,
        message: 'イベントが正常に削除されました'
      });
    } catch (error) {
      console.error('イベント削除エラー:', error);
      res.status(500).json({
        success: false,
        message: 'イベントの削除に失敗しました'
      });
    }
  },

  // イベント参加登録
  async registerForEvent(req, res) {
    try {
      const { id } = req.params;
      const { participantName, participantEmail, participantType = 'individual' } = req.body;

      if (!participantName || !participantEmail) {
        return res.status(400).json({
          success: false,
          message: '参加者名とメールアドレスは必須です'
        });
      }

      const event = await CreativeEvent.findByPk(id);

      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'イベントが見つかりませんでした'
        });
      }

      if (event.currentParticipants >= event.capacity) {
        return res.status(400).json({
          success: false,
          message: 'イベントの定員に達しています'
        });
      }

      if (event.registrationDeadline && new Date() > event.registrationDeadline) {
        return res.status(400).json({
          success: false,
          message: '参加登録の締切が過ぎています'
        });
      }

      // 参加者数を増加
      await CreativeEvent.update(
        { currentParticipants: event.currentParticipants + 1 },
        { where: { id } }
      );

      res.json({
        success: true,
        message: 'イベントに正常に参加登録されました',
        data: {
          eventId: id,
          eventTitle: event.title,
          participantName,
          participantEmail,
          participantType
        }
      });
    } catch (error) {
      console.error('イベント参加登録エラー:', error);
      res.status(500).json({
        success: false,
        message: 'イベント参加登録に失敗しました'
      });
    }
  },

  // イベントタイプ別検索
  async searchByType(req, res) {
    try {
      const { eventType } = req.params;
      const { limit = 10, status = 'upcoming' } = req.query;

      const whereClause = {
        eventType,
        status,
        isActive: true
      };

      if (status === 'upcoming') {
        whereClause.eventDate = { [Op.gte]: new Date() };
      }

      const events = await CreativeEvent.findAll({
        where: whereClause,
        limit: parseInt(limit),
        order: [['eventDate', 'ASC']],
        attributes: [
          'id', 'title', 'description', 'eventType', 'venue',
          'eventDate', 'startTime', 'capacity', 'currentParticipants',
          'registrationFee', 'organizerName', 'imageUrl'
        ]
      });

      res.json({
        success: true,
        data: events,
        total: events.length,
        eventType
      });
    } catch (error) {
      console.error('イベントタイプ検索エラー:', error);
      res.status(500).json({
        success: false,
        message: 'イベントタイプでの検索に失敗しました'
      });
    }
  }
};

module.exports = creativeEventController;