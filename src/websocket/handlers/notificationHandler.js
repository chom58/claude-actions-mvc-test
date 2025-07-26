const { User } = require('../../models');

const connectedUsers = new Map(); // Track connected users for notifications

const notificationHandler = (socket) => {
  console.log(`User ${socket.user.username} connected to notifications namespace`);
  
  // Store user connection
  connectedUsers.set(socket.userId, socket);
  
  socket.on('disconnect', () => {
    console.log(`User ${socket.user.username} disconnected from notifications`);
    connectedUsers.delete(socket.userId);
  });

  // Join user-specific notification channel
  socket.join(`user_${socket.userId}`);
  
  // Send initial connection confirmation
  socket.emit('connected', {
    message: 'Connected to notifications',
    userId: socket.userId
  });

  // Handle notification preferences update
  socket.on('update-preferences', (data) => {
    try {
      const { jobAlerts, matchingAlerts, eventReminders, collaborationInvites } = data;
      
      // Store preferences (could be saved to database)
      socket.notificationPreferences = {
        jobAlerts: jobAlerts !== false,
        matchingAlerts: matchingAlerts !== false,
        eventReminders: eventReminders !== false,
        collaborationInvites: collaborationInvites !== false
      };
      
      socket.emit('preferences-updated', socket.notificationPreferences);
    } catch (error) {
      console.error('Update preferences error:', error);
      socket.emit('error', { message: 'Failed to update preferences' });
    }
  });

  // Get notification history
  socket.on('get-history', async (data) => {
    try {
      const { limit = 50, offset = 0 } = data;
      
      // Mock notification history - in real implementation, fetch from database
      const notifications = [
        {
          id: 1,
          type: 'job-alert',
          title: '新しい求人が投稿されました',
          message: 'あなたのスキルにマッチする求人が見つかりました',
          createdAt: new Date(),
          read: false
        },
        {
          id: 2,
          type: 'match-found',
          title: 'マッチングが成立しました',
          message: 'デザイン会社との新しいマッチングが成立しました',
          createdAt: new Date(Date.now() - 60000),
          read: true
        }
      ];
      
      socket.emit('notification-history', {
        notifications: notifications.slice(offset, offset + limit),
        total: notifications.length
      });
    } catch (error) {
      console.error('Get history error:', error);
      socket.emit('error', { message: 'Failed to get notification history' });
    }
  });

  // Mark notification as read
  socket.on('mark-read', (data) => {
    try {
      const { notificationId } = data;
      
      // In real implementation, update database
      console.log(`Marking notification ${notificationId} as read for user ${socket.userId}`);
      
      socket.emit('marked-read', { notificationId });
    } catch (error) {
      console.error('Mark read error:', error);
      socket.emit('error', { message: 'Failed to mark notification as read' });
    }
  });

  // Mark all notifications as read
  socket.on('mark-all-read', () => {
    try {
      // In real implementation, update database
      console.log(`Marking all notifications as read for user ${socket.userId}`);
      
      socket.emit('all-marked-read');
    } catch (error) {
      console.error('Mark all read error:', error);
      socket.emit('error', { message: 'Failed to mark all notifications as read' });
    }
  });
};

// Helper functions to send notifications from other parts of the application
const sendNotification = (userId, notification) => {
  const userSocket = connectedUsers.get(userId);
  if (userSocket) {
    // Check user preferences before sending
    const preferences = userSocket.notificationPreferences || {};
    
    switch (notification.type) {
      case 'job-alert':
        if (preferences.jobAlerts !== false) {
          userSocket.emit('new-job', notification);
        }
        break;
      case 'match-found':
        if (preferences.matchingAlerts !== false) {
          userSocket.emit('match-found', notification);
        }
        break;
      case 'event-reminder':
        if (preferences.eventReminders !== false) {
          userSocket.emit('event-reminder', notification);
        }
        break;
      case 'collaboration-invite':
        if (preferences.collaborationInvites !== false) {
          userSocket.emit('collaboration-invite', notification);
        }
        break;
      default:
        userSocket.emit('notification', notification);
    }
    
    return true; // Notification sent
  }
  return false; // User not connected
};

const sendJobAlert = (userId, jobData) => {
  return sendNotification(userId, {
    type: 'job-alert',
    title: '新しい求人が投稿されました',
    message: `${jobData.title} - ${jobData.company}`,
    data: jobData,
    createdAt: new Date()
  });
};

const sendMatchingAlert = (userId, matchData) => {
  return sendNotification(userId, {
    type: 'match-found',
    title: 'マッチングが成立しました',
    message: `${matchData.companyName}との新しいマッチングが成立しました`,
    data: matchData,
    createdAt: new Date()
  });
};

const sendEventReminder = (userId, eventData) => {
  return sendNotification(userId, {
    type: 'event-reminder',
    title: 'イベント開始リマインダー',
    message: `${eventData.title}が間もなく開始されます`,
    data: eventData,
    createdAt: new Date()
  });
};

const sendCollaborationInvite = (userId, inviteData) => {
  return sendNotification(userId, {
    type: 'collaboration-invite',
    title: 'コラボレーション招待',
    message: `${inviteData.inviterName}からコラボレーションに招待されました`,
    data: inviteData,
    createdAt: new Date()
  });
};

const broadcastToAllUsers = (notification) => {
  connectedUsers.forEach((socket, userId) => {
    sendNotification(userId, notification);
  });
};

module.exports = notificationHandler;

// Export utility functions separately
module.exports.sendNotification = sendNotification;
module.exports.sendJobAlert = sendJobAlert;
module.exports.sendMatchingAlert = sendMatchingAlert;
module.exports.sendEventReminder = sendEventReminder;
module.exports.sendCollaborationInvite = sendCollaborationInvite;
module.exports.broadcastToAllUsers = broadcastToAllUsers;