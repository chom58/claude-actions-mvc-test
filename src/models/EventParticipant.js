const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const EventParticipant = sequelize.define('EventParticipant', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  eventId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'events',
      key: 'id'
    }
  },
  designCompanyId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'design_companies',
      key: 'id'
    }
  },
  participantName: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 50]
    }
  },
  participantEmail: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  participantRole: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'デザイナー、ディレクター、代表など'
  },
  specialtyArea: {
    type: DataTypes.ENUM('graphic', 'web', 'ui-ux', 'branding', 'package', 'editorial', 'motion', 'other'),
    allowNull: false
  },
  experienceYears: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 0,
      max: 50
    }
  },
  registrationDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  attendanceStatus: {
    type: DataTypes.ENUM('registered', 'confirmed', 'attended', 'no_show', 'cancelled'),
    defaultValue: 'registered'
  },
  networkingGoals: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'ネットワーキングの目標・期待'
  },
  portfolioUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isUrl: true
    }
  },
  socialMedia: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {},
    comment: 'Instagram, Twitter等のアカウント'
  },
  isHarajukuResident: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '原宿エリアで働いているか'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '主催者向けメモ'
  }
}, {
  tableName: 'event_participants',
  timestamps: true,
  indexes: [
    {
      fields: ['eventId']
    },
    {
      fields: ['designCompanyId']
    },
    {
      fields: ['attendanceStatus']
    },
    {
      fields: ['specialtyArea']
    },
    {
      unique: true,
      fields: ['eventId', 'participantEmail'],
      name: 'unique_event_participant'
    }
  ]
});

module.exports = EventParticipant;