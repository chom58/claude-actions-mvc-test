const { faker } = require('@faker-js/faker');

module.exports = {
  generateRandomPost,
  logResponse
};

function generateRandomPost(context, events, done) {
  context.vars.postTitle = faker.lorem.sentence();
  context.vars.postContent = faker.lorem.paragraphs(2);
  return done();
}

function logResponse(requestParams, response, context, events, done) {
  if (response.statusCode >= 400) {
    console.log(`Error: ${response.statusCode} - ${response.body}`);
  }
  return done();
}