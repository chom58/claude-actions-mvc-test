const express = require('express');
const router = express.Router();
const userRoutes = require('./userRoutes');
const postRoutes = require('./postRoutes');

router.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Claude MVC API',
    version: '1.0.0',
    endpoints: {
      users: '/api/users',
      posts: '/api/posts'
    }
  });
});

router.use('/users', userRoutes);
router.use('/posts', postRoutes);

module.exports = router;