const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ChatRoom = sequelize.define('ChatRoom', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  roomId: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    comment: 'チャットルームの一意識別子'
  },
  name: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'チャットルーム名'
  },
  type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      isIn: [['direct', 'group', 'application']]
    },
    comment: 'チャットルームタイプ'
  },
  participants: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
    comment: '参加者ユーザーID配列'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'アクティブ状態'
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {},
    comment: 'その他のメタデータ'
  }
}, {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['roomId']
    },
    {
      fields: ['type']
    },
    {
      fields: ['isActive']
    }
  ]
});

module.exports = ChatRoom;