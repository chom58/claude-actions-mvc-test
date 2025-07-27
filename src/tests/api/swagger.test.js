const request = require('supertest');
const app = require('../../app');

describe('OpenAPI/Swagger Integration', () => {
  describe('Swagger UI', () => {
    it('should serve Swagger UI at /api-docs', async () => {
      const response = await request(app)
        .get('/api-docs/')
        .expect(200);
      
      expect(response.text).toContain('Swagger UI');
    });
  });

  describe('OpenAPI Specification', () => {
    it('should serve OpenAPI specification JSON at /api-docs.json', async () => {
      const response = await request(app)
        .get('/api-docs.json')
        .expect(200)
        .expect('Content-Type', /json/);
      
      expect(response.body).toHaveProperty('openapi', '3.0.0');
      expect(response.body).toHaveProperty('info');
      expect(response.body.info).toHaveProperty('title', '原宿クリエイティブコミュニティAPI');
      expect(response.body.info).toHaveProperty('version', '2.0.0');
    });

    it('should include security schemes in OpenAPI spec', async () => {
      const response = await request(app)
        .get('/api-docs.json')
        .expect(200);
      
      expect(response.body.components).toHaveProperty('securitySchemes');
      expect(response.body.components.securitySchemes).toHaveProperty('bearerAuth');
      expect(response.body.components.securitySchemes.bearerAuth).toEqual({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      });
    });

    it('should include common schemas in OpenAPI spec', async () => {
      const response = await request(app)
        .get('/api-docs.json')
        .expect(200);
      
      expect(response.body.components).toHaveProperty('schemas');
      expect(response.body.components.schemas).toHaveProperty('User');
      expect(response.body.components.schemas).toHaveProperty('SuccessResponse');
      expect(response.body.components.schemas).toHaveProperty('ErrorResponse');
    });

    it('should include common response definitions', async () => {
      const response = await request(app)
        .get('/api-docs.json')
        .expect(200);
      
      expect(response.body.components).toHaveProperty('responses');
      expect(response.body.components.responses).toHaveProperty('UnauthorizedError');
      expect(response.body.components.responses).toHaveProperty('ValidationError');
      expect(response.body.components.responses).toHaveProperty('NotFoundError');
    });
  });

  describe('API Response Format', () => {
    it('should return standardized success response for API root', async () => {
      const response = await request(app)
        .get('/api/')
        .expect(200);
      
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('version', '2.0.0');
      expect(response.body).toHaveProperty('endpoints');
    });

    it('should return standardized error response for invalid endpoints', async () => {
      const response = await request(app)
        .get('/api/invalid-endpoint')
        .expect(404);
      
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Security Headers', () => {
    it('should include security headers in API responses', async () => {
      const response = await request(app)
        .get('/api/')
        .expect(200);
      
      expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
      expect(response.headers).toHaveProperty('x-frame-options', 'DENY');
      expect(response.headers).toHaveProperty('x-xss-protection', '1; mode=block');
    });
  });
});