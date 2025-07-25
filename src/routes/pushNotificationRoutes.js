const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');

// プッシュ通知サブスクリプション保存用（実際のプロダクションではデータベースを使用）
const subscriptions = new Map();

// VAPIDキー（実際の実装では環境変数から取得）
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'YOUR_VAPID_PUBLIC_KEY_HERE';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'YOUR_VAPID_PRIVATE_KEY_HERE';

/**
 * プッシュ通知購読エンドポイント
 * POST /api/push/subscribe
 */
router.post('/subscribe', [
    body('endpoint').isURL().withMessage('有効なエンドポイントURLが必要です'),
    body('keys.p256dh').notEmpty().withMessage('p256dhキーが必要です'),
    body('keys.auth').notEmpty().withMessage('authキーが必要です'),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'バリデーションエラー',
                errors: errors.array()
            });
        }

        const { endpoint, keys } = req.body;
        const userId = req.user?.id || 'anonymous';
        
        // サブスクリプション情報を保存
        const subscriptionId = `${userId}_${Date.now()}`;
        subscriptions.set(subscriptionId, {
            userId,
            endpoint,
            keys,
            subscribedAt: new Date().toISOString(),
            active: true
        });

        console.log(`📬 プッシュ通知購読: ${subscriptionId}`);

        res.json({
            success: true,
            message: 'プッシュ通知の購読が完了しました',
            subscriptionId,
            publicKey: VAPID_PUBLIC_KEY
        });

    } catch (error) {
        console.error('❌ プッシュ通知購読エラー:', error);
        res.status(500).json({
            success: false,
            message: 'プッシュ通知の購読に失敗しました',
            error: error.message
        });
    }
});

/**
 * プッシュ通知購読解除エンドポイント
 * DELETE /api/push/unsubscribe
 */
router.delete('/unsubscribe', [
    body('subscriptionId').notEmpty().withMessage('サブスクリプションIDが必要です'),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'バリデーションエラー',
                errors: errors.array()
            });
        }

        const { subscriptionId } = req.body;
        
        if (subscriptions.has(subscriptionId)) {
            subscriptions.delete(subscriptionId);
            console.log(`🗑️ プッシュ通知購読解除: ${subscriptionId}`);
            
            res.json({
                success: true,
                message: 'プッシュ通知の購読を解除しました'
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'サブスクリプションが見つかりません'
            });
        }

    } catch (error) {
        console.error('❌ プッシュ通知購読解除エラー:', error);
        res.status(500).json({
            success: false,
            message: 'プッシュ通知の購読解除に失敗しました',
            error: error.message
        });
    }
});

/**
 * テスト通知送信エンドポイント
 * POST /api/push/send-test
 */
router.post('/send-test', [
    body('title').optional().isString().withMessage('タイトルは文字列である必要があります'),
    body('body').optional().isString().withMessage('本文は文字列である必要があります'),
    body('userId').optional().isString().withMessage('ユーザーIDは文字列である必要があります'),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'バリデーションエラー',
                errors: errors.array()
            });
        }

        const { 
            title = '原宿クリエイティブコミュニティ',
            body = 'テスト通知です 🎌',
            userId 
        } = req.body;

        // 対象のサブスクリプションを取得
        const targetSubscriptions = Array.from(subscriptions.values()).filter(sub => 
            sub.active && (!userId || sub.userId === userId)
        );

        if (targetSubscriptions.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'アクティブなサブスクリプションが見つかりません'
            });
        }

        // テスト通知データ
        const notificationData = {
            title,
            body,
            icon: '/icons/icon-192.png',
            badge: '/icons/badge-72.png',
            tag: 'test-notification',
            requireInteraction: false,
            actions: [
                {
                    action: 'view',
                    title: '表示',
                    icon: '/icons/view-icon.png'
                },
                {
                    action: 'dismiss',
                    title: '閉じる'
                }
            ],
            data: {
                url: '/',
                timestamp: Date.now()
            }
        };

        // 実際のプロダクションでは web-push ライブラリを使用してプッシュ通知を送信
        console.log(`📤 テスト通知送信: ${targetSubscriptions.length} 件のサブスクリプション`);
        console.log('通知データ:', notificationData);

        // ここでは送信をシミュレートし、実際のプッシュ通知は送信しない
        // 実装例:
        /*
        const webpush = require('web-push');
        
        webpush.setVapidDetails(
            'mailto:your-email@example.com',
            VAPID_PUBLIC_KEY,
            VAPID_PRIVATE_KEY
        );

        const promises = targetSubscriptions.map(subscription => {
            return webpush.sendNotification(
                {
                    endpoint: subscription.endpoint,
                    keys: subscription.keys
                },
                JSON.stringify(notificationData)
            );
        });

        await Promise.all(promises);
        */

        res.json({
            success: true,
            message: `テスト通知を ${targetSubscriptions.length} 件のサブスクリプションに送信しました`,
            sentCount: targetSubscriptions.length,
            notificationData
        });

    } catch (error) {
        console.error('❌ テスト通知送信エラー:', error);
        res.status(500).json({
            success: false,
            message: 'テスト通知の送信に失敗しました',
            error: error.message
        });
    }
});

