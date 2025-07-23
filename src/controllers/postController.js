const { Post, User } = require('../models');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');

exports.getAllPosts = async (req, res) => {
  try {
    const { page = 1, limit = 10, published } = req.query;
    const offset = (page - 1) * limit;
    
    const where = {};
    if (published !== undefined) {
      where.published = published === 'true';
    }

    const { count, rows: posts } = await Post.findAndCountAll({
      where,
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'username', 'email']
      }],
      limit: parseInt(limit),
      offset: offset,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      posts,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      totalPosts: count
    });
  } catch (error) {
    console.error('Get all posts error:', error);
    res.status(500).json({
      error: '投稿一覧の取得中にエラーが発生しました'
    });
  }
};

exports.getPost = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const post = await Post.findByPk(req.params.id, {
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'username', 'email']
      }]
    });

    if (!post) {
      return res.status(404).json({
        error: '投稿が見つかりません'
      });
    }

    await post.increment('viewCount');

    res.json({ post });
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({
      error: '投稿の取得中にエラーが発生しました'
    });
  }
};

exports.createPost = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, content, slug } = req.body;

    const post = await Post.create({
      title,
      content,
      slug,
      userId: req.userId
    });

    const postWithAuthor = await Post.findByPk(post.id, {
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'username', 'email']
      }]
    });

    res.status(201).json({
      message: '投稿が作成されました',
      post: postWithAuthor
    });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({
      error: '投稿の作成中にエラーが発生しました'
    });
  }
};

exports.updatePost = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const post = await Post.findByPk(req.params.id);

    if (!post) {
      return res.status(404).json({
        error: '投稿が見つかりません'
      });
    }

    if (post.userId !== req.userId) {
      return res.status(403).json({
        error: 'この投稿を編集する権限がありません'
      });
    }

    const { title, content, slug } = req.body;

    await post.update({
      title: title || post.title,
      content: content || post.content,
      slug: slug || post.slug
    });

    const updatedPost = await Post.findByPk(post.id, {
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'username', 'email']
      }]
    });

    res.json({
      message: '投稿が更新されました',
      post: updatedPost
    });
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({
      error: '投稿の更新中にエラーが発生しました'
    });
  }
};

exports.deletePost = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const post = await Post.findByPk(req.params.id);

    if (!post) {
      return res.status(404).json({
        error: '投稿が見つかりません'
      });
    }

    if (post.userId !== req.userId) {
      return res.status(403).json({
        error: 'この投稿を削除する権限がありません'
      });
    }

    await post.destroy();

    res.json({
      message: '投稿が削除されました'
    });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({
      error: '投稿の削除中にエラーが発生しました'
    });
  }
};

exports.publishPost = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const post = await Post.findByPk(req.params.id);

    if (!post) {
      return res.status(404).json({
        error: '投稿が見つかりません'
      });
    }

    if (post.userId !== req.userId) {
      return res.status(403).json({
        error: 'この投稿を公開する権限がありません'
      });
    }

    await post.update({
      published: true,
      publishedAt: new Date()
    });

    res.json({
      message: '投稿が公開されました',
      post
    });
  } catch (error) {
    console.error('Publish post error:', error);
    res.status(500).json({
      error: '投稿の公開中にエラーが発生しました'
    });
  }
};