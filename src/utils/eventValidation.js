const { body } = require('express-validator');

const eventValidation = {
  create: [
    body('title')
      .notEmpty()
      .withMessage('イベントタイトルは必須です')
      .isLength({ min: 3, max: 200 })
      .withMessage('イベントタイトルは3文字以上200文字以下で入力してください'),
    
    body('description')
      .notEmpty()
      .withMessage('イベント説明は必須です')
      .isLength({ min: 10, max: 2000 })
      .withMessage('イベント説明は10文字以上2000文字以下で入力してください'),
    
    body('eventType')
      .isIn(['networking', 'workshop', 'exhibition', 'conference', 'meetup'])
      .withMessage('イベントタイプは networking, workshop, exhibition, conference, meetup のいずれかを選択してください'),
    
    body('startDateTime')
      .isISO8601()
      .withMessage('開始日時は有効な日時形式で入力してください')
      .custom((value) => {
        const startDate = new Date(value);
        const now = new Date();
        if (startDate <= now) {
          throw new Error('開始日時は現在時刻より後に設定してください');
        }
        return true;
      }),
    
    body('endDateTime')
      .isISO8601()
      .withMessage('終了日時は有効な日時形式で入力してください')
      .custom((value, { req }) => {
        const endDate = new Date(value);
        const startDate = new Date(req.body.startDateTime);
        if (endDate <= startDate) {
          throw new Error('終了日時は開始日時より後に設定してください');
        }
        return true;
      }),
    
    body('venue')
      .optional()
      .isLength({ min: 2, max: 100 })
      .withMessage('会場名は2文字以上100文字以下で入力してください'),
    
    body('address')
      .optional()
      .isLength({ min: 5, max: 200 })
      .withMessage('住所は5文字以上200文字以下で入力してください'),
    
    body('maxParticipants')
      .isInt({ min: 1, max: 200 })
      .withMessage('最大参加者数は1人以上200人以下で設定してください'),
    
    body('fee')
      .isInt({ min: 0 })
      .withMessage('参加費は0円以上で設定してください'),
    
    body('targetAudience')
      .isArray()
      .withMessage('対象参加者は配列で指定してください')
      .custom((value) => {
        const validAudiences = [
          'graphic-designers', 'web-designers', 'ui-ux-designers', 
          'branding-specialists', 'art-directors', 'creative-directors',
          'freelancers', 'students', 'all'
        ];
        if (!Array.isArray(value) || value.length === 0) {
          throw new Error('少なくとも1つの対象参加者を選択してください');
        }
        for (const audience of value) {
          if (!validAudiences.includes(audience)) {
            throw new Error(`無効な対象参加者です: ${audience}`);
          }
        }
        return true;
      }),
    
    body('tags')
      .optional()
      .isArray()
      .withMessage('タグは配列で指定してください'),
    
    body('imageUrl')
      .optional()
      .isURL()
      .withMessage('有効な画像URLを入力してください'),
    
    body('registrationDeadline')
      .optional()
      .isISO8601()
      .withMessage('登録締切日時は有効な日時形式で入力してください')
      .custom((value, { req }) => {
        if (value) {
          const deadline = new Date(value);
          const startDate = new Date(req.body.startDateTime);
          if (deadline >= startDate) {
            throw new Error('登録締切日時はイベント開始時刻より前に設定してください');
          }
        }
        return true;
      }),
    
    body('organizer')
      .notEmpty()
      .withMessage('主催者情報は必須です')
      .isObject()
      .withMessage('主催者情報はオブジェクト形式で指定してください')
      .custom((value) => {
        if (!value.name || !value.email) {
          throw new Error('主催者の名前とメールアドレスは必須です');
        }
        if (typeof value.name !== 'string' || value.name.length < 2) {
          throw new Error('主催者名は2文字以上で入力してください');
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)) {
          throw new Error('有効な主催者メールアドレスを入力してください');
        }
        return true;
      }),
    
    body('requirements')
      .optional()
      .isLength({ max: 500 })
      .withMessage('参加要件は500文字以下で入力してください'),
    
    body('agenda')
      .optional()
      .isArray()
      .withMessage('アジェンダは配列で指定してください')
  ],

  update: [
    body('title')
      .optional()
      .isLength({ min: 3, max: 200 })
      .withMessage('イベントタイトルは3文字以上200文字以下で入力してください'),
    
    body('description')
      .optional()
      .isLength({ min: 10, max: 2000 })
      .withMessage('イベント説明は10文字以上2000文字以下で入力してください'),
    
    body('eventType')
      .optional()
      .isIn(['networking', 'workshop', 'exhibition', 'conference', 'meetup'])
      .withMessage('イベントタイプは networking, workshop, exhibition, conference, meetup のいずれかを選択してください'),
    
    body('startDateTime')
      .optional()
      .isISO8601()
      .withMessage('開始日時は有効な日時形式で入力してください'),
    
    body('endDateTime')
      .optional()
      .isISO8601()
      .withMessage('終了日時は有効な日時形式で入力してください'),
    
    body('maxParticipants')
      .optional()
      .isInt({ min: 1, max: 200 })
      .withMessage('最大参加者数は1人以上200人以下で設定してください'),
    
    body('fee')
      .optional()
      .isInt({ min: 0 })
      .withMessage('参加費は0円以上で設定してください'),
    
    body('status')
      .optional()
      .isIn(['draft', 'published', 'cancelled', 'completed'])
      .withMessage('ステータスは draft, published, cancelled, completed のいずれかを選択してください')
  ],

  register: [
    body('participantName')
      .notEmpty()
      .withMessage('参加者名は必須です')
      .isLength({ min: 2, max: 50 })
      .withMessage('参加者名は2文字以上50文字以下で入力してください'),
    
    body('participantEmail')
      .isEmail()
      .withMessage('有効なメールアドレスを入力してください')
      .normalizeEmail(),
    
    body('participantRole')
      .optional()
      .isLength({ max: 100 })
      .withMessage('役職は100文字以下で入力してください'),
    
    body('specialtyArea')
      .isIn(['graphic', 'web', 'ui-ux', 'branding', 'package', 'editorial', 'motion', 'other'])
      .withMessage('専門分野は graphic, web, ui-ux, branding, package, editorial, motion, other のいずれかを選択してください'),
    
    body('experienceYears')
      .optional()
      .isInt({ min: 0, max: 50 })
      .withMessage('経験年数は0年以上50年以下で入力してください'),
    
    body('networkingGoals')
      .optional()
      .isLength({ max: 500 })
      .withMessage('ネットワーキングの目標は500文字以下で入力してください'),
    
    body('portfolioUrl')
      .optional()
      .isURL()
      .withMessage('有効なポートフォリオURLを入力してください'),
    
    body('isHarajukuResident')
      .optional()
      .isBoolean()
      .withMessage('原宿エリア勤務フラグはtrue/falseで指定してください'),
    
    body('designCompanyId')
      .optional()
      .isInt()
      .withMessage('デザイン会社IDは整数で指定してください')
  ]
};

module.exports = eventValidation;