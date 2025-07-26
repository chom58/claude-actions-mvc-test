module.exports = {
  users: [
    { 
      id: 1, 
      email: 'admin@test.com', 
      username: 'admin',
      role: 'admin',
      firstName: 'Test',
      lastName: 'Admin',
      password: 'Test123!',
      isEmailVerified: true
    },
    { 
      id: 2, 
      email: 'user@test.com', 
      username: 'testuser',
      role: 'user',
      firstName: 'Test',
      lastName: 'User',
      password: 'Test123!',
      isEmailVerified: true
    },
    { 
      id: 3, 
      email: 'designer@test.com', 
      username: 'designer',
      role: 'user',
      firstName: 'Test',
      lastName: 'Designer',
      password: 'Test123!',
      isEmailVerified: true
    }
  ],
  posts: [
    { 
      id: 1, 
      title: 'Test Post 1', 
      content: 'This is a test post content.',
      type: 'general',
      userId: 2,
      isPublic: true,
      tags: 'test,sample'
    },
    { 
      id: 2, 
      title: 'Designer Showcase', 
      content: 'Showcasing design work and portfolio.',
      type: 'showcase',
      userId: 3,
      isPublic: true,
      tags: 'design,portfolio'
    }
  ],
  designerJobs: [
    {
      id: 1,
      title: 'UI/UX Designer',
      description: 'Looking for experienced UI/UX designer.',
      company: 'Test Company',
      location: 'Tokyo',
      salary: '5000000',
      requirements: 'Experience with Figma, Adobe XD',
      userId: 1
    }
  ],
  creativeEvents: [
    {
      id: 1,
      title: 'Design Workshop',
      description: 'Workshop on modern design principles.',
      location: 'Tokyo Design Center',
      date: new Date('2025-08-01'),
      userId: 1
    }
  ]
};