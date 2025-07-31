const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Recommendation = sequelize.define('Recommendation', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    },
    comment: 'レコメンドを受けるユーザーID'
  },
  recommendedItemId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'レコメンドするアイテムID（投稿など）'
  },
  recommendedItemType: {
    type: DataTypes.ENUM('post', 'user'),
    allowNull: false,
    defaultValue: 'post',
    comment: 'レコメンドアイテムの種類'
  },
  score: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0.0,
    validate: {
      min: 0.0,
      max: 1.0
    },
    comment: 'レコメンドスコア（0.0-1.0）'
  },
  reason: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'レコメンド理由の詳細'
  },
  viewed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'ユーザーが閲覧したかどうか'
  },
  clicked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'ユーザーがクリックしたかどうか'
  },
  dismissed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'ユーザーが却下したかどうか'
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'レコメンドの有効期限'
  }
}, {
  timestamps: true,
  indexes: [
    {
      fields: ['userId', 'recommendedItemType']
    },
    {
      fields: ['score']
    },
    {
      fields: ['expiresAt']
    }
  ]
});

module.exports = Recommendation;