const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const DesignCompany = sequelize.define('DesignCompany', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 100]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  location: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: '原宿'
  },
  area: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'harajuku',
    validate: {
      isIn: [['harajuku', 'shibuya', 'omotesando', 'aoyama']]
    }
  },
  specialties: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
    comment: 'グラフィック、Web、UI/UX、ブランディング、パッケージなど'
  },
  website: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isUrl: true
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  establishedYear: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1900,
      max: new Date().getFullYear()
    }
  },
  employeeCount: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1
    }
  },
  portfolio: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
    comment: 'ポートフォリオ画像URL配列'
  },
  socialMedia: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {},
    comment: 'Instagram, Twitter, Facebook等のURL'
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '原宿エリア企業として認証済み'
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'pending'),
    defaultValue: 'pending'
  }
}, {
  tableName: 'design_companies',
  timestamps: true,
  indexes: [
    {
      fields: ['area']
    },
    {
      fields: ['isVerified']
    },
    {
      fields: ['status']
    }
  ]
});

module.exports = DesignCompany;