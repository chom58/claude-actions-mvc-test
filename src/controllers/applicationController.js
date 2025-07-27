const { JobApplication, User, DesignerJob, JobSite } = require('../models');
const { validationResult } = require('express-validator');
const notificationService = require('../services/notificationService');
const { Op } = require('sequelize');

// 求人に応募する
const applyToJob = async (req, res) => {
  try {
    // バリデーションエラーチェック
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'バリデーションエラー',
        details: errors.array()
      });
    }

    const { jobId } = req.params;
    const userId = req.user.id;
    const { motivation, expectedSalary, availableStartDate } = req.body;

    // 求人が存在するかチェック
    const job = await DesignerJob.findByPk(jobId, {
      include: [{ model: JobSite, as: 'jobSite' }]
    });
    
    if (!job) {
      return res.status(404).json({ error: '求人が見つかりません' });
    }

    // アクティブな求人かチェック
    if (!job.isActive || job.status !== 'approved') {
      return res.status(400).json({ error: 'この求人には応募できません' });
    }

    // 締切チェック
    if (job.applicationDeadline && new Date() > new Date(job.applicationDeadline)) {
      return res.status(400).json({ error: '応募締切が過ぎています' });
    }

    // 重複応募チェック
    const existingApplication = await JobApplication.findOne({
      where: { userId, jobId }
    });

    if (existingApplication) {
      return res.status(400).json({ error: 'この求人には既に応募済みです' });
    }

    // 応募作成
    const applicationData = {
      userId,
      jobId: parseInt(jobId),
      motivation,
      expectedSalary,
      availableStartDate,
      appliedAt: new Date(),
      source: 'website'
    };

    // ファイルアップロード情報があれば追加
    if (req.uploadedFiles) {
      if (req.uploadedFiles.resume) {
        applicationData.resumeFile = req.uploadedFiles.resume.path;
      }
      if (req.uploadedFiles.portfolio) {
        applicationData.portfolioFile = req.uploadedFiles.portfolio.path;
      }
      if (req.uploadedFiles.additional && req.uploadedFiles.additional.length > 0) {
        applicationData.additionalDocuments = req.uploadedFiles.additional.map(file => ({
          filename: file.originalname,
          path: file.path,
          uploadedAt: new Date()
        }));
      }
    }

    const application = await JobApplication.create(applicationData);

    // ステータス履歴を初期化
    application.addStatusHistory('pending', '応募を受付ました');
    await application.save();

    // 応募完了通知（企業側への通知も含む）
    await notificationService.sendNotification(userId, {
      type: 'application_submitted',
      title: '応募完了',
      message: `${job.title}への応募が完了しました`,
      data: { applicationId: application.id, jobId }
    });

    // レスポンス用に求人情報と一緒に返す
    const applicationWithJob = await JobApplication.findByPk(application.id, {
      include: [
        {
          model: DesignerJob,
          as: 'job',
          include: [{ model: JobSite, as: 'jobSite' }]
        },
        { model: User, as: 'applicant', attributes: ['id', 'username', 'email'] }
      ]
    });

    res.status(201).json({
      message: '応募が完了しました',
      application: applicationWithJob
    });

  } catch (error) {
    console.error('応募処理エラー:', error);
    res.status(500).json({ 
      error: '応募処理中にエラーが発生しました',
      details: error.message 
    });
  }
};

// ユーザーの応募履歴一覧取得
const getUserApplications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const whereCondition = { userId };
    if (status) {
      whereCondition.status = status;
    }

    const { count, rows } = await JobApplication.findAndCountAll({
      where: whereCondition,
      include: [
        {
          model: DesignerJob,
          as: 'job',
          include: [{ model: JobSite, as: 'jobSite' }]
        }
      ],
      order: [['appliedAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      applications: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('応募履歴取得エラー:', error);
    res.status(500).json({ 
      error: '応募履歴の取得中にエラーが発生しました',
      details: error.message 
    });
  }
};

// 応募詳細取得
const getApplicationById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const application = await JobApplication.findOne({
      where: { id, userId },
      include: [
        {
          model: DesignerJob,
          as: 'job',
          include: [{ model: JobSite, as: 'jobSite' }]
        },
        { model: User, as: 'applicant', attributes: ['id', 'username', 'email'] }
      ]
    });

    if (!application) {
      return res.status(404).json({ error: '応募が見つかりません' });
    }

    res.json({ application });

  } catch (error) {
    console.error('応募詳細取得エラー:', error);
    res.status(500).json({ 
      error: '応募詳細の取得中にエラーが発生しました',
      details: error.message 
    });
  }
};

// 応募取り下げ
const withdrawApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { reason } = req.body;

    const application = await JobApplication.findOne({
      where: { id, userId },
      include: [
        {
          model: DesignerJob,
          as: 'job'
        }
      ]
    });

    if (!application) {
      return res.status(404).json({ error: '応募が見つかりません' });
    }

    if (!application.canWithdraw()) {
      return res.status(400).json({ 
        error: 'この段階では応募を取り下げることができません' 
      });
    }

    // ステータス更新
    application.addStatusHistory('withdrawn', reason || '応募者による取り下げ', userId);
    await application.save();

    // 通知送信
    await notificationService.sendNotification(userId, {
      type: 'application_withdrawn',
      title: '応募取り下げ完了',
      message: `${application.job.title}への応募を取り下げました`,
      data: { applicationId: application.id }
    });

    res.json({ 
      message: '応募を取り下げました',
      application 
    });

  } catch (error) {
    console.error('応募取り下げエラー:', error);
    res.status(500).json({ 
      error: '応募取り下げ処理中にエラーが発生しました',
      details: error.message 
    });
  }
};

