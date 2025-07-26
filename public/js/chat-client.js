class ChatClient {
  constructor() {
    this.currentRoom = null;
    this.typingUsers = new Set();
    this.typingTimeout = null;
    this.messageHistory = new Map();
    this.unreadCounts = new Map();
    
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.createChatInterface();
    
    // Wait for realtime manager to be available
    this.waitForRealtimeManager();
  }

  waitForRealtimeManager() {
    if (window.realtimeManager && window.realtimeManager.isConnected) {
      this.setupChatHandlers();
    } else {
      setTimeout(() => this.waitForRealtimeManager(), 100);
    }
  }

  setupEventListeners() {
    // Listen for WebSocket events
    document.addEventListener('chat-message-received', (event) => {
      this.handleMessageReceived(event.detail);
    });

    document.addEventListener('chat-message-sent', (event) => {
      this.handleMessageSent(event.detail);
    });

    document.addEventListener('chat-typing-start', (event) => {
      this.handleTypingStart(event.detail);
    });

    document.addEventListener('chat-typing-stopped', (event) => {
      this.handleTypingStopped(event.detail);
    });

    document.addEventListener('chat-user-joined', (event) => {
      this.handleUserJoined(event.detail);
    });

    document.addEventListener('chat-user-left', (event) => {
      this.handleUserLeft(event.detail);
    });
  }

  setupChatHandlers() {
    // Get user's chat rooms
    window.realtimeManager.emit('chat', 'get-rooms');
  }

  createChatInterface() {
    // Create chat container if it doesn't exist
    if (document.getElementById('chat-container')) return;

    const chatContainer = document.createElement('div');
    chatContainer.id = 'chat-container';
    chatContainer.className = 'chat-container hidden';
    
    chatContainer.innerHTML = `
      <div class="chat-header">
        <h3>チャット</h3>
        <div class="chat-controls">
          <button id="new-chat-btn" class="btn btn-primary">新しいチャット</button>
          <button id="close-chat-btn" class="btn btn-secondary">&times;</button>
        </div>
      </div>
      
      <div class="chat-body">
        <div class="chat-sidebar">
          <div class="room-list">
            <h4>チャットルーム</h4>
            <div id="room-list-container">
              <!-- Rooms will be populated here -->
            </div>
          </div>
        </div>
        
        <div class="chat-main">
          <div class="chat-room-header">
            <span id="current-room-name">チャットルームを選択してください</span>
            <div class="room-info">
              <span id="room-participants"></span>
              <span id="online-indicator"></span>
            </div>
          </div>
          
          <div class="message-area">
            <div id="messages-container">
              <!-- Messages will be displayed here -->
            </div>
            <div id="typing-indicator" class="typing-indicator hidden">
              <!-- Typing users will be shown here -->
            </div>
          </div>
          
          <div class="message-input-area">
            <div class="input-group">
              <input type="text" id="message-input" placeholder="メッセージを入力..." disabled>
              <button id="send-message-btn" class="btn btn-primary" disabled>送信</button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- New Chat Modal -->
      <div id="new-chat-modal" class="modal hidden">
        <div class="modal-content">
          <div class="modal-header">
            <h4>新しいチャット</h4>
            <button id="close-modal-btn">&times;</button>
          </div>
          <div class="modal-body">
            <div class="tab-container">
              <button class="tab-btn active" data-tab="direct">1対1チャット</button>
              <button class="tab-btn" data-tab="group">グループチャット</button>
            </div>
            
            <div id="direct-chat-tab" class="tab-content active">
              <label for="target-user-select">ユーザーを選択:</label>
              <select id="target-user-select">
                <option value="">ユーザーを選択...</option>
              </select>
            </div>
            
            <div id="group-chat-tab" class="tab-content hidden">
              <label for="group-name-input">グループ名:</label>
              <input type="text" id="group-name-input" placeholder="グループ名を入力">
              
              <label>参加者を選択:</label>
              <div id="user-selection-list">
                <!-- User checkboxes will be populated here -->
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button id="create-chat-btn" class="btn btn-primary">チャット作成</button>
            <button id="cancel-modal-btn" class="btn btn-secondary">キャンセル</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(chatContainer);
    
    this.setupChatInterfaceHandlers();
  }

  setupChatInterfaceHandlers() {
    // Toggle chat container
    document.getElementById('close-chat-btn').addEventListener('click', () => {
      document.getElementById('chat-container').classList.add('hidden');
    });

    // Message input handlers
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-message-btn');

    messageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      } else {
        this.handleTyping();
      }
    });

    messageInput.addEventListener('input', () => {
      this.handleTyping();
    });

    sendButton.addEventListener('click', () => {
      this.sendMessage();
    });

    // New chat modal handlers
    document.getElementById('new-chat-btn').addEventListener('click', () => {
      this.openNewChatModal();
    });

    document.getElementById('close-modal-btn').addEventListener('click', () => {
      this.closeNewChatModal();
    });

    document.getElementById('cancel-modal-btn').addEventListener('click', () => {
      this.closeNewChatModal();
    });

    document.getElementById('create-chat-btn').addEventListener('click', () => {
      this.createNewChat();
    });

    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.switchTab(e.target.dataset.tab);
      });
    });
  }

  handleMessageReceived(message) {
    if (message.roomId === this.currentRoom) {
      this.displayMessage(message);
      this.markMessageAsRead(message.id);
    } else {
      // Update unread count
      const count = this.unreadCounts.get(message.roomId) || 0;
      this.unreadCounts.set(message.roomId, count + 1);
      this.updateRoomUnreadIndicator(message.roomId);
    }

    // Store message in history
    if (!this.messageHistory.has(message.roomId)) {
      this.messageHistory.set(message.roomId, []);
    }
    this.messageHistory.get(message.roomId).push(message);

    // Show notification if chat is not visible
    if (document.getElementById('chat-container').classList.contains('hidden')) {
      this.showChatNotification(message);
    }
  }

  handleMessageSent(data) {
    // Update message status to sent
    const messageElement = document.querySelector(`[data-temp-id="${data.tempId}"]`);
    if (messageElement) {
      messageElement.removeAttribute('data-temp-id');
      messageElement.setAttribute('data-message-id', data.messageId);
      messageElement.classList.remove('sending');
      
      const statusElement = messageElement.querySelector('.message-status');
      if (statusElement) {
        statusElement.textContent = '送信済み';
      }
    }
  }

  handleTypingStart(data) {
    if (data.roomId === this.currentRoom) {
      this.typingUsers.add(data.username);
      this.updateTypingIndicator();
    }
  }

  handleTypingStopped(data) {
    if (data.roomId === this.currentRoom) {
      this.typingUsers.delete(data.username);
      this.updateTypingIndicator();
    }
  }

  handleUserJoined(data) {
    if (data.roomId === this.currentRoom) {
      this.displaySystemMessage(`${data.username}さんが参加しました`);
    }
  }

  handleUserLeft(data) {
    if (data.roomId === this.currentRoom) {
      this.displaySystemMessage(`${data.username}さんが退出しました`);
    }
  }

  joinRoom(roomId) {
    if (this.currentRoom) {
      window.realtimeManager.leaveChatRoom(this.currentRoom);
    }

    this.currentRoom = roomId;
    window.realtimeManager.joinChatRoom(roomId);
    
    // Enable message input
    document.getElementById('message-input').disabled = false;
    document.getElementById('send-message-btn').disabled = false;
    
    // Clear messages
    document.getElementById('messages-container').innerHTML = '';
    
    // Reset unread count
    this.unreadCounts.set(roomId, 0);
    this.updateRoomUnreadIndicator(roomId);
    
    // Load message history if available
    if (this.messageHistory.has(roomId)) {
      const messages = this.messageHistory.get(roomId);
      messages.forEach(message => this.displayMessage(message));
    }
  }

  sendMessage() {
    const messageInput = document.getElementById('message-input');
    const content = messageInput.value.trim();
    
    if (!content || !this.currentRoom) return;

    const tempId = Date.now().toString();
    
    // Display message immediately with sending status
    this.displayMessage({
      id: tempId,
      content,
      sender: { username: 'あなた' },
      created_at: new Date().toISOString(),
      tempId,
      status: 'sending'
    });

    // Send through WebSocket
    window.realtimeManager.sendMessage(this.currentRoom, content);
    
    // Clear input
    messageInput.value = '';
    
    // Stop typing indicator
    this.stopTyping();
  }

  displayMessage(message) {
    const messagesContainer = document.getElementById('messages-container');
    const messageElement = document.createElement('div');
    messageElement.className = `message ${message.sender?.username === 'あなた' ? 'own-message' : 'other-message'}`;
    
    if (message.tempId) {
      messageElement.setAttribute('data-temp-id', message.tempId);
      messageElement.classList.add('sending');
    } else {
      messageElement.setAttribute('data-message-id', message.id);
    }

    const timestamp = new Date(message.created_at).toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit'
    });

    messageElement.innerHTML = `
      <div class="message-header">
        <span class="sender-name">${message.sender?.username || 'Unknown'}</span>
        <span class="message-time">${timestamp}</span>
      </div>
      <div class="message-content">${this.escapeHtml(message.content)}</div>
      <div class="message-status">${message.status === 'sending' ? '送信中...' : ''}</div>
    `;

    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  displaySystemMessage(content) {
    const messagesContainer = document.getElementById('messages-container');
    const messageElement = document.createElement('div');
    messageElement.className = 'system-message';
    messageElement.innerHTML = `<span>${this.escapeHtml(content)}</span>`;
    
    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  handleTyping() {
    if (!this.currentRoom) return;

    // Send typing start
    window.realtimeManager.startTyping(this.currentRoom);
    
    // Clear existing timeout
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }
    
    // Set timeout to stop typing
    this.typingTimeout = setTimeout(() => {
      this.stopTyping();
    }, 3000);
  }

  stopTyping() {
    if (this.currentRoom) {
      window.realtimeManager.stopTyping(this.currentRoom);
    }
    
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
      this.typingTimeout = null;
    }
  }

  updateTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    
    if (this.typingUsers.size === 0) {
      indicator.classList.add('hidden');
    } else {
      const users = Array.from(this.typingUsers);
      let text;
      
      if (users.length === 1) {
        text = `${users[0]}さんが入力中...`;
      } else if (users.length === 2) {
        text = `${users[0]}さんと${users[1]}さんが入力中...`;
      } else {
        text = `${users.length}人が入力中...`;
      }
      
      indicator.textContent = text;
      indicator.classList.remove('hidden');
    }
  }

  openNewChatModal() {
    document.getElementById('new-chat-modal').classList.remove('hidden');
    this.loadUserList();
  }

  closeNewChatModal() {
    document.getElementById('new-chat-modal').classList.add('hidden');
  }

  switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.add('hidden');
    });
    document.getElementById(`${tabName}-chat-tab`).classList.remove('hidden');
  }

  loadUserList() {
    // Mock user list - in real implementation, fetch from API
    const users = [
      { id: 1, username: 'デザイナー1' },
      { id: 2, username: 'デザイナー2' },
      { id: 3, username: 'デザイナー3' }
    ];

    // Populate direct chat select
    const select = document.getElementById('target-user-select');
    select.innerHTML = '<option value="">ユーザーを選択...</option>';
    users.forEach(user => {
      const option = document.createElement('option');
      option.value = user.id;
      option.textContent = user.username;
      select.appendChild(option);
    });

    // Populate group chat checkboxes
    const container = document.getElementById('user-selection-list');
    container.innerHTML = '';
    users.forEach(user => {
      const checkbox = document.createElement('div');
      checkbox.className = 'user-checkbox';
      checkbox.innerHTML = `
        <input type="checkbox" id="user-${user.id}" value="${user.id}">
        <label for="user-${user.id}">${user.username}</label>
      `;
      container.appendChild(checkbox);
    });
  }

  createNewChat() {
    const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
    
    if (activeTab === 'direct') {
      const targetUserId = document.getElementById('target-user-select').value;
      if (!targetUserId) {
        alert('ユーザーを選択してください');
        return;
      }
      
      window.realtimeManager.emit('chat', 'create-direct-chat', {
        targetUserId: parseInt(targetUserId)
      });
    } else {
      const groupName = document.getElementById('group-name-input').value.trim();
      const selectedUsers = Array.from(document.querySelectorAll('#user-selection-list input:checked'))
        .map(checkbox => parseInt(checkbox.value));
      
      if (!groupName) {
        alert('グループ名を入力してください');
        return;
      }
      
      if (selectedUsers.length < 1) {
        alert('少なくとも1人のユーザーを選択してください');
        return;
      }
      
      window.realtimeManager.emit('chat', 'create-group-chat', {
        participants: selectedUsers,
        groupName
      });
    }
    
    this.closeNewChatModal();
  }

  markMessageAsRead(messageId) {
    window.realtimeManager.emit('chat', 'mark-read', { messageId });
  }

  updateRoomUnreadIndicator(roomId) {
    const unreadCount = this.unreadCounts.get(roomId) || 0;
    const roomElement = document.querySelector(`[data-room-id="${roomId}"]`);
    
    if (roomElement) {
      let indicator = roomElement.querySelector('.unread-indicator');
      if (!indicator) {
        indicator = document.createElement('span');
        indicator.className = 'unread-indicator';
        roomElement.appendChild(indicator);
      }
      
      if (unreadCount > 0) {
        indicator.textContent = unreadCount;
        indicator.classList.remove('hidden');
      } else {
        indicator.classList.add('hidden');
      }
    }
  }

  showChatNotification(message) {
    // Show desktop notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`${message.sender?.username}からのメッセージ`, {
        body: message.content,
        icon: '/favicon.ico',
        tag: 'chat-message'
      });
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Public API
  show() {
    document.getElementById('chat-container').classList.remove('hidden');
  }

  hide() {
    document.getElementById('chat-container').classList.add('hidden');
  }

  toggle() {
    const container = document.getElementById('chat-container');
    container.classList.toggle('hidden');
  }
}

// Initialize chat client when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.chatClient = new ChatClient();
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ChatClient;
}