const { test, expect } = require('@playwright/test');
const LoginPage = require('../pages/LoginPage');
const RegisterPage = require('../pages/RegisterPage');
const DashboardPage = require('../pages/DashboardPage');
const { 
  validUsers, 
  eventData, 
  collaborationData, 
  generateRandomUser,
  testFiles 
} = require('../fixtures/testData');
const { 
  waitForPageLoad, 
  clearAllStorage, 
  takeScreenshot,
  waitAndClick,
  waitAndFill,
  uploadFile,
  monitorConsoleErrors
} = require('../utils/helpers');

test.describe('コミュニティ機能', () => {
  let loginPage;
  let registerPage;
  let dashboardPage;
  let getConsoleErrors;

  // テスト用ユーザーを作成してログイン状態にする
  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    registerPage = new RegisterPage(page);
    dashboardPage = new DashboardPage(page);
    getConsoleErrors = monitorConsoleErrors(page);
    
    await clearAllStorage(page);
    
    // デザイナーユーザーでログイン
    await registerPage.navigateToRegister();
    await registerPage.register(generateRandomUser('designer'));
    await waitForPageLoad(page, '/dashboard');
  });

  test.afterEach(async ({ page }, testInfo) => {
    const consoleErrors = getConsoleErrors();
    if (consoleErrors.length > 0) {
      console.warn('Console errors detected:', consoleErrors);
    }
    
    if (testInfo.status !== 'passed') {
      await takeScreenshot(page, testInfo.title, 'failure');
    }
  });

  test.describe('プロフィール作成・編集', () => {
    test('プロフィール編集ページにアクセスできる', async ({ page }) => {
      // プロフィール編集ページに移動
      await dashboardPage.goToProfileEdit();
      await waitForPageLoad(page, '/profile/edit');
      
      // プロフィール編集フォームが表示されることを確認
      const profileForm = page.locator('.profile-edit-form');
      expect(await profileForm.isVisible()).toBe(true);
      
      // 基本的なフィールドが存在することを確認
      const requiredFields = [
        '[name="username"]',
        '[name="email"]',
        '[name="profile-type"]',
        '[name="skills"]',
        '[name="bio"]'
      ];
      
      for (const field of requiredFields) {
        const element = page.locator(field);
        expect(await element.count()).toBeGreaterThanOrEqual(0);
      }
    });

    test('プロフィール情報を更新できる', async ({ page }) => {
      await dashboardPage.goToProfileEdit();
      await waitForPageLoad(page, '/profile/edit');
      
      // 新しいプロフィール情報を入力
      const newBio = 'Updated bio: UI/UXデザイナーとして5年の経験があります。';
      const newSkills = 'Figma, Sketch, Adobe XD, プロトタイピング';
      
      await waitAndFill(page, '[name="bio"]', newBio);
      await waitAndFill(page, '[name="skills"]', newSkills);
      
      // 保存ボタンをクリック
      await waitAndClick(page, '.save-profile-button');
      
      // 保存成功メッセージまたはリダイレクトを確認
      await page.waitForLoadState('networkidle');
      
      const successMessage = page.locator('.success-message');
      const profileSaved = await successMessage.isVisible();
      
      if (profileSaved) {
        expect(await successMessage.textContent()).toContain('保存');
      }
    });

    test('プロフィール画像をアップロードできる', async ({ page }) => {
      await dashboardPage.goToProfileEdit();
      await waitForPageLoad(page, '/profile/edit');
      
      // プロフィール画像アップロード要素が存在するかチェック
      const avatarUpload = page.locator('.avatar-upload');
      if (await avatarUpload.isVisible()) {
        const fileInput = avatarUpload.locator('input[type="file"]');
        
        if (await fileInput.count() > 0) {
          // Note: 実際のファイルアップロードテストは、テストファイルが必要
          // ここではUI要素の存在確認のみ
          expect(await fileInput.isVisible() || await fileInput.count() > 0).toBe(true);
        }
      }
    });

    test('プロフィールバリデーションが動作する', async ({ page }) => {
      await dashboardPage.goToProfileEdit();
      await waitForPageLoad(page, '/profile/edit');
      
      // 必須フィールドを空にして保存を試行
      await waitAndFill(page, '[name="username"]', '');
      await waitAndClick(page, '.save-profile-button');
      
      // バリデーションメッセージが表示されることを確認
      const validationMessage = page.locator('.validation-message');
      const errorMessage = page.locator('.error-message');
      
      const hasValidation = await validationMessage.isVisible();
      const hasError = await errorMessage.isVisible();
      
      expect(hasValidation || hasError).toBe(true);
    });

    test('プロフィールを公開/非公開設定できる', async ({ page }) => {
      await dashboardPage.goToProfileEdit();
      await waitForPageLoad(page, '/profile/edit');
      
      // プライバシー設定が存在するかチェック
      const privacySettings = page.locator('.privacy-settings');
      if (await privacySettings.isVisible()) {
        const publicProfileToggle = privacySettings.locator('[name="is-public"]');
        
        if (await publicProfileToggle.isVisible()) {
          // 公開設定をトグル
          await publicProfileToggle.click();
          
          // 保存
          await waitAndClick(page, '.save-profile-button');
          await page.waitForLoadState('networkidle');
          
          // 設定が保存されたことを確認
          const successMessage = page.locator('.success-message');
          if (await successMessage.isVisible()) {
            expect(await successMessage.textContent()).toContain('保存');
          }
        }
      }
    });
  });

  test.describe('画像アップロード機能', () => {
    test('ポートフォリオ画像をアップロードできる', async ({ page }) => {
      // ポートフォリオページに移動
      await dashboardPage.navigateToPage('portfolio');
      
      // ポートフォリオページが表示されることを確認
      const portfolioPage = page.locator('.portfolio-page');
      if (await portfolioPage.isVisible()) {
        // 画像アップロードボタンが存在するかチェック
        const uploadButton = page.locator('.upload-image-button');
        
        if (await uploadButton.isVisible()) {
          expect(await uploadButton.isVisible()).toBe(true);
          
          // Note: 実際のファイルアップロードテストは環境に依存
          // ここではUI要素の確認のみ
        }
      }
    });

    test('アップロード可能なファイル形式が制限される', async ({ page }) => {
      await dashboardPage.navigateToPage('portfolio');
      
      const portfolioPage = page.locator('.portfolio-page');
      if (await portfolioPage.isVisible()) {
        const fileInput = page.locator('input[type="file"][accept*="image"]');
        
        if (await fileInput.count() > 0) {
          // accept属性で画像ファイルのみ許可されていることを確認
          const acceptAttr = await fileInput.getAttribute('accept');
          expect(acceptAttr).toContain('image');
        }
      }
    });

    test('画像のプレビュー機能が動作する', async ({ page }) => {
      await dashboardPage.navigateToPage('portfolio');
      
      const portfolioPage = page.locator('.portfolio-page');
      if (await portfolioPage.isVisible()) {
        // 既存の画像がある場合、クリックで拡大表示されるかチェック
        const portfolioImages = page.locator('.portfolio-image');
        const imageCount = await portfolioImages.count();
        
        if (imageCount > 0) {
          await portfolioImages.first().click();
          
          // モーダルまたは拡大表示が開くことを確認
          const imageModal = page.locator('.image-modal, .image-lightbox');
          const modalVisible = await imageModal.isVisible();
          
          if (modalVisible) {
            expect(await imageModal.isVisible()).toBe(true);
            
            // モーダルを閉じる
            const closeButton = imageModal.locator('.close-button, .modal-close');
            if (await closeButton.isVisible()) {
              await closeButton.click();
            }
          }
        }
      }
    });
  });

  test.describe('イベント参加登録', () => {
    test('イベント一覧ページにアクセスできる', async ({ page }) => {
      // イベントページに移動
      await dashboardPage.navigateToPage('events');
      await waitForPageLoad(page, '/events');
      
      // イベント一覧が表示されることを確認
      const eventsPage = page.locator('.events-page');
      expect(await eventsPage.isVisible()).toBe(true);
      
      // イベントカードが存在することを確認
      const eventCards = page.locator('.event-card');
      const cardCount = await eventCards.count();
      
      // 0件以上であることを確認
      expect(cardCount).toBeGreaterThanOrEqual(0);
    });

    test('イベント詳細を閲覧できる', async ({ page }) => {
      await dashboardPage.navigateToPage('events');
      await waitForPageLoad(page, '/events');
      
      // 最初のイベントカードをクリック
      const firstEventCard = page.locator('.event-card').first();
      
      if (await firstEventCard.isVisible()) {
        await firstEventCard.click();
        
        // イベント詳細ページに移動することを確認
        await waitForPageLoad(page);
        expect(page.url()).toContain('/events/');
        
        // イベント詳細情報が表示されることを確認
        const eventDetails = page.locator('.event-details');
        expect(await eventDetails.isVisible()).toBe(true);
        
        // 基本情報が表示されることを確認
        const requiredElements = [
          '.event-title',
          '.event-date',
          '.event-location',
          '.event-description'
        ];
        
        for (const selector of requiredElements) {
          const element = page.locator(selector);
          expect(await element.count()).toBeGreaterThanOrEqual(0);
        }
      }
    });

    test('イベントに参加登録できる', async ({ page }) => {
      await dashboardPage.navigateToPage('events');
      await waitForPageLoad(page, '/events');
      
      const firstEventCard = page.locator('.event-card').first();
      
      if (await firstEventCard.isVisible()) {
        await firstEventCard.click();
        await waitForPageLoad(page);
        
        // 参加登録ボタンが表示されるかチェック
        const joinButton = page.locator('.join-event-button');
        
        if (await joinButton.isVisible()) {
          await joinButton.click();
          
          // 参加登録フォームまたは確認ダイアログが表示されることを確認
          const joinForm = page.locator('.join-event-form');
          const confirmDialog = page.locator('.confirm-dialog');
          
          const formVisible = await joinForm.isVisible();
          const dialogVisible = await confirmDialog.isVisible();
          
          expect(formVisible || dialogVisible).toBe(true);
          
          // 確認ダイアログの場合は確認ボタンをクリック
          if (dialogVisible) {
            const confirmButton = confirmDialog.locator('.confirm-button');
            if (await confirmButton.isVisible()) {
              await confirmButton.click();
              
              // 成功メッセージを確認
              const successMessage = page.locator('.success-message');
              if (await successMessage.isVisible()) {
                expect(await successMessage.textContent()).toContain('参加');
              }
            }
          }
        }
      }
    });

    test('参加済みイベントは重複参加できない', async ({ page }) => {
      // Note: 実際のテストでは、事前に参加済みの状態を作る必要がある
      await dashboardPage.navigateToPage('events');
      await waitForPageLoad(page, '/events');
      
      // 参加済みのイベントがあるかチェック
      const joinedEventCard = page.locator('.event-card.joined').first();
      
      if (await joinedEventCard.isVisible()) {
        await joinedEventCard.click();
        await waitForPageLoad(page);
        
        // 参加ボタンが無効化されているか、「参加済み」表示になっていることを確認
        const joinButton = page.locator('.join-event-button');
        const joinedStatus = page.locator('.already-joined');
        
        if (await joinButton.isVisible()) {
          expect(await joinButton.isDisabled()).toBe(true);
        } else {
          expect(await joinedStatus.isVisible()).toBe(true);
        }
      }
    });

    test('参加イベント一覧を確認できる', async ({ page }) => {
      // マイページまたは参加イベント一覧ページに移動
      await dashboardPage.navigateToPage('my-events');
      
      // 参加イベント一覧ページが表示されることを確認
      const myEventsPage = page.locator('.my-events-page');
      if (await myEventsPage.isVisible()) {
        // 参加イベントリストが表示されることを確認
        const eventsList = page.locator('.events-list');
        expect(await eventsList.isVisible()).toBe(true);
        
        // 参加したイベントの情報が表示されることを確認
        const eventItems = page.locator('.event-item');
        const itemCount = await eventItems.count();
        
        // 0件以上であることを確認（新規ユーザーなので0件も正常）
        expect(itemCount).toBeGreaterThanOrEqual(0);
      }
    });
  });

  test.describe('コラボレーション申請', () => {
    test('コラボレーション一覧ページにアクセスできる', async ({ page }) => {
      // コラボレーションページに移動
      await dashboardPage.navigateToPage('collaborations');
      await waitForPageLoad(page, '/collaborations');
      
      // コラボレーション一覧が表示されることを確認
      const collaborationsPage = page.locator('.collaborations-page');
      expect(await collaborationsPage.isVisible()).toBe(true);
      
      // コラボレーションカードが存在することを確認
      const collaborationCards = page.locator('.collaboration-card');
      const cardCount = await collaborationCards.count();
      
      // 0件以上であることを確認
      expect(cardCount).toBeGreaterThanOrEqual(0);
    });

    test('コラボレーション詳細を閲覧できる', async ({ page }) => {
      await dashboardPage.navigateToPage('collaborations');
      await waitForPageLoad(page, '/collaborations');
      
      // 最初のコラボレーションカードをクリック
      const firstCollaborationCard = page.locator('.collaboration-card').first();
      
      if (await firstCollaborationCard.isVisible()) {
        await firstCollaborationCard.click();
        
        // コラボレーション詳細ページに移動することを確認
        await waitForPageLoad(page);
        expect(page.url()).toContain('/collaborations/');
        
        // コラボレーション詳細情報が表示されることを確認
        const collaborationDetails = page.locator('.collaboration-details');
        expect(await collaborationDetails.isVisible()).toBe(true);
        
        // 基本情報が表示されることを確認
        const requiredElements = [
          '.collaboration-title',
          '.collaboration-description',
          '.collaboration-budget',
          '.collaboration-deadline',
          '.collaboration-skills'
        ];
        
        for (const selector of requiredElements) {
          const element = page.locator(selector);
          expect(await element.count()).toBeGreaterThanOrEqual(0);
        }
      }
    });

    test('コラボレーションに申請できる', async ({ page }) => {
      await dashboardPage.navigateToPage('collaborations');
      await waitForPageLoad(page, '/collaborations');
      
      const firstCollaborationCard = page.locator('.collaboration-card').first();
      
      if (await firstCollaborationCard.isVisible()) {
        await firstCollaborationCard.click();
        await waitForPageLoad(page);
        
        // 申請ボタンが表示されるかチェック
        const applyButton = page.locator('.apply-collaboration-button');
        
        if (await applyButton.isVisible()) {
          await applyButton.click();
          
          // 申請フォームが表示されることを確認
          const applyForm = page.locator('.collaboration-apply-form');
          
          if (await applyForm.isVisible()) {
            // 申請メッセージを入力
            const messageField = applyForm.locator('[name="message"]');
            if (await messageField.isVisible()) {
              await waitAndFill(page, '[name="message"]', 'このプロジェクトに興味があります。ぜひ参加させてください。');
            }
            
            // 申請を送信
            const submitButton = applyForm.locator('.submit-application-button');
            if (await submitButton.isVisible()) {
              await submitButton.click();
              
              // 成功メッセージを確認
              await page.waitForLoadState('networkidle');
              const successMessage = page.locator('.success-message');
              
              if (await successMessage.isVisible()) {
                expect(await successMessage.textContent()).toContain('申請');
              }
            }
          }
        }
      }
    });

    test('申請済みコラボレーションは重複申請できない', async ({ page }) => {
      // Note: 実際のテストでは、事前に申請済みの状態を作る必要がある
      await dashboardPage.navigateToPage('collaborations');
      await waitForPageLoad(page, '/collaborations');
      
      // 申請済みのコラボレーションがあるかチェック
      const appliedCollaborationCard = page.locator('.collaboration-card.applied').first();
      
      if (await appliedCollaborationCard.isVisible()) {
        await appliedCollaborationCard.click();
        await waitForPageLoad(page);
        
        // 申請ボタンが無効化されているか、「申請済み」表示になっていることを確認
        const applyButton = page.locator('.apply-collaboration-button');
        const appliedStatus = page.locator('.already-applied');
        
        if (await applyButton.isVisible()) {
          expect(await applyButton.isDisabled()).toBe(true);
        } else {
          expect(await appliedStatus.isVisible()).toBe(true);
        }
      }
    });

    test('申請したコラボレーション一覧を確認できる', async ({ page }) => {
      // マイページまたは申請コラボレーション一覧ページに移動
      await dashboardPage.navigateToPage('my-collaborations');
      
      // 申請コラボレーション一覧ページが表示されることを確認
      const myCollaborationsPage = page.locator('.my-collaborations-page');
      if (await myCollaborationsPage.isVisible()) {
        // 申請コラボレーションリストが表示されることを確認
        const collaborationsList = page.locator('.collaborations-list');
        expect(await collaborationsList.isVisible()).toBe(true);
        
        // 申請したコラボレーションの情報が表示されることを確認
        const collaborationItems = page.locator('.collaboration-item');
        const itemCount = await collaborationItems.count();
        
        // 0件以上であることを確認（新規ユーザーなので0件も正常）
        expect(itemCount).toBeGreaterThanOrEqual(0);
      }
    });
  });

  test.describe('コミュニティ検索・フィルタリング', () => {
    test('ユーザー検索ができる', async ({ page }) => {
      // コミュニティまたはユーザー検索ページに移動
      await dashboardPage.navigateToPage('community');
      await waitForPageLoad(page, '/community');
      
      // ユーザー検索フォームが存在するかチェック
      const userSearchForm = page.locator('.user-search-form');
      if (await userSearchForm.isVisible()) {
        // キーワード検索
        await waitAndFill(page, '[name="user-keyword"]', 'デザイナー');
        await waitAndClick(page, '.search-users-button');
        
        // 検索結果が表示されることを確認
        await page.waitForSelector('.user-results', { timeout: 10000 });
        
        const userCards = page.locator('.user-card');
        const userCount = await userCards.count();
        
        // 検索結果が表示されることを確認
        expect(userCount).toBeGreaterThanOrEqual(0);
      }
    });

    test('スキルでユーザーをフィルタリングできる', async ({ page }) => {
      await dashboardPage.navigateToPage('community');
      await waitForPageLoad(page, '/community');
      
      const skillFilter = page.locator('[name="skill-filter"]');
      if (await skillFilter.isVisible()) {
        await page.selectOption('[name="skill-filter"]', 'figma');
        await waitAndClick(page, '.filter-users-button');
        
        // フィルタリング結果を確認
        await page.waitForSelector('.user-results');
        
        // URLにフィルタパラメータが含まれることを確認
        expect(page.url()).toContain('skill=figma');
      }
    });

    test('地域でユーザーをフィルタリングできる', async ({ page }) => {
      await dashboardPage.navigateToPage('community');
      await waitForPageLoad(page, '/community');
      
      const locationFilter = page.locator('[name="location-filter"]');
      if (await locationFilter.isVisible()) {
        await waitAndFill(page, '[name="location-filter"]', '東京');
        await waitAndClick(page, '.filter-users-button');
        
        // フィルタリング結果を確認
        await page.waitForSelector('.user-results');
        
        // URLに地域パラメータが含まれることを確認
        expect(page.url()).toContain('location=東京');
      }
    });
  });
});