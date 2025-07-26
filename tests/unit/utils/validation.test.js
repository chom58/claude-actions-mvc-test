const {
  validateEmail,
  validatePassword,
  validateUsername,
  sanitizeInput
} = require('../../../src/utils/validation');

describe('Validation Utils', () => {
  describe('validateEmail', () => {
    test('有効なメールアドレスの検証', () => {
      const validEmails = [
        'user@example.com',
        'test.email@domain.co.jp',
        'user+tag@example.org',
        'user123@test-domain.com'
      ];

      validEmails.forEach(email => {
        expect(validateEmail(email)).toBe(true);
      });
    });

    test('無効なメールアドレスの検証', () => {
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user..double.dot@example.com',
        'user@domain',
        ''
      ];

      invalidEmails.forEach(email => {
        expect(validateEmail(email)).toBe(false);
      });
    });
  });

  describe('validatePassword', () => {
    test('有効なパスワードの検証', () => {
      const validPasswords = [
        'Password123!',
        'MySecure@Pass1',
        'Complex#Password2023',
        'Valid$Password9'
      ];

      validPasswords.forEach(password => {
        expect(validatePassword(password)).toBe(true);
      });
    });

    test('無効なパスワードの検証', () => {
      const invalidPasswords = [
        'short',           // 短すぎる
        'lowercase123!',   // 大文字なし
        'UPPERCASE123!',   // 小文字なし
        'NoNumbers!',      // 数字なし
        'NoSpecialChar123', // 特殊文字なし
        'ValidPassword123' // 特殊文字なし
      ];

      invalidPasswords.forEach(password => {
        expect(validatePassword(password)).toBe(false);
      });
    });
  });

  describe('validateUsername', () => {
    test('有効なユーザー名の検証', () => {
      const validUsernames = [
        'user123',
        'test_user',
        'my-username',
        'User.Name',
        'validuser'
      ];

      validUsernames.forEach(username => {
        expect(validateUsername(username)).toBe(true);
      });
    });

    test('無効なユーザー名の検証', () => {
      const invalidUsernames = [
        'a',               // 短すぎる
        'very-long-username-that-exceeds-maximum-length', // 長すぎる
        'user name',       // スペース含む
        'user@name',       // 無効な文字
        '123user',         // 数字で開始
        '',                // 空文字
        'user#name'        // 無効な文字
      ];

      invalidUsernames.forEach(username => {
        expect(validateUsername(username)).toBe(false);
      });
    });
  });

  describe('sanitizeInput', () => {
    test('HTMLエスケープ処理', () => {
      const inputs = [
        { input: '<script>alert("xss")</script>', expected: '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;' },
        { input: 'Normal text', expected: 'Normal text' },
        { input: '<div>Content</div>', expected: '&lt;div&gt;Content&lt;/div&gt;' },
        { input: "O'Reilly & Associates", expected: 'O&#x27;Reilly &amp; Associates' }
      ];

      inputs.forEach(({ input, expected }) => {
        expect(sanitizeInput(input)).toBe(expected);
      });
    });

    test('空文字と nullの処理', () => {
      expect(sanitizeInput('')).toBe('');
      expect(sanitizeInput(null)).toBe('');
      expect(sanitizeInput(undefined)).toBe('');
    });

    test('数値の処理', () => {
      expect(sanitizeInput(123)).toBe('123');
      expect(sanitizeInput(0)).toBe('0');
    });
  });

  describe('エッジケース', () => {
    test('非常に長い入力値の処理', () => {
      const longString = 'a'.repeat(10000);
      expect(() => sanitizeInput(longString)).not.toThrow();
    });

    test('特殊Unicode文字の処理', () => {
      const unicodeInput = '🚀 ユニコード テスト 👍';
      expect(() => sanitizeInput(unicodeInput)).not.toThrow();
    });

    test('SQLインジェクション攻撃パターンの検証', () => {
      const sqlInjectionAttempts = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "UNION SELECT * FROM passwords"
      ];

      sqlInjectionAttempts.forEach(attempt => {
        const sanitized = sanitizeInput(attempt);
        expect(sanitized).not.toContain("'");
        expect(sanitized).not.toContain(";");
      });
    });
  });
});