const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const JobSite = sequelize.define('JobSite', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: 'サイト名'
  },
  url: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isUrl: true
    },
    comment: 'サイトURL'
  },
  description: {
    type: DataTypes.TEXT,
    comment: 'サイトの説明'
  },
  logo: {
    type: DataTypes.STRING,
    comment: 'ロゴ画像URL'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'サイトがアクティブかどうか'
  },
  priority: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '表示優先度（高い値ほど優先）'
  },
  category: {
    type: DataTypes.ENUM('design', 'creative', 'general'),
    defaultValue: 'design',
    comment: 'サイトのカテゴリ'
  }
}, {
  tableName: 'job_sites',
  timestamps: true,
  comment: '求人サイト情報'
});

module.exports = JobSite;