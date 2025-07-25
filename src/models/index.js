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
  syncDatabase
};