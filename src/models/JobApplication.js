const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const JobApplication = sequelize.define('JobApplication', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    },
    comment: '応募者のユーザーID'
  },
  jobId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'designer_jobs',
      key: 'id'
    },
    comment: '応募先の求人ID'
  },
  status: {
    type: DataTypes.ENUM,
    values: [
      'pending',        // 応募済み・審査中
      'screening',      // 書類選考中
      'interview',      // 面接段階
      'final_review',   // 最終確認
      'accepted',       // 内定
      'rejected',       // 不採用
      'withdrawn'       // 応募取り下げ
    ],
    defaultValue: 'pending',
    comment: '応募ステータス'
  },
  motivation: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '志望動機'
  },
  resumeFile: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '履歴書ファイルパス'
  },
  portfolioFile: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '職務経歴書・ポートフォリオファイルパス'
  },
  additionalDocuments: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'その他の添付書類配列'
  },
  companyNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '企業側メモ'
  },
  interviewSchedule: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '面接スケジュール情報'
  },
  statusHistory: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
    comment: 'ステータス変更履歴'
  },
  applicationData: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'その他の応募データ'
  },
  appliedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: '応募日時'
  },
  lastContactedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '最後の連絡日時'
  },
  expectedSalary: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '希望給与（万円）'
  },
  availableStartDate: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '勤務開始可能日'
  },
  isUrgent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '緊急案件かどうか'
  },
  source: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '応募経路（ウェブサイト、紹介等）'
  }
}, {
  timestamps: true,
  tableName: 'job_applications',
  indexes: [
    {
      fields: ['userId']
    },
    {
      fields: ['jobId']
    },
    {
      fields: ['status']
    },
    {
      fields: ['appliedAt']
    },
    {
      fields: ['lastContactedAt']
    },
    {
      // 複合インデックス：ユーザー別応募履歴
      fields: ['userId', 'appliedAt']
    },
    {
      // 複合インデックス：求人別応募状況
      fields: ['jobId', 'status']
    },
    {
      // 複合インデックス：重複応募チェック
      unique: true,
      fields: ['userId', 'jobId'],
      name: 'unique_user_job_application'
    }
  ]
});

// ステータス変更履歴を追加するヘルパーメソッド
JobApplication.prototype.addStatusHistory = function(newStatus, note = null, changedBy = null) {
  const history = this.statusHistory || [];
  history.push({
    status: newStatus,
    changedAt: new Date(),
    changedBy: changedBy,
    note: note,
    previousStatus: this.status
  });
  this.statusHistory = history;
  this.status = newStatus;
};

// 応募取り下げ可能かチェック
JobApplication.prototype.canWithdraw = function() {
  return ['pending', 'screening', 'interview'].includes(this.status);
};

// 企業側で編集可能かチェック
JobApplication.prototype.canEditByCompany = function() {
  return !['withdrawn', 'accepted', 'rejected'].includes(this.status);
};

module.exports = JobApplication;