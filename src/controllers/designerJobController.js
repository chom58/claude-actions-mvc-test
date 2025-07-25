const { DesignerJob, JobSite } = require('../models');
const { Op } = require('sequelize');
const asyncHandler = require('../utils/asyncHandler');
const { ValidationError, NotFoundError } = require('../utils/errorTypes');

const designerJobController = {
  getAllJobs: asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 20,
      experience_level,
      employment_type,
      is_entry_level_ok,
      is_new_grad_ok,
      job_site,
      search,
      sort = 'created_at',
      order = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    const where = { is_approved: true };

    if (experience_level) {
      where.experience_level = experience_level;
    }

    if (employment_type) {
      where.employment_type = employment_type;
    }

    if (is_entry_level_ok === 'true') {
      where.is_entry_level_ok = true;
    }

    if (is_new_grad_ok === 'true') {
      where.is_new_grad_ok = true;
    }

    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { company: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    const include = [{
      model: JobSite,
      as: 'jobSite',
      attributes: ['id', 'name', 'url', 'logo']
    }];

    if (job_site) {
      include[0].where = { name: job_site };
    }

    const { count, rows } = await DesignerJob.findAndCountAll({
      where,
      include,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sort, order.toUpperCase()]],
      distinct: true
    });

    res.json({
      jobs: rows,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(count / limit),
        total_count: count,
        limit: parseInt(limit)
      }
    });
  }),

  getJobById: asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const job = await DesignerJob.findByPk(id, {
      include: [{
        model: JobSite,
        as: 'jobSite'
      }]
    });

    if (!job) {
      throw new NotFoundError('求人が見つかりません');
    }

    await job.increment('view_count');

    res.json(job);
  }),

  getEntryLevelStats: asyncHandler(async (req, res) => {
    const totalJobs = await DesignerJob.count({ where: { is_approved: true } });
    const entryLevelJobs = await DesignerJob.count({ 
      where: { is_approved: true, is_entry_level_ok: true } 
    });
    const newGradJobs = await DesignerJob.count({ 
      where: { is_approved: true, is_new_grad_ok: true } 
    });

    const jobSiteStats = await DesignerJob.findAll({
      attributes: [
        'jobSiteId',
        [DesignerJob.sequelize.fn('COUNT', '*'), 'job_count'],
        [DesignerJob.sequelize.fn('SUM', DesignerJob.sequelize.col('is_entry_level_ok')), 'entry_level_count']
      ],
      include: [{
        model: JobSite,
        as: 'jobSite',
        attributes: ['name']
      }],
      where: { is_approved: true },
      group: ['jobSiteId', 'jobSite.id'],
      raw: false
    });

    res.json({
      total_jobs: totalJobs,
      entry_level_jobs: entryLevelJobs,
      new_grad_jobs: newGradJobs,
      entry_level_percentage: totalJobs > 0 ? Math.round((entryLevelJobs / totalJobs) * 100) : 0,
      job_site_stats: jobSiteStats
    });
  }),

  getFeaturedJobs: asyncHandler(async (req, res) => {
    const { limit = 10 } = req.query;

    const jobs = await DesignerJob.findAll({
      where: { 
        is_approved: true, 
        is_featured: true 
      },
      include: [{
        model: JobSite,
        as: 'jobSite',
        attributes: ['id', 'name', 'url', 'logo']
      }],
      limit: parseInt(limit),
      order: [['created_at', 'DESC']]
    });

    res.json(jobs);
  }),

  trackClick: asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const job = await DesignerJob.findByPk(id);
    if (!job) {
      throw new NotFoundError('求人が見つかりません');
    }

    await job.increment('click_count');

    res.json({ 
      message: 'クリックを記録しました',
      redirect_url: job.original_url
    });
  }),

  createJob: asyncHandler(async (req, res) => {
    const job = await DesignerJob.create(req.body);
    res.status(201).json(job);
  }),

  updateJob: asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const job = await DesignerJob.findByPk(id);
    if (!job) {
      throw new NotFoundError('求人が見つかりません');
    }

    await job.update(req.body);
    res.json(job);
  }),

  deleteJob: asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const job = await DesignerJob.findByPk(id);
    if (!job) {
      throw new NotFoundError('求人が見つかりません');
    }

    await job.destroy();
    res.json({ message: '求人が削除されました' });
  }),

  approveJob: asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const job = await DesignerJob.findByPk(id);
    if (!job) {
      throw new NotFoundError('求人が見つかりません');
    }

    await job.update({ is_approved: true });
    res.json({ message: '求人が承認されました', job });
  })
};

module.exports = designerJobController;