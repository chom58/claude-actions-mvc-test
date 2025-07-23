const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

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
      model: 'Events',
      key: 'id'
    }
  },
  designCompanyId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'DesignCompanies',
      key: 'id'
    }
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  participantName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  participantEmail: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  participantPhone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  position: {
    type: DataTypes.STRING,
    allowNull: true
  },
  registrationDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  status: {
    type: DataTypes.ENUM('registered', 'confirmed', 'attended', 'cancelled', 'no_show'),
    defaultValue: 'registered'
  },
  specialRequests: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  timestamps: true,
  indexes: [
    {
      fields: ['eventId']
    },
    {
      fields: ['designCompanyId']
    },
    {
      fields: ['userId']
    },
    {
      fields: ['status']
    },
    {
      unique: true,
      fields: ['eventId', 'participantEmail']
    }
  ]
});

module.exports = EventParticipant;