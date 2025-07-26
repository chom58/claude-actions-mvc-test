const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      len: [3, 30]
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
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  resetPasswordToken: {
    type: DataTypes.STRING,
    allowNull: true
  },
  resetPasswordExpires: {
    type: DataTypes.DATE,
    allowNull: true
  },
  refreshToken: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  lastLoginAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  profileImage: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'プロフィール画像のパス'
  },
  profileImageThumbnail: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'プロフィール画像サムネイルのパス'
  },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '自己紹介'
  },
  website: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isUrl: true
    },
    comment: 'ウェブサイトURL'
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '所在地'
  },
  skills: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'スキル一覧'
  }
}, {
  timestamps: true,
  hooks: {
    beforeSave: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  }
});

User.prototype.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// パスワードリセットトークンを生成
User.prototype.generatePasswordResetToken = function() {
  const crypto = require('crypto');
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  // 1時間後に期限切れ
  this.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
  
  return resetToken;
};

// パスワードリセットトークンを検証
User.prototype.validatePasswordResetToken = function(token) {
  const crypto = require('crypto');
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
  
  return this.resetPasswordToken === hashedToken && 
         this.resetPasswordExpires > new Date();
};

// リフレッシュトークンを生成
User.prototype.generateRefreshToken = function() {
  const crypto = require('crypto');
  const refreshToken = crypto.randomBytes(40).toString('hex');
  this.refreshToken = refreshToken;
  return refreshToken;
};

User.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  delete values.password;
  delete values.resetPasswordToken;
  delete values.resetPasswordExpires;
  delete values.refreshToken;
  return values;
};

module.exports = User;