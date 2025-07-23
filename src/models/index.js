const sequelize = require('../config/database');
const User = require('./User');
const Post = require('./Post');
const DesignCompany = require('./DesignCompany');
const Event = require('./Event');
const EventParticipant = require('./EventParticipant');

// 既存の関連
User.hasMany(Post, {
  foreignKey: 'userId',
  as: 'posts'
});

Post.belongsTo(User, {
  foreignKey: 'userId',
  as: 'author'
});

// 原宿デザイナーの会関連
DesignCompany.hasMany(EventParticipant, {
  foreignKey: 'designCompanyId',
  as: 'eventParticipations'
});

EventParticipant.belongsTo(DesignCompany, {
  foreignKey: 'designCompanyId',
  as: 'company'
});

Event.hasMany(EventParticipant, {
  foreignKey: 'eventId',
  as: 'participants'
});

EventParticipant.belongsTo(Event, {
  foreignKey: 'eventId',
  as: 'event'
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
  Event,
  EventParticipant,
  syncDatabase
};