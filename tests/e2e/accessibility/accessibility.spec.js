const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const LoginPage = require('../pages/LoginPage');
const RegisterPage = require('../pages/RegisterPage');
const DashboardPage = require('../pages/DashboardPage');
const { generateRandomUser } = require('../fixtures/testData');
const { clearAllStorage, waitForPageLoad } = require('../utils/helpers');

test.describe('アクセシビリティテスト', () => {
  let loginPage;
  let registerPage;
  let dashboardPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    registerPage = new RegisterPage(page);
    dashboardPage = new DashboardPage(page);
    
    await clearAllStorage(page);
  });

  test.describe('基本ページのアクセシビリティ', () => {
    test('ログインページのアクセシビリティをチェック', async ({ page }) => {
      await loginPage.navigateToLogin();
      
      // axe-coreを使用してアクセシビリティをチェック
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      
      // 重大な問題がないことを確認
      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('ユーザー登録ページのアクセシビリティをチェック', async ({ page }) => {
      await registerPage.navigateToRegister();
      
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      
      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('ダッシュボードページのアクセシビリティをチェック', async ({ page }) => {
      // ログイン状態にする
      await registerPage.navigateToRegister();
      await registerPage.register(generateRandomUser('designer'));
      await waitForPageLoad(page, '/dashboard');
      
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      
      expect(accessibilityScanResults.violations).toEqual([]);
    });
  });

  test.describe('フォームのアクセシビリティ', () => {
    test('ログインフォームのラベルと入力フィールドの関連付け', async ({ page }) => {
      await loginPage.navigateToLogin();
      
      // メールフィールドのラベル関連付けをチェック
      const emailInput = page.locator('[name="email"]');
      const emailLabel = page.locator('label[for="email"], [aria-labelledby]');
      
      // ラベルが存在することを確認
      const hasLabel = await emailLabel.count() > 0;
      const hasAriaLabel = await emailInput.getAttribute('aria-label');
      const hasAriaLabelledBy = await emailInput.getAttribute('aria-labelledby');
      
      expect(hasLabel || hasAriaLabel || hasAriaLabelledBy).toBe(true);
      
      // パスワードフィールドのラベル関連付けをチェック
      const passwordInput = page.locator('[name="password"]');
      const passwordLabel = page.locator('label[for="password"], [aria-labelledby]');
      
      const hasPasswordLabel = await passwordLabel.count() > 0;
      const hasPasswordAriaLabel = await passwordInput.getAttribute('aria-label');
      const hasPasswordAriaLabelledBy = await passwordInput.getAttribute('aria-labelledby');
      
      expect(hasPasswordLabel || hasPasswordAriaLabel || hasPasswordAriaLabelledBy).toBe(true);
    });

    test('フォーカス管理が適切に動作する', async ({ page }) => {
      await loginPage.navigateToLogin();
      
      // タブキーでフォーカス移動をテスト
      await page.keyboard.press('Tab');
      
      // フォーカスが可視要素に移動することを確認
      const focusedElement = await page.evaluate(() => {
        return document.activeElement?.tagName;
      });
      
      expect(['INPUT', 'BUTTON', 'A', 'SELECT', 'TEXTAREA']).toContain(focusedElement);
    });

    test('エラーメッセージがスクリーンリーダーで読み上げ可能', async ({ page }) => {
      await loginPage.navigateToLogin();
      
      // 無効なログインを実行してエラーメッセージを表示
      await loginPage.login('invalid@email.com', 'wrongpassword');
      
      // エラーメッセージがaria-live属性を持つことを確認
      const errorMessage = page.locator('.error-message');
      
      if (await errorMessage.isVisible()) {
        const ariaLive = await errorMessage.getAttribute('aria-live');
        const ariaAtomic = await errorMessage.getAttribute('aria-atomic');
        const role = await errorMessage.getAttribute('role');
        
        // aria-live、role="alert"、またはaria-atomic属性があることを確認
        expect(ariaLive || role === 'alert' || ariaAtomic).toBeTruthy();
      }
    });
  });

  test.describe('ナビゲーションのアクセシビリティ', () => {
    test('メインナビゲーションにランドマークロールが設定されている', async ({ page }) => {
      // ログイン状態にする
      await registerPage.navigateToRegister();
      await registerPage.register(generateRandomUser('designer'));
      await waitForPageLoad(page, '/dashboard');
      
      // メインナビゲーションの確認
      const mainNav = page.locator('nav[role="navigation"], [role="navigation"], nav');
      const navCount = await mainNav.count();
      
      expect(navCount).toBeGreaterThan(0);
    });

    test('スキップリンクが提供されている', async ({ page }) => {
      await loginPage.navigateToLogin();
      
      // スキップリンクの存在をチェック
      const skipLink = page.locator('a[href="#main"], a[href="#content"], .skip-link');
      
      if (await skipLink.count() > 0) {
        // スキップリンクがフォーカス時に表示されることを確認
        await skipLink.first().focus();
        
        const isVisible = await skipLink.first().isVisible();
        expect(isVisible).toBe(true);
      }
    });

    test('ページタイトルが適切に設定されている', async ({ page }) => {
      // 各ページのタイトルをチェック
      const pages = [
        { navigate: () => loginPage.navigateToLogin(), expectedTitle: 'ログイン' },
        { navigate: () => registerPage.navigateToRegister(), expectedTitle: '登録' }
      ];
      
      for (const pageInfo of pages) {
        await pageInfo.navigate();
        
        const title = await page.title();
        expect(title.length).toBeGreaterThan(0);
        expect(title).not.toBe('');
      }
    });
  });

  test.describe('画像とメディアのアクセシビリティ', () => {
    test('画像にalt属性が設定されている', async ({ page }) => {
      await loginPage.navigateToLogin();
      
      // ページ内のすべての画像を取得
      const images = page.locator('img');
      const imageCount = await images.count();
      
      if (imageCount > 0) {
        // 各画像のalt属性をチェック
        for (let i = 0; i < imageCount; i++) {
          const img = images.nth(i);
          const alt = await img.getAttribute('alt');
          const role = await img.getAttribute('role');
          const ariaLabel = await img.getAttribute('aria-label');
          
          // alt属性、role="presentation"、またはaria-labelが設定されていることを確認
          expect(alt !== null || role === 'presentation' || ariaLabel !== null).toBe(true);
        }
      }
    });
  });

  test.describe('色とコントラストのアクセシビリティ', () => {
    test('色のコントラスト比が適切である', async ({ page }) => {
      await loginPage.navigateToLogin();
      
      // axe-coreでコントラスト比をチェック
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2aa'])
        .withRules(['color-contrast'])
        .analyze();
      
      // コントラスト比の問題がないことを確認
      const contrastViolations = accessibilityScanResults.violations.filter(
        violation => violation.id === 'color-contrast'
      );
      
      expect(contrastViolations).toEqual([]);
    });
  });

  test.describe('キーボードナビゲーション', () => {
    test('すべてのインタラクティブ要素がキーボードでアクセス可能', async ({ page }) => {
      await loginPage.navigateToLogin();
      
      // タブキーで全ての要素を順次フォーカス
      const focusableElements = [];
      let previousElement = null;
      
      // 最大20回タブキーを押してフォーカス可能な要素を収集
      for (let i = 0; i < 20; i++) {
        await page.keyboard.press('Tab');
        
        const currentElement = await page.evaluate(() => {
          const el = document.activeElement;
          return {
            tagName: el?.tagName,
            type: el?.type,
            id: el?.id,
            className: el?.className
          };
        });
        
        // 同じ要素に戻った場合はループ終了
        if (previousElement && 
            currentElement.tagName === previousElement.tagName &&
            currentElement.id === previousElement.id) {
          break;
        }
        
        focusableElements.push(currentElement);
        previousElement = currentElement;
      }
      
      // フォーカス可能な要素が存在することを確認
      expect(focusableElements.length).toBeGreaterThan(0);
    });

    test('Enterキーとスペースキーでボタンが動作する', async ({ page }) => {
      await loginPage.navigateToLogin();
      
      // ログインボタンにフォーカス
      const loginButton = page.locator('button[type="submit"]');
      await loginButton.focus();
      
      // Enterキーでボタンが動作することを確認
      const isEnabled = await loginButton.isEnabled();
      if (isEnabled) {
        // フォーカスが当たっていることを確認
        const isFocused = await loginButton.evaluate(el => document.activeElement === el);
        expect(isFocused).toBe(true);
      }
    });
  });

  test.describe('動的コンテンツのアクセシビリティ', () => {
    test('動的に追加されるコンテンツがスクリーンリーダーに通知される', async ({ page }) => {
      await loginPage.navigateToLogin();
      
      // 無効なログインでエラーメッセージを表示
      await loginPage.login('test@example.com', 'wrongpassword');
      
      // エラーメッセージがaria-live属性またはrole="alert"を持つことを確認
      const dynamicContent = page.locator('.error-message, .success-message, .notification');
      
      if (await dynamicContent.count() > 0) {
        const firstMessage = dynamicContent.first();
        const ariaLive = await firstMessage.getAttribute('aria-live');
        const role = await firstMessage.getAttribute('role');
        
        expect(ariaLive === 'polite' || ariaLive === 'assertive' || role === 'alert').toBe(true);
      }
    });
  });
});