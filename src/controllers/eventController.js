const { Event, EventParticipant, DesignCompany } = require('../models');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');

class EventController {
  // 全てのイベントを取得
  async getAllEvents(req, res) {
    try {
      const { page = 1, limit = 10, eventType, status, upcoming } = req.query;
      const offset = (page - 1) * limit;

      const whereClause = {};
      
      if (eventType) {
        whereClause.eventType = eventType;
      }
      
      if (status) {
        whereClause.status = status;
      }

      if (upcoming === 'true') {
        whereClause.startDateTime = {
          [Op.gte]: new Date()
        };
      }

      const events = await Event.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['startDateTime', 'ASC']],
        include: [{
          model: EventParticipant,
          as: 'participants',
          include: [{
            model: DesignCompany,
            as: 'company',
            attributes: ['name', 'area', 'specialties']
          }]
        }]
      });

      res.json({
        success: true,
        data: events.rows,
        pagination: {
          total: events.count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(events.count / limit)
        }
      });
    } catch (error) {
      console.error('イベント取得エラー:', error);
      res.status(500).json({
        success: false,
        error: 'イベントの取得に失敗しました'
      });
    }
  }

  // 近日開催のイベントを取得
  async getUpcomingEvents(req, res) {
    try {
      const events = await Event.findAll({
        where: {
          startDateTime: {
            [Op.gte]: new Date()
          },
          status: 'published'
        },
        order: [['startDateTime', 'ASC']],
        limit: 5,
        include: [{
          model: EventParticipant,
          as: 'participants',
          attributes: ['id', 'participantName', 'specialtyArea']
        }]
      });

      res.json({
        success: true,
        data: events,
        message: '近日開催予定のイベント'
      });
    } catch (error) {
      console.error('近日イベント取得エラー:', error);
      res.status(500).json({
        success: false,
        error: '近日イベントの取得に失敗しました'
      });
    }
  }

  // 特定のイベントを取得
  async getEventById(req, res) {
    try {
      const { id } = req.params;
      
      const event = await Event.findByPk(id, {
        include: [{
          model: EventParticipant,
          as: 'participants',
          include: [{
            model: DesignCompany,
            as: 'company'
          }]
        }]
      });

      if (!event) {
        return res.status(404).json({
          success: false,
          error: 'イベントが見つかりません'
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
        error: 'イベントの詳細取得に失敗しました'
      });
    }
  }

  // 新しいイベントを作成
  async createEvent(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const eventData = {
        ...req.body,
        venue: req.body.venue || '原宿イベントスペース',
        address: req.body.address || '東京都渋谷区神宮前',
        isHarajukuExclusive: req.body.isHarajukuExclusive !== false
      };

      const event = await Event.create(eventData);

      res.status(201).json({
        success: true,
        data: event,
        message: 'イベントが作成されました'
      });
    } catch (error) {
      console.error('イベント作成エラー:', error);
      res.status(500).json({
        success: false,
        error: 'イベントの作成に失敗しました'
      });
    }
  }

  // イベント情報を更新
  async updateEvent(req, res) {
    try {
      const { id } = req.params;
      const errors = validationResult(req);
      
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const event = await Event.findByPk(id);
      
      if (!event) {
        return res.status(404).json({
          success: false,
          error: 'イベントが見つかりません'
        });
      }

      await event.update(req.body);

      res.json({
        success: true,
        data: event,
        message: 'イベント情報が更新されました'
      });
    } catch (error) {
      console.error('イベント更新エラー:', error);
      res.status(500).json({
        success: false,
        error: 'イベントの更新に失敗しました'
      });
    }
  }

  // イベントを削除
  async deleteEvent(req, res) {
    try {
      const { id } = req.params;
      
      const event = await Event.findByPk(id);
      
      if (!event) {
        return res.status(404).json({
          success: false,
          error: 'イベントが見つかりません'
        });
      }

      await event.destroy();

      res.json({
        success: true,
        message: 'イベントが削除されました'
      });
    } catch (error) {
      console.error('イベント削除エラー:', error);
      res.status(500).json({
        success: false,
        error: 'イベントの削除に失敗しました'
      });
    }
  }

  // イベントに参加登録
  async registerForEvent(req, res) {
    try {
      const { id } = req.params;
      const errors = validationResult(req);
      
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const event = await Event.findByPk(id);
      
      if (!event) {
        return res.status(404).json({
          success: false,
          error: 'イベントが見つかりません'
        });
      }

      // 満員チェック
      if (event.currentParticipants >= event.maxParticipants) {
        return res.status(400).json({
          success: false,
          error: 'このイベントは満員です'
        });
      }

      // 登録期限チェック
      if (event.registrationDeadline && new Date() > event.registrationDeadline) {
        return res.status(400).json({
          success: false,
          error: '登録期限を過ぎています'
        });
      }

      // 重複参加チェック
      const existingParticipant = await EventParticipant.findOne({
        where: {
          eventId: id,
          participantEmail: req.body.participantEmail
        }
      });

      if (existingParticipant) {
        return res.status(400).json({
          success: false,
          error: '既にこのイベントに参加登録されています'
        });
      }

      // 参加者登録
      const participant = await EventParticipant.create({
        eventId: id,
        ...req.body
      });

      // イベントの現在参加者数を更新
      await event.increment('currentParticipants');

      res.status(201).json({
        success: true,
        data: participant,
        message: 'イベントへの参加登録が完了しました'
      });
    } catch (error) {
      console.error('イベント参加登録エラー:', error);
      res.status(500).json({
        success: false,
        error: 'イベントへの参加登録に失敗しました'
      });
    }
  }

  // イベント参加者一覧を取得
  async getEventParticipants(req, res) {
    try {
      const { id } = req.params;

      const participants = await EventParticipant.findAll({
        where: { eventId: id },
        include: [{
          model: DesignCompany,
          as: 'company',
          attributes: ['name', 'specialties', 'area']
        }],
        order: [['registrationDate', 'ASC']]
      });

      res.json({
        success: true,
        data: participants,
        total: participants.length
      });
    } catch (error) {
      console.error('参加者取得エラー:', error);
      res.status(500).json({
        success: false,
        error: '参加者の取得に失敗しました'
      });
    }
  }

  // イベント統計情報を取得
  async getEventStatistics(req, res) {
    try {
      const totalEvents = await Event.count();
      const upcomingEvents = await Event.count({
        where: {
          startDateTime: {
            [Op.gte]: new Date()
          },
          status: 'published'
        }
      });
      const totalParticipants = await EventParticipant.count();
      
      // イベントタイプ別統計
      const eventTypeStats = await Event.findAll({
        attributes: [
          'eventType',
          [Event.sequelize.fn('COUNT', Event.sequelize.col('id')), 'count']
        ],
        group: ['eventType'],
        raw: true
      });

      res.json({
        success: true,
        data: {
          totalEvents,
          upcomingEvents,
          totalParticipants,
          eventTypeDistribution: eventTypeStats
        }
      });
    } catch (error) {
      console.error('イベント統計取得エラー:', error);
      res.status(500).json({
        success: false,
        error: 'イベント統計の取得に失敗しました'
      });
    }
  }
}

module.exports = new EventController();