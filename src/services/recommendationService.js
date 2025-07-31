const { User, Post, Recommendation, UserInteraction } = require('../models');
const { Op } = require('sequelize');

class RecommendationService {
  constructor() {
    // インタラクションタイプの重み設定
    this.interactionWeights = {
      view: 1,
      like: 3,
      comment: 5,
      share: 4,
      bookmark: 6
    };
    
    // レコメンドの有効期限（7日間）
    this.recommendationTTL = 7 * 24 * 60 * 60 * 1000;
  }

  /**
   * ユーザーのインタラクションを記録
   */
  async recordInteraction(userId, targetId, targetType, interactionType, metadata = null) {
    try {
      const weight = this.interactionWeights[interactionType] || 1;
      
      return await UserInteraction.create({
        userId,
        targetId,
        targetType,
        interactionType,
        weight,
        metadata
      });
    } catch (error) {
      console.error('インタラクション記録エラー:', error);
      throw error;
    }
  }

  /**
   * ユーザーの興味プロファイルを分析
   */
  async analyzeUserProfile(userId) {
    try {
      const user = await User.findByPk(userId, {
        include: [{
          model: UserInteraction,
          as: 'interactions',
          where: {
            createdAt: {
              [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30日以内
            }
          },
          required: false
        }]
      });

      if (!user) {
        throw new Error('ユーザーが見つかりません');
      }

      // スキルベースの興味
      const skillInterests = user.skills || [];
      
      // インタラクションベースの興味
      const interactionInterests = this.extractInteractionPatterns(user.interactions);
      
      return {
        userId,
        skills: skillInterests,
        interactionPatterns: interactionInterests,
        profileCompleteness: this.calculateProfileCompleteness(user)
      };
    } catch (error) {
      console.error('ユーザープロファイル分析エラー:', error);
      throw error;
    }
  }

  /**
   * インタラクションパターンを抽出
   */
  extractInteractionPatterns(interactions = []) {
    const patterns = {
      preferredContentTypes: {},
      activityLevel: 0,
      engagementScore: 0
    };

    let totalWeight = 0;
    const authorInteractions = {};

    interactions.forEach(interaction => {
      const weight = interaction.weight;
      totalWeight += weight;

      // 投稿者との関係性
      if (interaction.targetType === 'post') {
        authorInteractions[interaction.targetId] = 
          (authorInteractions[interaction.targetId] || 0) + weight;
      }
      
      patterns.activityLevel += 1;
    });

    patterns.engagementScore = totalWeight / Math.max(interactions.length, 1);
    patterns.preferredAuthors = Object.entries(authorInteractions)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([authorId]) => parseInt(authorId));

    return patterns;
  }

  /**
   * プロファイルの完成度を計算
   */
  calculateProfileCompleteness(user) {
    let score = 0;
    const maxScore = 5;

    if (user.bio) score += 1;
    if (user.skills && user.skills.length > 0) score += 1;
    if (user.location) score += 1;
    if (user.website) score += 1;
    if (user.profileImage) score += 1;

    return score / maxScore;
  }

