const { body, param, query } = require('express-validator');

const harajukuValidation = {
  // デザイン会社作成バリデーション
  createCompany: [
    body('name')
      .isLength({ min: 1, max: 100 })
      .withMessage('会社名は1〜100文字で入力してください'),
    body('type')
      .isIn(['graphic', 'web', 'ui_ux', 'branding', 'packaging', 'other'])
      .withMessage('有効なデザインタイプを選択してください'),
    body('contactEmail')
      .isEmail()
      .withMessage('有効なメールアドレスを入力してください'),
    body('contactPhone')
      .optional()
      .isMobilePhone('ja-JP')
      .withMessage('有効な電話番号を入力してください'),
    body('website')
      .optional()
      .isURL()
      .withMessage('有効なWebサイトURLを入力してください'),
    body('portfolio')
      .optional()
      .isURL()
      .withMessage('有効なポートフォリオURLを入力してください'),
    body('employees')
      .optional()
      .isInt({ min: 1 })
      .withMessage('従業員数は1以上の整数を入力してください'),
    body('establishedYear')
      .optional()
      .isInt({ min: 1900, max: new Date().getFullYear() })
      .withMessage('設立年は1900年から現在年まで入力してください'),
    body('specialties')
      .optional()
      .isArray()
      .withMessage('専門分野は配列で入力してください')
  ],

  // デザイン会社更新バリデーション
  updateCompany: [
    param('id').isInt().withMessage('有効なIDを指定してください'),
    body('name')
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage('会社名は1〜100文字で入力してください'),
    body('type')
      .optional()
      .isIn(['graphic', 'web', 'ui_ux', 'branding', 'packaging', 'other'])
      .withMessage('有効なデザインタイプを選択してください'),
    body('contactEmail')
      .optional()
      .isEmail()
      .withMessage('有効なメールアドレスを入力してください'),
    body('contactPhone')
      .optional()
      .isMobilePhone('ja-JP')
      .withMessage('有効な電話番号を入力してください'),
    body('website')
      .optional()
      .isURL()
      .withMessage('有効なWebサイトURLを入力してください'),
    body('portfolio')
      .optional()
      .isURL()
      .withMessage('有効なポートフォリオURLを入力してください'),
    body('employees')
      .optional()
      .isInt({ min: 1 })
      .withMessage('従業員数は1以上の整数を入力してください'),
    body('establishedYear')
      .optional()
      .isInt({ min: 1900, max: new Date().getFullYear() })
      .withMessage('設立年は1900年から現在年まで入力してください'),
    body('specialties')
      .optional()
      .isArray()
      .withMessage('専門分野は配列で入力してください')
  ],

  // イベント作成バリデーション
  createEvent: [
    body('title')
      .isLength({ min: 1, max: 150 })
      .withMessage('イベントタイトルは1〜150文字で入力してください'),
    body('type')
      .isIn(['networking', 'workshop', 'exhibition', 'conference', 'meetup', 'other'])
      .withMessage('有効なイベントタイプを選択してください'),
    body('startDate')
      .isISO8601()
      .toDate()
      .withMessage('有効な開始日時を入力してください'),
    body('endDate')
      .optional()
      .isISO8601()
      .toDate()
      .withMessage('有効な終了日時を入力してください'),
    body('maxParticipants')
      .optional()
      .isInt({ min: 1 })
      .withMessage('最大参加者数は1以上の整数を入力してください'),
    body('registrationDeadline')
      .optional()
      .isISO8601()
      .toDate()
      .withMessage('有効な申込締切日時を入力してください'),
    body('fee')
      .optional()
      .isDecimal({ decimal_digits: '0,2' })
      .withMessage('参加費は有効な金額を入力してください'),
    body('agenda')
      .optional()
      .isArray()
      .withMessage('アジェンダは配列で入力してください'),
    body('tags')
      .optional()
      .isArray()
      .withMessage('タグは配列で入力してください')
  ],

  // イベント更新バリデーション
  updateEvent: [
    param('id').isInt().withMessage('有効なIDを指定してください'),
    body('title')
      .optional()
      .isLength({ min: 1, max: 150 })
      .withMessage('イベントタイトルは1〜150文字で入力してください'),
    body('type')
      .optional()
      .isIn(['networking', 'workshop', 'exhibition', 'conference', 'meetup', 'other'])
      .withMessage('有効なイベントタイプを選択してください'),
    body('startDate')
      .optional()
      .isISO8601()
      .toDate()
      .withMessage('有効な開始日時を入力してください'),
    body('endDate')
      .optional()
      .isISO8601()
      .toDate()
      .withMessage('有効な終了日時を入力してください'),
    body('maxParticipants')
      .optional()
      .isInt({ min: 1 })
      .withMessage('最大参加者数は1以上の整数を入力してください'),
    body('registrationDeadline')
      .optional()
      .isISO8601()
      .toDate()
      .withMessage('有効な申込締切日時を入力してください'),
    body('fee')
      .optional()
      .isDecimal({ decimal_digits: '0,2' })
      .withMessage('参加費は有効な金額を入力してください'),
    body('status')
      .optional()
      .isIn(['draft', 'published', 'ongoing', 'completed', 'cancelled'])
      .withMessage('有効なステータスを選択してください'),
    body('agenda')
      .optional()
      .isArray()
      .withMessage('アジェンダは配列で入力してください'),
    body('tags')
      .optional()
      .isArray()
      .withMessage('タグは配列で入力してください')
  ],

  // イベント参加登録バリデーション
  registerForEvent: [
    param('id').isInt().withMessage('有効なIDを指定してください'),
    body('participantName')
      .isLength({ min: 1, max: 100 })
      .withMessage('参加者名は1〜100文字で入力してください'),
    body('participantEmail')
      .isEmail()
      .withMessage('有効なメールアドレスを入力してください'),
    body('participantPhone')
      .optional()
      .isMobilePhone('ja-JP')
      .withMessage('有効な電話番号を入力してください'),
    body('designCompanyId')
      .optional()
      .isInt()
      .withMessage('有効なデザイン会社IDを指定してください'),
    body('userId')
      .optional()
      .isInt()
      .withMessage('有効なユーザーIDを指定してください')
  ],

  // IDパラメータバリデーション
  validateId: [
    param('id').isInt().withMessage('有効なIDを指定してください')
  ],

  // クエリパラメータバリデーション
  validateQuery: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('ページは1以上の整数を指定してください'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('リミットは1〜100の整数を指定してください')
  ]
};

module.exports = harajukuValidation;