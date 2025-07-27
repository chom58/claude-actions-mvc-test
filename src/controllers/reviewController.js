const { Review, ReviewHelpful, User, DesignCompany, ApparelBrand, Collaboration } = require('../models');
const { validationResult } = require('express-validator');
const { asyncHandler } = require('../utils/asyncHandler');
const { Op } = require('sequelize');

// レビュー作成
exports.createReview = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    reviewedEntityId,
    reviewedEntityType,
    rating,
    title,
    content,
    pros,
    cons,
    collaborationId
  } = req.body;

  // レビューされるエンティティが存在するかチェック
  const entityExists = await validateReviewedEntity(reviewedEntityType, reviewedEntityId);
  if (!entityExists) {
    return res.status(404).json({ error: 'レビュー対象が見つかりません' });
  }

  // 自分自身をレビューできないかチェック
  if (reviewedEntityType === 'user' && reviewedEntityId === req.user.id) {
    return res.status(400).json({ error: '自分自身をレビューすることはできません' });
  }

  // 既存のレビューがないかチェック
  const existingReview = await Review.findOne({
    where: {
      reviewerId: req.user.id,
      reviewedEntityId,
      reviewedEntityType
    }
  });

  if (existingReview) {
    return res.status(400).json({ error: 'このエンティティに対して既にレビューを投稿しています' });
  }

  // コラボレーションに基づく確認済みレビューかチェック
  let isVerified = false;
  if (collaborationId) {
    const collaboration = await Collaboration.findByPk(collaborationId);
    if (collaboration && 
        (collaboration.designCompanyId === reviewedEntityId || 
         collaboration.apparelBrandId === reviewedEntityId) &&
        collaboration.status === 'completed') {
      isVerified = true;
    }
  }

  const review = await Review.create({
    reviewerId: req.user.id,
    reviewedEntityId,
    reviewedEntityType,
    rating,
    title,
    content,
    pros,
    cons,
    isVerified,
    collaborationId: isVerified ? collaborationId : null
  });

  const reviewWithDetails = await Review.findByPk(review.id, {
    include: [
      {
        model: User,
        as: 'reviewer',
        attributes: ['id', 'username']
      }
    ]
  });

  res.status(201).json({
    message: 'レビューを投稿しました',
    review: reviewWithDetails
  });
});

// レビュー一覧取得
exports.getReviews = asyncHandler(async (req, res) => {
  const {
    entityType,
    entityId,
    rating,
    verified,
    page = 1,
    limit = 10,
    sortBy = 'created_at',
    sortOrder = 'DESC'
  } = req.query;

  const whereClause = {
    isHidden: false
  };

  if (entityType && entityId) {
    whereClause.reviewedEntityType = entityType;
    whereClause.reviewedEntityId = entityId;
  }

  if (rating) {
    whereClause.rating = rating;
  }

  if (verified !== undefined) {
    whereClause.isVerified = verified === 'true';
  }

  const offset = (page - 1) * limit;

  const reviews = await Review.findAndCountAll({
    where: whereClause,
    include: [
      {
        model: User,
        as: 'reviewer',
        attributes: ['id', 'username']
      },
      {
        model: ReviewHelpful,
        as: 'helpfulVotes',
        attributes: ['isHelpful']
      }
    ],
    order: [[sortBy, sortOrder]],
    limit: parseInt(limit),
    offset: parseInt(offset)
  });

  // 統計情報を計算
  const stats = await calculateReviewStats(entityType, entityId);

  res.json({
    reviews: reviews.rows,
    stats,
    pagination: {
      total: reviews.count,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(reviews.count / limit)
    }
  });
});

// 特定のレビュー取得
exports.getReview = asyncHandler(async (req, res) => {
  const review = await Review.findByPk(req.params.id, {
    include: [
      {
        model: User,
        as: 'reviewer',
        attributes: ['id', 'username']
      },
      {
        model: ReviewHelpful,
        as: 'helpfulVotes',
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username']
          }
        ]
      }
    ]
  });

  if (!review || review.isHidden) {
    return res.status(404).json({ error: 'レビューが見つかりません' });
  }

  res.json(review);
});

