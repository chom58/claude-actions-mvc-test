const apiHelper = require('../../helpers/api.helper');
const dbHelper = require('../../helpers/db.helper');

describe('Posts API Integration Tests', () => {
  let authToken;
  let testUser;
  let testPost;

  beforeAll(async () => {
    await dbHelper.resetDatabase();
  });

  beforeEach(async () => {
    await dbHelper.clearAllTables();
    
    // 認証済みユーザーを作成
    const auth = await apiHelper.createAuthenticatedUser({
      username: 'posttest',
      email: 'posttest@example.com'
    });
    
    authToken = auth.token;
    testUser = auth.user;
  });

  afterAll(async () => {
    await dbHelper.sequelize.close();
  });

  describe('POST /api/posts', () => {
    it('should create a new post with valid data', async () => {
      const postData = {
        title: 'Test Post Title',
        content: 'This is a test post content',
        status: 'published'
      };

      const response = await apiHelper.authPost('/api/posts', postData, authToken);
      const body = apiHelper.expectSuccess(response, 201);

      expect(body.post).toMatchObject({
        title: postData.title,
        content: postData.content,
        status: postData.status,
        userId: testUser.id
      });
      expect(body.post.id).toBeDefined();
      expect(body.post.createdAt).toBeDefined();
    });

    it('should validate required fields', async () => {
      const invalidData = {
        content: 'Content without title'
      };

      const response = await apiHelper.authPost('/api/posts', invalidData, authToken);
      apiHelper.expectError(response, 400);
    });

    it('should reject unauthenticated requests', async () => {
      const postData = {
        title: 'Test Post',
        content: 'Test content'
      };

      const response = await apiHelper.request
        .post('/api/posts')
        .send(postData);
      
      apiHelper.expectError(response, 401);
    });
  });

  describe('GET /api/posts', () => {
    beforeEach(async () => {
      // テスト用の投稿を作成
      const posts = await dbHelper.createManyTestData('Post', 15, (i) => ({
        title: `Post ${i}`,
        content: `Content for post ${i}`,
        status: i % 3 === 0 ? 'draft' : 'published',
        userId: testUser.id
      }));
      
      testPost = posts[0];
    });

    it('should get paginated posts list', async () => {
      const response = await apiHelper.request
        .get('/api/posts')
        .query({ page: 1, limit: 10 });

      const body = apiHelper.expectPagination(response);
      
      expect(body.data).toHaveLength(10);
      expect(body.pagination.total).toBe(15);
      expect(body.pagination.totalPages).toBe(2);
      expect(body.pagination.page).toBe(1);
    });

    it('should filter posts by status', async () => {
      const response = await apiHelper.request
        .get('/api/posts')
        .query({ status: 'published' });

      const body = apiHelper.expectSuccess(response);
      
      body.data.forEach(post => {
        expect(post.status).toBe('published');
      });
    });

    it('should search posts by title', async () => {
      const response = await apiHelper.request
        .get('/api/posts')
        .query({ search: 'Post 1' });

      const body = apiHelper.expectSuccess(response);
      
      expect(body.data.length).toBeGreaterThan(0);
      body.data.forEach(post => {
        expect(post.title).toMatch(/Post 1/);
      });
    });
  });

  describe('GET /api/posts/:id', () => {
    beforeEach(async () => {
      testPost = await dbHelper.createTestData('Post', {
        title: 'Specific Post',
        content: 'Specific content',
        userId: testUser.id
      });
    });

    it('should get a specific post', async () => {
      const response = await apiHelper.request
        .get(`/api/posts/${testPost.id}`);

      const body = apiHelper.expectSuccess(response);
      
      expect(body.post).toMatchObject({
        id: testPost.id,
        title: testPost.title,
        content: testPost.content
      });
    });

    it('should return 404 for non-existent post', async () => {
      const response = await apiHelper.request
        .get('/api/posts/99999');

      apiHelper.expectError(response, 404, 'Post not found');
    });
  });

  describe('PUT /api/posts/:id', () => {
    beforeEach(async () => {
      testPost = await dbHelper.createTestData('Post', {
        title: 'Original Title',
        content: 'Original content',
        userId: testUser.id
      });
    });

    it('should update own post', async () => {
      const updateData = {
        title: 'Updated Title',
        content: 'Updated content'
      };

      const response = await apiHelper.authPut(
        `/api/posts/${testPost.id}`,
        updateData,
        authToken
      );

      const body = apiHelper.expectSuccess(response);
      
      expect(body.post.title).toBe(updateData.title);
      expect(body.post.content).toBe(updateData.content);
      expect(body.post.updatedAt).not.toBe(testPost.updatedAt);
    });

    it('should not update other user\'s post', async () => {
      // 別のユーザーを作成
      const otherAuth = await apiHelper.createAuthenticatedUser({
        username: 'otheruser',
        email: 'other@example.com'
      });

      const response = await apiHelper.authPut(
        `/api/posts/${testPost.id}`,
        { title: 'Hacked Title' },
        otherAuth.token
      );

      apiHelper.expectError(response, 403);
    });
  });

  describe('DELETE /api/posts/:id', () => {
    beforeEach(async () => {
      testPost = await dbHelper.createTestData('Post', {
        title: 'To Be Deleted',
        content: 'Delete me',
        userId: testUser.id
      });
    });

    it('should delete own post', async () => {
      const response = await apiHelper.authDelete(
        `/api/posts/${testPost.id}`,
        authToken
      );

      apiHelper.expectSuccess(response);
      
      // 削除確認
      const checkResponse = await apiHelper.request
        .get(`/api/posts/${testPost.id}`);
      
      apiHelper.expectError(checkResponse, 404);
    });

    it('should not delete other user\'s post', async () => {
      const otherAuth = await apiHelper.createAuthenticatedUser({
        username: 'otheruser2',
        email: 'other2@example.com'
      });

      const response = await apiHelper.authDelete(
        `/api/posts/${testPost.id}`,
        otherAuth.token
      );

      apiHelper.expectError(response, 403);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      const requests = [];
      
      // 短時間に大量のリクエストを送信
      for (let i = 0; i < 20; i++) {
        requests.push(
          apiHelper.request.get('/api/posts')
        );
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.some(res => res.status === 429);
      
      expect(rateLimited).toBe(true);
    });
  });
});