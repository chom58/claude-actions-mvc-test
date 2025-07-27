const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const applicationController = require('../controllers/applicationController');
const applicationMessageController = require('../controllers/applicationMessageController');
const auth = require('../middleware/auth');
const { documentUpload, uploadApplicationDocuments } = require('../middleware/upload');

// バリデーションルール
const applyJobValidation = [
  body('motivation')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('志望動機は2000文字以内で入力してください'),
  body('expectedSalary')
    .optional()
    .isInt({ min: 0 })
    .withMessage('希望給与は0以上の数値で入力してください'),
  body('availableStartDate')
    .optional()
    .isISO8601()
    .withMessage('有効な日付形式で入力してください')
];

const statusUpdateValidation = [
  body('status')
    .isIn(['pending', 'screening', 'interview', 'final_review', 'accepted', 'rejected'])
    .withMessage('有効なステータスを選択してください'),
  body('note')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('備考は1000文字以内で入力してください'),
  body('interviewSchedule')
    .optional()
    .isObject()
    .withMessage('面接スケジュールは有効なオブジェクトで入力してください')
];

const withdrawValidation = [
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('理由は500文字以内で入力してください')
];

const messageValidation = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('メッセージは1〜2000文字で入力してください'),
  body('type')
    .optional()
    .isIn(['text', 'image', 'file'])
    .withMessage('有効なメッセージタイプを選択してください')
];

// 認証が必要なエンドポイント
router.use(auth);

// 求人に応募する
router.post(
  '/jobs/:jobId/apply',
  documentUpload.fields([
    { name: 'resume', maxCount: 1 },      // 履歴書
    { name: 'portfolio', maxCount: 1 },   // 職務経歴書・ポートフォリオ
    { name: 'additional', maxCount: 5 }   // その他の書類（最大5件）
  ]),
  uploadApplicationDocuments,
  applyJobValidation,
  applicationController.applyToJob
);

// ユーザーの応募履歴一覧取得
router.get('/my-applications', applicationController.getUserApplications);

// 応募統計情報取得
router.get('/my-applications/stats', applicationController.getApplicationStats);

// 応募履歴エクスポート
router.get('/my-applications/export', applicationController.exportApplications);

// 応募詳細取得
router.get('/my-applications/:id', applicationController.getApplicationById);

// 応募取り下げ
router.patch(
  '/my-applications/:id/withdraw',
  withdrawValidation,
  applicationController.withdrawApplication
);

// === 企業側エンドポイント（将来的には企業権限チェックを追加） ===

// 求人別応募者一覧取得
router.get('/jobs/:jobId/applications', applicationController.getJobApplications);

// 応募ステータス更新（企業側）
router.patch(
  '/applications/:id/status',
  statusUpdateValidation,
  applicationController.updateApplicationStatus
);

// === メッセージング機能 ===

// ユーザーの応募チャット一覧取得
router.get('/my-applications/chats', applicationMessageController.getUserApplicationChats);

// 応募チャットルーム取得・作成
router.get('/my-applications/:applicationId/chat', applicationMessageController.getOrCreateApplicationChatRoom);

// 応募メッセージ一覧取得
router.get('/my-applications/:applicationId/messages', applicationMessageController.getApplicationMessages);

// 応募メッセージ送信
router.post(
  '/my-applications/:applicationId/messages',
  messageValidation,
  applicationMessageController.sendApplicationMessage
);

module.exports = router;