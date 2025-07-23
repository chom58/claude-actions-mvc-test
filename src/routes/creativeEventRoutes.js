const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const creativeEventController = require('../controllers/creativeEventController');

// バリデーションルール
const createValidation = [
  body('title').trim().notEmpty().withMessage('イベントタイトルは必須です').isLength({ max: 255 }).withMessage('タイトルは255文字以内で入力してください'),
  body('description').trim().notEmpty().withMessage('イベント説明は必須です'),
  body('eventType').isIn(['ネットワーキング', 'ワークショップ', '展示会', 'カンファレンス', 'ファッションショー', 'デザイン展', 'トークセッション', 'その他']).withMessage('有効なイベントタイプを選択してください'),
  body('targetAudience').isArray().withMessage('ターゲット参加者は配列で指定してください'),
  body('venue').trim().notEmpty().withMessage('開催場所は必須です'),
  body('address').optional().trim(),
  body('eventDate').isISO8601().withMessage('有効なイベント日時を入力してください'),
  body('startTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('有効な開始時刻を入力してください (HH:MM形式)'),
  body('endTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('有効な終了時刻を入力してください (HH:MM形式)'),
  body('capacity').isInt({ min: 1 }).withMessage('定員は1以上の整数を入力してください'),
  body('registrationFee').isFloat({ min: 0 }).withMessage('参加費は0以上の数値を入力してください'),
  body('isOnline').isBoolean().withMessage('オンライン開催フラグはboolean値で指定してください'),
  body('onlineUrl').optional().isURL().withMessage('オンラインURLは有効なURLを入力してください'),
  body('organizerType').isIn(['design_company', 'apparel_brand', 'external', 'community']).withMessage('有効な主催者タイプを選択してください'),
  body('organizerId').optional().isInt().withMessage('主催者IDは整数を入力してください'),
  body('organizerName').trim().notEmpty().withMessage('主催者名は必須です'),
  body('contactEmail').isEmail().withMessage('有効なメールアドレスを入力してください'),
  body('imageUrl').optional().isURL().withMessage('画像URLは有効なURLを入力してください'),
  body('tags').optional().isArray().withMessage('タグは配列で指定してください'),
  body('requirements').optional().trim(),
  body('agenda').optional().trim(),
  body('speakers').optional().isArray().withMessage('スピーカー情報は配列で指定してください'),
  body('registrationDeadline').optional().isISO8601().withMessage('有効な申込締切日時を入力してください')
];

const updateValidation = [
  body('title').optional().trim().notEmpty().withMessage('イベントタイトルは必須です').isLength({ max: 255 }).withMessage('タイトルは255文字以内で入力してください'),
  body('description').optional().trim().notEmpty().withMessage('イベント説明は必須です'),
  body('eventType').optional().isIn(['ネットワーキング', 'ワークショップ', '展示会', 'カンファレンス', 'ファッションショー', 'デザイン展', 'トークセッション', 'その他']).withMessage('有効なイベントタイプを選択してください'),
  body('targetAudience').optional().isArray().withMessage('ターゲット参加者は配列で指定してください'),
  body('venue').optional().trim().notEmpty().withMessage('開催場所は必須です'),
  body('address').optional().trim(),
  body('eventDate').optional().isISO8601().withMessage('有効なイベント日時を入力してください'),
  body('startTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('有効な開始時刻を入力してください (HH:MM形式)'),
  body('endTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('有効な終了時刻を入力してください (HH:MM形式)'),
  body('capacity').optional().isInt({ min: 1 }).withMessage('定員は1以上の整数を入力してください'),
  body('registrationFee').optional().isFloat({ min: 0 }).withMessage('参加費は0以上の数値を入力してください'),
  body('isOnline').optional().isBoolean().withMessage('オンライン開催フラグはboolean値で指定してください'),
  body('onlineUrl').optional().isURL().withMessage('オンラインURLは有効なURLを入力してください'),
  body('organizerType').optional().isIn(['design_company', 'apparel_brand', 'external', 'community']).withMessage('有効な主催者タイプを選択してください'),
  body('organizerId').optional().isInt().withMessage('主催者IDは整数を入力してください'),
  body('organizerName').optional().trim().notEmpty().withMessage('主催者名は必須です'),
  body('contactEmail').optional().isEmail().withMessage('有効なメールアドレスを入力してください'),
  body('imageUrl').optional().isURL().withMessage('画像URLは有効なURLを入力してください'),
  body('tags').optional().isArray().withMessage('タグは配列で指定してください'),
  body('requirements').optional().trim(),
  body('agenda').optional().trim(),
  body('speakers').optional().isArray().withMessage('スピーカー情報は配列で指定してください'),
  body('registrationDeadline').optional().isISO8601().withMessage('有効な申込締切日時を入力してください'),
  body('status').optional().isIn(['upcoming', 'ongoing', 'completed', 'cancelled']).withMessage('有効なステータスを選択してください')
];

const registrationValidation = [
  body('participantName').trim().notEmpty().withMessage('参加者名は必須です').isLength({ max: 100 }).withMessage('参加者名は100文字以内で入力してください'),
  body('participantEmail').isEmail().withMessage('有効なメールアドレスを入力してください'),
  body('participantType').optional().isIn(['individual', 'company', 'student', 'other']).withMessage('有効な参加者タイプを選択してください')
];

// ルート定義
router.get('/', creativeEventController.getAllEvents);
router.get('/upcoming', creativeEventController.getUpcomingEvents);
router.get('/type/:eventType', creativeEventController.searchByType);
router.get('/:id', creativeEventController.getEventById);
router.post('/', createValidation, creativeEventController.createEvent);
router.put('/:id', updateValidation, creativeEventController.updateEvent);
router.delete('/:id', creativeEventController.deleteEvent);
router.post('/:id/register', registrationValidation, creativeEventController.registerForEvent);

module.exports = router;