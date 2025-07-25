const request = require('supertest');
const app = require('../../src/app');
const { JobSite, DesignerJob, User } = require('../../src/models');
const jwt = require('jsonwebtoken');

describe('Job Site API', () => {
  let testUser;
  let authToken;

  beforeAll(async () => {
    await JobSite.destroy({ where: {} });
    await DesignerJob.destroy({ where: {} });
    await User.destroy({ where: {} });

    testUser = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'TestPassword123!'
    });

    authToken = jwt.sign(
      { userId: testUser.id, username: testUser.username },
      process.env.JWT_SECRET || 'test_secret',
      { expiresIn: '1h' }
    );
  });

  beforeEach(async () => {
    await JobSite.destroy({ where: {} });
    await DesignerJob.destroy({ where: {} });
  });

  describe('GET /api/job-sites', () => {
    beforeEach(async () => {
      await JobSite.bulkCreate([
        {
          name: 'アクティブサイト1',
          url: 'https://active1.com',
          description: 'アクティブなサイト1',
          isActive: true,
          priority: 10,
          category: 'design'
        },
        {
          name: 'アクティブサイト2',
          url: 'https://active2.com',
          description: 'アクティブなサイト2',
          isActive: true,
          priority: 5,
          category: 'creative'
        },
        {
          name: '非アクティブサイト',
          url: 'https://inactive.com',
          description: '非アクティブなサイト',
          isActive: false,
          priority: 8,
          category: 'general'
        }
      ]);
    });

    it('アクティブな求人サイト一覧を取得できる', async () => {
      const response = await request(app)
        .get('/api/job-sites')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body.every(site => site.isActive)).toBe(true);
      expect(response.body[0].priority).toBeGreaterThanOrEqual(response.body[1].priority);
    });

    it('統計情報付きで求人サイト一覧を取得できる', async () => {
      const jobSite = await JobSite.create({
        name: '統計テストサイト',
        url: 'https://stats-test.com',
        isActive: true
      });

      await DesignerJob.bulkCreate([
        {
          title: '求人1',
          company: '会社1',
          original_url: 'https://job1.com',
          jobSiteId: jobSite.id,
          is_entry_level_ok: true,
          is_approved: true
        },
        {
          title: '求人2',
          company: '会社2',
          original_url: 'https://job2.com',
          jobSiteId: jobSite.id,
          is_entry_level_ok: false,
          is_approved: true
        },
        {
          title: '未承認求人',
          company: '会社3',
          original_url: 'https://job3.com',
          jobSiteId: jobSite.id,
          is_approved: false
        }
      ]);

      const response = await request(app)
        .get('/api/job-sites?include_stats=true')
        .expect(200);

      const testSite = response.body.find(site => site.name === '統計テストサイト');
      expect(testSite).toBeDefined();
      expect(testSite.stats.total_jobs).toBe(2);
      expect(testSite.stats.entry_level_jobs).toBe(1);
    });
  });

  describe('GET /api/job-sites/:id', () => {
    it('求人サイト詳細を取得できる', async () => {
      const jobSite = await JobSite.create({
        name: '詳細テストサイト',
        url: 'https://detail-test.com',
        description: '詳細テスト用のサイト',
        isActive: true
      });

      await DesignerJob.create({
        title: 'テスト求人',
        company: 'テスト会社',
        original_url: 'https://test-job.com',
        jobSiteId: jobSite.id,
        is_approved: true
      });

      const response = await request(app)
        .get(`/api/job-sites/${jobSite.id}`)
        .expect(200);

      expect(response.body.id).toBe(jobSite.id);
      expect(response.body.name).toBe('詳細テストサイト');
      expect(response.body.jobs).toHaveLength(1);
      expect(response.body.jobs[0].title).toBe('テスト求人');
    });

    it('存在しない求人サイトIDの場合404エラー', async () => {
      const response = await request(app)
        .get('/api/job-sites/99999')
        .expect(404);

      expect(response.body.message).toContain('求人サイトが見つかりません');
    });
  });

  describe('POST /api/job-sites', () => {
    it('認証済みユーザーは新しい求人サイトを作成できる', async () => {
      const siteData = {
        name: '新規テストサイト',
        url: 'https://new-test-site.com',
        description: '新規作成テスト用のサイト',
        category: 'design',
        priority: 7
      };

      const response = await request(app)
        .post('/api/job-sites')
        .set('Authorization', `Bearer ${authToken}`)
        .send(siteData)
        .expect(201);

      expect(response.body.name).toBe(siteData.name);
      expect(response.body.url).toBe(siteData.url);
      expect(response.body.category).toBe(siteData.category);
      expect(response.body.priority).toBe(siteData.priority);
      expect(response.body.isActive).toBe(true);
    });

    it('認証なしでは求人サイト作成できない', async () => {
      const siteData = {
        name: '認証テストサイト',
        url: 'https://auth-test.com'
      };

      await request(app)
        .post('/api/job-sites')
        .send(siteData)
        .expect(401);
    });

    it('不正なURL形式の場合エラーになる', async () => {
      const siteData = {
        name: '不正URLテストサイト',
        url: 'invalid-url'
      };

      await request(app)
        .post('/api/job-sites')
        .set('Authorization', `Bearer ${authToken}`)
        .send(siteData)
        .expect(500);
    });
  });

  describe('PUT /api/job-sites/:id', () => {
    it('認証済みユーザーは求人サイトを更新できる', async () => {
      const jobSite = await JobSite.create({
        name: '更新前サイト',
        url: 'https://before-update.com',
        description: '更新前の説明'
      });

      const updateData = {
        name: '更新後サイト',
        description: '更新後の説明',
        priority: 9
      };

      const response = await request(app)
        .put(`/api/job-sites/${jobSite.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe('更新後サイト');
      expect(response.body.description).toBe('更新後の説明');
      expect(response.body.priority).toBe(9);
    });

    it('存在しない求人サイトIDの場合404エラー', async () => {
      await request(app)
        .put('/api/job-sites/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'テスト' })
        .expect(404);
    });
  });

  describe('DELETE /api/job-sites/:id', () => {
    it('関連する求人がない場合、求人サイトを削除できる', async () => {
      const jobSite = await JobSite.create({
        name: '削除テストサイト',
        url: 'https://delete-test.com'
      });

      const response = await request(app)
        .delete(`/api/job-sites/${jobSite.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.message).toContain('求人サイトが削除されました');

      const deletedSite = await JobSite.findByPk(jobSite.id);
      expect(deletedSite).toBeNull();
    });

    it('関連する求人がある場合、削除できない', async () => {
      const jobSite = await JobSite.create({
        name: '関連求人ありサイト',
        url: 'https://has-jobs.com'
      });

      await DesignerJob.create({
        title: '関連求人',
        company: '関連会社',
        original_url: 'https://related-job.com',
        jobSiteId: jobSite.id
      });

      const response = await request(app)
        .delete(`/api/job-sites/${jobSite.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.message).toContain('関連する求人が存在するため削除できません');
    });

    it('存在しない求人サイトIDの場合404エラー', async () => {
      await request(app)
        .delete('/api/job-sites/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('PATCH /api/job-sites/:id/toggle-active', () => {
    it('求人サイトのアクティブ状態を切り替えできる', async () => {
      const jobSite = await JobSite.create({
        name: 'アクティブ切り替えテストサイト',
        url: 'https://toggle-test.com',
        isActive: true
      });

      const response = await request(app)
        .patch(`/api/job-sites/${jobSite.id}/toggle-active`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.message).toContain('非アクティブにしました');
      expect(response.body.jobSite.isActive).toBe(false);

      const secondResponse = await request(app)
        .patch(`/api/job-sites/${jobSite.id}/toggle-active`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(secondResponse.body.message).toContain('アクティブにしました');
      expect(secondResponse.body.jobSite.isActive).toBe(true);
    });

    it('存在しない求人サイトIDの場合404エラー', async () => {
      await request(app)
        .patch('/api/job-sites/99999/toggle-active')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });
});