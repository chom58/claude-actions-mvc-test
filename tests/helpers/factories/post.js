const { faker } = require('@faker-js/faker');
const { Post } = require('../../../src/models');

const postFactory = {
  build: (overrides = {}) => ({
    title: faker.lorem.sentence(),
    content: faker.lorem.paragraphs(3),
    type: 'general',
    tags: [faker.lorem.word(), faker.lorem.word()].join(','),
    isPublic: true,
    ...overrides
  }),
  
  create: async (overrides = {}) => {
    const postData = postFactory.build(overrides);
    return await Post.create(postData);
  },
  
  createMany: async (count, overrides = {}) => {
    const posts = [];
    for (let i = 0; i < count; i++) {
      posts.push(await postFactory.create(overrides));
    }
    return posts;
  },

  createWithUser: async (userId, overrides = {}) => {
    const postData = postFactory.build({
      userId,
      ...overrides
    });
    return await Post.create(postData);
  }
};

module.exports = postFactory;