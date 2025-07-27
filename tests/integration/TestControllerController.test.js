const request = require('supertest');
const app = require('../../src/app');
const { TestController } = require('../../src/models');

describe('TestControllerController', () => {
  beforeEach(async () => {
    // データベースのクリーンアップ
    await TestController.destroy({ where: {}, truncate: true });
  });

  describe('GET /testcontrollers', () => {
    it('should return all testcontrollers', async () => {
      // テストデータの作成
      await TestController.create({ name: 'Test TestController' });
      
      const response = await request(app)
        .get('/testcontrollers')
        .expect(200);
      
      expect(response.text).toContain('Test TestController');
    });
  });

  describe('POST /testcontrollers', () => {
    it('should create a new testcontroller', async () => {
      const testControllerData = {
        name: 'New TestController'
      };
      
      const response = await request(app)
        .post('/testcontrollers')
        .send(testControllerData)
        .expect(302);
      
      const created = await TestController.findOne({ where: { name: 'New TestController' } });
      expect(created).toBeTruthy();
    });
    
    it('should return validation errors', async () => {
      const response = await request(app)
        .post('/testcontrollers')
        .send({})
        .expect(400);
      
      expect(response.text).toContain('名前は必須です');
    });
  });
  
  // TODO: 追加のテストケース
});