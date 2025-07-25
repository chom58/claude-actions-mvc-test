const { ChatRoom, Message, User } = require('../../models');
const { validateMessage, rateLimit } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const activeUsers = new Map(); // Track active users and their typing status
const userSockets = new Map(); // Track user socket mapping

const chatHandler = (socket) => {
  console.log(`User ${socket.user.username} connected to chat namespace`);
  
  // Store user socket mapping
  userSockets.set(socket.userId, socket);
  
  socket.on('disconnect', () => {
    console.log(`User ${socket.user.username} disconnected from chat`);
    activeUsers.delete(socket.userId);
    userSockets.delete(socket.userId);
    
    // Notify all rooms this user was in that they're offline
    socket.rooms.forEach(room => {
      if (room !== socket.id) {
        socket.to(room).emit('user-offline', {
          userId: socket.userId,
          username: socket.user.username
        });
      }
    });
  });

  // Join a chat room
  socket.on('join-room', async (data) => {
    try {
      const { roomId } = data;
      
      if (!roomId) {
        return socket.emit('error', { message: 'Room ID is required' });
      }

      // Verify user has access to this room
      const room = await ChatRoom.findByPk(roomId);
      if (!room) {
        return socket.emit('error', { message: 'Room not found' });
      }

      // Check if user is a participant
      if (!room.participants.includes(socket.userId)) {
        return socket.emit('error', { message: 'Access denied to this room' });
      }

      socket.join(roomId);
      
      // Load recent messages
      const messages = await Message.findAll({
        where: { roomId },
        include: [{
          model: User,
          as: 'sender',
          attributes: ['id', 'username']
        }],
        order: [['created_at', 'DESC']],
        limit: 50
      });

      socket.emit('room-joined', {
        roomId,
        messages: messages.reverse()
      });

      // Notify others in the room
      socket.to(roomId).emit('user-joined', {
        userId: socket.userId,
        username: socket.user.username
      });

    } catch (error) {
      console.error('Join room error:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  // Leave a chat room
  socket.on('leave-room', (data) => {
    const { roomId } = data;
    socket.leave(roomId);
    
    socket.to(roomId).emit('user-left', {
      userId: socket.userId,
      username: socket.user.username
    });
  });

  // Send message with rate limiting
  socket.on('send-message', async (data) => {
    // Apply rate limiting
    rateLimit(socket, async () => {
      try {
        const validation = validateMessage(data);
        if (!validation.isValid) {
          return socket.emit('error', { message: validation.error });
        }

        const { roomId, content, type = 'text' } = validation.sanitizedData;

        if (!roomId) {
          return socket.emit('error', { message: 'Room ID is required' });
        }

        // Verify room access
        const room = await ChatRoom.findByPk(roomId);
        if (!room || !room.participants.includes(socket.userId)) {
          return socket.emit('error', { message: 'Access denied to this room' });
        }

        // Create message
        const message = await Message.create({
          roomId,
          senderId: socket.userId,
          content,
          type,
          readBy: [{ userId: socket.userId, readAt: new Date() }]
        });

        // Load message with sender info
        const fullMessage = await Message.findByPk(message.id, {
          include: [{
            model: User,
            as: 'sender',
            attributes: ['id', 'username']
          }]
        });

        // Emit to all users in the room
        socket.to(roomId).emit('new-message', fullMessage);
        socket.emit('message-sent', { messageId: message.id, status: 'sent' });

        // Stop typing indicator for this user
        socket.to(roomId).emit('typing-stopped', {
          userId: socket.userId,
          username: socket.user.username
        });

      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    }, 10, 60000); // 10 messages per minute
  });

  // Mark message as read
  socket.on('mark-read', async (data) => {
    try {
      const { messageId } = data;
      
      const message = await Message.findByPk(messageId);
      if (!message) {
        return socket.emit('error', { message: 'Message not found' });
      }

      // Verify access to room
      const room = await ChatRoom.findByPk(message.roomId);
      if (!room || !room.participants.includes(socket.userId)) {
        return;
      }

      // Update read status
      const readBy = message.readBy || [];
      const existingRead = readBy.find(r => r.userId === socket.userId);
      
      if (!existingRead) {
        readBy.push({ userId: socket.userId, readAt: new Date() });
        await message.update({ readBy });

        // Notify sender
        socket.to(message.roomId).emit('message-read', {
          messageId,
          readBy: { userId: socket.userId, username: socket.user.username }
        });
      }

    } catch (error) {
      console.error('Mark read error:', error);
    }
  });

  // Typing indicators
  socket.on('typing-start', (data) => {
    const { roomId } = data;
    socket.to(roomId).emit('typing-start', {
      userId: socket.userId,
      username: socket.user.username
    });
  });

  socket.on('typing-stop', (data) => {
    const { roomId } = data;
    socket.to(roomId).emit('typing-stopped', {
      userId: socket.userId,
      username: socket.user.username
    });
  });

  // Create direct chat room
  socket.on('create-direct-chat', async (data) => {
    try {
      const { targetUserId } = data;
      
      if (!targetUserId) {
        return socket.emit('error', { message: 'Target user ID is required' });
      }

      // Check if direct chat already exists
      const existingRoom = await ChatRoom.findOne({
        where: {
          type: 'direct'
        }
      });

      let room;
      if (existingRoom) {
        const participants = existingRoom.participants;
        if (participants.includes(socket.userId) && participants.includes(targetUserId)) {
          room = existingRoom;
        }
      }

      if (!room) {
        // Create new direct chat room
        const roomId = `direct_${Math.min(socket.userId, targetUserId)}_${Math.max(socket.userId, targetUserId)}`;
        room = await ChatRoom.create({
          id: roomId,
          type: 'direct',
          participants: [socket.userId, targetUserId],
          metadata: {
            createdBy: socket.userId
          }
        });
      }

      socket.emit('room-created', {
        roomId: room.id,
        type: room.type,
        participants: room.participants
      });

    } catch (error) {
      console.error('Create direct chat error:', error);
      socket.emit('error', { message: 'Failed to create chat room' });
    }
  });

  // Create group chat room
  socket.on('create-group-chat', async (data) => {
    try {
      const { participants, groupName } = data;
      
      if (!participants || !Array.isArray(participants) || participants.length < 2) {
        return socket.emit('error', { message: 'At least 2 participants required' });
      }

      // Add current user to participants if not included
      if (!participants.includes(socket.userId)) {
        participants.push(socket.userId);
      }

      const roomId = `group_${uuidv4()}`;
      const room = await ChatRoom.create({
        id: roomId,
        type: 'group',
        participants,
        metadata: {
          groupName: groupName || 'New Group',
          createdBy: socket.userId,
          createdAt: new Date()
        }
      });

      socket.emit('room-created', {
        roomId: room.id,
        type: room.type,
        participants: room.participants,
        metadata: room.metadata
      });

      // Notify all participants
      participants.forEach(participantId => {
        const participantSocket = userSockets.get(participantId);
        if (participantSocket && participantId !== socket.userId) {
          participantSocket.emit('invited-to-group', {
            roomId: room.id,
            groupName: room.metadata.groupName,
            invitedBy: socket.user.username
          });
        }
      });

    } catch (error) {
      console.error('Create group chat error:', error);
      socket.emit('error', { message: 'Failed to create group chat' });
    }
  });

  // Get user's chat rooms
  socket.on('get-rooms', async () => {
    try {
      const rooms = await ChatRoom.findAll({
        where: {
          participants: {
            [require('sequelize').Op.contains]: [socket.userId]
          }
        },
        include: [{
          model: Message,
          as: 'messages',
          limit: 1,
          order: [['created_at', 'DESC']],
          include: [{
            model: User,
            as: 'sender',
            attributes: ['id', 'username']
          }]
        }]
      });

      socket.emit('rooms-list', rooms);
    } catch (error) {
      console.error('Get rooms error:', error);
      socket.emit('error', { message: 'Failed to get rooms' });
    }
  });
};

module.exports = chatHandler;