const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ReviewHelpful = sequelize.define('ReviewHelpful', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id',
    comment: '「役に立った」と評価したユーザーのID'
  },
  reviewId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'review_id',
    comment: 'レビューのID'
  },
  isHelpful: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_helpful',
    comment: 'true: 役に立った, false: 役に立たなかった'
  }
}, {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['review_id']
    },
    {
      // 同じユーザーが同じレビューを評価するのは1回まで
      unique: true,
      fields: ['user_id', 'review_id']
    }
  ]
});

module.exports = ReviewHelpful;