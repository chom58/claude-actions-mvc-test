const { JobSite, DesignerJob } = require('../models');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const asyncHandler = require('../utils/asyncHandler');

/**
 * 求人サイト一覧を取得
 */
exports.getJobSites = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    category = 'all',
    isActive = 'true',
    sortBy = 'priority',
    sortOrder = 'DESC'
  } = req.query;

  const offset = (page - 1) * limit;
  
  const whereConditions = {};

  // アクティブフィルタ
  if (isActive !== 'all') {
    whereConditions.isActive = isActive === 'true';
  }

  // カテゴリフィルタ
  if (category !== 'all') {
    whereConditions.category = category;
  }

  const { count, rows } = await JobSite.findAndCountAll({
    where: whereConditions,
    include: [
      {
        model: DesignerJob,
        as: 'jobs',
        attributes: ['id'],
        where: {
          isActive: true,
          status: 'approved'
        },
        required: false
      }
    ],
    order: [[sortBy, sortOrder.toUpperCase()]],
    limit: parseInt(limit),
    offset: parseInt(offset),
    distinct: true
  });

  // 各サイトの求人数を計算
  const sitesWithJobCount = rows.map(site => ({
    ...site.toJSON(),
    jobCount: site.jobs ? site.jobs.length : 0,
    jobs: undefined // jobs配列は除外
  }));

  const totalPages = Math.ceil(count / limit);

  res.json({
    success: true,
    data: {
      jobSites: sitesWithJobCount,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalSites: count,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      filters: {
        category,
        isActive
      }
    }
  });
});

/**
 * 求人サイト詳細を取得
 */
exports.getJobSiteById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const jobSite = await JobSite.findByPk(id, {
    include: [
      {
        model: DesignerJob,
        as: 'jobs',
        where: {
          isActive: true,
          status: 'approved'
        },
        required: false,
        order: [['createdAt', 'DESC']],
        limit: 10
      }
    ]
  });

  if (!jobSite) {
    return res.status(404).json({
      success: false,
      error: '求人サイトが見つかりません'
    });
  }

  const totalJobs = await DesignerJob.count({
    where: {
      jobSiteId: id,
      isActive: true,
      status: 'approved'
    }
  });

  const experienceWelcomeJobs = await DesignerJob.count({
    where: {
      jobSiteId: id,
      isExperienceWelcome: true,
      isActive: true,
      status: 'approved'
    }
  });

  const newGraduateWelcomeJobs = await DesignerJob.count({
    where: {
      jobSiteId: id,
      isNewGraduateWelcome: true,
      isActive: true,
      status: 'approved'
    }
  });

  const siteData = {
    ...jobSite.toJSON(),
    stats: {
      totalJobs,
      experienceWelcomeJobs,
      newGraduateWelcomeJobs,
      entryLevelPercentage: totalJobs > 0 ? Math.round((experienceWelcomeJobs / totalJobs) * 100) : 0
    }
  };

  res.json({
    success: true,
    data: siteData
  });
});

/**
 * 求人サイトを作成（管理者のみ）
 */
exports.createJobSite = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const { domain } = req.body;

  // ドメインの重複チェック
  const existingSite = await JobSite.findOne({
    where: { domain }
  });

  if (existingSite) {
    return res.status(400).json({
      success: false,
      error: 'このドメインは既に登録されています'
    });
  }

  const jobSite = await JobSite.create(req.body);

  res.status(201).json({
    success: true,
    message: '求人サイトが作成されました',
    data: jobSite
  });
});

/**
 * 求人サイトを更新（管理者のみ）
 */
exports.updateJobSite = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const { id } = req.params;
  const updateData = req.body;

  const jobSite = await JobSite.findByPk(id);

  if (!jobSite) {
    return res.status(404).json({
      success: false,
      error: '求人サイトが見つかりません'
    });
  }

  // ドメインを変更する場合の重複チェック
  if (updateData.domain && updateData.domain !== jobSite.domain) {
    const existingSite = await JobSite.findOne({
      where: { 
        domain: updateData.domain,
        id: { [Op.ne]: id }
      }
    });

    if (existingSite) {
      return res.status(400).json({
        success: false,
        error: 'このドメインは既に登録されています'
      });
    }
  }

  await jobSite.update(updateData);

  res.json({
    success: true,
    message: '求人サイトが更新されました',
    data: jobSite
  });
});

