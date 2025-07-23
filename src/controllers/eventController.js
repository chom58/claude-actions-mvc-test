const { Event, EventParticipant, DesignCompany, User } = require('../models');
const { validationResult } = require('express-validator');
const { getPaginationParams } = require('../utils/pagination');

const eventController = {
  // 全イベント取得
  async getAllEvents(req, res) {
    try {
      const { page, limit, offset } = getPaginationParams(req.query);
      const { type, status, isPublic } = req.query;

      const where = {};
      if (type) where.type = type;
      if (status) where.status = status;
      if (isPublic !== undefined) where.isPublic = isPublic === 'true';

      const events = await Event.findAndCountAll({
        where,
        limit,
        offset,
        include: [
          {
            model: EventParticipant,
            as: 'participants',
            include: [
              {
                model: DesignCompany,
                as: 'company',
                attributes: ['id', 'name', 'type']
              }
            ]
          }
        ],
        order: [['startDate', 'ASC']]
      });

      res.json({
        success: true,
        data: events.rows,
        pagination: {
          page,
          limit,
          total: events.count,
          totalPages: Math.ceil(events.count / limit)
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'イベントの取得に失敗しました',
        error: error.message
      });
    }
  },

  // 特定イベント取得
  async getEventById(req, res) {
    try {
      const { id } = req.params;
      
      const event = await Event.findByPk(id, {
        include: [
          {
            model: EventParticipant,
            as: 'participants',
            include: [
              {
                model: DesignCompany,
                as: 'company',
                attributes: ['id', 'name', 'type', 'website']
              },
              {
                model: User,
                as: 'user',
                attributes: ['id', 'username', 'email']
              }
            ]
          }
        ]
      });

      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'イベントが見つかりません'
        });
      }

      res.json({
        success: true,
        data: event
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'イベントの取得に失敗しました',
        error: error.message
      });
    }
  },

  // イベント作成
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

      const {
        title, description, type, startDate, endDate,
        location, address, maxParticipants, registrationDeadline,
        fee, requirements, agenda, tags, isPublic
      } = req.body;

      const event = await Event.create({
        title,
        description,
        type,
        startDate,
        endDate,
        location: location || '原宿イベントスペース',
        address: address || '東京都渋谷区神宮前',
        maxParticipants,
        registrationDeadline,
        fee: fee || 0,
        requirements,
        agenda: agenda ? JSON.stringify(agenda) : null,
        tags: tags ? JSON.stringify(tags) : null,
        isPublic: isPublic !== undefined ? isPublic : true,
        status: 'draft'
      });

      res.status(201).json({
        success: true,
        message: 'イベントが正常に作成されました',
        data: event
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'イベントの作成に失敗しました',
        error: error.message
      });
    }
  },

  // イベント更新
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
      const updateData = { ...req.body };

      if (updateData.agenda) {
        updateData.agenda = JSON.stringify(updateData.agenda);
      }
      if (updateData.tags) {
        updateData.tags = JSON.stringify(updateData.tags);
      }

      const [updatedCount] = await Event.update(updateData, {
        where: { id }
      });

      if (updatedCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'イベントが見つかりません'
        });
      }

      const updatedEvent = await Event.findByPk(id);

      res.json({
        success: true,
        message: 'イベントが正常に更新されました',
        data: updatedEvent
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'イベントの更新に失敗しました',
        error: error.message
      });
    }
  },

  // イベント削除
  async deleteEvent(req, res) {
    try {
      const { id } = req.params;
      
      const deletedCount = await Event.destroy({
        where: { id }
      });

      if (deletedCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'イベントが見つかりません'
        });
      }

      res.json({
        success: true,
        message: 'イベントが正常に削除されました'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'イベントの削除に失敗しました',
        error: error.message
      });
    }
  },

  // イベント参加登録
  async registerForEvent(req, res) {
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
      const {
        designCompanyId, userId, participantName,
        participantEmail, participantPhone, position, specialRequests
      } = req.body;

      const event = await Event.findByPk(id);
      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'イベントが見つかりません'
        });
      }

      if (!event.isRegistrationOpen()) {
        return res.status(400).json({
          success: false,
          message: '申し込み期間が終了しています'
        });
      }

      if (!event.hasSpace()) {
        return res.status(400).json({
          success: false,
          message: '定員に達しています'
        });
      }

      const participant = await EventParticipant.create({
        eventId: id,
        designCompanyId,
        userId,
        participantName,
        participantEmail,
        participantPhone,
        position,
        specialRequests,
        status: 'registered'
      });

      // 参加者数を更新
      await Event.update(
        { currentParticipants: event.currentParticipants + 1 },
        { where: { id } }
      );

      res.status(201).json({
        success: true,
        message: 'イベント参加登録が完了しました',
        data: participant
      });
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({
          success: false,
          message: '既にこのイベントに参加登録されています'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'イベント参加登録に失敗しました',
        error: error.message
      });
    }
  },

  // 近日開催のイベント取得
  async getUpcomingEvents(req, res) {
    try {
      const { page, limit, offset } = getPaginationParams(req.query);
      
      const events = await Event.findAndCountAll({
        where: {
          startDate: {
            $gte: new Date()
          },
          status: 'published',
          isPublic: true
        },
        limit,
        offset,
        include: [
          {
            model: EventParticipant,
            as: 'participants',
            attributes: ['id'],
            include: [
              {
                model: DesignCompany,
                as: 'company',
                attributes: ['name', 'type']
              }
            ]
          }
        ],
        order: [['startDate', 'ASC']]
      });

      res.json({
        success: true,
        data: events.rows,
        pagination: {
          page,
          limit,
          total: events.count,
          totalPages: Math.ceil(events.count / limit)
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '近日開催イベントの取得に失敗しました',
        error: error.message
      });
    }
  }
};

module.exports = eventController;