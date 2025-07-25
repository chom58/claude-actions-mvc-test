const { DesignerJob, JobSite } = require('../../src/models');

describe('DesignerJob Model', () => {
  let testJobSite;

  beforeAll(async () => {
    await JobSite.destroy({ where: {} });
    await DesignerJob.destroy({ where: {} });

    testJobSite = await JobSite.create({
      name: 'テストJobSite',
      url: 'https://test-jobsite.com'
    });
  });

  beforeEach(async () => {
    await DesignerJob.destroy({ where: {} });
  });

  describe('DesignerJob creation', () => {
    it('正常にDesignerJobを作成できる', async () => {
      const jobData = {
        title: 'テストUIデザイナー求人',
        company: 'テスト会社',
        description: 'UIデザイナーを募集しています',
        location: '東京都渋谷区',
        salary: '年収400万円〜600万円',
        employment_type: 'full_time',
        experience_level: 'mid',
        is_entry_level_ok: true,
        is_new_grad_ok: false,
        skills_required: ['Figma', 'Photoshop'],
        skills_preferred: ['Sketch', 'Adobe XD'],
        original_url: 'https://test-company.com/job1',
        jobSiteId: testJobSite.id,
        tags: ['リモート可', 'フレックス']
      };

      const designerJob = await DesignerJob.create(jobData);

      expect(designerJob.id).toBeDefined();
      expect(designerJob.title).toBe(jobData.title);
      expect(designerJob.company).toBe(jobData.company);
      expect(designerJob.employment_type).toBe(jobData.employment_type);
      expect(designerJob.experience_level).toBe(jobData.experience_level);
      expect(designerJob.is_entry_level_ok).toBe(jobData.is_entry_level_ok);
      expect(designerJob.is_new_grad_ok).toBe(jobData.is_new_grad_ok);
      expect(designerJob.skills_required).toEqual(jobData.skills_required);
      expect(designerJob.skills_preferred).toEqual(jobData.skills_preferred);
      expect(designerJob.jobSiteId).toBe(testJobSite.id);
      expect(designerJob.tags).toEqual(jobData.tags);
      expect(designerJob.view_count).toBe(0);
      expect(designerJob.click_count).toBe(0);
      expect(designerJob.is_approved).toBe(false);
      expect(designerJob.is_featured).toBe(false);
    });

    it('必須フィールドが不足している場合エラーになる', async () => {
      await expect(DesignerJob.create({
        company: 'テスト会社'
      })).rejects.toThrow();
    });

    it('不正なoriginal_urlの場合エラーになる', async () => {
      await expect(DesignerJob.create({
        title: 'テスト求人',
        company: 'テスト会社',
        original_url: 'invalid-url',
        jobSiteId: testJobSite.id
      })).rejects.toThrow();
    });

    it('存在しないjobSiteIdの場合エラーになる', async () => {
      await expect(DesignerJob.create({
        title: 'テスト求人',
        company: 'テスト会社',
        original_url: 'https://test.com/job',
        jobSiteId: 99999
      })).rejects.toThrow();
    });
  });

  describe('DesignerJob validation', () => {
    it('employment_typeのENUM値以外は受け付けない', async () => {
      await expect(DesignerJob.create({
        title: 'テスト求人',
        company: 'テスト会社',
        original_url: 'https://test.com/job',
        jobSiteId: testJobSite.id,
        employment_type: 'invalid_type'
      })).rejects.toThrow();
    });

    it('experience_levelのENUM値以外は受け付けない', async () => {
      await expect(DesignerJob.create({
        title: 'テスト求人',
        company: 'テスト会社',
        original_url: 'https://test.com/job',
        jobSiteId: testJobSite.id,
        experience_level: 'invalid_level'
      })).rejects.toThrow();
    });

    it('正しいenum値は受け付ける', async () => {
      const employmentTypes = ['full_time', 'part_time', 'contract', 'internship'];
      const experienceLevels = ['entry', 'junior', 'mid', 'senior'];

      for (const employment_type of employmentTypes) {
        const job = await DesignerJob.create({
          title: `テスト求人${employment_type}`,
          company: 'テスト会社',
          original_url: `https://test.com/job-${employment_type}`,
          jobSiteId: testJobSite.id,
          employment_type: employment_type
        });
        expect(job.employment_type).toBe(employment_type);
      }

      for (const experience_level of experienceLevels) {
        const job = await DesignerJob.create({
          title: `テスト求人${experience_level}`,
          company: 'テスト会社',
          original_url: `https://test.com/job-${experience_level}`,
          jobSiteId: testJobSite.id,
          experience_level: experience_level
        });
        expect(job.experience_level).toBe(experience_level);
      }
    });
  });

  describe('DesignerJob associations', () => {
    it('DesignerJobはJobSiteに属する', async () => {
      const designerJob = await DesignerJob.create({
        title: 'アソシエーションテスト求人',
        company: 'アソシエーションテスト会社',
        original_url: 'https://association-test.com/job',
        jobSiteId: testJobSite.id
      });

      const jobWithSite = await DesignerJob.findByPk(designerJob.id, {
        include: [{
          model: JobSite,
          as: 'jobSite'
        }]
      });

      expect(jobWithSite.jobSite).toBeDefined();
      expect(jobWithSite.jobSite.name).toBe(testJobSite.name);
    });
  });

  describe('DesignerJob query and filtering', () => {
    beforeEach(async () => {
      await DesignerJob.bulkCreate([
        {
          title: '未経験歓迎UIデザイナー',
          company: '未経験会社',
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
          original_url: 'https://test2.com/job',
          jobSiteId: testJobSite.id,
          experience_level: 'mid',
          is_entry_level_ok: false,
          is_new_grad_ok: false,
          is_approved: true,
          is_featured: false
        },
        {
          title: '新卒歓迎グラフィックデザイナー',
          company: '新卒会社',
          original_url: 'https://test3.com/job',
          jobSiteId: testJobSite.id,
          experience_level: 'entry',
          is_entry_level_ok: false,
          is_new_grad_ok: true,
          is_approved: false,
          is_featured: false
        }
      ]);
    });

    it('未経験歓迎の求人のみを取得できる', async () => {
      const entryLevelJobs = await DesignerJob.findAll({
        where: { is_entry_level_ok: true, is_approved: true }
      });

      expect(entryLevelJobs).toHaveLength(1);
      expect(entryLevelJobs[0].title).toBe('未経験歓迎UIデザイナー');
    });

    it('新卒歓迎の求人のみを取得できる', async () => {
      const newGradJobs = await DesignerJob.findAll({
        where: { is_new_grad_ok: true, is_approved: true }
      });

      expect(newGradJobs).toHaveLength(1);
      expect(newGradJobs[0].title).toBe('未経験歓迎UIデザイナー');
    });

    it('承認済み求人のみを取得できる', async () => {
      const approvedJobs = await DesignerJob.findAll({
        where: { is_approved: true }
      });

      expect(approvedJobs).toHaveLength(2);
    });

    it('注目求人のみを取得できる', async () => {
      const featuredJobs = await DesignerJob.findAll({
        where: { is_featured: true, is_approved: true }
      });

      expect(featuredJobs).toHaveLength(1);
      expect(featuredJobs[0].title).toBe('未経験歓迎UIデザイナー');
    });

    it('経験レベルでフィルタリングできる', async () => {
      const entryJobs = await DesignerJob.findAll({
        where: { experience_level: 'entry' }
      });

      expect(entryJobs).toHaveLength(2);
    });
  });

  describe('DesignerJob methods', () => {
    it('view_countをインクリメントできる', async () => {
      const job = await DesignerJob.create({
        title: 'ビューカウントテスト',
        company: 'テスト会社',
        original_url: 'https://test.com/job',
        jobSiteId: testJobSite.id
      });

      expect(job.view_count).toBe(0);

      await job.increment('view_count');
      await job.reload();

      expect(job.view_count).toBe(1);
    });

    it('click_countをインクリメントできる', async () => {
      const job = await DesignerJob.create({
        title: 'クリックカウントテスト',
        company: 'テスト会社',
        original_url: 'https://test.com/job',
        jobSiteId: testJobSite.id
      });

      expect(job.click_count).toBe(0);

      await job.increment('click_count');
      await job.reload();

      expect(job.click_count).toBe(1);
    });

    it('承認状態を変更できる', async () => {
      const job = await DesignerJob.create({
        title: '承認テスト',
        company: 'テスト会社',
        original_url: 'https://test.com/job',
        jobSiteId: testJobSite.id
      });

      expect(job.is_approved).toBe(false);

      await job.update({ is_approved: true });

      expect(job.is_approved).toBe(true);
    });
  });
});