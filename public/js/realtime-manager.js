class RealtimeManager {
  constructor() {
    this.sockets = {};
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = null;
    this.messageQueue = [];
    this.isOnline = navigator.onLine;
    
    this.init();
    this.setupEventListeners();
  }

  init() {
    const token = this.getAuthToken();
    if (!token) {
      console.warn('No auth token found, WebSocket connections will not be established');
      return;
    }

    this.connect();
  }

  getAuthToken() {
    // Try to get JWT token from localStorage, cookie, or other storage
    return localStorage.getItem('jwt') || 
           this.getCookie('jwt') || 
           null;
  }

  getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  }

  connect() {
    const token = this.getAuthToken();
    if (!token) return;

    try {
      // Connect to different namespaces
      this.connectToNamespace('notifications', '/notifications');
      this.connectToNamespace('chat', '/chat');
      this.connectToNamespace('liveUpdates', '/live-updates');
      
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      console.log('WebSocket connections established');
      this.processMessageQueue();
      
    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.handleConnectionError();
    }
  }

  connectToNamespace(name, namespace) {
    const token = this.getAuthToken();
    
    this.sockets[name] = io(namespace, {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    });

    this.setupNamespaceHandlers(name, this.sockets[name]);
  }

  setupNamespaceHandlers(name, socket) {
    socket.on('connect', () => {
      console.log(`Connected to ${name} namespace`);
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      // Emit custom connection event
      document.dispatchEvent(new CustomEvent('websocket-connected', {
        detail: { namespace: name }
      }));
    });

    socket.on('disconnect', (reason) => {
      console.log(`Disconnected from ${name} namespace:`, reason);
      this.isConnected = false;
      
      if (reason === 'io server disconnect') {
        // Server-initiated disconnect, try to reconnect
        this.handleConnectionError();
      }
      
      document.dispatchEvent(new CustomEvent('websocket-disconnected', {
        detail: { namespace: name, reason }
      }));
    });

    socket.on('connect_error', (error) => {
      console.error(`Connection error for ${name}:`, error);
      this.handleConnectionError();
    });

    socket.on('error', (error) => {
      console.error(`Socket error for ${name}:`, error);
      document.dispatchEvent(new CustomEvent('websocket-error', {
        detail: { namespace: name, error }
      }));
    });

    // Setup namespace-specific handlers
    if (name === 'notifications') {
      this.setupNotificationHandlers(socket);
    } else if (name === 'chat') {
      this.setupChatHandlers(socket);
    } else if (name === 'liveUpdates') {
      this.setupLiveUpdateHandlers(socket);
    }
  }

  setupNotificationHandlers(socket) {
    socket.on('new-job', (data) => {
      this.handleNotification('job-alert', data);
    });

    socket.on('match-found', (data) => {
      this.handleNotification('match-found', data);
    });

    socket.on('event-reminder', (data) => {
      this.handleNotification('event-reminder', data);
    });

    socket.on('collaboration-invite', (data) => {
      this.handleNotification('collaboration-invite', data);
    });

    socket.on('notification', (data) => {
      this.handleNotification('general', data);
    });
  }

  setupChatHandlers(socket) {
    socket.on('new-message', (data) => {
      document.dispatchEvent(new CustomEvent('chat-message-received', {
        detail: data
      }));
    });

    socket.on('message-sent', (data) => {
      document.dispatchEvent(new CustomEvent('chat-message-sent', {
        detail: data
      }));
    });

    socket.on('typing-start', (data) => {
      document.dispatchEvent(new CustomEvent('chat-typing-start', {
        detail: data
      }));
    });

    socket.on('typing-stopped', (data) => {
      document.dispatchEvent(new CustomEvent('chat-typing-stopped', {
        detail: data
      }));
    });

    socket.on('user-joined', (data) => {
      document.dispatchEvent(new CustomEvent('chat-user-joined', {
        detail: data
      }));
    });

    socket.on('user-left', (data) => {
      document.dispatchEvent(new CustomEvent('chat-user-left', {
        detail: data
      }));
    });
  }

  setupLiveUpdateHandlers(socket) {
    socket.on('job-application-update', (data) => {
      document.dispatchEvent(new CustomEvent('job-update', {
        detail: data
      }));
    });

    socket.on('event-participation-update', (data) => {
      document.dispatchEvent(new CustomEvent('event-update', {
        detail: data
      }));
    });

    socket.on('online-count-update', (data) => {
      document.dispatchEvent(new CustomEvent('online-count-update', {
        detail: data
      }));
    });

    socket.on('stats-update', (data) => {
      document.dispatchEvent(new CustomEvent('stats-update', {
        detail: data
      }));
    });
  }

  setupEventListeners() {
    // Handle online/offline status
    window.addEventListener('online', () => {
      console.log('Browser back online');
      this.isOnline = true;
      if (!this.isConnected) {
        this.connect();
      }
    });

    window.addEventListener('offline', () => {
      console.log('Browser went offline');
      this.isOnline = false;
    });

    // Handle page visibility for connection management
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && !this.isConnected) {
        this.connect();
      }
    });
  }

  handleNotification(type, data) {
    // Display notification
    this.displayNotification(data);
    
    // Emit custom event for specific handling
    document.dispatchEvent(new CustomEvent('notification-received', {
      detail: { type, data }
    }));
    
    // Store notification if supported
    this.storeNotification(data);
  }

  displayNotification(data) {
    // Show browser notification if permission granted
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(data.title || 'New Notification', {
        body: data.message,
        icon: '/favicon.ico',
        tag: data.type || 'general'
      });
      
      notification.onclick = () => {
        window.focus();
        notification.close();
        
        // Handle notification click based on type
        if (data.type === 'job-alert' && data.data?.jobId) {
          window.location.href = `/jobs/${data.data.jobId}`;
        } else if (data.type === 'match-found' && data.data?.matchId) {
          window.location.href = `/matches/${data.data.matchId}`;
        }
      };
    }
    
    // Show in-app notification
    this.showInAppNotification(data);
  }

  showInAppNotification(data) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'realtime-notification';
    notification.innerHTML = `
      <div class="notification-content">
        <h4>${data.title || 'Notification'}</h4>
        <p>${data.message}</p>
      </div>
      <button class="notification-close">&times;</button>
    `;
    
    // Add click handler to close button
    notification.querySelector('.notification-close').addEventListener('click', () => {
      notification.remove();
    });
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 5000);
    
    // Add to notification container or body
    const container = document.getElementById('notification-container') || document.body;
    container.appendChild(notification);
  }

  storeNotification(data) {
    try {
      const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
      notifications.unshift({
        ...data,
        id: Date.now(),
        timestamp: new Date().toISOString(),
        read: false
      });
      
      // Keep only last 100 notifications
      if (notifications.length > 100) {
        notifications.splice(100);
      }
      
      localStorage.setItem('notifications', JSON.stringify(notifications));
    } catch (error) {
      console.error('Failed to store notification:', error);
    }
  }

  handleConnectionError() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    this.reconnectInterval = setTimeout(() => {
      if (this.isOnline) {
        this.connect();
      }
    }, delay);
  }

  processMessageQueue() {
    // Process any queued messages that were sent while offline
    while (this.messageQueue.length > 0) {
      const queuedMessage = this.messageQueue.shift();
      this.emit(queuedMessage.namespace, queuedMessage.event, queuedMessage.data);
    }
  }

  emit(namespace, event, data) {
    if (this.sockets[namespace] && this.sockets[namespace].connected) {
      this.sockets[namespace].emit(event, data);
    } else {
      // Queue message for later sending
      this.messageQueue.push({ namespace, event, data });
    }
  }

  // Public API methods
  sendMessage(roomId, content, type = 'text') {
    this.emit('chat', 'send-message', { roomId, content, type });
  }

  joinChatRoom(roomId) {
    this.emit('chat', 'join-room', { roomId });
  }

  leaveChatRoom(roomId) {
    this.emit('chat', 'leave-room', { roomId });
  }

  startTyping(roomId) {
    this.emit('chat', 'typing-start', { roomId });
  }

  stopTyping(roomId) {
    this.emit('chat', 'typing-stop', { roomId });
  }

  subscribeToJobUpdates(jobId) {
    this.emit('liveUpdates', 'subscribe-job-updates', { jobId });
  }

  subscribeToEventUpdates(eventId) {
    this.emit('liveUpdates', 'subscribe-event-updates', { eventId });
  }

  subscribeToOnlineCount() {
    this.emit('liveUpdates', 'subscribe-online-count');
  }

  updateNotificationPreferences(preferences) {
    this.emit('notifications', 'update-preferences', preferences);
  }

  disconnect() {
    Object.values(this.sockets).forEach(socket => {
      if (socket.connected) {
        socket.disconnect();
      }
    });
    
    if (this.reconnectInterval) {
      clearTimeout(this.reconnectInterval);
    }
    
    this.isConnected = false;
  }

  // Request notification permission
  static async requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return Notification.permission === 'granted';
  }
}

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Only initialize if user is authenticated
  const token = localStorage.getItem('jwt') || 
                document.cookie.includes('jwt=');
  
  if (token) {
    window.realtimeManager = new RealtimeManager();
    
    // Request notification permission
    RealtimeManager.requestNotificationPermission();
  }
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RealtimeManager;
}