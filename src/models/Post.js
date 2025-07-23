const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Post = sequelize.define('Post', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [1, 200]
    }
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  slug: {
    type: DataTypes.STRING,
    unique: true
  },
  published: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  publishedAt: {
    type: DataTypes.DATE
  },
  viewCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  timestamps: true,
  hooks: {
    beforeSave: (post) => {
      if (!post.slug && post.title) {
        post.slug = post.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
      }
      
      if (post.published && !post.publishedAt) {
        post.publishedAt = new Date();
      }
    }
  }
});

module.exports = Post;