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
      len: [1, 100]
    }
  },
  type: {
    type: DataTypes.ENUM('graphic', 'web', 'ui_ux', 'branding', 'packaging', 'other'),
    allowNull: false,
    defaultValue: 'graphic'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  address: {
    type: DataTypes.STRING,
    allowNull: true
  },
  isHarajukuArea: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
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
  website: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isUrl: true
    }
  },
  portfolio: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isUrl: true
    }
  },
  employees: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1
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
  specialties: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'JSON array of specialties'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  timestamps: true,
  indexes: [
    {
      fields: ['type']
    },
    {
      fields: ['isHarajukuArea']
    },
    {
      fields: ['isActive']
    }
  ]
});

// JSON getter/setter for specialties
DesignCompany.prototype.getSpecialties = function() {
  try {
    return this.specialties ? JSON.parse(this.specialties) : [];
  } catch (error) {
    return [];
  }
};

DesignCompany.prototype.setSpecialties = function(specialties) {
  this.specialties = JSON.stringify(specialties);
};

module.exports = DesignCompany;