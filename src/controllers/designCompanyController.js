const { DesignCompany, Collaboration, ApparelBrand } = require('../models');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');

const designCompanyController = {
  // 全デザイン会社の取得
  async getAllCompanies(req, res) {
    try {
      const { page = 1, limit = 12, specialty, location = '原宿', verified } = req.query;
      const offset = (page - 1) * limit;

      const whereClause = {};
      if (location) whereClause.location = location;
      if (verified !== undefined) whereClause.isVerified = verified === 'true';
      if (specialty) {
        whereClause.specialties = {
          [Op.contains]: [specialty]
        };
      }

      const { count, rows: companies } = await DesignCompany.findAndCountAll({
        where: whereClause,
        include: [{
          model: Collaboration,
          as: 'collaborations',
          attributes: ['id', 'title', 'status', 'rating']
        }],
        limit: parseInt(limit),
        offset: offset,
        order: [['isVerified', 'DESC'], ['rating', 'DESC'], ['createdAt', 'DESC']]
      });

      res.json({
        success: true,
        data: companies,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit)
        }
      });
    } catch (error) {
      console.error('デザイン会社取得エラー:', error);
      res.status(500).json({
        success: false,
        message: 'デザイン会社の取得に失敗しました'
      });
    }
  },

  // 原宿エリア限定デザイン会社の取得
  async getHarajukuCompanies(req, res) {
    try {
      const { specialty, verified } = req.query;
      
      const whereClause = { location: '原宿' };
      if (verified !== undefined) whereClause.isVerified = verified === 'true';
      if (specialty) {
        whereClause.specialties = {
          [Op.contains]: [specialty]
        };
      }

      const companies = await DesignCompany.findAll({
        where: whereClause,
        include: [{
          model: Collaboration,
          as: 'collaborations',
          attributes: ['id', 'title', 'projectType', 'status', 'rating'],
          limit: 3,
          order: [['createdAt', 'DESC']]
        }],
        order: [['isVerified', 'DESC'], ['rating', 'DESC']]
      });

      res.json({
        success: true,
        data: companies,
        total: companies.length
      });
    } catch (error) {
      console.error('原宿デザイン会社取得エラー:', error);
      res.status(500).json({
        success: false,
        message: '原宿デザイン会社の取得に失敗しました'
      });
    }
  },

  // 特定デザイン会社の詳細取得
  async getCompanyById(req, res) {
    try {
      const { id } = req.params;
      
      const company = await DesignCompany.findByPk(id, {
        include: [{
          model: Collaboration,
          as: 'collaborations',
          include: [{
            model: ApparelBrand,
            as: 'apparelBrand',
            attributes: ['id', 'name', 'logoUrl']
          }]
        }]
      });

      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'デザイン会社が見つかりませんでした'
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
        message: 'デザイン会社の詳細取得に失敗しました'
      });
    }
  },

  // 新規デザイン会社の登録
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

      const companyData = req.body;
      const company = await DesignCompany.create(companyData);

      res.status(201).json({
        success: true,
        message: 'デザイン会社が正常に登録されました',
        data: company
      });
    } catch (error) {
      console.error('デザイン会社登録エラー:', error);
      res.status(500).json({
        success: false,
        message: 'デザイン会社の登録に失敗しました'
      });
    }
  },

  // デザイン会社情報の更新
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
      const updateData = req.body;

      const [updatedRowsCount] = await DesignCompany.update(updateData, {
        where: { id }
      });

      if (updatedRowsCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'デザイン会社が見つかりませんでした'
        });
      }

      const updatedCompany = await DesignCompany.findByPk(id);

      res.json({
        success: true,
        message: 'デザイン会社情報が正常に更新されました',
        data: updatedCompany
      });
    } catch (error) {
      console.error('デザイン会社更新エラー:', error);
      res.status(500).json({
        success: false,
        message: 'デザイン会社の更新に失敗しました'
      });
    }
  },

  // デザイン会社の削除
  async deleteCompany(req, res) {
    try {
      const { id } = req.params;

      const deletedRowsCount = await DesignCompany.destroy({
        where: { id }
      });

      if (deletedRowsCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'デザイン会社が見つかりませんでした'
        });
      }

      res.json({
        success: true,
        message: 'デザイン会社が正常に削除されました'
      });
    } catch (error) {
      console.error('デザイン会社削除エラー:', error);
      res.status(500).json({
        success: false,
        message: 'デザイン会社の削除に失敗しました'
      });
    }
  },

  // デザイン会社の専門分野検索
  async searchBySpecialty(req, res) {
    try {
      const { specialty } = req.params;
      const { location = '原宿' } = req.query;

      const companies = await DesignCompany.findAll({
        where: {
          location,
          specialties: {
            [Op.contains]: [specialty]
          }
        },
        include: [{
          model: Collaboration,
          as: 'collaborations',
          attributes: ['id', 'title', 'rating'],
          limit: 2
        }],
        order: [['rating', 'DESC'], ['totalProjects', 'DESC']]
      });

      res.json({
        success: true,
        data: companies,
        total: companies.length,
        searchTerm: specialty
      });
    } catch (error) {
      console.error('専門分野検索エラー:', error);
      res.status(500).json({
        success: false,
        message: '専門分野での検索に失敗しました'
      });
    }
  }
};

module.exports = designCompanyController;