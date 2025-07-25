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
    comment: 'サイト名（例: vivivit, デザイナーのお仕事）'
  },
  domain: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isUrl: true
    },
    comment: 'サイトのドメイン（例: vivivit.jp）'
  },
  baseUrl: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isUrl: true
    },
    comment: 'サイトのベースURL'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'サイトの説明'
  },
  logoUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isUrl: true
    },
    comment: 'サイトのロゴURL'
  },
  category: {
    type: DataTypes.ENUM,
    values: ['general', 'design_specialized', 'creative_focused', 'freelance'],
    defaultValue: 'general',
    comment: 'サイトのカテゴリー'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'サイトがアクティブかどうか'
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
  scrapingConfig: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'スクレイピング設定（将来の拡張用）'
  },
  apiConfig: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'API連携設定（将来の拡張用）'
  }
}, {
  timestamps: true,
  tableName: 'job_sites',
  indexes: [
    {
      fields: ['domain']
    },
    {
      fields: ['category']
    },
    {
      fields: ['isActive']
    },
    {
      fields: ['priority']
    }
  ]
});

module.exports = JobSite;