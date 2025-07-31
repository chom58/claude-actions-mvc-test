const request = require('supertest');
const { app } = require('../../src/app');
const { User, Post, Recommendation, UserInteraction, sequelize } = require('../../src/models');
const jwt = require('jsonwebtoken');

describe('Recommendation API', () => {
  let authToken;
  let testUser;
  let testPosts;
  let otherUser;

  beforeAll(async () => {
    // データベースを同期
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
      skills: ['JavaScript', 'React', 'Node.js']
    });

    otherUser = await User.create({
      username: 'otheruser',
      email: 'other@example.com',
      password: 'password123',
      skills: ['JavaScript', 'Vue.js', 'Python']
    });

    // テスト投稿を作成
    testPosts = await Promise.all([
      Post.create({
        title: 'React Hooks入門',
        content: 'React Hooksの使い方について詳しく解説します。useStateやuseEffectなどの基本的なフックから、カスタムフックの作成まで学びましょう。',
        published: true,
        publishedAt: new Date(),
        userId: otherUser.id,
        viewCount: 100
      }),
      Post.create({
        title: 'Vue.js 3の新機能',
        content: 'Vue.js 3で追加された新機能について紹介します。Composition APIや新しいライフサイクルメソッドなど。',
        published: true,
        publishedAt: new Date(),
        userId: otherUser.id,
        viewCount: 50
      }),
      Post.create({
        title: 'Node.js パフォーマンス最適化',
        content: 'Node.jsアプリケーションのパフォーマンスを向上させるための実践的なテクニックを紹介します。',
        published: true,
        publishedAt: new Date(),
        userId: otherUser.id,
        viewCount: 75
      })
    ]);

    // JWTトークンを生成
    authToken = jwt.sign(
      { id: testUser.id, username: testUser.username },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('GET /api/recommendations', () => {
    it('認証されたユーザーのレコメンドを取得できること', async () => {
      const response = await request(app)
        .get('/api/recommendations')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('recommendations');
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('algorithm');
      expect(Array.isArray(response.body.data.recommendations)).toBe(true);
    });

    it('認証なしではアクセスできないこと', async () => {
      await request(app)
        .get('/api/recommendations')
        .expect(401);
    });

    it('アルゴリズムパラメータが正しく処理されること', async () => {
      const response = await request(app)
        .get('/api/recommendations?algorithm=content&limit=5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.algorithm).toBe('content');
    });

    it('無効なアルゴリズムパラメータでバリデーションエラーになること', async () => {
      await request(app)
        .get('/api/recommendations?algorithm=invalid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });

  describe('POST /api/recommendations/regenerate', () => {
    it('レコメンドを再生成できること', async () => {
      const response = await request(app)
        .post('/api/recommendations/regenerate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          algorithm: 'hybrid',
          limit: 10
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('recommendations');
      expect(response.body.data).toHaveProperty('generated');
      expect(response.body.data).toHaveProperty('algorithm');
    });
  });

  describe('POST /api/recommendations/interactions', () => {
    it('インタラクションを記録できること', async () => {
      const response = await request(app)
        .post('/api/recommendations/interactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetId: testPosts[0].id,
          targetType: 'post',
          interactionType: 'view',
          metadata: { source: 'recommendation' }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');

      // データベースに保存されていることを確認
      const interaction = await UserInteraction.findOne({
        where: {
          userId: testUser.id,
          targetId: testPosts[0].id,
          targetType: 'post',
          interactionType: 'view'
        }
      });
      expect(interaction).toBeTruthy();
    });

    it('無効なインタラクションタイプでバリデーションエラーになること', async () => {
      await request(app)
        .post('/api/recommendations/interactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetId: testPosts[0].id,
          targetType: 'post',
          interactionType: 'invalid',
        })
        .expect(400);
    });
  });

  describe('POST /api/recommendations/:id/feedback', () => {
    let testRecommendation;

    beforeEach(async () => {
      // テスト用のレコメンドを作成
      testRecommendation = await Recommendation.create({
        userId: testUser.id,
        recommendedItemId: testPosts[0].id,
        recommendedItemType: 'post',
        score: 0.8,
        reason: { type: 'content-based' },
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7日後
      });
    });

    it('レコメンドフィードバックを送信できること', async () => {
      const response = await request(app)
        .post(`/api/recommendations/${testRecommendation.id}/feedback`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          action: 'click'
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      // データベースが更新されていることを確認
      const updatedRecommendation = await Recommendation.findByPk(testRecommendation.id);
      expect(updatedRecommendation.clicked).toBe(true);
      expect(updatedRecommendation.viewed).toBe(true);
    });

    it('存在しないレコメンドIDでエラーになること', async () => {
      await request(app)
        .post('/api/recommendations/999999/feedback')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          action: 'click'
        })
        .expect(500);
    });

    it('無効なアクションでバリデーションエラーになること', async () => {
      await request(app)
        .post(`/api/recommendations/${testRecommendation.id}/feedback`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          action: 'invalid'
        })
        .expect(400);
    });
  });

  describe('GET /api/recommendations/similar-users', () => {
    beforeEach(async () => {
      // 類似ユーザーを作成
      await User.create({
        username: 'similaruser1',
        email: 'similar1@example.com',
        password: 'password123',
        skills: ['JavaScript', 'React'] // testUserと類似
      });

      await User.create({
        username: 'similaruser2',
        email: 'similar2@example.com',
        password: 'password123',
        skills: ['Python', 'Django'] // testUserと異なる
      });
    });

    it('類似ユーザーを取得できること', async () => {
      const response = await request(app)
        .get('/api/recommendations/similar-users')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('similarUsers');
      expect(response.body.data).toHaveProperty('total');
      expect(Array.isArray(response.body.data.similarUsers)).toBe(true);
    });
  });

  describe('GET /api/recommendations/profile', () => {
    it('ユーザープロファイル分析結果を取得できること', async () => {
      const response = await request(app)
        .get('/api/recommendations/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('userId');
      expect(response.body.data).toHaveProperty('skills');
      expect(response.body.data).toHaveProperty('interactionPatterns');
      expect(response.body.data).toHaveProperty('profileCompleteness');
      expect(response.body.data.userId).toBe(testUser.id);
    });
  });

  describe('GET /api/recommendations/stats', () => {
    beforeEach(async () => {
      // テスト用の統計データを作成
      await Recommendation.create({
        userId: testUser.id,
        recommendedItemId: testPosts[0].id,
        recommendedItemType: 'post',
        score: 0.8,
        viewed: true,
        clicked: true,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      await UserInteraction.create({
        userId: testUser.id,
        targetId: testPosts[0].id,
        targetType: 'post',
        interactionType: 'view',
        weight: 1
      });
    });

    it('レコメンド統計情報を取得できること', async () => {
      const response = await request(app)
        .get('/api/recommendations/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('recommendations');
      expect(response.body.data).toHaveProperty('interactions');

      const { recommendations } = response.body.data;
      expect(recommendations).toHaveProperty('total');
      expect(recommendations).toHaveProperty('viewed');
      expect(recommendations).toHaveProperty('clicked');
      expect(recommendations).toHaveProperty('dismissed');
      expect(recommendations).toHaveProperty('viewRate');
      expect(recommendations).toHaveProperty('clickRate');
      expect(recommendations).toHaveProperty('dismissRate');
    });
  });
});