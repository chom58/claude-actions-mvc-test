const sequelize = require('../config/database');
const User = require('./User');
const Post = require('./Post');

User.hasMany(Post, {
  foreignKey: 'userId',
  as: 'posts'
});

Post.belongsTo(User, {
  foreignKey: 'userId',
  as: 'author'
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
  syncDatabase
};