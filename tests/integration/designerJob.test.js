const request = require('supertest');
const app = require('../../src/app');
const { DesignerJob, JobSite, User } = require('../../src/models');
const jwt = require('jsonwebtoken');

describe('Designer Job API', () => {
  let testJobSite;
  let testUser;
  let authToken;

  beforeAll(async () => {
    await JobSite.destroy({ where: {} });
    await DesignerJob.destroy({ where: {} });
    await User.destroy({ where: {} });

    testJobSite = await JobSite.create({
      name: 'テスト求人サイト',
      url: 'https://test-site.com'
    });

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
    await DesignerJob.destroy({ where: {} });
  });

  describe('GET /api/designer-jobs', () => {
    beforeEach(async () => {
      await DesignerJob.bulkCreate([
        {
          title: '未経験歓迎UIデザイナー',
          company: '未経験会社',
          description: 'UIデザインを担当していただきます',
          location: '東京都渋谷区',
          salary: '年収300万円〜450万円',
          original_url: 'https://test1.com/job',
          jobSiteId: testJobSite.id,
          experience_level: 'entry',
          is_entry_level_ok: true,
          is_new_grad_ok: true,
          is_approved: true,
          is_featured: true
        },
        {
          title: '経験者向けWebデザイナー',
          company: '経験者会社',
          description: 'Webサイトのデザインを担当',
          location: '大阪府大阪市',
          salary: '年収400万円〜600万円',
          original_url: 'https://test2.com/job',
          jobSiteId: testJobSite.id,
          experience_level: 'mid',
          is_entry_level_ok: false,
          is_new_grad_ok: false,
          is_approved: true,
          is_featured: false
        },
        {
          title: '未承認の求人',
          company: '未承認会社',
          description: 'この求人は未承認です',
          original_url: 'https://test3.com/job',
          jobSiteId: testJobSite.id,
          is_approved: false
        }
      ]);
    });

    it('承認済みの求人一覧を取得できる', async () => {
      const response = await request(app)
        .get('/api/designer-jobs')
        .expect(200);

      expect(response.body.jobs).toHaveLength(2);
      expect(response.body.pagination.total_count).toBe(2);
      expect(response.body.jobs.every(job => job.is_approved)).toBe(true);
    });

    it('未経験歓迎の求人のみをフィルタリングできる', async () => {
      const response = await request(app)
        .get('/api/designer-jobs?is_entry_level_ok=true')
        .expect(200);

      expect(response.body.jobs).toHaveLength(1);
      expect(response.body.jobs[0].title).toBe('未経験歓迎UIデザイナー');
    });

    it('新卒歓迎の求人のみをフィルタリングできる', async () => {
      const response = await request(app)
        .get('/api/designer-jobs?is_new_grad_ok=true')
        .expect(200);

      expect(response.body.jobs).toHaveLength(1);
      expect(response.body.jobs[0].title).toBe('未経験歓迎UIデザイナー');
    });

    it('経験レベルでフィルタリングできる', async () => {
      const response = await request(app)
        .get('/api/designer-jobs?experience_level=entry')
        .expect(200);

      expect(response.body.jobs).toHaveLength(1);
      expect(response.body.jobs[0].experience_level).toBe('entry');
    });

    it('検索キーワードで求人を検索できる', async () => {
      const response = await request(app)
        .get('/api/designer-jobs?search=UI')
        .expect(200);

      expect(response.body.jobs).toHaveLength(1);
      expect(response.body.jobs[0].title).toContain('UI');
    });

    it('ページネーションが正しく動作する', async () => {
      const response = await request(app)
        .get('/api/designer-jobs?page=1&limit=1')
        .expect(200);

      expect(response.body.jobs).toHaveLength(1);
      expect(response.body.pagination.current_page).toBe(1);
      expect(response.body.pagination.total_pages).toBe(2);
      expect(response.body.pagination.limit).toBe(1);
    });
  });

  describe('GET /api/designer-jobs/:id', () => {
    it('求人詳細を取得できる', async () => {
      const job = await DesignerJob.create({
        title: '詳細テスト求人',
        company: '詳細テスト会社',
        description: '詳細なデザイナー求人です',
        original_url: 'https://detail-test.com/job',
        jobSiteId: testJobSite.id,
        is_approved: true
      });

      const response = await request(app)
        .get(`/api/designer-jobs/${job.id}`)
        .expect(200);

      expect(response.body.id).toBe(job.id);
      expect(response.body.title).toBe('詳細テスト求人');
      expect(response.body.jobSite).toBeDefined();
      expect(response.body.jobSite.name).toBe(testJobSite.name);
    });

    it('求人を閲覧するとview_countが増加する', async () => {
      const job = await DesignerJob.create({
        title: 'ビューカウントテスト',
        company: 'ビューカウントテスト会社',
        original_url: 'https://view-test.com/job',
        jobSiteId: testJobSite.id,
        view_count: 0
      });

      await request(app)
        .get(`/api/designer-jobs/${job.id}`)
        .expect(200);

      await job.reload();
      expect(job.view_count).toBe(1);
    });

    it('存在しない求人IDの場合404エラー', async () => {
      const response = await request(app)
        .get('/api/designer-jobs/99999')
        .expect(404);

      expect(response.body.message).toContain('求人が見つかりません');
    });
  });

  describe('GET /api/designer-jobs/stats/entry-level', () => {
    beforeEach(async () => {
      await DesignerJob.bulkCreate([
        {
          title: '未経験1',
          company: '会社1',
          original_url: 'https://test1.com/job',
          jobSiteId: testJobSite.id,
          is_entry_level_ok: true,
          is_new_grad_ok: true,
          is_approved: true
        },
        {
          title: '未経験2',
          company: '会社2',
          original_url: 'https://test2.com/job',
          jobSiteId: testJobSite.id,
          is_entry_level_ok: true,
          is_new_grad_ok: false,
          is_approved: true
        },
        {
          title: '経験者',
          company: '会社3',
          original_url: 'https://test3.com/job',
          jobSiteId: testJobSite.id,
          is_entry_level_ok: false,
          is_new_grad_ok: false,
          is_approved: true
        }
      ]);
    });

    it('未経験歓迎求人の統計を取得できる', async () => {
      const response = await request(app)
        .get('/api/designer-jobs/stats/entry-level')
        .expect(200);

      expect(response.body.total_jobs).toBe(3);
      expect(response.body.entry_level_jobs).toBe(2);
      expect(response.body.new_grad_jobs).toBe(1);
      expect(response.body.entry_level_percentage).toBe(67); // 2/3 * 100 = 66.7 rounded to 67
    });
  });

  describe('GET /api/designer-jobs/featured/list', () => {
    beforeEach(async () => {
      await DesignerJob.bulkCreate([
        {
          title: 'おすすめ求人1',
          company: 'おすすめ会社1',
          original_url: 'https://featured1.com/job',
          jobSiteId: testJobSite.id,
          is_approved: true,
          is_featured: true
        },
        {
          title: 'おすすめ求人2',
          company: 'おすすめ会社2',
          original_url: 'https://featured2.com/job',
          jobSiteId: testJobSite.id,
          is_approved: true,
          is_featured: true
        },
        {
          title: '通常求人',
          company: '通常会社',
          original_url: 'https://normal.com/job',
          jobSiteId: testJobSite.id,
          is_approved: true,
          is_featured: false
        }
      ]);
    });

    it('おすすめ求人一覧を取得できる', async () => {
      const response = await request(app)
        .get('/api/designer-jobs/featured/list')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body.every(job => job.is_featured)).toBe(true);
      expect(response.body.every(job => job.is_approved)).toBe(true);
    });

    it('件数制限が正しく動作する', async () => {
      const response = await request(app)
        .get('/api/designer-jobs/featured/list?limit=1')
        .expect(200);

      expect(response.body).toHaveLength(1);
    });
  });

  describe('POST /api/designer-jobs/:id/click', () => {
    it('求人のクリック数を増加できる', async () => {
      const job = await DesignerJob.create({
        title: 'クリックテスト求人',
        company: 'クリックテスト会社',
        original_url: 'https://click-test.com/job',
        jobSiteId: testJobSite.id,
        click_count: 0
      });

      const response = await request(app)
        .post(`/api/designer-jobs/${job.id}/click`)
        .expect(200);

      expect(response.body.message).toContain('クリックを記録しました');
      expect(response.body.redirect_url).toBe(job.original_url);

      await job.reload();
      expect(job.click_count).toBe(1);
    });

    it('存在しない求人IDの場合404エラー', async () => {
      const response = await request(app)
        .post('/api/designer-jobs/99999/click')
        .expect(404);

      expect(response.body.message).toContain('求人が見つかりません');
    });
  });

  describe('POST /api/designer-jobs', () => {
    it('認証済みユーザーは新しい求人を作成できる', async () => {
      const jobData = {
        title: '新規作成テスト求人',
        company: '新規作成テスト会社',
        description: 'テスト用の新規求人です',
        original_url: 'https://new-job.com/job',
        jobSiteId: testJobSite.id,
        is_entry_level_ok: true
      };

      const response = await request(app)
        .post('/api/designer-jobs')
        .set('Authorization', `Bearer ${authToken}`)
        .send(jobData)
        .expect(201);

      expect(response.body.title).toBe(jobData.title);
      expect(response.body.company).toBe(jobData.company);
      expect(response.body.is_entry_level_ok).toBe(true);
    });

    it('認証なしでは求人作成できない', async () => {
      const jobData = {
        title: '認証テスト求人',
        company: '認証テスト会社',
        original_url: 'https://auth-test.com/job',
        jobSiteId: testJobSite.id
      };

      await request(app)
        .post('/api/designer-jobs')
        .send(jobData)
        .expect(401);
    });
  });

  describe('PUT /api/designer-jobs/:id', () => {
    it('認証済みユーザーは求人を更新できる', async () => {
      const job = await DesignerJob.create({
        title: '更新前タイトル',
        company: '更新前会社',
        original_url: 'https://update-test.com/job',
        jobSiteId: testJobSite.id
      });

      const updateData = {
        title: '更新後タイトル',
        company: '更新後会社'
      };

      const response = await request(app)
        .put(`/api/designer-jobs/${job.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.title).toBe('更新後タイトル');
      expect(response.body.company).toBe('更新後会社');
    });

    it('存在しない求人IDの場合404エラー', async () => {
      await request(app)
        .put('/api/designer-jobs/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'テスト' })
        .expect(404);
    });
  });

  describe('DELETE /api/designer-jobs/:id', () => {
    it('認証済みユーザーは求人を削除できる', async () => {
      const job = await DesignerJob.create({
        title: '削除テスト求人',
        company: '削除テスト会社',
        original_url: 'https://delete-test.com/job',
        jobSiteId: testJobSite.id
      });

      const response = await request(app)
        .delete(`/api/designer-jobs/${job.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.message).toContain('求人が削除されました');

      const deletedJob = await DesignerJob.findByPk(job.id);
      expect(deletedJob).toBeNull();
    });
  });

  describe('PATCH /api/designer-jobs/:id/approve', () => {
    it('認証済みユーザーは求人を承認できる', async () => {
      const job = await DesignerJob.create({
        title: '承認テスト求人',
        company: '承認テスト会社',
        original_url: 'https://approve-test.com/job',
        jobSiteId: testJobSite.id,
        is_approved: false
      });

      const response = await request(app)
        .patch(`/api/designer-jobs/${job.id}/approve`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.message).toContain('求人が承認されました');
      expect(response.body.job.is_approved).toBe(true);
    });
  });
});