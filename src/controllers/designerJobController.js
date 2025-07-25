const { DesignerJob, JobSite, User } = require('../models');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const asyncHandler = require('../utils/asyncHandler');

/**
 * 求人一覧を取得（未経験歓迎フィルタあり）
 */
exports.getJobs = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    experience = 'all', // 'entry_level', 'new_graduate', 'all'
    jobType = 'all',
    location,
    isRemoteOk,
    designCategories,
    tools,
    sortBy = 'createdAt',
    sortOrder = 'DESC',
    featured = false
  } = req.query;

  const offset = (page - 1) * limit;
  
  // 基本の検索条件
  const whereConditions = {
    isActive: true,
    status: 'approved'
  };

  // 未経験歓迎フィルタ
  if (experience === 'entry_level') {
    whereConditions.isExperienceWelcome = true;
  } else if (experience === 'new_graduate') {
    whereConditions.isNewGraduateWelcome = true;
  } else if (experience === 'both') {
    whereConditions[Op.or] = [
      { isExperienceWelcome: true },
      { isNewGraduateWelcome: true }
    ];
  }

  // 雇用形態フィルタ
  if (jobType !== 'all') {
    whereConditions.jobType = jobType;
  }

  // 勤務地フィルタ
  if (location) {
    whereConditions.location = {
      [Op.like]: `%${location}%`
    };
  }

  // リモートワークフィルタ
  if (isRemoteOk === 'true') {
    whereConditions.isRemoteOk = true;
  }

  // デザインカテゴリフィルタ
  if (designCategories) {
    const categories = Array.isArray(designCategories) ? designCategories : [designCategories];
    whereConditions.designCategories = {
      [Op.overlap]: categories
    };
  }

  // ツールフィルタ
  if (tools) {
    const toolsList = Array.isArray(tools) ? tools : [tools];
    whereConditions.tools = {
      [Op.overlap]: toolsList
    };
  }

  // おすすめ求人フィルタ
  if (featured === 'true') {
    whereConditions.isFeatured = true;
  }

  const { count, rows } = await DesignerJob.findAndCountAll({
    where: whereConditions,
    include: [
      {
        model: JobSite,
        as: 'jobSite',
        attributes: ['id', 'name', 'domain', 'logoUrl', 'category']
      }
    ],
    order: [[sortBy, sortOrder.toUpperCase()]],
    limit: parseInt(limit),
    offset: parseInt(offset),
    distinct: true
  });

  const totalPages = Math.ceil(count / limit);

  res.json({
    success: true,
    data: {
      jobs: rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalJobs: count,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      filters: {
        experience,
        jobType,
        location,
        isRemoteOk,
        designCategories,
        tools,
        featured
      }
    }
  });
});

/**
 * 求人詳細を取得
 */
exports.getJobById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const job = await DesignerJob.findOne({
    where: {
      id,
      isActive: true,
      status: 'approved'
    },
    include: [
      {
        model: JobSite,
        as: 'jobSite',
        attributes: ['id', 'name', 'domain', 'baseUrl', 'logoUrl', 'category', 'description']
      },
      {
        model: User,
        as: 'approver',
        attributes: ['id', 'username']
      }
    ]
  });

  if (!job) {
    return res.status(404).json({
      success: false,
      error: '求人が見つかりません'
    });
  }

  // 閲覧数を増加
  await job.increment('viewCount');

  res.json({
    success: true,
    data: job
  });
});

/**
 * 求人クリック数を増加（外部サイトへのリダイレクト時）
 */
exports.trackClick = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const job = await DesignerJob.findOne({
    where: {
      id,
      isActive: true,
      status: 'approved'
    }
  });

  if (!job) {
    return res.status(404).json({
      success: false,
      error: '求人が見つかりません'
    });
  }

  // クリック数を増加
  await job.increment('clickCount');

  res.json({
    success: true,
    data: {
      redirectUrl: job.originalUrl
    }
  });
});

/**
 * 求人を作成（管理者のみ）
 */
exports.createJob = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const jobData = {
    ...req.body,
    status: 'pending_review'
  };

  const job = await DesignerJob.create(jobData);

  const jobWithSite = await DesignerJob.findByPk(job.id, {
    include: [
      {
        model: JobSite,
        as: 'jobSite',
        attributes: ['id', 'name', 'domain', 'logoUrl']
      }
    ]
  });

  res.status(201).json({
    success: true,
    message: '求人が作成されました',
    data: jobWithSite
  });
});

/**
 * 求人を更新（管理者のみ）
 */
exports.updateJob = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const { id } = req.params;
  const updateData = req.body;

  const job = await DesignerJob.findByPk(id);

  if (!job) {
    return res.status(404).json({
      success: false,
      error: '求人が見つかりません'
    });
  }

  await job.update(updateData);

  const updatedJob = await DesignerJob.findByPk(job.id, {
    include: [
      {
        model: JobSite,
        as: 'jobSite',
        attributes: ['id', 'name', 'domain', 'logoUrl']
      }
    ]
  });

  res.json({
    success: true,
    message: '求人が更新されました',
    data: updatedJob
  });
});