// レビューを「役に立った」と評価
exports.markHelpful = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isHelpful = true } = req.body;

  const review = await Review.findByPk(id);
  if (!review || review.isHidden) {
    return res.status(404).json({ error: 'レビューが見つかりません' });
  }

  // 自分のレビューは評価できない
  if (review.reviewerId === req.user.id) {
    return res.status(400).json({ error: '自分のレビューを評価することはできません' });
  }

  // 既存の評価をチェック
  const existingVote = await ReviewHelpful.findOne({
    where: {
      userId: req.user.id,
      reviewId: id
    }
  });

  if (existingVote) {
    // 既存の評価を更新
    await existingVote.update({ isHelpful });
  } else {
    // 新しい評価を作成
    await ReviewHelpful.create({
      userId: req.user.id,
      reviewId: id,
      isHelpful
    });
  }

  // helpfulCountを再計算
  const helpfulCount = await ReviewHelpful.count({
    where: {
      reviewId: id,
      isHelpful: true
    }
  });

  await review.update({ helpfulCount });

  res.json({
    message: 'レビューを評価しました',
    helpfulCount
  });
});

// レビュー更新（自分のレビューのみ）
exports.updateReview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rating, title, content, pros, cons } = req.body;

  const review = await Review.findByPk(id);
  if (!review) {
    return res.status(404).json({ error: 'レビューが見つかりません' });
  }

  // 自分のレビューかチェック
  if (review.reviewerId !== req.user.id) {
    return res.status(403).json({ error: 'このレビューを編集する権限がありません' });
  }

  const updateData = {};
  if (rating !== undefined) updateData.rating = rating;
  if (title !== undefined) updateData.title = title;
  if (content !== undefined) updateData.content = content;
  if (pros !== undefined) updateData.pros = pros;
  if (cons !== undefined) updateData.cons = cons;

  await review.update(updateData);

  const updatedReview = await Review.findByPk(id, {
    include: [
      {
        model: User,
        as: 'reviewer',
        attributes: ['id', 'username']
      }
    ]
  });

  res.json({
    message: 'レビューを更新しました',
    review: updatedReview
  });
});

// レビュー削除（自分のレビューのみ）
exports.deleteReview = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const review = await Review.findByPk(id);
  if (!review) {
    return res.status(404).json({ error: 'レビューが見つかりません' });
  }

  // 自分のレビューかチェック
  if (review.reviewerId !== req.user.id) {
    return res.status(403).json({ error: 'このレビューを削除する権限がありません' });
  }

  await review.destroy();

  res.json({ message: 'レビューを削除しました' });
});

// ユーザーのレビュー一覧取得
exports.getUserReviews = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;

  const reviews = await Review.findAndCountAll({
    where: {
      reviewerId: userId,
      isHidden: false
    },
    include: [
      {
        model: User,
        as: 'reviewer',
        attributes: ['id', 'username']
      }
    ],
    order: [['created_at', 'DESC']],
    limit: parseInt(limit),
    offset: parseInt(offset)
  });

  res.json({
    reviews: reviews.rows,
    pagination: {
      total: reviews.count,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(reviews.count / limit)
    }
  });
});

// ヘルパー関数：レビューされるエンティティの存在確認
async function validateReviewedEntity(entityType, entityId) {
  switch (entityType) {
    case 'user':
      return await User.findByPk(entityId) !== null;
    case 'design_company':
      return await DesignCompany.findByPk(entityId) !== null;
    case 'apparel_brand':
      return await ApparelBrand.findByPk(entityId) !== null;
    case 'collaboration':
      return await Collaboration.findByPk(entityId) !== null;
    default:
      return false;
  }
}

// ヘルパー関数：レビュー統計の計算
async function calculateReviewStats(entityType, entityId) {
  if (!entityType || !entityId) {
    return null;
  }

  const stats = await Review.findAll({
    where: {
      reviewedEntityType: entityType,
      reviewedEntityId: entityId,
      isHidden: false
    },
    attributes: [
      'rating',
      [Review.sequelize.fn('COUNT', Review.sequelize.col('rating')), 'count']
    ],
    group: ['rating'],
    raw: true
  });

  const totalReviews = stats.reduce((sum, stat) => sum + parseInt(stat.count), 0);
  const averageRating = totalReviews > 0 
    ? stats.reduce((sum, stat) => sum + (stat.rating * stat.count), 0) / totalReviews 
    : 0;

  const ratingDistribution = [1, 2, 3, 4, 5].map(rating => {
    const stat = stats.find(s => s.rating === rating);
    return {
      rating,
      count: stat ? parseInt(stat.count) : 0,
      percentage: totalReviews > 0 ? ((stat ? parseInt(stat.count) : 0) / totalReviews * 100).toFixed(1) : '0.0'
    };
  });

  return {
    totalReviews,
    averageRating: Math.round(averageRating * 10) / 10,
    ratingDistribution
  };
}

module.exports = {
  createReview: exports.createReview,
  getReviews: exports.getReviews,
  getReview: exports.getReview,
  markHelpful: exports.markHelpful,
  updateReview: exports.updateReview,
  deleteReview: exports.deleteReview,
  getUserReviews: exports.getUserReviews
};