const sequelize = require('../config/database');
const User = require('./User');
const Post = require('./Post');
const DesignCompany = require('./DesignCompany');
const Event = require('./Event');
const EventParticipant = require('./EventParticipant');

// 既存の関係
User.hasMany(Post, {
  foreignKey: 'userId',
  as: 'posts'
});

Post.belongsTo(User, {
  foreignKey: 'userId',
  as: 'author'
});

// 原宿デザイナーの会の関係
// デザイン会社とユーザーの関係
User.belongsTo(DesignCompany, {
  foreignKey: 'designCompanyId',
  as: 'company'
});

DesignCompany.hasMany(User, {
  foreignKey: 'designCompanyId',
  as: 'members'
});

// イベントとイベント参加者の関係
Event.hasMany(EventParticipant, {
  foreignKey: 'eventId',
  as: 'participants'
});

EventParticipant.belongsTo(Event, {
  foreignKey: 'eventId',
  as: 'event'
});

// デザイン会社とイベント参加者の関係
DesignCompany.hasMany(EventParticipant, {
  foreignKey: 'designCompanyId',
  as: 'eventParticipations'
});

EventParticipant.belongsTo(DesignCompany, {
  foreignKey: 'designCompanyId',
  as: 'company'
});

// ユーザーとイベント参加者の関係
User.hasMany(EventParticipant, {
  foreignKey: 'userId',
  as: 'eventParticipations'
});

EventParticipant.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
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