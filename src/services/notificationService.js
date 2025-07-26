const { Notification, NotificationPreference, User } = require('../models');
const emailService = require('./emailService');
const logger = require('../utils/logger');

class NotificationService {
  constructor() {
    this.initialized = false;
  }

  async initialize() {
    await emailService.initialize();
    this.initialized = true;
    logger.info('Notification service initialized');
  }

  // 通知作成のメインメソッド
  async createNotification({
    userId,
    type,
    title,
    content,
    relatedId = null,
    relatedType = null,
    metadata = {},
    skipEmail = false
  }) {
    try {
      // 通知をデータベースに保存
      const notification = await Notification.create({
        userId,
        type,
        title,
        content,
        relatedId,
        relatedType,
        metadata
      });

      // メール通知の処理
      if (!skipEmail) {
        await this.processEmailNotification(userId, notification);
      }

      logger.info(`Notification created for user ${userId}: ${type}`);
      return notification;
    } catch (error) {
      logger.error('Error creating notification:', error);
      throw error;
    }
  }

  // メール通知の処理
  async processEmailNotification(userId, notification) {
    try {
      // ユーザーの通知設定を確認
      const userPrefs = await this.getUserNotificationPreferences(userId);
      
      // メール通知が無効になっている場合はスキップ
      if (!userPrefs.emailNotifications) {
        return;
      }

      // 通知タイプ別の設定をチェック
      const typeSpecificEnabled = this.isNotificationTypeEnabled(userPrefs, notification.type);
      if (!typeSpecificEnabled) {
        return;
      }

      // 時間制限をチェック（クワイエット時間）
      if (this.isQuietHours(userPrefs)) {
        logger.info(`Skipping email notification for user ${userId} due to quiet hours`);
        return;
      }

      // ユーザー情報を取得
      const user = await User.findByPk(userId);
      if (!user || !user.email) {
        logger.warn(`User ${userId} not found or has no email address`);
        return;
      }

      // 通知タイプに応じてメールを送信
      await this.sendNotificationEmail(user, notification);
      
      // メール送信フラグを更新
      await notification.update({ emailSent: true });

    } catch (error) {
      logger.error(`Error processing email notification for user ${userId}:`, error);
    }
  }

  // 通知タイプに応じたメール送信
  async sendNotificationEmail(user, notification) {
    const { type, metadata } = notification;

    switch (type) {
      case 'message':
        await emailService.sendMessageNotification(
          user.email,
          metadata.senderUsername || 'Unknown User',
          notification.content.substring(0, 100) + '...'
        );
        break;

      case 'collaboration':
        await emailService.sendCollaborationNotification(
          user.email,
          metadata.applicantName || 'Unknown User',
          notification.content
        );
        break;

      case 'event':
        await emailService.sendEventNotification(
          user.email,
          metadata.eventName || 'New Event',
          metadata.eventDate || 'TBD',
          metadata.eventLocation || 'TBD'
        );
        break;

      case 'welcome':
        await emailService.sendWelcomeEmail(user.email, user.username);
        break;

      default:
        // その他の通知タイプの場合は汎用メールを送信
        logger.info(`No specific email template for notification type: ${type}`);
        break;
    }
  }

  // ユーザーの通知設定を取得（存在しない場合はデフォルト値で作成）
  async getUserNotificationPreferences(userId) {
    let preferences = await NotificationPreference.findOne({
      where: { userId }
    });

    if (!preferences) {
      preferences = await NotificationPreference.create({
        userId,
        // デフォルト値はモデルで定義済み
      });
    }

    return preferences;
  }

  // 通知タイプ別の有効性をチェック
  isNotificationTypeEnabled(preferences, notificationType) {
    switch (notificationType) {
      case 'message':
        return preferences.messageNotifications;
      case 'collaboration':
        return preferences.collaborationNotifications;
      case 'event':
        return preferences.eventNotifications;
      case 'system':
      case 'welcome':
        return preferences.systemNotifications;
      default:
        return true;
    }
  }

  // クワイエット時間かどうかをチェック
  isQuietHours(preferences) {
    if (!preferences.quietHoursStart || !preferences.quietHoursEnd) {
      return false;
    }

    const now = new Date();
    const currentHour = now.getHours();
    
    const start = preferences.quietHoursStart;
    const end = preferences.quietHoursEnd;

    // 同日内の範囲
    if (start <= end) {
      return currentHour >= start && currentHour < end;
    }
    // 日をまたぐ範囲（例：22時〜6時）
    else {
      return currentHour >= start || currentHour < end;
    }
  }

  // 便利メソッド：メッセージ通知
  async notifyNewMessage(userId, senderId, senderUsername, messageContent) {
    return await this.createNotification({
      userId,
      type: 'message',
      title: `${senderUsername}さんからメッセージが届きました`,
      content: messageContent,
      metadata: {
        senderId,
        senderUsername
      }
    });
  }

  // 便利メソッド：コラボレーション通知
  async notifyCollaborationRequest(userId, applicantId, applicantName, projectDetails) {
    return await this.createNotification({
      userId,
      type: 'collaboration',
      title: 'コラボレーション申請が届きました',
      content: projectDetails,
      metadata: {
        applicantId,
        applicantName
      }
    });
  }

  // 便利メソッド：イベント通知
  async notifyEventRegistration(userId, eventId, eventName, eventDate, eventLocation) {
    return await this.createNotification({
      userId,
      type: 'event',
      title: `イベント参加確認: ${eventName}`,
      content: `${eventDate}に開催される${eventName}への参加を確認いたしました。`,
      relatedId: eventId,
      relatedType: 'event',
      metadata: {
        eventName,
        eventDate,
        eventLocation
      }
    });
  }

  // 便利メソッド：ウェルカム通知
  async notifyWelcome(userId) {
    return await this.createNotification({
      userId,
      type: 'welcome',
      title: '原宿クリエイティブコミュニティへようこそ！',
      content: 'コミュニティへの参加ありがとうございます。クリエイターとのつながりを楽しんでください。'
    });
  }

  // ユーザーの未読通知を取得
  async getUnreadNotifications(userId, limit = 20) {
    return await Notification.findAll({
      where: {
        userId,
        isRead: false
      },
      order: [['created_at', 'DESC']],
      limit
    });
  }

  // 通知を既読にマーク
  async markAsRead(notificationId, userId) {
    const notification = await Notification.findOne({
      where: {
        id: notificationId,
        userId
      }
    });

    if (notification) {
      await notification.update({ isRead: true });
      return true;
    }
    return false;
  }

  // 全ての通知を既読にマーク
  async markAllAsRead(userId) {
    await Notification.update(
      { isRead: true },
      {
        where: {
          userId,
          isRead: false
        }
      }
    );
  }

  // 通知設定を更新
  async updateNotificationPreferences(userId, preferences) {
    const [userPrefs] = await NotificationPreference.findOrCreate({
      where: { userId },
      defaults: { userId, ...preferences }
    });

    if (userPrefs) {
      await userPrefs.update(preferences);
    }

    return userPrefs;
  }
}

const notificationService = new NotificationService();

module.exports = notificationService;