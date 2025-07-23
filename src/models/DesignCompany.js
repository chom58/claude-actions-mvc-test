const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

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
      len: [1, 255]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  specialties: {
    type: DataTypes.JSON, 
    allowNull: false,
    defaultValue: [],
    comment: 'グラフィック、Web、UI/UX、ブランディング、パッケージデザインなど'
  },
  location: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: '原宿',
    validate: {
      notEmpty: true
    }
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
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isIn: [['1-5', '6-20', '21-50', '51-100', '100+']]
    }
  },
  portfolioUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isUrl: true
    }
  },
  websiteUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isUrl: true
    }
  },
  contactEmail: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  contactPhone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  logoUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isUrl: true
    }
  },
  philosophy: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '会社の理念・コンセプト'
  },
  collaborationAreas: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
    comment: 'コラボレーションしたい分野'
  },
  providedSkills: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
    comment: '提供できるスキル'
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: '認証済み企業かどうか'
  },
  rating: {
    type: DataTypes.DECIMAL(3, 2),
    allowNull: true,
    validate: {
      min: 0,
      max: 5
    }
  },
  totalProjects: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  }
}, {
  tableName: 'design_companies',
  timestamps: true,
  indexes: [
    {
      fields: ['location']
    },
    {
      fields: ['isVerified']
    },
    {
      fields: ['specialties'],
      using: 'gin'
    }
  ]
});

module.exports = DesignCompany;