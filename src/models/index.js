const sequelize = require('../config/database');
const User = require('./User');
const Post = require('./Post');
const DesignCompany = require('./DesignCompany');
const ApparelBrand = require('./ApparelBrand');
const CreativeEvent = require('./CreativeEvent');
const Collaboration = require('./Collaboration');
const MatchingRequest = require('./MatchingRequest');
const JobSite = require('./JobSite');
const DesignerJob = require('./DesignerJob');
const Image = require('./Image');
const ImageUsage = require('./ImageUsage');
const ChatRoom = require('./ChatRoom');
const Message = require('./Message');
const Notification = require('./Notification');
const NotificationPreference = require('./NotificationPreference');
const Review = require('./Review');
const ReviewHelpful = require('./ReviewHelpful');

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

// Designer Jobs relationships
JobSite.hasMany(DesignerJob, {
  foreignKey: 'jobSiteId',
  as: 'jobs'
});

DesignerJob.belongsTo(JobSite, {
  foreignKey: 'jobSiteId',
  as: 'jobSite'
});

User.hasMany(DesignerJob, {
  foreignKey: 'approvedBy',
  as: 'approvedJobs'
});

DesignerJob.belongsTo(User, {
  foreignKey: 'approvedBy',
  as: 'approver'
});

// Image relationships
User.hasMany(Image, {
  foreignKey: 'userId',
  as: 'images'
});

Image.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

Image.hasMany(ImageUsage, {
  foreignKey: 'imageId',
  as: 'usages'
});

ImageUsage.belongsTo(Image, {
  foreignKey: 'imageId',
  as: 'image'
});

// Chat and messaging relationships
ChatRoom.hasMany(Message, {
  foreignKey: 'roomId',
  as: 'messages'
});

Message.belongsTo(ChatRoom, {
  foreignKey: 'roomId',
  as: 'room'
});

User.hasMany(Message, {
  foreignKey: 'senderId',
  as: 'sentMessages'
});

Message.belongsTo(User, {
  foreignKey: 'senderId',
  as: 'sender'
});

// Notification relationships
User.hasMany(Notification, {
  foreignKey: 'userId',
  as: 'notifications'
});

Notification.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

User.hasOne(NotificationPreference, {
  foreignKey: 'userId',
  as: 'notificationPreference'
});

NotificationPreference.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

// Review relationships
User.hasMany(Review, {
  foreignKey: 'reviewerId',
  as: 'reviewsWritten'
});

Review.belongsTo(User, {
  foreignKey: 'reviewerId',
  as: 'reviewer'
});

// ReviewHelpful relationships
User.hasMany(ReviewHelpful, {
  foreignKey: 'userId',
  as: 'helpfulReviews'
});

ReviewHelpful.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

Review.hasMany(ReviewHelpful, {
  foreignKey: 'reviewId',
  as: 'helpfulVotes'
});

ReviewHelpful.belongsTo(Review, {
  foreignKey: 'reviewId',
  as: 'review'
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
  JobSite,
  DesignerJob,
  Image,
  ImageUsage,
  ChatRoom,
  Message,
  Notification,
  NotificationPreference,
  Review,
  ReviewHelpful,
  syncDatabase
};