const { ApparelBrand, Collaboration, DesignCompany } = require('../models');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');

const apparelBrandController = {
  // 全アパレルブランドの取得
  async getAllBrands(req, res) {
    try {
      const { page = 1, limit = 12, style, targetMarket, location = '原宿', verified } = req.query;
      const offset = (page - 1) * limit;

      const whereClause = {};
      if (location) whereClause.location = location;
      if (verified !== undefined) whereClause.isVerified = verified === 'true';
      if (style) {
        whereClause.style = {
          [Op.contains]: [style]
        };
      }
      if (targetMarket) {
        whereClause.targetMarket = {
          [Op.contains]: [targetMarket]
        };
      }

      const { count, rows: brands } = await ApparelBrand.findAndCountAll({
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
        data: brands,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit)
        }
      });
    } catch (error) {
      console.error('アパレルブランド取得エラー:', error);
      res.status(500).json({
        success: false,
        message: 'アパレルブランドの取得に失敗しました'
      });
    }
  },

  // 原宿エリア限定アパレルブランドの取得
  async getHarajukuBrands(req, res) {
    try {
      const { style, targetMarket, verified } = req.query;
      
      const whereClause = { location: '原宿' };
      if (verified !== undefined) whereClause.isVerified = verified === 'true';
      if (style) {
        whereClause.style = {
          [Op.contains]: [style]
        };
      }
      if (targetMarket) {
        whereClause.targetMarket = {
          [Op.contains]: [targetMarket]
        };
      }

      const brands = await ApparelBrand.findAll({
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
        data: brands,
        total: brands.length
      });
    } catch (error) {
      console.error('原宿アパレルブランド取得エラー:', error);
      res.status(500).json({
        success: false,
        message: '原宿アパレルブランドの取得に失敗しました'
      });
    }
  },

  // 特定アパレルブランドの詳細取得
  async getBrandById(req, res) {
    try {
      const { id } = req.params;
      
      const brand = await ApparelBrand.findByPk(id, {
        include: [{
          model: Collaboration,
          as: 'collaborations',
          include: [{
            model: DesignCompany,
            as: 'designCompany',
            attributes: ['id', 'name', 'logoUrl']
          }]
        }]
      });

      if (!brand) {
        return res.status(404).json({
          success: false,
          message: 'アパレルブランドが見つかりませんでした'
        });
      }

      res.json({
        success: true,
        data: brand
      });
    } catch (error) {
      console.error('アパレルブランド詳細取得エラー:', error);
      res.status(500).json({
        success: false,
        message: 'アパレルブランドの詳細取得に失敗しました'
      });
    }
  },

  // 新規アパレルブランドの登録
  async createBrand(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'バリデーションエラー',
          errors: errors.array()
        });
      }

      const brandData = req.body;
      const brand = await ApparelBrand.create(brandData);

      res.status(201).json({
        success: true,
        message: 'アパレルブランドが正常に登録されました',
        data: brand
      });
    } catch (error) {
      console.error('アパレルブランド登録エラー:', error);
      res.status(500).json({
        success: false,
        message: 'アパレルブランドの登録に失敗しました'
      });
    }
  },

  // アパレルブランド情報の更新
  async updateBrand(req, res) {
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

      const [updatedRowsCount] = await ApparelBrand.update(updateData, {
        where: { id }
      });

      if (updatedRowsCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'アパレルブランドが見つかりませんでした'
        });
      }

      const updatedBrand = await ApparelBrand.findByPk(id);

      res.json({
        success: true,
        message: 'アパレルブランド情報が正常に更新されました',
        data: updatedBrand
      });
    } catch (error) {
      console.error('アパレルブランド更新エラー:', error);
      res.status(500).json({
        success: false,
        message: 'アパレルブランドの更新に失敗しました'
      });
    }
  },

  // アパレルブランドの削除
  async deleteBrand(req, res) {
    try {
      const { id } = req.params;

      const deletedRowsCount = await ApparelBrand.destroy({
        where: { id }
      });

      if (deletedRowsCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'アパレルブランドが見つかりませんでした'
        });
      }

      res.json({
        success: true,
        message: 'アパレルブランドが正常に削除されました'
      });
    } catch (error) {
      console.error('アパレルブランド削除エラー:', error);
      res.status(500).json({
        success: false,
        message: 'アパレルブランドの削除に失敗しました'
      });
    }
  },

  // スタイル別アパレルブランド検索
  async searchByStyle(req, res) {
    try {
      const { style } = req.params;
      const { location = '原宿', targetMarket } = req.query;

      const whereClause = {
        location,
        style: {
          [Op.contains]: [style]
        }
      };

      if (targetMarket) {
        whereClause.targetMarket = {
          [Op.contains]: [targetMarket]
        };
      }

      const brands = await ApparelBrand.findAll({
        where: whereClause,
        include: [{
          model: Collaboration,
          as: 'collaborations',
          attributes: ['id', 'title', 'rating'],
          limit: 2
        }],
        order: [['rating', 'DESC'], ['totalCollaborations', 'DESC']]
      });

      res.json({
        success: true,
        data: brands,
        total: brands.length,
        searchTerm: style
      });
    } catch (error) {
      console.error('スタイル検索エラー:', error);
      res.status(500).json({
        success: false,
        message: 'スタイルでの検索に失敗しました'
      });
    }
  },

  // コラボレーション希望分野別検索
  async searchByCollaborationNeeds(req, res) {
    try {
      const { need } = req.params;
      const { location = '原宿' } = req.query;

      const brands = await ApparelBrand.findAll({
        where: {
          location,
          collaborationNeeds: {
            [Op.contains]: [need]
          }
        },
        attributes: ['id', 'name', 'brandConcept', 'style', 'collaborationNeeds', 'logoUrl', 'rating'],
        order: [['rating', 'DESC']]
      });

      res.json({
        success: true,
        data: brands,
        total: brands.length,
        searchTerm: need
      });
    } catch (error) {
      console.error('コラボレーション希望分野検索エラー:', error);
      res.status(500).json({
        success: false,
        message: 'コラボレーション希望分野での検索に失敗しました'
      });
    }
  }
};

module.exports = apparelBrandController;