const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Event = sequelize.define('Event', {
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
      len: [3, 200]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  eventType: {
    type: DataTypes.ENUM('networking', 'workshop', 'exhibition', 'conference', 'meetup'),
    allowNull: false,
    defaultValue: 'networking'
  },
  startDateTime: {
    type: DataTypes.DATE,
    allowNull: false,
    validate: {
      isDate: true,
      isAfter: new Date().toISOString()
    }
  },
  endDateTime: {
    type: DataTypes.DATE,
    allowNull: false,
    validate: {
      isDate: true
    }
  },
  venue: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: '原宿イベントスペース'
  },
  address: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: '東京都渋谷区神宮前'
  },
  maxParticipants: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 50,
    validate: {
      min: 1,
      max: 200
    }
  },
  currentParticipants: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  fee: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: '参加費（円）'
  },
  targetAudience: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: ['graphic-designers', 'web-designers'],
    comment: 'ターゲット参加者タイプ'
  },
  tags: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
    comment: 'イベントタグ'
  },
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isUrl: true
    }
  },
  registrationDeadline: {
    type: DataTypes.DATE,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('draft', 'published', 'cancelled', 'completed'),
    defaultValue: 'draft'
  },
  isHarajukuExclusive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: '原宿エリア限定イベント'
  },
  organizer: {
    type: DataTypes.JSON,
    allowNull: false,
    comment: '主催者情報'
  },
  requirements: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '参加要件・持ち物など'
  },
  agenda: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
    comment: 'イベントスケジュール'
  }
}, {
  tableName: 'events',
  timestamps: true,
  indexes: [
    {
      fields: ['eventType']
    },
    {
      fields: ['startDateTime']
    },
    {
      fields: ['status']
    },
    {
      fields: ['isHarajukuExclusive']
    }
  ],
  validate: {
    endAfterStart() {
      if (this.endDateTime <= this.startDateTime) {
        throw new Error('終了時間は開始時間より後である必要があります');
      }
    },
    participantsNotExceedMax() {
      if (this.currentParticipants > this.maxParticipants) {
        throw new Error('現在の参加者数が最大参加者数を超えています');
      }
    }
  }
});

module.exports = Event;