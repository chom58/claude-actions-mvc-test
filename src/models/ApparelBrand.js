const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ApparelBrand = sequelize.define('ApparelBrand', {
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
  brandConcept: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'ブランドコンセプト・理念'
  },
  targetMarket: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
    comment: 'ターゲット市場（メンズ、レディース、ユニセックス、キッズなど）'
  },
  style: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
    comment: 'スタイル（ストリート、エレガント、カジュアル、アバンギャルドなど）'
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
  teamSize: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isIn: [['1-5', '6-20', '21-50', '51-100', '100+']]
    }
  },
  lookbookUrl: {
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
  instagramUrl: {
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
  priceRange: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isIn: [['プチプラ', 'ミドルレンジ', 'ハイエンド', 'ラグジュアリー']]
    }
  },
  collaborationNeeds: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
    comment: 'コラボレーション希望分野（グラフィックデザイン、Web制作、パッケージングなど）'
  },
  brandValues: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
    comment: 'ブランド価値観（サステナブル、エシカル、イノベーションなど）'
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: '認証済みブランドかどうか'
  },
  rating: {
    type: DataTypes.DECIMAL(3, 2),
    allowNull: true,
    validate: {
      min: 0,
      max: 5
    }
  },
  totalCollaborations: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  seasonalCollections: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: '年間コレクション数'
  }
}, {
  tableName: 'apparel_brands',
  timestamps: true,
  indexes: [
    {
      fields: ['location']
    },
    {
      fields: ['isVerified']
    },
    {
      fields: ['style'],
      using: 'gin'
    },
    {
      fields: ['targetMarket'],
      using: 'gin'
    }
  ]
});

module.exports = ApparelBrand;