// 求人別応募者一覧（企業側）
const getJobApplications = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // 求人の存在チェック（将来的には企業権限チェックも追加）
    const job = await DesignerJob.findByPk(jobId);
    if (!job) {
      return res.status(404).json({ error: '求人が見つかりません' });
    }

    const whereCondition = { jobId };
    if (status) {
      whereCondition.status = status;
    }

    const { count, rows } = await JobApplication.findAndCountAll({
      where: whereCondition,
      include: [
        { 
          model: User, 
          as: 'applicant', 
          attributes: ['id', 'username', 'email', 'bio', 'skills', 'location'] 
        }
      ],
      order: [['appliedAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      applications: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('求人応募者一覧取得エラー:', error);
    res.status(500).json({ 
      error: '応募者一覧の取得中にエラーが発生しました',
      details: error.message 
    });
  }
};

// 応募ステータス更新（企業側）
const updateApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note, interviewSchedule } = req.body;
    const updatedBy = req.user.id;

    const application = await JobApplication.findByPk(id, {
      include: [
        { model: User, as: 'applicant' },
        { model: DesignerJob, as: 'job' }
      ]
    });

    if (!application) {
      return res.status(404).json({ error: '応募が見つかりません' });
    }

    if (!application.canEditByCompany()) {
      return res.status(400).json({ 
        error: 'このステータスは変更できません' 
      });
    }

    // ステータス更新
    const oldStatus = application.status;
    application.addStatusHistory(status, note, updatedBy);
    
    if (interviewSchedule) {
      application.interviewSchedule = interviewSchedule;
    }
    
    application.lastContactedAt = new Date();
    await application.save();

    // 応募者への通知
    const statusMessages = {
      'screening': '書類選考が開始されました',
      'interview': '面接に進むことになりました',
      'final_review': '最終確認段階に進みました',
      'accepted': '内定が決定しました',
      'rejected': '選考結果をお知らせします'
    };

    if (statusMessages[status]) {
      await notificationService.sendNotification(application.userId, {
        type: 'application_status_updated',
        title: '選考状況更新',
        message: `${application.job.title}: ${statusMessages[status]}`,
        data: { 
          applicationId: application.id,
          newStatus: status,
          oldStatus
        }
      });
    }

    res.json({ 
      message: 'ステータスを更新しました',
      application 
    });

  } catch (error) {
    console.error('ステータス更新エラー:', error);
    res.status(500).json({ 
      error: 'ステータス更新中にエラーが発生しました',
      details: error.message 
    });
  }
};

// 応募統計情報
const getApplicationStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const stats = {
      total: await JobApplication.count({ where: { userId } }),
      pending: await JobApplication.count({ where: { userId, status: 'pending' } }),
      screening: await JobApplication.count({ where: { userId, status: 'screening' } }),
      interview: await JobApplication.count({ where: { userId, status: 'interview' } }),
      accepted: await JobApplication.count({ where: { userId, status: 'accepted' } }),
      rejected: await JobApplication.count({ where: { userId, status: 'rejected' } }),
      withdrawn: await JobApplication.count({ where: { userId, status: 'withdrawn' } })
    };

    res.json({ stats });

  } catch (error) {
    console.error('応募統計取得エラー:', error);
    res.status(500).json({ 
      error: '統計情報の取得中にエラーが発生しました',
      details: error.message 
    });
  }
};

// 応募データのエクスポート
const exportApplications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;

    const whereCondition = { userId };
    if (status) {
      whereCondition.status = status;
    }

    const applications = await JobApplication.findAll({
      where: whereCondition,
      include: [
        {
          model: DesignerJob,
          as: 'job',
          include: [{ model: JobSite, as: 'jobSite' }]
        }
      ],
      order: [['appliedAt', 'DESC']]
    });

    // CSV形式でデータを生成
    const csvHeader = 'タイトル,会社名,ステータス,応募日,勤務地,雇用形態,希望給与,勤務開始可能日\n';
    const csvData = applications.map(app => {
      const statusLabels = {
        'pending': '審査中',
        'screening': '書類選考中',
        'interview': '面接中',
        'final_review': '最終確認',
        'accepted': '内定',
        'rejected': '不採用',
        'withdrawn': '取り下げ'
      };
      
      const jobTypeLabels = {
        'full_time': '正社員',
        'part_time': 'パート・アルバイト',
        'contract': '契約社員',
        'freelance': 'フリーランス',
        'internship': 'インターンシップ'
      };

      return [
        `"${app.job.title}"`,
        `"${app.job.company}"`,
        `"${statusLabels[app.status] || app.status}"`,
        `"${new Date(app.appliedAt).toLocaleDateString('ja-JP')}"`,
        `"${app.job.location || '-'}"`,
        `"${jobTypeLabels[app.job.jobType] || app.job.jobType}"`,
        `"${app.expectedSalary ? app.expectedSalary + '万円' : '-'}"`,
        `"${app.availableStartDate ? new Date(app.availableStartDate).toLocaleDateString('ja-JP') : '-'}"`
      ].join(',');
    }).join('\n');

    const csv = csvHeader + csvData;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="applications_${new Date().toISOString().split('T')[0]}.csv"`);
    res.write('\uFEFF'); // BOM for Excel
    res.end(csv);

  } catch (error) {
    console.error('エクスポートエラー:', error);
    res.status(500).json({ 
      error: 'エクスポート処理中にエラーが発生しました',
      details: error.message 
    });
  }
};

module.exports = {
  applyToJob,
  getUserApplications,
  getApplicationById,
  withdrawApplication,
  getJobApplications,
  updateApplicationStatus,
  getApplicationStats,
  exportApplications
};