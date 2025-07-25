const { JobSite, DesignerJob } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { ValidationError, NotFoundError } = require('../utils/errorTypes');

const jobSiteController = {
  getAllJobSites: asyncHandler(async (req, res) => {
    const { include_stats } = req.query;

    const jobSites = await JobSite.findAll({
      where: { isActive: true },
      order: [['priority', 'DESC'], ['name', 'ASC']]
    });

    if (include_stats === 'true') {
      const sitesWithStats = await Promise.all(
        jobSites.map(async (site) => {
          const jobCount = await DesignerJob.count({
            where: { jobSiteId: site.id, is_approved: true }
          });
          const entryLevelCount = await DesignerJob.count({
            where: { 
              jobSiteId: site.id, 
              is_approved: true,
              is_entry_level_ok: true 
            }
          });

          return {
            ...site.toJSON(),
            stats: {
              total_jobs: jobCount,
              entry_level_jobs: entryLevelCount
            }
          };
        })
      );
      return res.json(sitesWithStats);
    }

    res.json(jobSites);
  }),

  getJobSiteById: asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const jobSite = await JobSite.findByPk(id, {
      include: [{
        model: DesignerJob,
        as: 'jobs',
        where: { is_approved: true },
        required: false,
        limit: 10,
        order: [['created_at', 'DESC']]
      }]
    });

    if (!jobSite) {
      throw new NotFoundError('求人サイトが見つかりません');
    }

    res.json(jobSite);
  }),

  createJobSite: asyncHandler(async (req, res) => {
    const jobSite = await JobSite.create(req.body);
    res.status(201).json(jobSite);
  }),

  updateJobSite: asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const jobSite = await JobSite.findByPk(id);
    if (!jobSite) {
      throw new NotFoundError('求人サイトが見つかりません');
    }

    await jobSite.update(req.body);
    res.json(jobSite);
  }),

  deleteJobSite: asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const jobSite = await JobSite.findByPk(id);
    if (!jobSite) {
      throw new NotFoundError('求人サイトが見つかりません');
    }

    const jobCount = await DesignerJob.count({ where: { jobSiteId: id } });
    if (jobCount > 0) {
      throw new ValidationError('このサイトに関連する求人が存在するため削除できません');
    }

    await jobSite.destroy();
    res.json({ message: '求人サイトが削除されました' });
  }),

  toggleActive: asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const jobSite = await JobSite.findByPk(id);
    if (!jobSite) {
      throw new NotFoundError('求人サイトが見つかりません');
    }

    await jobSite.update({ isActive: !jobSite.isActive });
    res.json({ 
      message: `求人サイトを${jobSite.isActive ? 'アクティブ' : '非アクティブ'}にしました`,
      jobSite 
    });
  })
};

module.exports = jobSiteController;