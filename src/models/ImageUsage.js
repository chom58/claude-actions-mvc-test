const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ImageUsage = sequelize.define('ImageUsage', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  imageId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'images',
      key: 'id'
    }
  },
  entityType: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'エンティティタイプ: profile, post, design, etc'
  },
  entityId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '関連エンティティのID'
  },
  usageType: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: '使用タイプ: avatar, cover, gallery, etc'
  }
}, {
  timestamps: true,
  tableName: 'image_usages',
  indexes: [
    {
      fields: ['imageId']
    },
    {
      fields: ['entityType', 'entityId']
    }
  ]
});

module.exports = ImageUsage;