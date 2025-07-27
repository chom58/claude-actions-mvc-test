const { test, expect } = require('@playwright/test');
const LoginPage = require('./pages/login.page');

test.describe('認証フロー', () => {
  let loginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test.describe('ログイン機能', () => {
    test('正しい認証情報でログインできる', async ({ page }) => {
      // E2Eテスト用ユーザーでログイン
      await loginPage.login('e2e_user@test.com', 'User123!@#');
      
      // ログイン成功後のリダイレクト確認
      await expect(page).toHaveURL('/');
      
      // ユーザー情報が表示されているか確認
      await expect(page.locator('.user-info')).toBeVisible();
    });

    test('間違った認証情報でエラーが表示される', async ({ page }) => {
      await loginPage.login('wrong@example.com', 'wrongpassword');
      
      // エラーメッセージの確認
      const hasError = await loginPage.hasErrorMessage();
      expect(hasError).toBeTruthy();
      
      const errorMessage = await loginPage.getErrorMessage();
      expect(errorMessage).toContain('認証に失敗しました');
    });

    test('必須項目が空の場合バリデーションエラーが表示される', async ({ page }) => {
      // 空のフォームで送信
      await loginPage.clickLogin();
      
      // HTML5バリデーションの確認
      const validation = await loginPage.checkValidation();
      expect(validation.email.valid).toBeFalsy();
      expect(validation.password.valid).toBeFalsy();
    });

    test('Remember Me機能が動作する', async ({ page, context }) => {
      // Remember Meを有効にしてログイン
      await loginPage.login('e2e_user@test.com', 'User123!@#', true);
      
      // クッキーの確認
      const cookies = await context.cookies();
      const sessionCookie = cookies.find(c => c.name === 'connect.sid');
      
      expect(sessionCookie).toBeDefined();
      expect(sessionCookie.expires).toBeGreaterThan(Date.now() / 1000 + 86400); // 1日以上
    });
  });

  test.describe('ナビゲーション', () => {
    test('パスワードリセットページへ遷移できる', async ({ page }) => {
      await loginPage.clickForgotPassword();
      await expect(page).toHaveURL('/forgot-password');
    });

    test('新規登録ページへ遷移できる', async ({ page }) => {
      await loginPage.clickRegisterLink();
      await expect(page).toHaveURL('/register.html');
    });
  });

  test.describe('セキュリティ', () => {
    test('連続ログイン失敗でレート制限がかかる', async ({ page }) => {
      // 5回連続で失敗
      for (let i = 0; i < 5; i++) {
        await loginPage.login('e2e_user@test.com', 'wrongpassword');
        await loginPage.resetForm();
      }
      
      // 6回目はレート制限エラー
      await loginPage.login('e2e_user@test.com', 'User123!@#');
      
      const errorMessage = await loginPage.getErrorMessage();
      expect(errorMessage).toContain('試行回数が多すぎます');
    });

    test('XSS攻撃が防御される', async ({ page }) => {
      const xssPayload = '<script>alert("XSS")</script>';
      
      await loginPage.fillEmail(xssPayload);
      await loginPage.fillPassword('password');
      await loginPage.clickLogin();
      
      // アラートが表示されないことを確認
      let alertTriggered = false;
      page.on('dialog', () => {
        alertTriggered = true;
      });
      
      await page.waitForTimeout(1000);
      expect(alertTriggered).toBeFalsy();
    });
  });

  test.describe('レスポンシブデザイン', () => {
    test('モバイル表示で正しくレイアウトされる', async ({ page }) => {
      // モバイルビューポートに変更
      await page.setViewportSize({ width: 375, height: 667 });
      
      // 要素が正しく表示されているか確認
      await expect(page.locator(loginPage.selectors.emailInput)).toBeVisible();
      await expect(page.locator(loginPage.selectors.passwordInput)).toBeVisible();
      await expect(page.locator(loginPage.selectors.loginButton)).toBeVisible();
      
      // スクリーンショット撮影
      await loginPage.takeScreenshot('mobile-view');
    });
  });

  test.describe('アクセシビリティ', () => {
    test('キーボードナビゲーションが機能する', async ({ page }) => {
      // Tabキーでフォーカス移動
      await page.keyboard.press('Tab'); // メールフィールド
      await expect(page.locator(loginPage.selectors.emailInput)).toBeFocused();
      
      await page.keyboard.press('Tab'); // パスワードフィールド
      await expect(page.locator(loginPage.selectors.passwordInput)).toBeFocused();
      
      await page.keyboard.press('Tab'); // Remember Meチェックボックス
      await expect(page.locator(loginPage.selectors.rememberMeCheckbox)).toBeFocused();
      
      await page.keyboard.press('Tab'); // ログインボタン
      await expect(page.locator(loginPage.selectors.loginButton)).toBeFocused();
    });

    test('スクリーンリーダー用のラベルが設定されている', async ({ page }) => {
      // aria-labelまたはlabel要素の確認
      const emailLabel = await page.getAttribute(loginPage.selectors.emailInput, 'aria-label');
      const passwordLabel = await page.getAttribute(loginPage.selectors.passwordInput, 'aria-label');
      
      expect(emailLabel || await page.locator(`label[for="${await page.getAttribute(loginPage.selectors.emailInput, 'id')}"]`).count()).toBeTruthy();
      expect(passwordLabel || await page.locator(`label[for="${await page.getAttribute(loginPage.selectors.passwordInput, 'id')}"]`).count()).toBeTruthy();
    });
  });
});