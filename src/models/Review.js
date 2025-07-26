const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Review = sequelize.define('Review', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  reviewerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'reviewer_id',
    comment: 'レビューを書くユーザーのID'
  },
  reviewedEntityId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'reviewed_entity_id',
    comment: 'レビューされるエンティティのID（ユーザー、デザイン会社等）'
  },
  reviewedEntityType: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'reviewed_entity_type',
    validate: {
      isIn: [['user', 'design_company', 'apparel_brand', 'collaboration', 'event']]
    },
    comment: 'レビューされるエンティティのタイプ'
  },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 5
    },
    comment: '1-5の評価'
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: 'レビューのタイトル'
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'レビューの内容'
  },
  pros: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '良い点'
  },
  cons: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '改善点'
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_verified',
    comment: '実際の取引/コラボに基づく確認済みレビューかどうか'
  },
  collaborationId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'collaboration_id',
    comment: '関連するコラボレーションのID（確認済みレビューの場合）'
  },
  helpfulCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'helpful_count',
    comment: '「役に立った」と評価された数'
  },
  reportCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'report_count',
    comment: '報告された数'
  },
  isHidden: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_hidden',
    comment: '管理者により非表示にされているかどうか'
  },
  adminNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'admin_notes',
    comment: '管理者のメモ'
  }
}, {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['reviewer_id']
    },
    {
      fields: ['reviewed_entity_id', 'reviewed_entity_type']
    },
    {
      fields: ['rating']
    },
    {
      fields: ['is_verified']
    },
    {
      fields: ['created_at']
    },
    {
      // 同じユーザーが同じエンティティをレビューするのは1回まで
      unique: true,
      fields: ['reviewer_id', 'reviewed_entity_id', 'reviewed_entity_type']
    }
  ]
});

module.exports = Review;