  /**
   * コンテンツベースのレコメンド
   */
  async generateContentBasedRecommendations(userId, limit = 10) {
    try {
      const userProfile = await this.analyzeUserProfile(userId);
      
      // 既にレコメンドされた投稿を除外
      const existingRecommendations = await Recommendation.findAll({
        where: {
          userId,
          recommendedItemType: 'post',
          expiresAt: { [Op.gt]: new Date() }
        },
        attributes: ['recommendedItemId']
      });
      
      const excludePostIds = existingRecommendations.map(r => r.recommendedItemId);
      excludePostIds.push(0); // デフォルト値

      let whereClause = {
        published: true,
        id: { [Op.notIn]: excludePostIds }
      };

      // スキルベースフィルタリング
      if (userProfile.skills.length > 0) {
        // タイトルや内容にスキルキーワードが含まれる投稿を検索
        const skillKeywords = userProfile.skills.join('|');
        whereClause[Op.or] = [
          { title: { [Op.regexp]: skillKeywords } },
          { content: { [Op.regexp]: skillKeywords } }
        ];
      }

      const posts = await Post.findAll({
        where: whereClause,
        include: [{
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'skills']
        }],
        order: [['viewCount', 'DESC'], ['createdAt', 'DESC']],
        limit: limit * 2 // 後でフィルタリングするため多めに取得
      });

      const recommendations = [];
      for (const post of posts.slice(0, limit)) {
        const score = await this.calculateContentScore(post, userProfile);
        if (score > 0.3) { // 閾値フィルタリング
          recommendations.push({
            post,
            score,
            reason: this.generateRecommendationReason(post, userProfile, 'content-based')
          });
        }
      }

      return recommendations.sort((a, b) => b.score - a.score);
    } catch (error) {
      console.error('コンテンツベースレコメンドエラー:', error);
      throw error;
    }
  }

  /**
   * 協調フィルタリング
   */
  async generateCollaborativeRecommendations(userId, limit = 10) {
    try {
      // 類似ユーザーを見つける
      const similarUsers = await this.findSimilarUsers(userId, 20);
      
      if (similarUsers.length === 0) {
        return [];
      }

      // 類似ユーザーの高評価投稿を取得
      const similarUserIds = similarUsers.map(u => u.userId);
      const highEngagementInteractions = await UserInteraction.findAll({
        where: {
          userId: { [Op.in]: similarUserIds },
          targetType: 'post',
          interactionType: { [Op.in]: ['like', 'bookmark', 'share'] }
        },
        include: [{
          model: User,
          as: 'user',
          attributes: ['id']
        }]
      });

      // 投稿の評価スコアを計算
      const postScores = {};
      highEngagementInteractions.forEach(interaction => {
        const postId = interaction.targetId;
        const userSimilarity = similarUsers.find(u => u.userId === interaction.userId)?.similarity || 0;
        
        postScores[postId] = (postScores[postId] || 0) + 
          (interaction.weight * userSimilarity);
      });

      // 上位投稿を取得
      const topPostIds = Object.entries(postScores)
        .sort(([,a], [,b]) => b - a)
        .slice(0, limit)
        .map(([postId]) => parseInt(postId));

      const posts = await Post.findAll({
        where: {
          id: { [Op.in]: topPostIds },
          published: true
        },
        include: [{
          model: User,
          as: 'author',
          attributes: ['id', 'username']
        }]
      });

      return posts.map(post => ({
        post,
        score: postScores[post.id] / Math.max(...Object.values(postScores)),
        reason: { type: 'collaborative', similarUsers: similarUsers.length }
      }));

    } catch (error) {
      console.error('協調フィルタリングエラー:', error);
      throw error;
    }
  }

  /**
   * 類似ユーザーを見つける
   */
  async findSimilarUsers(userId, limit = 20) {
    try {
      const targetUser = await User.findByPk(userId);
      if (!targetUser) return [];

      const allUsers = await User.findAll({
        where: { 
          id: { [Op.ne]: userId },
          isActive: true 
        },
        attributes: ['id', 'skills'],
        limit: 100 // パフォーマンス考慮
      });

      const similarities = [];
      
      for (const user of allUsers) {
        const similarity = this.calculateUserSimilarity(targetUser, user);
        if (similarity > 0.1) { // 閾値
          similarities.push({
            userId: user.id,
            similarity
          });
        }
      }

      return similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);
    } catch (error) {
      console.error('類似ユーザー検索エラー:', error);
      return [];
    }
  }

  /**
   * ユーザー類似度を計算（コサイン類似度）
   */
  calculateUserSimilarity(user1, user2) {
    const skills1 = user1.skills || [];
    const skills2 = user2.skills || [];
    
    if (skills1.length === 0 || skills2.length === 0) {
      return 0;
    }

    const allSkills = [...new Set([...skills1, ...skills2])];
    const vector1 = allSkills.map(skill => skills1.includes(skill) ? 1 : 0);
    const vector2 = allSkills.map(skill => skills2.includes(skill) ? 1 : 0);

    const dotProduct = vector1.reduce((sum, a, i) => sum + a * vector2[i], 0);
    const magnitude1 = Math.sqrt(vector1.reduce((sum, a) => sum + a * a, 0));
    const magnitude2 = Math.sqrt(vector2.reduce((sum, a) => sum + a * a, 0));

    if (magnitude1 === 0 || magnitude2 === 0) return 0;
    
    return dotProduct / (magnitude1 * magnitude2);
  }

  /**
   * コンテンツスコアを計算
   */
  async calculateContentScore(post, userProfile) {
    let score = 0;

    // スキルマッチング
    const postContent = (post.title + ' ' + post.content).toLowerCase();
    const matchedSkills = userProfile.skills.filter(skill => 
      postContent.includes(skill.toLowerCase())
    );
    score += matchedSkills.length * 0.3;

    // 作者の類似性
    if (post.author && post.author.skills) {
      const authorSimilarity = this.calculateSkillSimilarity(
        userProfile.skills, 
        post.author.skills
      );
      score += authorSimilarity * 0.2;
    }

    // 人気度
    const popularityScore = Math.min(post.viewCount / 100, 1);
    score += popularityScore * 0.1;

    // 鮮度
    const daysSincePublished = (Date.now() - new Date(post.publishedAt).getTime()) / (1000 * 60 * 60 * 24);
    const freshnessScore = Math.max(0, 1 - daysSincePublished / 30);
    score += freshnessScore * 0.2;

    return Math.min(score, 1);
  }

  /**
   * スキル類似度を計算
   */
  calculateSkillSimilarity(skills1, skills2) {
    if (!skills1 || !skills2 || skills1.length === 0 || skills2.length === 0) {
      return 0;
    }
    
    const intersection = skills1.filter(skill => 
      skills2.some(s2 => s2.toLowerCase() === skill.toLowerCase())
    );
    const union = [...new Set([...skills1, ...skills2])];
    
    return intersection.length / union.length;
  }

  /**
   * レコメンド理由を生成
   */
  generateRecommendationReason(post, userProfile, type) {
    const reason = { type };
    
    if (type === 'content-based') {
      const matchedSkills = userProfile.skills.filter(skill => 
        (post.title + ' ' + post.content).toLowerCase().includes(skill.toLowerCase())
      );
      
      reason.matchedSkills = matchedSkills;
      reason.message = matchedSkills.length > 0 
        ? `あなたのスキル「${matchedSkills.join(', ')}」に関連しています`
        : '人気の投稿です';
    }
    
    return reason;
  }

  /**
   * レコメンドを保存
   */
  async saveRecommendations(userId, recommendations) {
    try {
      const recommendationData = recommendations.map(rec => ({
        userId,
        recommendedItemId: rec.post.id,
        recommendedItemType: 'post',
        score: rec.score,
        reason: rec.reason,
        expiresAt: new Date(Date.now() + this.recommendationTTL)
      }));

      return await Recommendation.bulkCreate(recommendationData);
    } catch (error) {
      console.error('レコメンド保存エラー:', error);
      throw error;
    }
  }

  /**
   * ユーザー向けレコメンドを生成
   */
  async generateRecommendations(userId, options = {}) {
    try {
      const { limit = 10, algorithm = 'hybrid' } = options;
      
      let recommendations = [];

      if (algorithm === 'content' || algorithm === 'hybrid') {
        const contentRecs = await this.generateContentBasedRecommendations(userId, limit);
        recommendations = [...recommendations, ...contentRecs];
      }

      if (algorithm === 'collaborative' || algorithm === 'hybrid') {
        const collabRecs = await this.generateCollaborativeRecommendations(userId, limit);
        recommendations = [...recommendations, ...collabRecs];
      }

      // ハイブリッド: スコアでソートして重複除去
      const uniqueRecs = [];
      const seenPostIds = new Set();
      
      recommendations
        .sort((a, b) => b.score - a.score)
        .forEach(rec => {
          if (!seenPostIds.has(rec.post.id)) {
            seenPostIds.add(rec.post.id);
            uniqueRecs.push(rec);
          }
        });

      const finalRecs = uniqueRecs.slice(0, limit);
      
      // レコメンドを保存
      if (finalRecs.length > 0) {
        await this.saveRecommendations(userId, finalRecs);
      }

      return finalRecs;
    } catch (error) {
      console.error('レコメンド生成エラー:', error);
      throw error;
    }
  }

  /**
   * ユーザーのレコメンドを取得
   */
  async getRecommendations(userId, options = {}) {
    try {
      const { limit = 10, includeExpired = false } = options;
      
      let whereClause = {
        userId,
        recommendedItemType: 'post'
      };

      if (!includeExpired) {
        whereClause.expiresAt = { [Op.gt]: new Date() };
      }

      const recommendations = await Recommendation.findAll({
        where: whereClause,
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'username']
        }],
        order: [['score', 'DESC'], ['createdAt', 'DESC']],
        limit
      });

      // 関連する投稿情報を取得
      const postIds = recommendations.map(rec => rec.recommendedItemId);
      const posts = await Post.findAll({
        where: { id: { [Op.in]: postIds } },
        include: [{
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'profileImage']
        }]
      });

      const postMap = {};
      posts.forEach(post => {
        postMap[post.id] = post;
      });

      return recommendations.map(rec => ({
        ...rec.toJSON(),
        post: postMap[rec.recommendedItemId]
      })).filter(rec => rec.post); // 投稿が存在するもののみ
    } catch (error) {
      console.error('レコメンド取得エラー:', error);
      throw error;
    }
  }

  /**
   * レコメンドのフィードバックを処理
   */
  async handleFeedback(userId, recommendationId, action) {
    try {
      const recommendation = await Recommendation.findOne({
        where: { id: recommendationId, userId }
      });

      if (!recommendation) {
        throw new Error('レコメンドが見つかりません');
      }

      const updates = {};
      
      switch (action) {
        case 'view':
          updates.viewed = true;
          break;
        case 'click':
          updates.clicked = true;
          updates.viewed = true;
          break;
        case 'dismiss':
          updates.dismissed = true;
          break;
      }

      await recommendation.update(updates);
      
      // インタラクションも記録
      if (action === 'click') {
        await this.recordInteraction(
          userId, 
          recommendation.recommendedItemId, 
          'post', 
          'view'
        );
      }

      return recommendation;
    } catch (error) {
      console.error('フィードバック処理エラー:', error);
      throw error;
    }
  }
}

module.exports = new RecommendationService();