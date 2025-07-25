const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

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
    comment: '求人詳細'
  },
  location: {
    type: DataTypes.STRING,
    comment: '勤務地'
  },
  salary: {
    type: DataTypes.STRING,
    comment: '給与情報'
  },
  employment_type: {
    type: DataTypes.ENUM('full_time', 'part_time', 'contract', 'internship'),
    defaultValue: 'full_time',
    comment: '雇用形態'
  },
  experience_level: {
    type: DataTypes.ENUM('entry', 'junior', 'mid', 'senior'),
    defaultValue: 'mid',
    comment: '必要経験レベル'
  },
  is_entry_level_ok: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '未経験歓迎かどうか'
  },
  is_new_grad_ok: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '新卒歓迎かどうか'
  },
  skills_required: {
    type: DataTypes.JSON,
    comment: '必要スキル（JSON配列）'
  },
  skills_preferred: {
    type: DataTypes.JSON,
    comment: '歓迎スキル（JSON配列）'
  },
  original_url: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isUrl: true
    },
    comment: '元の求人URL'
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
  posted_date: {
    type: DataTypes.DATE,
    comment: '掲載開始日'
  },
  deadline: {
    type: DataTypes.DATE,
    comment: '応募締切日'
  },
  is_featured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '注目求人かどうか'
  },
  is_approved: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '承認済みかどうか'
  },
  view_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '閲覧数'
  },
  click_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'クリック数'
  },
  tags: {
    type: DataTypes.JSON,
    comment: 'タグ（JSON配列）'
  }
}, {
  tableName: 'designer_jobs',
  timestamps: true,
  comment: 'デザイナー求人情報',
  indexes: [
    {
      fields: ['is_entry_level_ok']
    },
    {
      fields: ['is_new_grad_ok']
    },
    {
      fields: ['experience_level']
    },
    {
      fields: ['employment_type']
    },
    {
      fields: ['is_approved']
    },
    {
      fields: ['jobSiteId']
    }
  ]
});

module.exports = DesignerJob;