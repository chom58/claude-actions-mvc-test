const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserInteraction = sequelize.define('UserInteraction', {
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
    comment: 'インタラクションを行ったユーザーID'
  },
  targetId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'インタラクション対象のID'
  },
  targetType: {
    type: DataTypes.ENUM('post', 'user'),
    allowNull: false,
    comment: 'インタラクション対象の種類'
  },
  interactionType: {
    type: DataTypes.ENUM('view', 'like', 'share', 'comment', 'bookmark'),
    allowNull: false,
    comment: 'インタラクションの種類'
  },
  weight: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 1.0,
    comment: 'インタラクションの重み'
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'インタラクションの追加情報'
  }
}, {
  timestamps: true,
  indexes: [
    {
      fields: ['userId', 'targetType', 'interactionType']
    },
    {
      fields: ['targetId', 'targetType']
    },
    {
      fields: ['createdAt']
    }
  ]
});

module.exports = UserInteraction;