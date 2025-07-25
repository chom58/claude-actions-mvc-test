const { test, expect } = require('@playwright/test');
const LoginPage = require('../pages/LoginPage');
const RegisterPage = require('../pages/RegisterPage');
const DashboardPage = require('../pages/DashboardPage');
const { validUsers, invalidUsers, generateRandomUser } = require('../fixtures/testData');
const { 
  waitForPageLoad, 
  clearAllStorage, 
  takeScreenshot,
  generateUniqueEmail,
  monitorConsoleErrors
} = require('../utils/helpers');

test.describe('認証フロー', () => {
  let loginPage;
  let registerPage;
  let dashboardPage;
  let getConsoleErrors;

  test.beforeEach(async ({ page }) => {
    // ページオブジェクトを初期化
    loginPage = new LoginPage(page);
    registerPage = new RegisterPage(page);
    dashboardPage = new DashboardPage(page);
    
    // コンソールエラーの監視を開始
    getConsoleErrors = monitorConsoleErrors(page);
    
    // ストレージをクリア
    await clearAllStorage(page);
  });

  test.afterEach(async ({ page }, testInfo) => {
    // コンソールエラーをチェック
    const consoleErrors = getConsoleErrors();
    if (consoleErrors.length > 0) {
      console.warn('Console errors detected:', consoleErrors);
    }
    
    // テスト失敗時にスクリーンショットを撮影
    if (testInfo.status !== 'passed') {
      await takeScreenshot(page, testInfo.title, 'failure');
    }
  });

  test.describe('ユーザー登録フロー', () => {
    test('新規ユーザー登録ができる', async ({ page }) => {
      // 登録ページに移動
      await registerPage.navigateToRegister();
      
      // フォームが表示されることを確認
      expect(await registerPage.isRegisterFormVisible()).toBe(true);
      
      // ランダムなユーザーデータで登録
      const userData = generateRandomUser('designer');
      await registerPage.register(userData);
      
      // ダッシュボードページにリダイレクトされることを確認
      await waitForPageLoad(page, '/dashboard');
      expect(dashboardPage.getCurrentUrl()).toContain('/dashboard');
      
      // ウェルカムメッセージが表示されることを確認
      const welcomeMessage = await dashboardPage.getWelcomeMessage();
      expect(welcomeMessage).toContain('ようこそ');
      
      // ユーザーがログイン状態であることを確認
      expect(await dashboardPage.isUserLoggedIn()).toBe(true);
    });

    test('デザイナープロフィールでの登録ができる', async ({ page }) => {
      await registerPage.navigateToRegister();
      
      const designerData = {
        ...generateRandomUser('designer'),
        skills: 'UI/UX Design, Figma, Sketch',
        portfolioUrl: 'https://portfolio.example.com'
      };
      
      await registerPage.register(designerData);
      await waitForPageLoad(page, '/dashboard');
      
      // プロフィール情報が正しく保存されていることを確認
      const profile = await dashboardPage.getUserProfile();
      expect(profile.profileType).toContain('デザイナー');
    });

    test('企業プロフィールでの登録ができる', async ({ page }) => {
      await registerPage.navigateToRegister();
      
      const companyData = {
        ...generateRandomUser('company'),
        skills: 'アパレル製造, ブランド運営',
        experience: 'expert'
      };
      
      await registerPage.register(companyData);
      await waitForPageLoad(page, '/dashboard');
      
      const profile = await dashboardPage.getUserProfile();
      expect(profile.profileType).toContain('企業');
    });

    test('必須フィールド未入力時にバリデーションエラーが表示される', async ({ page }) => {
      await registerPage.navigateToRegister();
      
      // 空のフォームで送信
      await registerPage.register(invalidUsers.emptyFields);
      
      // バリデーションメッセージが表示されることを確認
      const validationMessages = await registerPage.getValidationMessages();
      expect(validationMessages.length).toBeGreaterThan(0);
      
      // ページが登録ページのままであることを確認
      expect(registerPage.getCurrentUrl()).toContain('/register');
    });

    test('無効なメールアドレスでバリデーションエラーが表示される', async ({ page }) => {
      await registerPage.navigateToRegister();
      
      await registerPage.register(invalidUsers.invalidEmail);
      
      const errorMessage = await registerPage.getErrorMessage();
      expect(errorMessage).toBeTruthy();
    });

    test('弱いパスワードでバリデーションエラーが表示される', async ({ page }) => {
      await registerPage.navigateToRegister();
      
      await registerPage.register(invalidUsers.weakPassword);
      
      const validationMessages = await registerPage.getValidationMessages();
      expect(validationMessages.some(msg => 
        msg.includes('パスワード') || msg.includes('password')
      )).toBe(true);
    });

    test('パスワード確認が一致しない場合にエラーが表示される', async ({ page }) => {
      await registerPage.navigateToRegister();
      
      const passwordMatch = await registerPage.checkPasswordMatch(
        'TestPassword123!',
        'DifferentPassword456!'
      );
      
      expect(passwordMatch).toBe(false);
    });

    test('重複メールアドレスでエラーが表示される', async ({ page }) => {
      // 最初のユーザーを登録
      await registerPage.navigateToRegister();
      const firstUser = generateRandomUser();
      await registerPage.register(firstUser);
      await waitForPageLoad(page, '/dashboard');
      
      // ログアウト
      await dashboardPage.logout();
      await waitForPageLoad(page, '/login');
      
      // 同じメールアドレスで再度登録を試行
      await registerPage.navigateToRegister();
      const duplicateUser = {
        ...generateRandomUser(),
        email: firstUser.email // 同じメールアドレス
      };
      
      await registerPage.register(duplicateUser);
      
      const errorMessage = await registerPage.getErrorMessage();
      expect(errorMessage).toContain('既に使用されています');
    });
  });

  test.describe('ログインフロー', () => {
    // テスト用ユーザーを事前に登録
    test.beforeEach(async ({ page }) => {
      await registerPage.navigateToRegister();
      await registerPage.register(validUsers.designer);
      await waitForPageLoad(page, '/dashboard');
      await dashboardPage.logout();
      await waitForPageLoad(page, '/login');
    });

    test('有効な認証情報でログインできる', async ({ page }) => {
      await loginPage.navigateToLogin();
      
      // ログインフォームが表示されることを確認
      expect(await loginPage.isLoginFormVisible()).toBe(true);
      
      // ログイン実行
      await loginPage.login(validUsers.designer.email, validUsers.designer.password);
      
      // ダッシュボードにリダイレクトされることを確認
      await waitForPageLoad(page, '/dashboard');
      expect(await dashboardPage.isUserLoggedIn()).toBe(true);
    });

    test('無効なメールアドレスでログインエラーが表示される', async ({ page }) => {
      await loginPage.navigateToLogin();
      
      await loginPage.login('invalid@email.com', validUsers.designer.password);
      
      const errorMessage = await loginPage.getErrorMessage();
      expect(errorMessage).toBeTruthy();
      expect(loginPage.getCurrentUrl()).toContain('/login');
    });

    test('無効なパスワードでログインエラーが表示される', async ({ page }) => {
      await loginPage.navigateToLogin();
      
      await loginPage.login(validUsers.designer.email, 'wrongpassword');
      
      const errorMessage = await loginPage.getErrorMessage();
      expect(errorMessage).toBeTruthy();
      expect(loginPage.getCurrentUrl()).toContain('/login');
    });

    test('必須フィールド未入力時にバリデーションが動作する', async ({ page }) => {
      await loginPage.navigateToLogin();
      
      const validation = await loginPage.checkValidation();
      
      expect(validation.email.valid).toBe(false);
      expect(validation.password.valid).toBe(false);
    });
  });

  test.describe('ログアウトフロー', () => {
    test.beforeEach(async ({ page }) => {
      // ログイン状態にする
      await registerPage.navigateToRegister();
      await registerPage.register(generateRandomUser());
      await waitForPageLoad(page, '/dashboard');
    });

    test('ログアウトが正常に動作する', async ({ page }) => {
      // ログイン状態であることを確認
      expect(await dashboardPage.isUserLoggedIn()).toBe(true);
      
      // ログアウト実行
      await dashboardPage.logout();
      
      // ログインページにリダイレクトされることを確認
      await waitForPageLoad(page, '/login');
      expect(loginPage.getCurrentUrl()).toContain('/login');
    });

    test('ログアウト後にダッシュボードにアクセスできない', async ({ page }) => {
      // ログアウト
      await dashboardPage.logout();
      await waitForPageLoad(page, '/login');
      
      // ダッシュボードに直接アクセスを試行
      await page.goto('/dashboard');
      
      // ログインページにリダイレクトされることを確認
      await waitForPageLoad(page, '/login');
      expect(loginPage.getCurrentUrl()).toContain('/login');
    });
  });

  test.describe('ソーシャル認証フロー', () => {
    test.skip('Googleログインボタンが表示される', async ({ page }) => {
      // Note: 実際のソーシャル認証テストは外部サービスとの連携が必要
      // ここではUIの存在確認のみ
      await loginPage.navigateToLogin();
      
      const googleButton = await page.locator('.social-login-google');
      expect(await googleButton.isVisible()).toBe(true);
    });

    test.skip('GitHubログインボタンが表示される', async ({ page }) => {
      await loginPage.navigateToLogin();
      
      const githubButton = await page.locator('.social-login-github');
      expect(await githubButton.isVisible()).toBe(true);
    });
  });

  test.describe('パスワードリセットフロー', () => {
    test.skip('パスワードリセットページに移動できる', async ({ page }) => {
      await loginPage.navigateToLogin();
      await loginPage.goToForgotPassword();
      
      await waitForPageLoad(page, '/forgot-password');
      expect(page.url()).toContain('/forgot-password');
    });
  });
});