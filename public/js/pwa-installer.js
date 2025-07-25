// 原宿クリエイティブコミュニティ PWA インストーラー
class PWAInstaller {
    constructor() {
        this.deferredPrompt = null;
        this.isInstalled = false;
        this.supportsPWA = false;
        
        this.init();
    }

    init() {
        // PWAサポートチェック
        this.checkPWASupport();
        
        // イベントリスナーの設定
        this.setupEventListeners();
        
        // インストール状態のチェック
        this.checkInstallStatus();
        
        // Service Worker登録
        this.registerServiceWorker();
        
        console.log('🚀 PWA Installer 初期化完了');
    }

    // PWAサポートのチェック
    checkPWASupport() {
        this.supportsPWA = 'serviceWorker' in navigator && 'PushManager' in window;
        
        if (!this.supportsPWA) {
            console.warn('⚠️ このブラウザではPWA機能の一部がサポートされていません');
            this.showUnsupportedMessage();
        }
    }

    // イベントリスナーの設定
    setupEventListeners() {
        // インストールプロンプトイベント
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            this.showInstallButton();
            
            console.log('📱 PWAインストールプロンプトが準備されました');
        });

        // アプリインストール完了イベント
        window.addEventListener('appinstalled', () => {
            this.isInstalled = true;
            this.hideInstallButton();
            this.showInstalledMessage();
            
            console.log('✅ PWAインストール完了');
            
            // アナリティクス送信（実装時）
            this.trackInstallEvent();
        });

        // オンライン/オフライン状態の監視
        window.addEventListener('online', () => {
            this.updateConnectionStatus(true);
            this.showNotification('オンラインに復帰しました', 'success');
        });

        window.addEventListener('offline', () => {
            this.updateConnectionStatus(false);
            this.showNotification('オフラインモードに切り替わりました', 'warning');
        });

        // アプリ更新の監視
        this.setupUpdateListener();
    }

    // Service Worker登録
    async registerServiceWorker() {
        if (!('serviceWorker' in navigator)) {
            console.warn('⚠️ Service Workerがサポートされていません');
            return;
        }

        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            
            console.log('✅ Service Worker登録成功:', registration.scope);
            
            // 更新チェック
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        this.showUpdateAvailable();
                    }
                });
            });

            // プッシュ通知の設定
            this.setupPushNotifications(registration);
            
        } catch (error) {
            console.error('❌ Service Worker登録失敗:', error);
        }
    }

    // インストールボタンの表示
    showInstallButton() {
        let installButton = document.getElementById('pwa-install-button');
        
        if (!installButton) {
            installButton = this.createInstallButton();
            document.body.appendChild(installButton);
        }
        
        installButton.style.display = 'block';
        installButton.classList.add('show');
    }

    // インストールボタンの作成
    createInstallButton() {
        const button = document.createElement('button');
        button.id = 'pwa-install-button';
        button.className = 'pwa-install-btn';
        button.innerHTML = `
            <i class="fas fa-download"></i>
            アプリをインストール
        `;
        
        // スタイル設定
        button.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: linear-gradient(45deg, #FF1493, #FF00FF);
            color: white;
            border: none;
            padding: 1rem 1.5rem;
            border-radius: 50px;
            font-size: 1rem;
            font-weight: 600;
            font-family: 'Noto Sans JP', sans-serif;
            cursor: pointer;
            box-shadow: 0 4px 20px rgba(255, 20, 147, 0.4);
            z-index: 1000;
            transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            display: none;
            opacity: 0;
            transform: translateY(20px);
        `;
        
        // ホバーエフェクトとアニメーション
        button.addEventListener('mouseenter', () => {
            button.style.transform = 'translateY(-5px) scale(1.05)';
            button.style.boxShadow = '0 8px 30px rgba(255, 20, 147, 0.6)';
        });
        
        button.addEventListener('mouseleave', () => {
            button.style.transform = 'translateY(0) scale(1)';
            button.style.boxShadow = '0 4px 20px rgba(255, 20, 147, 0.4)';
        });
        
        // クリックイベント
        button.addEventListener('click', () => {
            this.installPWA();
        });
        
        // 表示アニメーション
        setTimeout(() => {
            button.style.opacity = '1';
            button.style.transform = 'translateY(0)';
        }, 100);
        
        return button;
    }

    // PWAインストール実行
    async installPWA() {
        if (!this.deferredPrompt) {
            console.warn('⚠️ インストールプロンプトが利用できません');
            return;
        }

        const installButton = document.getElementById('pwa-install-button');
        installButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> インストール中...';
        installButton.disabled = true;

        try {
            // インストールプロンプトを表示
            this.deferredPrompt.prompt();
            
            // ユーザーの選択を待つ
            const { outcome } = await this.deferredPrompt.userChoice;
            
            if (outcome === 'accepted') {
                console.log('👍 ユーザーがPWAインストールを承認');
                this.trackInstallAccepted();
            } else {
                console.log('👎 ユーザーがPWAインストールを拒否');
                this.trackInstallDeclined();
                
                // ボタンを元に戻す
                installButton.innerHTML = '<i class="fas fa-download"></i> アプリをインストール';
                installButton.disabled = false;
            }
            
            this.deferredPrompt = null;
            
        } catch (error) {
            console.error('❌ PWAインストールエラー:', error);
            installButton.innerHTML = '<i class="fas fa-exclamation-triangle"></i> エラーが発生しました';
            
            setTimeout(() => {
                installButton.innerHTML = '<i class="fas fa-download"></i> アプリをインストール';
                installButton.disabled = false;
            }, 3000);
        }
    }

    // インストールボタンの非表示
    hideInstallButton() {
        const installButton = document.getElementById('pwa-install-button');
        if (installButton) {
            installButton.style.opacity = '0';
            installButton.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                installButton.style.display = 'none';
            }, 300);
        }
    }

    // インストール状態のチェック
    checkInstallStatus() {
        // スタンドアロンモードかどうかをチェック
        this.isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
                          window.navigator.standalone ||
                          document.referrer.startsWith('android-app://');
        
        if (this.isInstalled) {
            console.log('📱 PWAはインストール済みです');
            this.hideInstallButton();
        }
    }

    // プッシュ通知の設定
    async setupPushNotifications(registration) {
        if (!('PushManager' in window)) {
            console.warn('⚠️ プッシュ通知がサポートされていません');
            return;
        }

        try {
            // 通知許可の確認
            const permission = await Notification.requestPermission();
            
            if (permission === 'granted') {
                console.log('✅ プッシュ通知が許可されました');
                
                // VAPID公開キー（実際のキーに置き換える必要があります）
                const vapidPublicKey = 'YOUR_VAPID_PUBLIC_KEY_HERE';
                
                if (vapidPublicKey !== 'YOUR_VAPID_PUBLIC_KEY_HERE') {
                    const subscription = await registration.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey)
                    });
                    
                    // サーバーに購読情報を送信
                    await this.sendSubscriptionToServer(subscription);
                }
                
            } else {
                console.log('🔕 プッシュ通知が拒否されました');
            }
            
        } catch (error) {
            console.error('❌ プッシュ通知設定エラー:', error);
        }
    }

    // VAPID キーの変換
    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');
        
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        
        return outputArray;
    }

    // 購読情報をサーバーに送信
    async sendSubscriptionToServer(subscription) {
        try {
            const response = await fetch('/api/push/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(subscription)
            });
            
            if (response.ok) {
                console.log('✅ プッシュ通知の購読が完了しました');
            }
            
        } catch (error) {
            console.error('❌ 購読情報の送信に失敗:', error);
        }
    }

    // アプリ更新の監視
    setupUpdateListener() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', event => {
                if (event.data && event.data.type === 'UPDATE_AVAILABLE') {
                    this.showUpdateAvailable();
                }
            });
        }
    }

    // 更新通知の表示
    showUpdateAvailable() {
        const updateBanner = document.createElement('div');
        updateBanner.id = 'update-banner';
        updateBanner.innerHTML = `
            <div class="update-content">
                <i class="fas fa-sync-alt"></i>
                <span>新しいバージョンが利用可能です</span>
                <button onclick="pwaInstaller.updateApp()" class="update-btn">更新</button>
                <button onclick="this.parentElement.parentElement.remove()" class="dismiss-btn">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        // スタイル設定
        updateBanner.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: linear-gradient(90deg, #FF1493, #FF00FF);
            color: white;
            padding: 1rem;
            z-index: 1001;
            animation: slideDown 0.3s ease-out;
        `;
        
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideDown {
                from { transform: translateY(-100%); }
                to { transform: translateY(0); }
            }
            
            .update-content {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 1rem;
                font-family: 'Noto Sans JP', sans-serif;
                font-weight: 600;
            }
            
            .update-btn {
                background: rgba(255, 255, 255, 0.2);
                border: 1px solid rgba(255, 255, 255, 0.3);
                color: white;
                padding: 0.5rem 1rem;
                border-radius: 4px;
                cursor: pointer;
                font-weight: 600;
                transition: all 0.3s ease;
            }
            
            .update-btn:hover {
                background: rgba(255, 255, 255, 0.3);
            }
            
            .dismiss-btn {
                background: transparent;
                border: none;
                color: white;
                cursor: pointer;
                padding: 0.5rem;
                opacity: 0.7;
                transition: opacity 0.3s ease;
            }
            
            .dismiss-btn:hover {
                opacity: 1;
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(updateBanner);
    }

    // アプリ更新の実行
    updateApp() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistration().then(registration => {
                if (registration && registration.waiting) {
                    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                    window.location.reload();
                }
            });
        }
    }

    // 接続状態の更新
    updateConnectionStatus(isOnline) {
        const statusElement = document.getElementById('connection-status');
        
        if (statusElement) {
            if (isOnline) {
                statusElement.className = 'connection-status online';
                statusElement.innerHTML = '<i class="fas fa-wifi"></i> オンライン';
            } else {
                statusElement.className = 'connection-status offline';
                statusElement.innerHTML = '<i class="fas fa-wifi-slash"></i> オフライン';
            }
        }
    }

    // 通知表示
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `pwa-notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${this.getNotificationIcon(type)}"></i>
            <span>${message}</span>
        `;
        
        // スタイル設定
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${this.getNotificationColor(type)};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            font-family: 'Noto Sans JP', sans-serif;
            font-weight: 600;
            z-index: 1002;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            max-width: 300px;
        `;
        
        document.body.appendChild(notification);
        
        // アニメーション
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // 自動削除
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 4000);
    }

    // 通知アイコンの取得
    getNotificationIcon(type) {
        const icons = {
            success: 'check-circle',
            warning: 'exclamation-triangle',
            error: 'times-circle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    // 通知カラーの取得
    getNotificationColor(type) {
        const colors = {
            success: '#00FF00',
            warning: '#FFFF00',
            error: '#FF1493',
            info: '#00FFFF'
        };
        return colors[type] || '#00FFFF';
    }

    // インストール完了メッセージ
    showInstalledMessage() {
        this.showNotification('アプリのインストールが完了しました！', 'success');
    }

    // 非サポートメッセージ
    showUnsupportedMessage() {
        console.info('ℹ️ PWA機能の詳細についてはヘルプページをご確認ください');
    }

    // アナリティクス - インストールイベント
    trackInstallEvent() {
        if (typeof gtag !== 'undefined') {
            gtag('event', 'pwa_install', {
                event_category: 'PWA',
                event_label: 'App Installed'
            });
        }
        
        console.log('📊 PWAインストールイベントを記録しました');
    }

    // アナリティクス - インストール承認
    trackInstallAccepted() {
        if (typeof gtag !== 'undefined') {
            gtag('event', 'pwa_install_accepted', {
                event_category: 'PWA',
                event_label: 'Install Prompt Accepted'
            });
        }
    }

    // アナリティクス - インストール拒否
    trackInstallDeclined() {
        if (typeof gtag !== 'undefined') {
            gtag('event', 'pwa_install_declined', {
                event_category: 'PWA',
                event_label: 'Install Prompt Declined'
            });
        }
    }
}

// PWAインストーラーのインスタンス化
const pwaInstaller = new PWAInstaller();

// グローバルに公開
window.pwaInstaller = pwaInstaller;

console.log('🎌 原宿クリエイティブコミュニティ PWA Installer 読み込み完了');