const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const NotificationPreference = sequelize.define('NotificationPreference', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    field: 'user_id'
  },
  emailNotifications: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'email_notifications',
    comment: '全体的なメール通知の有効/無効'
  },
  messageNotifications: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'message_notifications',
    comment: 'メッセージ通知の有効/無効'
  },
  collaborationNotifications: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'collaboration_notifications',
    comment: 'コラボレーション通知の有効/無効'
  },
  eventNotifications: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'event_notifications',
    comment: 'イベント通知の有効/無効'
  },
  systemNotifications: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'system_notifications',
    comment: 'システム通知の有効/無効'
  },
  emailFrequency: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'immediate',
    field: 'email_frequency',
    validate: {
      isIn: [['immediate', 'hourly', 'daily', 'weekly', 'never']]
    },
    comment: 'メール通知の頻度'
  },
  quietHoursStart: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'quiet_hours_start',
    validate: {
      min: 0,
      max: 23
    },
    comment: '通知停止時間の開始時刻（24時間形式）'
  },
  quietHoursEnd: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'quiet_hours_end',
    validate: {
      min: 0,
      max: 23
    },
    comment: '通知停止時間の終了時刻（24時間形式）'
  },
  timezone: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'Asia/Tokyo',
    comment: 'ユーザーのタイムゾーン'
  }
}, {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['user_id']
    }
  ]
});

module.exports = NotificationPreference;