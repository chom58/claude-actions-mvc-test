const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const notificationService = require('../services/notificationService');
const { Notification, NotificationPreference } = require('../models');
const { asyncHandler } = require('../utils/asyncHandler');

// 通知一覧取得
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, unreadOnly = false } = req.query;
  const offset = (page - 1) * limit;

  const whereClause = { userId: req.user.id };
  if (unreadOnly === 'true') {
    whereClause.isRead = false;
  }

  const notifications = await Notification.findAndCountAll({
    where: whereClause,
    order: [['created_at', 'DESC']],
    limit: parseInt(limit),
    offset: parseInt(offset)
  });

  res.json({
    notifications: notifications.rows,
    pagination: {
      total: notifications.count,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(notifications.count / limit)
    }
  });
}));

// 未読通知数取得
router.get('/unread-count', authenticateToken, asyncHandler(async (req, res) => {
  const count = await Notification.count({
    where: {
      userId: req.user.id,
      isRead: false
    }
  });

  res.json({ unreadCount: count });
}));

// 特定の通知を既読にマーク
router.patch('/:id/read', authenticateToken, asyncHandler(async (req, res) => {
  const success = await notificationService.markAsRead(req.params.id, req.user.id);
  
  if (success) {
    res.json({ message: '通知を既読にしました' });
  } else {
    res.status(404).json({ error: '通知が見つかりません' });
  }
}));

// 全ての通知を既読にマーク
router.patch('/mark-all-read', authenticateToken, asyncHandler(async (req, res) => {
  await notificationService.markAllAsRead(req.user.id);
  res.json({ message: '全ての通知を既読にしました' });
}));

// 通知設定取得
router.get('/preferences', authenticateToken, asyncHandler(async (req, res) => {
  const preferences = await notificationService.getUserNotificationPreferences(req.user.id);
  res.json(preferences);
}));

// 通知設定更新
router.put('/preferences', authenticateToken, asyncHandler(async (req, res) => {
  const {
    emailNotifications,
    messageNotifications,
    collaborationNotifications,
    eventNotifications,
    systemNotifications,
    emailFrequency,
    quietHoursStart,
    quietHoursEnd,
    timezone
  } = req.body;

  // バリデーション
  const validFrequencies = ['immediate', 'hourly', 'daily', 'weekly', 'never'];
  if (emailFrequency && !validFrequencies.includes(emailFrequency)) {
    return res.status(400).json({ 
      error: 'Invalid email frequency. Must be one of: ' + validFrequencies.join(', ')
    });
  }

  if (quietHoursStart !== undefined && (quietHoursStart < 0 || quietHoursStart > 23)) {
    return res.status(400).json({ 
      error: 'quietHoursStart must be between 0 and 23'
    });
  }

  if (quietHoursEnd !== undefined && (quietHoursEnd < 0 || quietHoursEnd > 23)) {
    return res.status(400).json({ 
      error: 'quietHoursEnd must be between 0 and 23'
    });
  }

  const updateData = {};
  if (emailNotifications !== undefined) updateData.emailNotifications = emailNotifications;
  if (messageNotifications !== undefined) updateData.messageNotifications = messageNotifications;
  if (collaborationNotifications !== undefined) updateData.collaborationNotifications = collaborationNotifications;
  if (eventNotifications !== undefined) updateData.eventNotifications = eventNotifications;
  if (systemNotifications !== undefined) updateData.systemNotifications = systemNotifications;
  if (emailFrequency !== undefined) updateData.emailFrequency = emailFrequency;
  if (quietHoursStart !== undefined) updateData.quietHoursStart = quietHoursStart;
  if (quietHoursEnd !== undefined) updateData.quietHoursEnd = quietHoursEnd;
  if (timezone !== undefined) updateData.timezone = timezone;

  const preferences = await notificationService.updateNotificationPreferences(
    req.user.id,
    updateData
  );

  res.json({
    message: '通知設定を更新しました',
    preferences
  });
}));

// テスト通知送信（開発用）
router.post('/test', authenticateToken, asyncHandler(async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Test notifications are not allowed in production' });
  }

  const { type = 'system' } = req.body;

  let notification;
  switch (type) {
    case 'message':
      notification = await notificationService.notifyNewMessage(
        req.user.id,
        req.user.id,
        req.user.username,
        'これはテストメッセージです。'
      );
      break;
    case 'welcome':
      notification = await notificationService.notifyWelcome(req.user.id);
      break;
    default:
      notification = await notificationService.createNotification({
        userId: req.user.id,
        type: 'system',
        title: 'テスト通知',
        content: 'これはテスト通知です。'
      });
  }

  res.json({
    message: 'テスト通知を送信しました',
    notification
  });
}));

// 通知削除
router.delete('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const notification = await Notification.findOne({
    where: {
      id: req.params.id,
      userId: req.user.id
    }
  });

  if (!notification) {
    return res.status(404).json({ error: '通知が見つかりません' });
  }

  await notification.destroy();
  res.json({ message: '通知を削除しました' });
}));

module.exports = router;