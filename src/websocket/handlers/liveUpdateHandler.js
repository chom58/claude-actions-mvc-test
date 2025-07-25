const { User, DesignerJob, CreativeEvent } = require('../../models');

const connectedUsers = new Map();
const subscribedToUpdates = new Map(); // Track what updates users are subscribed to

const liveUpdateHandler = (socket) => {
  console.log(`User ${socket.user.username} connected to live updates namespace`);
  
  connectedUsers.set(socket.userId, socket);
  
  socket.on('disconnect', () => {
    console.log(`User ${socket.user.username} disconnected from live updates`);
    connectedUsers.delete(socket.userId);
    subscribedToUpdates.delete(socket.userId);
  });

  // Subscribe to job application updates
  socket.on('subscribe-job-updates', (data) => {
    try {
      const { jobId } = data;
      
      if (!jobId) {
        return socket.emit('error', { message: 'Job ID is required' });
      }

      // Join job-specific room
      socket.join(`job_${jobId}`);
      
      // Track subscription
      if (!subscribedToUpdates.has(socket.userId)) {
        subscribedToUpdates.set(socket.userId, new Set());
      }
      subscribedToUpdates.get(socket.userId).add(`job_${jobId}`);
      
      socket.emit('subscribed', { 
        type: 'job-updates',
        jobId,
        message: 'Subscribed to job application updates'
      });
      
    } catch (error) {
      console.error('Subscribe job updates error:', error);
      socket.emit('error', { message: 'Failed to subscribe to job updates' });
    }
  });

  // Subscribe to event participation updates
  socket.on('subscribe-event-updates', (data) => {
    try {
      const { eventId } = data;
      
      if (!eventId) {
        return socket.emit('error', { message: 'Event ID is required' });
      }

      socket.join(`event_${eventId}`);
      
      if (!subscribedToUpdates.has(socket.userId)) {
        subscribedToUpdates.set(socket.userId, new Set());
      }
      subscribedToUpdates.get(socket.userId).add(`event_${eventId}`);
      
      socket.emit('subscribed', { 
        type: 'event-updates',
        eventId,
        message: 'Subscribed to event participation updates'
      });
      
    } catch (error) {
      console.error('Subscribe event updates error:', error);
      socket.emit('error', { message: 'Failed to subscribe to event updates' });
    }
  });

  // Subscribe to online user count
  socket.on('subscribe-online-count', () => {
    try {
      socket.join('online_count');
      
      if (!subscribedToUpdates.has(socket.userId)) {
        subscribedToUpdates.set(socket.userId, new Set());
      }
      subscribedToUpdates.get(socket.userId).add('online_count');
      
      // Send current online count
      const onlineCount = connectedUsers.size;
      socket.emit('online-count-update', { count: onlineCount });
      
      socket.emit('subscribed', { 
        type: 'online-count',
        message: 'Subscribed to online user count updates'
      });
      
    } catch (error) {
      console.error('Subscribe online count error:', error);
      socket.emit('error', { message: 'Failed to subscribe to online count' });
    }
  });

  // Unsubscribe from updates
  socket.on('unsubscribe', (data) => {
    try {
      const { type, id } = data;
      let roomName;
      
      switch (type) {
        case 'job-updates':
          roomName = `job_${id}`;
          break;
        case 'event-updates':
          roomName = `event_${id}`;
          break;
        case 'online-count':
          roomName = 'online_count';
          break;
        default:
          return socket.emit('error', { message: 'Invalid subscription type' });
      }
      
      socket.leave(roomName);
      
      const userSubscriptions = subscribedToUpdates.get(socket.userId);
      if (userSubscriptions) {
        userSubscriptions.delete(roomName);
      }
      
      socket.emit('unsubscribed', { type, id });
      
    } catch (error) {
      console.error('Unsubscribe error:', error);
      socket.emit('error', { message: 'Failed to unsubscribe' });
    }
  });

  // Get current statistics
  socket.on('get-stats', async () => {
    try {
      const [jobCount, eventCount, userCount] = await Promise.all([
        DesignerJob.count(),
        CreativeEvent.count(),
        User.count({ where: { isActive: true } })
      ]);
      
      socket.emit('current-stats', {
        totalJobs: jobCount,
        totalEvents: eventCount,
        totalUsers: userCount,
        onlineUsers: connectedUsers.size,
        timestamp: new Date()
      });
      
    } catch (error) {
      console.error('Get stats error:', error);
      socket.emit('error', { message: 'Failed to get statistics' });
    }
  });

  // Handle connection status
  socket.emit('connected', {
    userId: socket.userId,
    onlineCount: connectedUsers.size
  });

  // Broadcast new user online to online count subscribers
  socket.to('online_count').emit('online-count-update', { 
    count: connectedUsers.size 
  });
};

// Helper functions for broadcasting updates from other parts of the application

const broadcastJobUpdate = (jobId, updateData) => {
  const io = require('../server').getIO();
  if (io) {
    io.of('/live-updates').to(`job_${jobId}`).emit('job-application-update', {
      jobId,
      ...updateData,
      timestamp: new Date()
    });
  }
};

const broadcastEventUpdate = (eventId, updateData) => {
  const io = require('../server').getIO();
  if (io) {
    io.of('/live-updates').to(`event_${eventId}`).emit('event-participation-update', {
      eventId,
      ...updateData,
      timestamp: new Date()
    });
  }
};

const updateOnlineCount = () => {
  const io = require('../server').getIO();
  if (io) {
    io.of('/live-updates').to('online_count').emit('online-count-update', {
      count: connectedUsers.size,
      timestamp: new Date()
    });
  }
};

const broadcastSystemUpdate = (updateData) => {
  const io = require('../server').getIO();
  if (io) {
    io.of('/live-updates').emit('system-update', {
      ...updateData,
      timestamp: new Date()
    });
  }
};

// Periodic updates
let statsInterval;

const startPeriodicUpdates = () => {
  // Update statistics every 30 seconds
  statsInterval = setInterval(async () => {
    try {
      const io = require('../server').getIO();
      if (!io) return;
      
      const [jobCount, eventCount, userCount] = await Promise.all([
        DesignerJob.count(),
        CreativeEvent.count(),
        User.count({ where: { isActive: true } })
      ]);
      
      io.of('/live-updates').emit('stats-update', {
        totalJobs: jobCount,
        totalEvents: eventCount,
        totalUsers: userCount,
        onlineUsers: connectedUsers.size,
        timestamp: new Date()
      });
      
    } catch (error) {
      console.error('Periodic stats update error:', error);
    }
  }, 30000);
};

const stopPeriodicUpdates = () => {
  if (statsInterval) {
    clearInterval(statsInterval);
    statsInterval = null;
  }
};

module.exports = liveUpdateHandler;

// Export utility functions separately
module.exports.broadcastJobUpdate = broadcastJobUpdate;
module.exports.broadcastEventUpdate = broadcastEventUpdate;
module.exports.updateOnlineCount = updateOnlineCount;
module.exports.broadcastSystemUpdate = broadcastSystemUpdate;
module.exports.startPeriodicUpdates = startPeriodicUpdates;
module.exports.stopPeriodicUpdates = stopPeriodicUpdates;