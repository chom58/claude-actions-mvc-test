const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { addSearchIndexHooks } = require('./hooks/searchIndexHooks');

const CreativeEvent = sequelize.define('CreativeEvent', {
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
  // nameフィールドをtitleのエイリアスとして追加
  name: {
    type: DataTypes.VIRTUAL,
    get() {
      return this.getDataValue('title');
    },
    set(value) {
      this.setDataValue('title', value);
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  eventType: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['ネットワーキング', 'ワークショップ', '展示会', 'カンファレンス', 'ファッションショー', 'デザイン展', 'トークセッション', 'その他']]
    }
  },
  targetAudience: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
    comment: 'ターゲット（デザイナー、ブランド、学生、業界関係者など）'
  },
  venue: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: '原宿イベントスペース'
  },
  address: {
    type: DataTypes.STRING,
    allowNull: true
  },
  eventDate: {
    type: DataTypes.DATE,
    allowNull: false,
    validate: {
      isDate: true,
      isAfter: new Date().toISOString()
    }
  },
  startTime: {
    type: DataTypes.TIME,
    allowNull: false
  },
  endTime: {
    type: DataTypes.TIME,
    allowNull: false
  },
  capacity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1
    }
  },
  currentParticipants: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  registrationFee: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  isOnline: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  onlineUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isUrl: true
    }
  },
  organizerType: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['design_company', 'apparel_brand', 'external', 'community']]
    }
  },
  organizerId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'デザイン会社またはアパレルブランドのID'
  },
  organizerName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  contactEmail: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  imageUrl: {
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
    comment: 'イベントタグ'
  },
  requirements: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '参加要件'
  },
  agenda: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'アジェンダ・プログラム'
  },
  speakers: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
    comment: 'スピーカー情報'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  registrationDeadline: {
    type: DataTypes.DATE,
    allowNull: true
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'upcoming',
    validate: {
      isIn: [['upcoming', 'ongoing', 'completed', 'cancelled']]
    }
  }
}, {
  tableName: 'creative_events',
  timestamps: true,
  indexes: [
    {
      fields: ['eventDate']
    },
    {
      fields: ['eventType']
    },
    {
      fields: ['organizerType', 'organizerId']
    },
    {
      fields: ['status']
    },
    {
      fields: ['tags'],
      using: 'gin'
    }
  ]
});

// 検索インデックスフックを追加
addSearchIndexHooks(CreativeEvent, 'event');

// CreativeEventではtitleをnameとしても参照できるようにする
CreativeEvent.prototype.getName = function() {
  return this.title;
};

module.exports = CreativeEvent;