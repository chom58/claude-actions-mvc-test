const { body } = require('express-validator');

const designCompanyValidation = {
  create: [
    body('name')
      .notEmpty()
      .withMessage('会社名は必須です')
      .isLength({ min: 2, max: 100 })
      .withMessage('会社名は2文字以上100文字以下で入力してください'),
    
    body('email')
      .isEmail()
      .withMessage('有効なメールアドレスを入力してください')
      .normalizeEmail(),
    
    body('description')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('会社説明は1000文字以下で入力してください'),
    
    body('location')
      .optional()
      .isLength({ max: 200 })
      .withMessage('所在地は200文字以下で入力してください'),
    
    body('area')
      .optional()
      .isIn(['harajuku', 'shibuya', 'omotesando', 'aoyama'])
      .withMessage('エリアは harajuku, shibuya, omotesando, aoyama のいずれかを選択してください'),
    
    body('specialties')
      .isArray()
      .withMessage('専門分野は配列で指定してください')
      .custom((value) => {
        const validSpecialties = [
          'graphic', 'web', 'ui-ux', 'branding', 'package', 
          'editorial', 'motion', 'illustration', 'photography'
        ];
        if (!Array.isArray(value) || value.length === 0) {
          throw new Error('少なくとも1つの専門分野を選択してください');
        }
        for (const specialty of value) {
          if (!validSpecialties.includes(specialty)) {
            throw new Error(`無効な専門分野です: ${specialty}`);
          }
        }
        return true;
      }),
    
    body('website')
      .optional()
      .isURL()
      .withMessage('有効なWebサイトURLを入力してください'),
    
    body('phone')
      .optional()
      .matches(/^[\d\-\(\)\+\s]+$/)
      .withMessage('有効な電話番号を入力してください'),
    
    body('establishedYear')
      .optional()
      .isInt({ min: 1900, max: new Date().getFullYear() })
      .withMessage(`設立年は1900年から${new Date().getFullYear()}年の間で入力してください`),
    
    body('employeeCount')
      .optional()
      .isInt({ min: 1 })
      .withMessage('従業員数は1人以上で入力してください'),
    
    body('portfolio')
      .optional()
      .isArray()
      .withMessage('ポートフォリオは配列で指定してください')
      .custom((value) => {
        if (Array.isArray(value)) {
          for (const url of value) {
            if (typeof url !== 'string' || !url.match(/^https?:\/\/.+/)) {
              throw new Error('ポートフォリオの各項目は有効なURLである必要があります');
            }
          }
        }
        return true;
      }),
    
    body('socialMedia')
      .optional()
      .isObject()
      .withMessage('ソーシャルメディア情報はオブジェクト形式で指定してください')
      .custom((value) => {
        if (typeof value === 'object' && value !== null) {
          const validPlatforms = ['instagram', 'twitter', 'facebook', 'linkedin', 'behance', 'dribbble'];
          for (const [platform, url] of Object.entries(value)) {
            if (!validPlatforms.includes(platform)) {
              throw new Error(`サポートされていないソーシャルメディアプラットフォームです: ${platform}`);
            }
            if (typeof url !== 'string' || !url.match(/^https?:\/\/.+/)) {
              throw new Error(`${platform}のURLが無効です`);
            }
          }
        }
        return true;
      })
  ],

  update: [
    body('name')
      .optional()
      .isLength({ min: 2, max: 100 })
      .withMessage('会社名は2文字以上100文字以下で入力してください'),
    
    body('email')
      .optional()
      .isEmail()
      .withMessage('有効なメールアドレスを入力してください')
      .normalizeEmail(),
    
    body('description')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('会社説明は1000文字以下で入力してください'),
    
    body('location')
      .optional()
      .isLength({ max: 200 })
      .withMessage('所在地は200文字以下で入力してください'),
    
    body('area')
      .optional()
      .isIn(['harajuku', 'shibuya', 'omotesando', 'aoyama'])
      .withMessage('エリアは harajuku, shibuya, omotesando, aoyama のいずれかを選択してください'),
    
    body('specialties')
      .optional()
      .isArray()
      .withMessage('専門分野は配列で指定してください')
      .custom((value) => {
        const validSpecialties = [
          'graphic', 'web', 'ui-ux', 'branding', 'package', 
          'editorial', 'motion', 'illustration', 'photography'
        ];
        if (Array.isArray(value)) {
          for (const specialty of value) {
            if (!validSpecialties.includes(specialty)) {
              throw new Error(`無効な専門分野です: ${specialty}`);
            }
          }
        }
        return true;
      }),
    
    body('website')
      .optional()
      .isURL()
      .withMessage('有効なWebサイトURLを入力してください'),
    
    body('phone')
      .optional()
      .matches(/^[\d\-\(\)\+\s]+$/)
      .withMessage('有効な電話番号を入力してください'),
    
    body('establishedYear')
      .optional()
      .isInt({ min: 1900, max: new Date().getFullYear() })
      .withMessage(`設立年は1900年から${new Date().getFullYear()}年の間で入力してください`),
    
    body('employeeCount')
      .optional()
      .isInt({ min: 1 })
      .withMessage('従業員数は1人以上で入力してください'),
    
    body('status')
      .optional()
      .isIn(['active', 'inactive', 'pending'])
      .withMessage('ステータスは active, inactive, pending のいずれかを選択してください')
  ]
};

module.exports = designCompanyValidation;