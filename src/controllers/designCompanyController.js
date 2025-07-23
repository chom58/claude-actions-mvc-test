const { DesignCompany, EventParticipant, Event } = require('../models');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');

class DesignCompanyController {
  // 全てのデザイン会社を取得
  async getAllCompanies(req, res) {
    try {
      const { page = 1, limit = 10, area, specialty, verified } = req.query;
      const offset = (page - 1) * limit;

      const whereClause = {};
      
      if (area) {
        whereClause.area = area;
      }
      
      if (specialty) {
        whereClause.specialties = {
          [Op.contains]: [specialty]
        };
      }
      
      if (verified !== undefined) {
        whereClause.isVerified = verified === 'true';
      }

      const companies = await DesignCompany.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['createdAt', 'DESC']],
        include: [{
          model: EventParticipant,
          as: 'eventParticipations',
          include: [{
            model: Event,
            as: 'event',
            attributes: ['title', 'startDateTime', 'eventType']
          }]
        }]
      });

      res.json({
        success: true,
        data: companies.rows,
        pagination: {
          total: companies.count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(companies.count / limit)
        }
      });
    } catch (error) {
      console.error('デザイン会社取得エラー:', error);
      res.status(500).json({
        success: false,
        error: 'デザイン会社の取得に失敗しました'
      });
    }
  }

  // 原宿エリアのデザイン会社のみ取得
  async getHarajukuCompanies(req, res) {
    try {
      const companies = await DesignCompany.findAll({
        where: {
          area: 'harajuku',
          status: 'active'
        },
        order: [['isVerified', 'DESC'], ['createdAt', 'DESC']]
      });

      res.json({
        success: true,
        data: companies,
        message: '原宿エリアのデザイン会社一覧'
      });
    } catch (error) {
      console.error('原宿デザイン会社取得エラー:', error);
      res.status(500).json({
        success: false,
        error: '原宿デザイン会社の取得に失敗しました'
      });
    }
  }

  // 特定のデザイン会社を取得
  async getCompanyById(req, res) {
    try {
      const { id } = req.params;
      
      const company = await DesignCompany.findByPk(id, {
        include: [{
          model: EventParticipant,
          as: 'eventParticipations',
          include: [{
            model: Event,
            as: 'event'
          }]
        }]
      });

      if (!company) {
        return res.status(404).json({
          success: false,
          error: 'デザイン会社が見つかりません'
        });
      }

      res.json({
        success: true,
        data: company
      });
    } catch (error) {
      console.error('デザイン会社詳細取得エラー:', error);
      res.status(500).json({
        success: false,
        error: 'デザイン会社の詳細取得に失敗しました'
      });
    }
  }

  // 新しいデザイン会社を登録
  async createCompany(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const companyData = {
        ...req.body,
        area: req.body.area || 'harajuku',
        status: 'pending'
      };

      const company = await DesignCompany.create(companyData);

      res.status(201).json({
        success: true,
        data: company,
        message: 'デザイン会社の登録が完了しました。承認をお待ちください。'
      });
    } catch (error) {
      console.error('デザイン会社作成エラー:', error);
      
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({
          success: false,
          error: 'このメールアドレスは既に登録されています'
        });
      }

      res.status(500).json({
        success: false,
        error: 'デザイン会社の登録に失敗しました'
      });
    }
  }

  // デザイン会社情報を更新
  async updateCompany(req, res) {
    try {
      const { id } = req.params;
      const errors = validationResult(req);
      
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const company = await DesignCompany.findByPk(id);
      
      if (!company) {
        return res.status(404).json({
          success: false,
          error: 'デザイン会社が見つかりません'
        });
      }

      await company.update(req.body);

      res.json({
        success: true,
        data: company,
        message: 'デザイン会社情報が更新されました'
      });
    } catch (error) {
      console.error('デザイン会社更新エラー:', error);
      res.status(500).json({
        success: false,
        error: 'デザイン会社の更新に失敗しました'
      });
    }
  }

  // デザイン会社を削除
  async deleteCompany(req, res) {
    try {
      const { id } = req.params;
      
      const company = await DesignCompany.findByPk(id);
      
      if (!company) {
        return res.status(404).json({
          success: false,
          error: 'デザイン会社が見つかりません'
        });
      }

      await company.destroy();

      res.json({
        success: true,
        message: 'デザイン会社が削除されました'
      });
    } catch (error) {
      console.error('デザイン会社削除エラー:', error);
      res.status(500).json({
        success: false,
        error: 'デザイン会社の削除に失敗しました'
      });
    }
  }

  // 統計情報を取得
  async getStatistics(req, res) {
    try {
      const totalCompanies = await DesignCompany.count();
      const harajukuCompanies = await DesignCompany.count({
        where: { area: 'harajuku' }
      });
      const verifiedCompanies = await DesignCompany.count({
        where: { isVerified: true }
      });
      const activeCompanies = await DesignCompany.count({
        where: { status: 'active' }
      });

      // 専門分野別統計
      const specialtyStats = await DesignCompany.findAll({
        attributes: ['specialties'],
        where: { status: 'active' }
      });

      const specialtyCounts = {};
      specialtyStats.forEach(company => {
        if (company.specialties && Array.isArray(company.specialties)) {
          company.specialties.forEach(specialty => {
            specialtyCounts[specialty] = (specialtyCounts[specialty] || 0) + 1;
          });
        }
      });

      res.json({
        success: true,
        data: {
          totalCompanies,
          harajukuCompanies,
          verifiedCompanies,
          activeCompanies,
          specialtyDistribution: specialtyCounts
        }
      });
    } catch (error) {
      console.error('統計情報取得エラー:', error);
      res.status(500).json({
        success: false,
        error: '統計情報の取得に失敗しました'
      });
    }
  }
}

module.exports = new DesignCompanyController();