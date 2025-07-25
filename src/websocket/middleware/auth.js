const jwt = require('jsonwebtoken');
const { User } = require('../../models');

const authenticateSocket = async (socket, next) => {
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
};

const validateMessage = (data) => {
  // Basic message validation
  if (!data || typeof data !== 'object') {
    return { isValid: false, error: 'Invalid message format' };
  }

  if (!data.content || typeof data.content !== 'string') {
    return { isValid: false, error: 'Message content is required' };
  }

  if (data.content.length > 5000) {
    return { isValid: false, error: 'Message too long' };
  }

  // Sanitize HTML/XSS
  const sanitizedContent = data.content
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');

  return {
    isValid: true,
    sanitizedData: {
      ...data,
      content: sanitizedContent
    }
  };
};

const rateLimitMap = new Map();

const rateLimit = (socket, next, maxRequests = 30, windowMs = 60000) => {
  const key = socket.userId;
  const now = Date.now();
  
  if (!rateLimitMap.has(key)) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return next();
  }

  const userData = rateLimitMap.get(key);
  
  if (now > userData.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return next();
  }

  if (userData.count >= maxRequests) {
    return next(new Error('Rate limit exceeded'));
  }

  userData.count++;
  next();
};

module.exports = {
  authenticateSocket,
  validateMessage,
  rateLimit
};