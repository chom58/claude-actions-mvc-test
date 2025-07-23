const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

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
      len: [1, 150]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  type: {
    type: DataTypes.ENUM('networking', 'workshop', 'exhibition', 'conference', 'meetup', 'other'),
    allowNull: false,
    defaultValue: 'networking'
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  location: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: '原宿イベントスペース'
  },
  address: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: '東京都渋谷区神宮前'
  },
  maxParticipants: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1
    }
  },
  currentParticipants: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  registrationDeadline: {
    type: DataTypes.DATE,
    allowNull: true
  },
  fee: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0
  },
  requirements: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  agenda: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'JSON array of agenda items'
  },
  tags: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'JSON array of tags'
  },
  isPublic: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  status: {
    type: DataTypes.ENUM('draft', 'published', 'ongoing', 'completed', 'cancelled'),
    defaultValue: 'draft'
  }
}, {
  timestamps: true,
  indexes: [
    {
      fields: ['startDate']
    },
    {
      fields: ['type']
    },
    {
      fields: ['status']
    },
    {
      fields: ['isPublic']
    }
  ]
});

// JSON getter/setter for agenda
Event.prototype.getAgenda = function() {
  try {
    return this.agenda ? JSON.parse(this.agenda) : [];
  } catch (error) {
    return [];
  }
};

Event.prototype.setAgenda = function(agenda) {
  this.agenda = JSON.stringify(agenda);
};

// JSON getter/setter for tags
Event.prototype.getTags = function() {
  try {
    return this.tags ? JSON.parse(this.tags) : [];
  } catch (error) {
    return [];
  }
};

Event.prototype.setTags = function(tags) {
  this.tags = JSON.stringify(tags);
};

// Helper methods
Event.prototype.isRegistrationOpen = function() {
  const now = new Date();
  const deadline = this.registrationDeadline || this.startDate;
  return this.status === 'published' && now < deadline;
};

Event.prototype.hasSpace = function() {
  if (!this.maxParticipants) return true;
  return this.currentParticipants < this.maxParticipants;
};

module.exports = Event;