/**
 * 求人サイトを削除（管理者のみ）
 */
exports.deleteJobSite = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const jobSite = await JobSite.findByPk(id);

  if (!jobSite) {
    return res.status(404).json({
      success: false,
      error: '求人サイトが見つかりません'
    });
  }

  // 関連する求人があるかチェック
  const relatedJobsCount = await DesignerJob.count({
    where: { jobSiteId: id }
  });

  if (relatedJobsCount > 0) {
    return res.status(400).json({
      success: false,
      error: `このサイトには ${relatedJobsCount} 件の求人があります。先に求人を削除してください。`
    });
  }

  await jobSite.destroy();

  res.json({
    success: true,
    message: '求人サイトが削除されました'
  });
});

/**
 * 求人サイトのアクティブ状態を切り替え（管理者のみ）
 */
exports.toggleActiveStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const jobSite = await JobSite.findByPk(id);

  if (!jobSite) {
    return res.status(404).json({
      success: false,
      error: '求人サイトが見つかりません'
    });
  }

  await jobSite.update({
    isActive: !jobSite.isActive
  });

  res.json({
    success: true,
    message: `求人サイトが${jobSite.isActive ? 'アクティブ' : '非アクティブ'}になりました`,
    data: jobSite
  });
});

/**
 * 求人サイトの統計を取得
 */
exports.getJobSiteStats = asyncHandler(async (req, res) => {
  const totalSites = await JobSite.count();
  const activeSites = await JobSite.count({
    where: { isActive: true }
  });

  const categoryStats = await JobSite.findAll({
    attributes: [
      'category',
      [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
    ],
    group: 'category',
    order: [[require('sequelize').fn('COUNT', require('sequelize').col('id')), 'DESC']]
  });

  // 各サイトの求人数ランキング
  const siteJobCounts = await JobSite.findAll({
    attributes: [
      'id',
      'name',
      'domain',
      [require('sequelize').fn('COUNT', require('sequelize').col('jobs.id')), 'jobCount']
    ],
    include: [
      {
        model: DesignerJob,
        as: 'jobs',
        attributes: [],
        where: {
          isActive: true,
          status: 'approved'
        },
        required: false
      }
    ],
    where: { isActive: true },
    group: ['JobSite.id'],
    order: [[require('sequelize').fn('COUNT', require('sequelize').col('jobs.id')), 'DESC']],
    limit: 10
  });

  res.json({
    success: true,
    data: {
      totalSites,
      activeSites,
      inactiveSites: totalSites - activeSites,
      categoryStats,
      topSitesByJobs: siteJobCounts
    }
  });
});

/**
 * 人気の求人サイト一覧を取得（求人数順）
 */
exports.getPopularJobSites = asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;

  const sites = await JobSite.findAll({
    attributes: [
      'id',
      'name',
      'domain',
      'baseUrl',
      'logoUrl',
      'category',
      'description',
      [require('sequelize').fn('COUNT', require('sequelize').col('jobs.id')), 'jobCount']
    ],
    include: [
      {
        model: DesignerJob,
        as: 'jobs',
        attributes: [],
        where: {
          [Op.or]: [
            { isExperienceWelcome: true },
            { isNewGraduateWelcome: true }
          ],
          isActive: true,
          status: 'approved'
        },
        required: false
      }
    ],
    where: { isActive: true },
    group: ['JobSite.id'],
    having: require('sequelize').where(
      require('sequelize').fn('COUNT', require('sequelize').col('jobs.id')),
      '>',
      0
    ),
    order: [[require('sequelize').fn('COUNT', require('sequelize').col('jobs.id')), 'DESC']],
    limit: parseInt(limit)
  });

  res.json({
    success: true,
    data: sites
  });
});