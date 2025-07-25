const { JobSite, DesignerJob } = require('../../src/models');

describe('JobSite Model', () => {
  beforeEach(async () => {
    await JobSite.destroy({ where: {} });
    await DesignerJob.destroy({ where: {} });
  });

  describe('JobSite creation', () => {
    it('正常にJobSiteを作成できる', async () => {
      const jobSiteData = {
        name: 'テスト求人サイト',
        url: 'https://test-site.com',
        description: 'テスト用の求人サイトです',
        category: 'design',
        priority: 5
      };

      const jobSite = await JobSite.create(jobSiteData);

      expect(jobSite.id).toBeDefined();
      expect(jobSite.name).toBe(jobSiteData.name);
      expect(jobSite.url).toBe(jobSiteData.url);
      expect(jobSite.description).toBe(jobSiteData.description);
      expect(jobSite.category).toBe(jobSiteData.category);
      expect(jobSite.priority).toBe(jobSiteData.priority);
      expect(jobSite.isActive).toBe(true); // デフォルト値
    });

    it('必須フィールドが不足している場合エラーになる', async () => {
      await expect(JobSite.create({
        description: 'テスト'
      })).rejects.toThrow();
    });

    it('不正なURLの場合エラーになる', async () => {
      await expect(JobSite.create({
        name: 'テストサイト',
        url: 'invalid-url'
      })).rejects.toThrow();
    });

    it('同じ名前のJobSiteは作成できない', async () => {
      const jobSiteData = {
        name: '重複テストサイト',
        url: 'https://test1.com'
      };

      await JobSite.create(jobSiteData);

      await expect(JobSite.create({
        name: '重複テストサイト',
        url: 'https://test2.com'
      })).rejects.toThrow();
    });
  });

  describe('JobSite associations', () => {
    it('JobSiteは複数のDesignerJobを持つことができる', async () => {
      const jobSite = await JobSite.create({
        name: 'アソシエーションテストサイト',
        url: 'https://association-test.com'
      });

      const job1 = await DesignerJob.create({
        title: 'テストデザイナー求人1',
        company: 'テスト会社1',
        original_url: 'https://test1.com/job1',
        jobSiteId: jobSite.id
      });

      const job2 = await DesignerJob.create({
        title: 'テストデザイナー求人2',
        company: 'テスト会社2',
        original_url: 'https://test2.com/job2',
        jobSiteId: jobSite.id
      });

      const jobSiteWithJobs = await JobSite.findByPk(jobSite.id, {
        include: [{
          model: DesignerJob,
          as: 'jobs'
        }]
      });

      expect(jobSiteWithJobs.jobs).toHaveLength(2);
      expect(jobSiteWithJobs.jobs.map(job => job.id).sort()).toEqual([job1.id, job2.id].sort());
    });
  });

  describe('JobSite validation', () => {
    it('カテゴリのENUM値以外は受け付けない', async () => {
      await expect(JobSite.create({
        name: 'カテゴリテストサイト',
        url: 'https://category-test.com',
        category: 'invalid_category'
      })).rejects.toThrow();
    });

    it('正しいカテゴリ値は受け付ける', async () => {
      const categories = ['design', 'creative', 'general'];
      
      for (const category of categories) {
        const jobSite = await JobSite.create({
          name: `${category}テストサイト`,
          url: `https://${category}-test.com`,
          category: category
        });
        
        expect(jobSite.category).toBe(category);
      }
    });
  });

  describe('JobSite query', () => {
    beforeEach(async () => {
      await JobSite.bulkCreate([
        {
          name: 'アクティブサイト1',
          url: 'https://active1.com',
          isActive: true,
          priority: 10
        },
        {
          name: 'アクティブサイト2',
          url: 'https://active2.com',
          isActive: true,
          priority: 5
        },
        {
          name: '非アクティブサイト',
          url: 'https://inactive.com',
          isActive: false,
          priority: 8
        }
      ]);
    });

    it('アクティブなサイトのみを取得できる', async () => {
      const activeSites = await JobSite.findAll({
        where: { isActive: true },
        order: [['priority', 'DESC']]
      });

      expect(activeSites).toHaveLength(2);
      expect(activeSites[0].name).toBe('アクティブサイト1');
      expect(activeSites[1].name).toBe('アクティブサイト2');
    });

    it('優先度順でソートできる', async () => {
      const sites = await JobSite.findAll({
        order: [['priority', 'DESC']]
      });

      expect(sites[0].priority).toBe(10);
      expect(sites[1].priority).toBe(8);
      expect(sites[2].priority).toBe(5);
    });
  });
});