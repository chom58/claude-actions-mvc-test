const sequelize = require('../config/database');
const User = require('./User');
const Post = require('./Post');
const DesignCompany = require('./DesignCompany');
const ApparelBrand = require('./ApparelBrand');
const CreativeEvent = require('./CreativeEvent');
const Collaboration = require('./Collaboration');
const MatchingRequest = require('./MatchingRequest');

// Existing relationships
User.hasMany(Post, {
  foreignKey: 'userId',
  as: 'posts'
});

Post.belongsTo(User, {
  foreignKey: 'userId',
  as: 'author'
});

// New relationships for Creative Community
DesignCompany.hasMany(Collaboration, {
  foreignKey: 'designCompanyId',
  as: 'collaborations'
});

ApparelBrand.hasMany(Collaboration, {
  foreignKey: 'apparelBrandId',
  as: 'collaborations'
});

Collaboration.belongsTo(DesignCompany, {
  foreignKey: 'designCompanyId',
  as: 'designCompany'
});

Collaboration.belongsTo(ApparelBrand, {
  foreignKey: 'apparelBrandId',
  as: 'apparelBrand'
});

const syncDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('データベース接続が確立されました');
    
    if (process.env.NODE_ENV !== 'production') {
      await sequelize.sync({ alter: true });
      console.log('データベーススキーマが同期されました');
    }
  } catch (error) {
    console.error('データベース接続エラー:', error);
    throw error;
  }
};

module.exports = {
  sequelize,
  User,
  Post,
  DesignCompany,
  ApparelBrand,
  CreativeEvent,
  Collaboration,
  MatchingRequest,
  syncDatabase
};