/**
 * 新着求人通知送信
 * POST /api/push/send-job-notification
 */
router.post('/send-job-notification', [
    body('jobTitle').isString().withMessage('求人タイトルが必要です'),
    body('company').isString().withMessage('会社名が必要です'),
    body('jobId').isString().withMessage('求人IDが必要です'),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'バリデーションエラー',
                errors: errors.array()
            });
        }

        const { jobTitle, company, jobId } = req.body;

        const notificationData = {
            title: '🎨 新着求人情報',
            body: `${company}から新しい求人「${jobTitle}」が投稿されました`,
            icon: '/icons/icon-192.png',
            badge: '/icons/badge-72.png',
            tag: `job-${jobId}`,
            requireInteraction: true,
            actions: [
                {
                    action: 'view-job',
                    title: '詳細を見る',
                    icon: '/icons/view-icon.png'
                },
                {
                    action: 'save-job',
                    title: '保存'
                }
            ],
            data: {
                type: 'job',
                jobId,
                url: `/jobs/${jobId}`,
                timestamp: Date.now()
            }
        };

        const activeSubscriptions = Array.from(subscriptions.values()).filter(sub => sub.active);

        console.log(`💼 求人通知送信: ${activeSubscriptions.length} 件`);

        res.json({
            success: true,
            message: `求人通知を ${activeSubscriptions.length} 件のサブスクリプションに送信しました`,
            sentCount: activeSubscriptions.length,
            notificationData
        });

    } catch (error) {
        console.error('❌ 求人通知送信エラー:', error);
        res.status(500).json({
            success: false,
            message: '求人通知の送信に失敗しました',
            error: error.message
        });
    }
});

/**
 * バッジ更新エンドポイント（Windows タイル用）
 * GET /api/push/badge
 */
router.get('/badge', (req, res) => {
    try {
        // 未読通知数を取得（実際の実装では適切なロジックで計算）
        const unreadCount = Math.floor(Math.random() * 10); // デモ用ランダム値
        
        res.set('Content-Type', 'application/xml');
        res.send(`<?xml version="1.0" encoding="utf-8"?>
<badge value="${unreadCount}"/>`);
    } catch (error) {
        console.error('❌ バッジ取得エラー:', error);
        res.status(500).json({
            success: false,
            message: 'バッジ情報の取得に失敗しました'
        });
    }
});

/**
 * 通知フィード（Windows ライブタイル用）
 * GET /api/push/feed
 */
router.get('/feed', (req, res) => {
    try {
        const notifications = [
            {
                title: '新着求人',
                content: '原宿エリアで新しいデザイナー求人が投稿されました'
            },
            {
                title: 'イベント情報',
                content: '今週末にクリエイティブイベントが開催されます'
            }
        ];

        res.set('Content-Type', 'application/xml');
        
        let feedXml = '<?xml version="1.0" encoding="utf-8"?>\n<feed>\n';
        notifications.forEach((notification, index) => {
            feedXml += `  <notification id="${index + 1}">
    <title>${notification.title}</title>
    <content>${notification.content}</content>
    <timestamp>${new Date().toISOString()}</timestamp>
  </notification>\n`;
        });
        feedXml += '</feed>';

        res.send(feedXml);
    } catch (error) {
        console.error('❌ 通知フィード取得エラー:', error);
        res.status(500).json({
            success: false,
            message: '通知フィードの取得に失敗しました'
        });
    }
});

/**
 * サブスクリプション一覧取得（管理者用）
 * GET /api/push/subscriptions
 */
router.get('/subscriptions', (req, res) => {
    try {
        const subscriptionList = Array.from(subscriptions.entries()).map(([id, data]) => ({
            id,
            userId: data.userId,
            subscribedAt: data.subscribedAt,
            active: data.active,
            endpoint: data.endpoint.substring(0, 50) + '...' // セキュリティのため一部のみ表示
        }));

        res.json({
            success: true,
            subscriptions: subscriptionList,
            total: subscriptionList.length,
            active: subscriptionList.filter(sub => sub.active).length
        });
    } catch (error) {
        console.error('❌ サブスクリプション一覧取得エラー:', error);
        res.status(500).json({
            success: false,
            message: 'サブスクリプション一覧の取得に失敗しました'
        });
    }
});

/**
 * VAPID公開キー取得
 * GET /api/push/vapid-key
 */
router.get('/vapid-key', (req, res) => {
    res.json({
        success: true,
        publicKey: VAPID_PUBLIC_KEY
    });
});

module.exports = router;