const validator = require('validator');

/**
 * カスタムバリデーション関数
 */
const customValidators = {
  /**
   * 日本語を含む文字列の長さチェック
   * @param {string} str - チェックする文字列
   * @param {number} min - 最小長
   * @param {number} max - 最大長
   */
  isValidLength: (str, min = 1, max = 255) => {
    if (!str) return false;
    const length = Array.from(str).length;
    return length >= min && length <= max;
  },

  /**
   * パスワード強度チェック
   * @param {string} password - チェックするパスワード
   */
  isStrongPassword: (password) => {
    return validator.isStrongPassword(password, {
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 0
    });
  },

  /**
   * URLスラッグの妥当性チェック
   * @param {string} slug - チェックするスラッグ
   */
  isValidSlug: (slug) => {
    if (!slug) return true; // オプショナル
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
  },

  /**
   * 日本の電話番号チェック
   * @param {string} phone - チェックする電話番号
   */
  isJapanesePhoneNumber: (phone) => {
    const cleaned = phone.replace(/[-\s]/g, '');
    return /^(0[0-9]{9,10}|0[0-9]{2,3}-[0-9]{4}-[0-9]{4})$/.test(cleaned);
  },

  /**
   * 安全なファイル名チェック
   * @param {string} filename - チェックするファイル名
   */
  isSafeFilename: (filename) => {
    return /^[a-zA-Z0-9_\-\.]+$/.test(filename);
  }
};

/**
 * バリデーションエラーメッセージの生成
 */
const errorMessages = {
  required: (field) => `${field}は必須です`,
  email: () => '有効なメールアドレスを入力してください',
  minLength: (field, length) => `${field}は${length}文字以上必要です`,
  maxLength: (field, length) => `${field}は${length}文字以下にしてください`,
  alphanumeric: (field) => `${field}は英数字のみ使用できます`,
  numeric: (field) => `${field}は数値を入力してください`,
  url: () => '有効なURLを入力してください',
  strongPassword: () => 'パスワードは8文字以上で、大文字・小文字・数字を含む必要があります',
  slug: () => 'スラッグは小文字英数字とハイフンのみ使用できます',
  phoneNumber: () => '有効な電話番号を入力してください'
};

/**
 * Express-validator用カスタムバリデーター
 */
const expressValidators = {
  isStrongPassword: {
    custom: (value) => customValidators.isStrongPassword(value),
    errorMessage: errorMessages.strongPassword()
  },
  isValidSlug: {
    custom: (value) => customValidators.isValidSlug(value),
    errorMessage: errorMessages.slug()
  },
  isJapanesePhoneNumber: {
    custom: (value) => customValidators.isJapanesePhoneNumber(value),
    errorMessage: errorMessages.phoneNumber()
  }
};

module.exports = {
  customValidators,
  errorMessages,
  expressValidators
};