/**
 * 求人を承認（管理者のみ）
 */
exports.approveJob = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const job = await DesignerJob.findByPk(id);

  if (!job) {
    return res.status(404).json({
      success: false,
      error: '求人が見つかりません'
    });
  }

  await job.update({
    status: 'approved',
    approvedBy: req.userId,
    approvedAt: new Date()
  });

  res.json({
    success: true,
    message: '求人が承認されました',
    data: job
  });
});

/**
 * 求人を削除（管理者のみ）
 */
exports.deleteJob = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const job = await DesignerJob.findByPk(id);

  if (!job) {
    return res.status(404).json({
      success: false,
      error: '求人が見つかりません'
    });
  }

  await job.destroy();

  res.json({
    success: true,
    message: '求人が削除されました'
  });
});

/**
 * 未経験歓迎求人の統計を取得
 */
exports.getEntryLevelStats = asyncHandler(async (req, res) => {
  const totalJobs = await DesignerJob.count({
    where: {
      isActive: true,
      status: 'approved'
    }
  });

  const experienceWelcomeJobs = await DesignerJob.count({
    where: {
      isExperienceWelcome: true,
      isActive: true,
      status: 'approved'
    }
  });

  const newGraduateWelcomeJobs = await DesignerJob.count({
    where: {
      isNewGraduateWelcome: true,
      isActive: true,
      status: 'approved'
    }
  });

  const bothWelcomeJobs = await DesignerJob.count({
    where: {
      [Op.and]: [
        { isExperienceWelcome: true },
        { isNewGraduateWelcome: true }
      ],
      isActive: true,
      status: 'approved'
    }
  });

  const jobSiteStats = await DesignerJob.findAll({
    attributes: [
      'jobSiteId',
      [require('sequelize').fn('COUNT', require('sequelize').col('DesignerJob.id')), 'count']
    ],
    where: {
      [Op.or]: [
        { isExperienceWelcome: true },
        { isNewGraduateWelcome: true }
      ],
      isActive: true,
      status: 'approved'
    },
    include: [
      {
        model: JobSite,
        as: 'jobSite',
        attributes: ['name', 'domain']
      }
    ],
    group: ['jobSiteId', 'jobSite.id'],
    order: [[require('sequelize').fn('COUNT', require('sequelize').col('DesignerJob.id')), 'DESC']]
  });

  res.json({
    success: true,
    data: {
      totalJobs,
      experienceWelcomeJobs,
      newGraduateWelcomeJobs,
      bothWelcomeJobs,
      entryLevelPercentage: Math.round((experienceWelcomeJobs / totalJobs) * 100),
      newGraduatePercentage: Math.round((newGraduateWelcomeJobs / totalJobs) * 100),
      jobSiteStats
    }
  });
});

/**
 * おすすめ求人一覧を取得
 */
exports.getFeaturedJobs = asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;

  const jobs = await DesignerJob.findAll({
    where: {
      isFeatured: true,
      isActive: true,
      status: 'approved'
    },
    include: [
      {
        model: JobSite,
        as: 'jobSite',
        attributes: ['id', 'name', 'domain', 'logoUrl', 'category']
      }
    ],
    order: [['priority', 'DESC'], ['createdAt', 'DESC']],
    limit: parseInt(limit)
  });

  res.json({
    success: true,
    data: jobs
  });
});

/**
 * 検索サジェスト用のキーワード取得
 */
exports.getSearchSuggestions = asyncHandler(async (req, res) => {
  const { query } = req.query;

  if (!query || query.length < 2) {
    return res.json({
      success: true,
      data: {
        companies: [],
        locations: [],
        skills: [],
        tools: []
      }
    });
  }

  const companies = await DesignerJob.findAll({
    attributes: [[require('sequelize').fn('DISTINCT', require('sequelize').col('company')), 'company']],
    where: {
      company: {
        [Op.like]: `%${query}%`
      },
      isActive: true,
      status: 'approved'
    },
    limit: 5,
    raw: true
  });

  const locations = await DesignerJob.findAll({
    attributes: [[require('sequelize').fn('DISTINCT', require('sequelize').col('location')), 'location']],
    where: {
      location: {
        [Op.like]: `%${query}%`
      },
      isActive: true,
      status: 'approved'
    },
    limit: 5,
    raw: true
  });

  res.json({
    success: true,
    data: {
      companies: companies.map(c => c.company).filter(Boolean),
      locations: locations.map(l => l.location).filter(Boolean),
      skills: [], // JSON配列のため、より複雑なクエリが必要
      tools: []   // JSON配列のため、より複雑なクエリが必要
    }
  });
});