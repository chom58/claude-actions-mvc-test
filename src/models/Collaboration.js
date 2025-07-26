const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { addSearchIndexHooks } = require('./hooks/searchIndexHooks');

const Collaboration = sequelize.define('Collaboration', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 255]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  projectType: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['ブランディング', 'Webサイト制作', 'パッケージデザイン', 'グラフィックデザイン', 'ファッション撮影', 'イベント企画', 'マーケティング', 'その他']]
    }
  },
  designCompanyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'design_companies',
      key: 'id'
    }
  },
  apparelBrandId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'apparel_brands',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'proposed',
    validate: {
      isIn: [['proposed', 'accepted', 'in_progress', 'completed', 'cancelled']]
    }
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  expectedEndDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  actualEndDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  budget: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true
  },
  deliverables: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
    comment: '成果物リスト'
  },
  skills: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
    comment: '必要スキル'
  },
  objectives: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'プロジェクト目標'
  },
  results: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'プロジェクト結果・成果'
  },
  testimonial: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'お客様の声・証言'
  },
  rating: {
    type: DataTypes.DECIMAL(3, 2),
    allowNull: true,
    validate: {
      min: 0,
      max: 5
    }
  },
  imageUrls: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
    comment: 'プロジェクト画像URL配列'
  },
  portfolioUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isUrl: true
    }
  },
  tags: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
    comment: 'プロジェクトタグ'
  },
  isFeatured: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: '注目プロジェクトかどうか'
  },
  isPublic: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: '公開プロジェクトかどうか'
  },
  lessons: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '学んだこと・ノウハウ'
  },
  challenges: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '直面した課題'
  }
}, {
  tableName: 'collaborations',
  timestamps: true,
  indexes: [
    {
      fields: ['designCompanyId']
    },
    {
      fields: ['apparelBrandId']
    },
    {
      fields: ['status']
    },
    {
      fields: ['projectType']
    },
    {
      fields: ['isFeatured']
    },
    {
      fields: ['isPublic']
    }
  ]
});

// 検索インデックスフックを追加
addSearchIndexHooks(Collaboration, 'collaboration');

module.exports = Collaboration;