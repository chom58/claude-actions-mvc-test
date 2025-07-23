const { DesignCompany, User, EventParticipant } = require('../models');
const { validationResult } = require('express-validator');
const { getPaginationParams } = require('../utils/pagination');

const designCompanyController = {
  // 全デザイン会社取得
  async getAllCompanies(req, res) {
    try {
      const { page, limit, offset } = getPaginationParams(req.query);
      const { type, isHarajukuArea, isActive } = req.query;

      const where = {};
      if (type) where.type = type;
      if (isHarajukuArea !== undefined) where.isHarajukuArea = isHarajukuArea === 'true';
      if (isActive !== undefined) where.isActive = isActive === 'true';

      const companies = await DesignCompany.findAndCountAll({
        where,
        limit,
        offset,
        include: [
          {
            model: User,
            as: 'members',
            attributes: ['id', 'username', 'email']
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      res.json({
        success: true,
        data: companies.rows,
        pagination: {
          page,
          limit,
          total: companies.count,
          totalPages: Math.ceil(companies.count / limit)
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'デザイン会社の取得に失敗しました',
        error: error.message
      });
    }
  },

  // 特定デザイン会社取得
  async getCompanyById(req, res) {
    try {
      const { id } = req.params;
      
      const company = await DesignCompany.findByPk(id, {
        include: [
          {
            model: User,
            as: 'members',
            attributes: ['id', 'username', 'email', 'createdAt']
          },
          {
            model: EventParticipant,
            as: 'eventParticipations',
            include: [
              {
                model: require('../models').Event,
                as: 'event',
                attributes: ['id', 'title', 'startDate', 'type']
              }
            ]
          }
        ]
      });

      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'デザイン会社が見つかりません'
        });
      }

      res.json({
        success: true,
        data: company
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'デザイン会社の取得に失敗しました',
        error: error.message
      });
    }
  },

  // デザイン会社登録
  async createCompany(req, res) {
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
        name, type, description, address, isHarajukuArea,
        contactEmail, contactPhone, website, portfolio,
        employees, establishedYear, specialties
      } = req.body;

      const company = await DesignCompany.create({
        name,
        type,
        description,
        address,
        isHarajukuArea: isHarajukuArea !== undefined ? isHarajukuArea : true,
        contactEmail,
        contactPhone,
        website,
        portfolio,
        employees,
        establishedYear,
        specialties: specialties ? JSON.stringify(specialties) : null
      });

      res.status(201).json({
        success: true,
        message: 'デザイン会社が正常に登録されました',
        data: company
      });
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({
          success: false,
          message: '既に登録されているメールアドレスです'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'デザイン会社の登録に失敗しました',
        error: error.message
      });
    }
  },

  // デザイン会社更新
  async updateCompany(req, res) {
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

      if (updateData.specialties) {
        updateData.specialties = JSON.stringify(updateData.specialties);
      }

      const [updatedCount] = await DesignCompany.update(updateData, {
        where: { id }
      });

      if (updatedCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'デザイン会社が見つかりません'
        });
      }

      const updatedCompany = await DesignCompany.findByPk(id);

      res.json({
        success: true,
        message: 'デザイン会社が正常に更新されました',
        data: updatedCompany
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'デザイン会社の更新に失敗しました',
        error: error.message
      });
    }
  },

  // デザイン会社削除
  async deleteCompany(req, res) {
    try {
      const { id } = req.params;
      
      const deletedCount = await DesignCompany.destroy({
        where: { id }
      });

      if (deletedCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'デザイン会社が見つかりません'
        });
      }

      res.json({
        success: true,
        message: 'デザイン会社が正常に削除されました'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'デザイン会社の削除に失敗しました',
        error: error.message
      });
    }
  },

  // 原宿エリアのデザイン会社取得
  async getHarajukuCompanies(req, res) {
    try {
      const { page, limit, offset } = getPaginationParams(req.query);
      const { type } = req.query;

      const where = { 
        isHarajukuArea: true,
        isActive: true
      };
      if (type) where.type = type;

      const companies = await DesignCompany.findAndCountAll({
        where,
        limit,
        offset,
        include: [
          {
            model: User,
            as: 'members',
            attributes: ['id', 'username']
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      res.json({
        success: true,
        data: companies.rows,
        pagination: {
          page,
          limit,
          total: companies.count,
          totalPages: Math.ceil(companies.count / limit)
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '原宿エリアのデザイン会社取得に失敗しました',
        error: error.message
      });
    }
  }
};

module.exports = designCompanyController;