const recommendationService = require('../../src/services/recommendationService');
const { User, Post, Recommendation, UserInteraction, sequelize } = require('../../src/models');

describe('RecommendationService', () => {
  let testUser;
  let testPosts;
  let otherUsers;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  beforeEach(async () => {
    // テストデータをクリーンアップ
    await UserInteraction.destroy({ truncate: true });
    await Recommendation.destroy({ truncate: true });
    await Post.destroy({ truncate: true });
    await User.destroy({ truncate: true });

    // テストユーザーを作成
    testUser = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      skills: ['JavaScript', 'React', 'Node.js'],
      bio: 'フロントエンド開発者',
      location: '東京',
      website: 'https://example.com'
    });

    // 他のユーザーを作成
    otherUsers = await Promise.all([
      User.create({
        username: 'user1',
        email: 'user1@example.com',
        password: 'password123',
        skills: ['JavaScript', 'React', 'TypeScript']
      }),
      User.create({
        username: 'user2',
        email: 'user2@example.com',
        password: 'password123',
        skills: ['Python', 'Django', 'PostgreSQL']
      }),
      User.create({
        username: 'user3',
        email: 'user3@example.com',
        password: 'password123',
        skills: ['JavaScript', 'Vue.js', 'Node.js']
      })
    ]);

    // テスト投稿を作成
    testPosts = await Promise.all([
      Post.create({
        title: 'React Hooks完全ガイド',
        content: 'React Hooksの使い方を詳しく解説します。useState、useEffect、useContextなどの基本的なフックから、カスタムフックの作成まで。',
        published: true,
        publishedAt: new Date(),
        userId: otherUsers[0].id,
        viewCount: 150
      }),
      Post.create({
        title: 'TypeScript実践入門',
        content: 'TypeScriptを使った型安全なWebアプリケーション開発について学びます。基本的な型定義から高度な型推論まで。',
        published: true,
        publishedAt: new Date(),
        userId: otherUsers[0].id,
        viewCount: 200
      }),
      Post.create({
        title: 'Pythonデータ分析',
        content: 'Pythonを使ったデータ分析の基礎から応用まで。pandas、numpy、matplotlibを使った実践的な例を紹介。',
        published: true,
        publishedAt: new Date(),
        userId: otherUsers[1].id,
        viewCount: 80
      })
    ]);
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('recordInteraction', () => {
    it('インタラクションを正しく記録できること', async () => {
      const interaction = await recommendationService.recordInteraction(
        testUser.id,
        testPosts[0].id,
        'post',
        'view'
      );

      expect(interaction).toBeTruthy();
      expect(interaction.userId).toBe(testUser.id);
      expect(interaction.targetId).toBe(testPosts[0].id);
      expect(interaction.targetType).toBe('post');
      expect(interaction.interactionType).toBe('view');
      expect(interaction.weight).toBe(1); // viewの重み
    });

    it('いいねのインタラクションで正しい重みが設定されること', async () => {
      const interaction = await recommendationService.recordInteraction(
        testUser.id,
        testPosts[0].id,
        'post',
        'like'
      );

      expect(interaction.weight).toBe(3); // likeの重み
    });
  });

  describe('analyzeUserProfile', () => {
    it('ユーザープロファイルを正しく分析できること', async () => {
      const profile = await recommendationService.analyzeUserProfile(testUser.id);

      expect(profile).toBeTruthy();
      expect(profile.userId).toBe(testUser.id);
      expect(profile.skills).toEqual(['JavaScript', 'React', 'Node.js']);
      expect(profile.interactionPatterns).toBeTruthy();
      expect(profile.profileCompleteness).toBeGreaterThan(0);
    });

    it('プロファイルの完成度を正しく計算できること', async () => {
      const profile = await recommendationService.analyzeUserProfile(testUser.id);
      
      // bio, skills, location, website, profileImageの5項目のうち4項目が設定されている
      expect(profile.profileCompleteness).toBe(0.8);
    });
  });

  describe('calculateUserSimilarity', () => {
    it('ユーザー間の類似度を正しく計算できること', async () => {
      const similarity = recommendationService.calculateUserSimilarity(
        testUser,
        otherUsers[0] // JavaScript, React, TypeScript
      );

      // JavaScript, Reactが共通なので0より大きい値になる
      expect(similarity).toBeGreaterThan(0);
    });

    it('スキルが全く異なる場合の類似度が低いこと', async () => {
      const similarity = recommendationService.calculateUserSimilarity(
        testUser,
        otherUsers[1] // Python, Django, PostgreSQL
      );

      // 共通スキルがないので0になる
      expect(similarity).toBe(0);
    });
  });

  describe('findSimilarUsers', () => {
    it('類似ユーザーを見つけられること', async () => {
      const similarUsers = await recommendationService.findSimilarUsers(testUser.id, 10);

      expect(Array.isArray(similarUsers)).toBe(true);
      
      // 少なくとも1人は類似ユーザーが見つかるはず（JavaScript共通）
      expect(similarUsers.length).toBeGreaterThan(0);
      
      // 類似度で降順ソートされていること
      for (let i = 1; i < similarUsers.length; i++) {
        expect(similarUsers[i-1].similarity).toBeGreaterThanOrEqual(similarUsers[i].similarity);
      }
    });
  });

  describe('generateContentBasedRecommendations', () => {
    it('コンテンツベースのレコメンドを生成できること', async () => {
      const recommendations = await recommendationService.generateContentBasedRecommendations(
        testUser.id,
        5
      );

      expect(Array.isArray(recommendations)).toBe(true);
      
      // JavaScript、React、Node.jsのスキルに基づいて関連投稿が推薦される
      if (recommendations.length > 0) {
        expect(recommendations[0]).toHaveProperty('post');
        expect(recommendations[0]).toHaveProperty('score');
        expect(recommendations[0]).toHaveProperty('reason');
        expect(recommendations[0].score).toBeGreaterThan(0);
      }
    });
  });

  describe('generateCollaborativeRecommendations', () => {
    beforeEach(async () => {
      // 類似ユーザーのインタラクションを作成
      await UserInteraction.create({
        userId: otherUsers[0].id, // JavaScript, React, TypeScriptユーザー
        targetId: testPosts[0].id,
        targetType: 'post',
        interactionType: 'like',
        weight: 3
      });

      await UserInteraction.create({
        userId: otherUsers[2].id, // JavaScript, Vue.js, Node.jsユーザー
        targetId: testPosts[0].id,
        targetType: 'post',
        interactionType: 'bookmark',
        weight: 6
      });
    });

    it('協調フィルタリングのレコメンドを生成できること', async () => {
      const recommendations = await recommendationService.generateCollaborativeRecommendations(
        testUser.id,
        5
      );

      expect(Array.isArray(recommendations)).toBe(true);
      
      if (recommendations.length > 0) {
        expect(recommendations[0]).toHaveProperty('post');
        expect(recommendations[0]).toHaveProperty('score');
        expect(recommendations[0]).toHaveProperty('reason');
        expect(recommendations[0].reason.type).toBe('collaborative');
      }
    });
  });

  describe('generateRecommendations', () => {
    it('ハイブリッドレコメンドを生成できること', async () => {
      const recommendations = await recommendationService.generateRecommendations(
        testUser.id,
        { algorithm: 'hybrid', limit: 5 }
      );

      expect(Array.isArray(recommendations)).toBe(true);
      
      // レコメンドがデータベースに保存されることを確認
      const savedRecommendations = await Recommendation.findAll({
        where: { userId: testUser.id }
      });
      
      expect(savedRecommendations.length).toBe(recommendations.length);
    });

    it('コンテンツベースのみのレコメンドを生成できること', async () => {
      const recommendations = await recommendationService.generateRecommendations(
        testUser.id,
        { algorithm: 'content', limit: 3 }
      );

      expect(Array.isArray(recommendations)).toBe(true);
    });
  });

  describe('getRecommendations', () => {
    beforeEach(async () => {
      // テスト用のレコメンドを作成
      await Recommendation.create({
        userId: testUser.id,
        recommendedItemId: testPosts[0].id,
        recommendedItemType: 'post',
        score: 0.9,
        reason: { type: 'content-based', matchedSkills: ['React'] },
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      await Recommendation.create({
        userId: testUser.id,
        recommendedItemId: testPosts[1].id,
        recommendedItemType: 'post',
        score: 0.8,
        reason: { type: 'collaborative' },
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });
    });

    it('保存されたレコメンドを取得できること', async () => {
      const recommendations = await recommendationService.getRecommendations(testUser.id);

      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBe(2);
      
      // スコア順でソートされていること
      expect(recommendations[0].score).toBeGreaterThanOrEqual(recommendations[1].score);
      
      // 投稿情報が含まれていること
      expect(recommendations[0].post).toBeTruthy();
      expect(recommendations[0].post.title).toBeTruthy();
    });
  });

  describe('handleFeedback', () => {
    let testRecommendation;

    beforeEach(async () => {
      testRecommendation = await Recommendation.create({
        userId: testUser.id,
        recommendedItemId: testPosts[0].id,
        recommendedItemType: 'post',
        score: 0.9,
        reason: { type: 'content-based' },
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });
    });

    it('ビューフィードバックを処理できること', async () => {
      const result = await recommendationService.handleFeedback(
        testUser.id,
        testRecommendation.id,
        'view'
      );

      expect(result.viewed).toBe(true);
    });

    it('クリックフィードバックを処理できること', async () => {
      const result = await recommendationService.handleFeedback(
        testUser.id,
        testRecommendation.id,
        'click'
      );

      expect(result.clicked).toBe(true);
      expect(result.viewed).toBe(true);
      
      // インタラクションも記録されることを確認
      const interaction = await UserInteraction.findOne({
        where: {
          userId: testUser.id,
          targetId: testPosts[0].id,
          interactionType: 'view'
        }
      });
      expect(interaction).toBeTruthy();
    });

    it('却下フィードバックを処理できること', async () => {
      const result = await recommendationService.handleFeedback(
        testUser.id,
        testRecommendation.id,
        'dismiss'
      );

      expect(result.dismissed).toBe(true);
    });
  });
});