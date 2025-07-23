const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MatchingRequest = sequelize.define('MatchingRequest', {
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
  requestType: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['seeking_designer', 'seeking_brand', 'collaboration_offer', 'skill_exchange', 'mentorship', 'other']]
    }
  },
  requesterType: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['design_company', 'apparel_brand']]
    }
  },
  requesterId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'デザイン会社またはアパレルブランドのID'
  },
  requesterName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  targetType: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['design_company', 'apparel_brand', 'either']]
    }
  },
  skillsNeeded: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
    comment: '必要なスキル'
  },
  skillsOffered: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
    comment: '提供できるスキル'
  },
  projectScope: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['short_term', 'long_term', 'ongoing', 'one_time', 'flexible']]
    }
  },
  budgetRange: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isIn: [['~10万円', '10-50万円', '50-100万円', '100-500万円', '500万円~', '要相談']]
    }
  },
  timeline: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '希望スケジュール'
  },
  requirements: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '詳細要件'
  },
  contactEmail: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  contactMethod: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: ['email'],
    comment: '希望連絡手段'
  },
  location: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: '原宿'
  },
  isRemoteOk: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  experienceLevel: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isIn: [['junior', 'mid_level', 'senior', 'expert', 'any']]
    }
  },
  tags: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
    comment: 'マッチングタグ'
  },
  priority: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'medium',
    validate: {
      isIn: [['low', 'medium', 'high', 'urgent']]
    }
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'active',
    validate: {
      isIn: [['active', 'paused', 'completed', 'cancelled']]
    }
  },
  expiryDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  viewCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  responseCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '内部メモ'
  }
}, {
  tableName: 'matching_requests',
  timestamps: true,
  indexes: [
    {
      fields: ['requestType']
    },
    {
      fields: ['requesterType', 'requesterId']
    },
    {
      fields: ['targetType']
    },
    {
      fields: ['status']
    },
    {
      fields: ['priority']
    },
    {
      fields: ['location']
    },
    {
      fields: ['skillsNeeded'],
      using: 'gin'
    },
    {
      fields: ['tags'],
      using: 'gin'
    }
  ]
});

module.exports = MatchingRequest;