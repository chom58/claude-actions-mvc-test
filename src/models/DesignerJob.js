const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { addSearchIndexHooks } = require('./hooks/searchIndexHooks');

const DesignerJob = sequelize.define('DesignerJob', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '求人タイトル'
  },
  company: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '会社名'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '求人の詳細説明'
  },
  originalUrl: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isUrl: true
    },
    comment: '元の求人ページURL'
  },
  jobSiteId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'job_sites',
      key: 'id'
    },
    comment: '求人サイトID'
  },
  jobType: {
    type: DataTypes.ENUM,
    values: ['full_time', 'part_time', 'contract', 'freelance', 'internship'],
    defaultValue: 'full_time',
    comment: '雇用形態'
  },
  experienceLevel: {
    type: DataTypes.ENUM,
    values: ['entry_level', 'mid_level', 'senior_level', 'executive'],
    defaultValue: 'entry_level',
    comment: '経験レベル'
  },
  isExperienceWelcome: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '未経験歓迎かどうか'
  },
  isNewGraduateWelcome: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '新卒歓迎かどうか'
  },
  designCategories: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'デザインカテゴリー配列（例: ["graphic", "web", "ui_ux"]）'
  },
  skills: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '必要スキル配列'
  },
  tools: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '使用ツール配列（例: ["Photoshop", "Illustrator", "Figma"]）'
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '勤務地'
  },
  isRemoteOk: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'リモートワーク可能かどうか'
  },
  salaryMin: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '最低給与（万円）'
  },
  salaryMax: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '最高給与（万円）'
  },
  salaryType: {
    type: DataTypes.ENUM,
    values: ['hourly', 'monthly', 'annual', 'project_based'],
    defaultValue: 'monthly',
    comment: '給与タイプ'
  },
  benefits: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '福利厚生配列'
  },
  applicationDeadline: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '応募締切日'
  },
  postedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '求人が元サイトに投稿された日'
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '求人情報が最後に更新された日'
  },
  status: {
    type: DataTypes.ENUM,
    values: ['draft', 'pending_review', 'approved', 'rejected', 'expired'],
    defaultValue: 'pending_review',
    comment: '承認ステータス'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: '求人がアクティブかどうか'
  },
  isFeatured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'おすすめ求人かどうか'
  },
  priority: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    validate: {
      min: 1,
      max: 10
    },
    comment: '表示優先度（1-10、10が最高優先度）'
  },
  viewCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '閲覧数'
  },
  clickCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'クリック数'
  },
  tags: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'タグ配列（検索用）'
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'その他のメタデータ'
  },
  approvedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    },
    comment: '承認したユーザーID'
  },
  approvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '承認日時'
  }
}, {
  timestamps: true,
  tableName: 'designer_jobs',
  indexes: [
    {
      fields: ['jobSiteId']
    },
    {
      fields: ['experienceLevel']
    },
    {
      fields: ['isExperienceWelcome']
    },
    {
      fields: ['isNewGraduateWelcome']
    },
    {
      fields: ['jobType']
    },
    {
      fields: ['location']
    },
    {
      fields: ['isRemoteOk']
    },
    {
      fields: ['status']
    },
    {
      fields: ['isActive']
    },
    {
      fields: ['isFeatured']
    },
    {
      fields: ['priority']
    },
    {
      fields: ['postedAt']
    },
    {
      fields: ['applicationDeadline']
    },
    {
      // 複合インデックス：未経験歓迎 + アクティブ + 承認済み
      fields: ['isExperienceWelcome', 'isActive', 'status']
    },
    {
      // 複合インデックス：新卒歓迎 + アクティブ + 承認済み
      fields: ['isNewGraduateWelcome', 'isActive', 'status']
    }
  ]
});

// 検索インデックスフックを追加
addSearchIndexHooks(DesignerJob, 'designer_job');

module.exports = DesignerJob;