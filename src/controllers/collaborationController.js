const { Collaboration, DesignCompany, ApparelBrand } = require('../models');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');

const collaborationController = {
  // 全コラボレーションプロジェクトの取得
  async getAllCollaborations(req, res) {
    try {
      const { page = 1, limit = 12, projectType, status = 'completed', featured } = req.query;
      const offset = (page - 1) * limit;

      const whereClause = {};
      if (projectType) whereClause.projectType = projectType;
      if (status) whereClause.status = status;
      if (featured !== undefined) whereClause.isFeatured = featured === 'true';

      const { count, rows: collaborations } = await Collaboration.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: DesignCompany,
            as: 'designCompany',
            attributes: ['id', 'name', 'logoUrl', 'specialties']
          },
          {
            model: ApparelBrand,
            as: 'apparelBrand',
            attributes: ['id', 'name', 'logoUrl', 'style']
          }
        ],
        limit: parseInt(limit),
        offset: offset,
        order: [['isFeatured', 'DESC'], ['rating', 'DESC'], ['createdAt', 'DESC']]
      });

      res.json({
        success: true,
        data: collaborations,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit)
        }
      });
    } catch (error) {
      console.error('コラボレーション取得エラー:', error);
      res.status(500).json({
        success: false,
        message: 'コラボレーションプロジェクトの取得に失敗しました'
      });
    }
  },

  // 注目コラボレーション事例の取得
  async getFeaturedCollaborations(req, res) {
    try {
      const { limit = 6, projectType } = req.query;

      const whereClause = {
        isFeatured: true,
        isPublic: true,
        status: 'completed'
      };

      if (projectType) whereClause.projectType = projectType;

      const collaborations = await Collaboration.findAll({
        where: whereClause,
        include: [
          {
            model: DesignCompany,
            as: 'designCompany',
            attributes: ['id', 'name', 'logoUrl', 'specialties']
          },
          {
            model: ApparelBrand,
            as: 'apparelBrand',
            attributes: ['id', 'name', 'logoUrl', 'style', 'brandConcept']
          }
        ],
        limit: parseInt(limit),
        order: [['rating', 'DESC'], ['createdAt', 'DESC']],
        attributes: [
          'id', 'title', 'description', 'projectType', 'status',
          'results', 'testimonial', 'rating', 'imageUrls',
          'portfolioUrl', 'tags', 'createdAt'
        ]
      });

      res.json({
        success: true,
        data: collaborations,
        total: collaborations.length
      });
    } catch (error) {
      console.error('注目コラボレーション取得エラー:', error);
      res.status(500).json({
        success: false,
        message: '注目コラボレーション事例の取得に失敗しました'
      });
    }
  },

  // 特定コラボレーションの詳細取得
  async getCollaborationById(req, res) {
    try {
      const { id } = req.params;
      
      const collaboration = await Collaboration.findByPk(id, {
        include: [
          {
            model: DesignCompany,
            as: 'designCompany'
          },
          {
            model: ApparelBrand,
            as: 'apparelBrand'
          }
        ]
      });

      if (!collaboration) {
        return res.status(404).json({
          success: false,
          message: 'コラボレーションプロジェクトが見つかりませんでした'
        });
      }

      res.json({
        success: true,
        data: collaboration
      });
    } catch (error) {
      console.error('コラボレーション詳細取得エラー:', error);
      res.status(500).json({
        success: false,
        message: 'コラボレーションプロジェクトの詳細取得に失敗しました'
      });
    }
  },

  // 新規コラボレーションの作成
  async createCollaboration(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'バリデーションエラー',
          errors: errors.array()
        });
      }

      const collaborationData = req.body;

      // デザイン会社とアパレルブランドの存在確認
      const designCompany = await DesignCompany.findByPk(collaborationData.designCompanyId);
      const apparelBrand = await ApparelBrand.findByPk(collaborationData.apparelBrandId);

      if (!designCompany) {
        return res.status(404).json({
          success: false,
          message: '指定されたデザイン会社が見つかりませんでした'
        });
      }

      if (!apparelBrand) {
        return res.status(404).json({
          success: false,
          message: '指定されたアパレルブランドが見つかりませんでした'
        });
      }

      const collaboration = await Collaboration.create(collaborationData);

      res.status(201).json({
        success: true,
        message: 'コラボレーションプロジェクトが正常に作成されました',
        data: collaboration
      });
    } catch (error) {
      console.error('コラボレーション作成エラー:', error);
      res.status(500).json({
        success: false,
        message: 'コラボレーションプロジェクトの作成に失敗しました'
      });
    }
  },

  // コラボレーション情報の更新
  async updateCollaboration(req, res) {
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

      const [updatedRowsCount] = await Collaboration.update(updateData, {
        where: { id }
      });

      if (updatedRowsCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'コラボレーションプロジェクトが見つかりませんでした'
        });
      }

      const updatedCollaboration = await Collaboration.findByPk(id, {
        include: [
          {
            model: DesignCompany,
            as: 'designCompany',
            attributes: ['id', 'name', 'logoUrl']
          },
          {
            model: ApparelBrand,
            as: 'apparelBrand',
            attributes: ['id', 'name', 'logoUrl']
          }
        ]
      });

      res.json({
        success: true,
        message: 'コラボレーションプロジェクトが正常に更新されました',
        data: updatedCollaboration
      });
    } catch (error) {
      console.error('コラボレーション更新エラー:', error);
      res.status(500).json({
        success: false,
        message: 'コラボレーションプロジェクトの更新に失敗しました'
      });
    }
  },

  // コラボレーションの削除
  async deleteCollaboration(req, res) {
    try {
      const { id } = req.params;

      const deletedRowsCount = await Collaboration.destroy({
        where: { id }
      });

      if (deletedRowsCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'コラボレーションプロジェクトが見つかりませんでした'
        });
      }

      res.json({
        success: true,
        message: 'コラボレーションプロジェクトが正常に削除されました'
      });
    } catch (error) {
      console.error('コラボレーション削除エラー:', error);
      res.status(500).json({
        success: false,
        message: 'コラボレーションプロジェクトの削除に失敗しました'
      });
    }
  },

  // プロジェクトタイプ別検索
  async searchByProjectType(req, res) {
    try {
      const { projectType } = req.params;
      const { limit = 10, status = 'completed' } = req.query;

      const collaborations = await Collaboration.findAll({
        where: {
          projectType,
          status,
          isPublic: true
        },
        include: [
          {
            model: DesignCompany,
            as: 'designCompany',
            attributes: ['id', 'name', 'logoUrl']
          },
          {
            model: ApparelBrand,
            as: 'apparelBrand',
            attributes: ['id', 'name', 'logoUrl']
          }
        ],
        limit: parseInt(limit),
        order: [['rating', 'DESC'], ['createdAt', 'DESC']],
        attributes: [
          'id', 'title', 'description', 'projectType', 'results',
          'rating', 'imageUrls', 'tags', 'createdAt'
        ]
      });

      res.json({
        success: true,
        data: collaborations,
        total: collaborations.length,
        projectType
      });
    } catch (error) {
      console.error('プロジェクトタイプ検索エラー:', error);
      res.status(500).json({
        success: false,
        message: 'プロジェクトタイプでの検索に失敗しました'
      });
    }
  },

  // デザイン会社別のコラボレーション取得
  async getByDesignCompany(req, res) {
    try {
      const { companyId } = req.params;
      const { limit = 10, status } = req.query;

      const whereClause = { designCompanyId: companyId, isPublic: true };
      if (status) whereClause.status = status;

      const collaborations = await Collaboration.findAll({
        where: whereClause,
        include: [{
          model: ApparelBrand,
          as: 'apparelBrand',
          attributes: ['id', 'name', 'logoUrl', 'style']
        }],
        limit: parseInt(limit),
        order: [['createdAt', 'DESC']],
        attributes: [
          'id', 'title', 'description', 'projectType', 'status',
          'rating', 'imageUrls', 'createdAt'
        ]
      });

      res.json({
        success: true,
        data: collaborations,
        total: collaborations.length
      });
    } catch (error) {
      console.error('デザイン会社別コラボレーション取得エラー:', error);
      res.status(500).json({
        success: false,
        message: 'デザイン会社のコラボレーション取得に失敗しました'
      });
    }
  },

  // アパレルブランド別のコラボレーション取得
  async getByApparelBrand(req, res) {
    try {
      const { brandId } = req.params;
      const { limit = 10, status } = req.query;

      const whereClause = { apparelBrandId: brandId, isPublic: true };
      if (status) whereClause.status = status;

      const collaborations = await Collaboration.findAll({
        where: whereClause,
        include: [{
          model: DesignCompany,
          as: 'designCompany',
          attributes: ['id', 'name', 'logoUrl', 'specialties']
        }],
        limit: parseInt(limit),
        order: [['createdAt', 'DESC']],
        attributes: [
          'id', 'title', 'description', 'projectType', 'status',
          'rating', 'imageUrls', 'createdAt'
        ]
      });

      res.json({
        success: true,
        data: collaborations,
        total: collaborations.length
      });
    } catch (error) {
      console.error('アパレルブランド別コラボレーション取得エラー:', error);
      res.status(500).json({
        success: false,
        message: 'アパレルブランドのコラボレーション取得に失敗しました'
      });
    }
  }
};

module.exports = collaborationController;