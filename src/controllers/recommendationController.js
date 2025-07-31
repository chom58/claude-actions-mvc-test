const recommendationService = require('../services/recommendationService');
const { validationResult } = require('express-validator');
const asyncHandler = require('../utils/asyncHandler');

/**
 * ユーザーのレコメンドを取得
 */
const getRecommendations = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { limit = 10, algorithm = 'hybrid' } = req.query;

  try {
    // 既存のレコメンドをチェック
    let recommendations = await recommendationService.getRecommendations(userId, {
      limit: parseInt(limit)
    });

    // レコメンドが少ない場合は新しく生成
    if (recommendations.length < Math.min(5, parseInt(limit))) {
      console.log(`ユーザー${userId}の新しいレコメンドを生成中...`);
      const newRecommendations = await recommendationService.generateRecommendations(userId, {
        limit: parseInt(limit),
        algorithm
      });
      
      // 新しく生成されたレコメンドを再取得
      recommendations = await recommendationService.getRecommendations(userId, {
        limit: parseInt(limit)
      });
    }

    res.json({
      success: true,
      data: {
        recommendations,
        total: recommendations.length,
        algorithm: algorithm
      }
    });
  } catch (error) {
    console.error('レコメンド取得エラー:', error);
    res.status(500).json({
      success: false,
      message: 'レコメンドの取得に失敗しました',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * レコメンドを強制的に再生成
 */
const regenerateRecommendations = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { algorithm = 'hybrid', limit = 10 } = req.body;

  try {
    const recommendations = await recommendationService.generateRecommendations(userId, {
      algorithm,
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      data: {
        recommendations,
        generated: recommendations.length,
        algorithm
      },
      message: `${recommendations.length}件のレコメンドを生成しました`
    });
  } catch (error) {
    console.error('レコメンド再生成エラー:', error);
    res.status(500).json({
      success: false,
      message: 'レコメンドの再生成に失敗しました',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * レコメンドのフィードバック
 */
const handleFeedback = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'バリデーションエラー',
      errors: errors.array()
    });
  }

  const userId = req.user.id;
  const { recommendationId } = req.params;
  const { action } = req.body; // 'view', 'click', 'dismiss'

  try {
    const recommendation = await recommendationService.handleFeedback(
      userId, 
      parseInt(recommendationId), 
      action
    );

    res.json({
      success: true,
      data: recommendation,
      message: `フィードバック「${action}」を記録しました`
    });
  } catch (error) {
    console.error('フィードバック処理エラー:', error);
    res.status(500).json({
      success: false,
      message: 'フィードバックの処理に失敗しました',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * インタラクションを記録
 */
const recordInteraction = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'バリデーションエラー',
      errors: errors.array()
    });
  }

  const userId = req.user.id;
  const { targetId, targetType, interactionType, metadata } = req.body;

  try {
    const interaction = await recommendationService.recordInteraction(
      userId,
      parseInt(targetId),
      targetType,
      interactionType,
      metadata
    );

    res.json({
      success: true,
      data: interaction,
      message: 'インタラクションを記録しました'
    });
  } catch (error) {
    console.error('インタラクション記録エラー:', error);
    res.status(500).json({
      success: false,
      message: 'インタラクションの記録に失敗しました',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * ユーザーの類似ユーザーを取得
 */
const getSimilarUsers = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { limit = 10 } = req.query;

  try {
    const similarUsers = await recommendationService.findSimilarUsers(
      userId, 
      parseInt(limit)
    );

    res.json({
      success: true,
      data: {
        similarUsers,
        total: similarUsers.length
      }
    });
  } catch (error) {
    console.error('類似ユーザー取得エラー:', error);
    res.status(500).json({
      success: false,
      message: '類似ユーザーの取得に失敗しました',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * ユーザープロファイル分析結果を取得
 */
const getUserProfile = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  try {
    const profile = await recommendationService.analyzeUserProfile(userId);

    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error('ユーザープロファイル分析エラー:', error);
    res.status(500).json({
      success: false,
      message: 'ユーザープロファイルの分析に失敗しました',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * レコメンドの統計情報を取得
 */
const getRecommendationStats = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  try {
    const { Recommendation, UserInteraction } = require('../models');
    const { Op } = require('sequelize');

    // レコメンド統計
    const [totalRecommendations, viewedRecommendations, clickedRecommendations, dismissedRecommendations] = await Promise.all([
      Recommendation.count({ where: { userId } }),
      Recommendation.count({ where: { userId, viewed: true } }),
      Recommendation.count({ where: { userId, clicked: true } }),
      Recommendation.count({ where: { userId, dismissed: true } })
    ]);

    // インタラクション統計
    const interactionStats = await UserInteraction.findAll({
      where: { userId },
      attributes: [
        'interactionType',
        [require('sequelize').fn('COUNT', '*'), 'count'],
        [require('sequelize').fn('SUM', require('sequelize').col('weight')), 'totalWeight']
      ],
      group: ['interactionType'],
      raw: true
    });

    const stats = {
      recommendations: {
        total: totalRecommendations,
        viewed: viewedRecommendations,
        clicked: clickedRecommendations,
        dismissed: dismissedRecommendations,
        viewRate: totalRecommendations > 0 ? (viewedRecommendations / totalRecommendations) : 0,
        clickRate: viewedRecommendations > 0 ? (clickedRecommendations / viewedRecommendations) : 0,
        dismissRate: totalRecommendations > 0 ? (dismissedRecommendations / totalRecommendations) : 0
      },
      interactions: interactionStats.reduce((acc, stat) => {
        acc[stat.interactionType] = {
          count: parseInt(stat.count),
          totalWeight: parseFloat(stat.totalWeight) || 0
        };
        return acc;
      }, {})
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('レコメンド統計取得エラー:', error);
    res.status(500).json({
      success: false,
      message: 'レコメンド統計の取得に失敗しました',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = {
  getRecommendations,
  regenerateRecommendations,
  handleFeedback,
  recordInteraction,
  getSimilarUsers,
  getUserProfile,
  getRecommendationStats
};