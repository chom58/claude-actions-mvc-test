const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');
const jwt = require('jsonwebtoken');
const { User } = require('../models');

let io;

// Redis clients for adapter
let pubClient, subClient;

const initializeWebSocketServer = async (server) => {
  try {
    // Initialize Socket.IO server
    io = new Server(server, {
      cors: {
        origin: process.env.CLIENT_URL || "*",
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    // Redis adapter setup for scalability
    if (process.env.REDIS_URL) {
      pubClient = createClient({ url: process.env.REDIS_URL });
      subClient = pubClient.duplicate();
      
      await Promise.all([
        pubClient.connect(),
        subClient.connect()
      ]);
      
      io.adapter(createAdapter(pubClient, subClient));
      console.log('WebSocket Redis adapter initialized');
    }

    // Authentication middleware
    io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication error: No token provided'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findByPk(decoded.id);
        
        if (!user || !user.isActive) {
          return next(new Error('Authentication error: Invalid user'));
        }

        socket.userId = user.id;
        socket.user = user;
        next();
      } catch (error) {
        next(new Error('Authentication error: Invalid token'));
      }
    });

    // Import and setup namespace handlers
    const chatHandler = require('./handlers/chatHandler');
    const notificationHandler = require('./handlers/notificationHandler');
    const liveUpdateHandler = require('./handlers/liveUpdateHandler');

    // Setup namespaces
    const chatNamespace = io.of('/chat');
    const notificationNamespace = io.of('/notifications');
    const liveUpdateNamespace = io.of('/live-updates');

    // Apply authentication to all namespaces
    [chatNamespace, notificationNamespace, liveUpdateNamespace].forEach(namespace => {
      namespace.use(async (socket, next) => {
        try {
          const token = socket.handshake.auth.token;
          if (!token) {
            return next(new Error('Authentication error: No token provided'));
          }

          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          const user = await User.findByPk(decoded.id);
          
          if (!user || !user.isActive) {
            return next(new Error('Authentication error: Invalid user'));
          }

          socket.userId = user.id;
          socket.user = user;
          next();
        } catch (error) {
          next(new Error('Authentication error: Invalid token'));
        }
      });
    });

    // Setup handlers
    chatNamespace.on('connection', chatHandler);
    notificationNamespace.on('connection', notificationHandler);
    liveUpdateNamespace.on('connection', liveUpdateHandler);

    console.log('WebSocket server initialized successfully');
    return io;
  } catch (error) {
    console.error('WebSocket initialization error:', error);
    throw error;
  }
};

const getIO = () => {
  if (!io) {
    throw new Error('WebSocket server not initialized');
  }
  return io;
};

const closeWebSocketServer = async () => {
  try {
    if (io) {
      io.close();
    }
    if (pubClient) {
      await pubClient.quit();
    }
    if (subClient) {
      await subClient.quit();
    }
    console.log('WebSocket server closed');
  } catch (error) {
    console.error('Error closing WebSocket server:', error);
  }
};

module.exports = {
  initializeWebSocketServer,
  getIO,
  closeWebSocketServer
};