const { sequelize } = require('../../../src/models');
const fixtures = require('../fixtures/seed');

class DatabaseHelper {
  static async cleanDatabase() {
    // ロールバック相当の処理
    await sequelize.truncate({ cascade: true, restartIdentity: true });
  }

  static async seedDatabase() {
    // テストフィクスチャをロード
    const { User, Post, DesignerJob, CreativeEvent } = require('../../../src/models');
    
    // ユーザーを作成
    await User.bulkCreate(fixtures.users);
    
    // 投稿を作成
    await Post.bulkCreate(fixtures.posts);
    
    // デザイナー求人を作成
    await DesignerJob.bulkCreate(fixtures.designerJobs);
    
    // クリエイティブイベントを作成
    await CreativeEvent.bulkCreate(fixtures.creativeEvents);
  }

  static async resetDatabase() {
    await this.cleanDatabase();
    await this.seedDatabase();
  }

  static async syncDatabase(force = false) {
    await sequelize.sync({ force });
  }

  static async closeDatabase() {
    await sequelize.close();
  }

  static async startTransaction() {
    return await sequelize.transaction();
  }

  static async rollbackTransaction(transaction) {
    if (transaction) {
      await transaction.rollback();
    }
  }

  static async commitTransaction(transaction) {
    if (transaction) {
      await transaction.commit();
    }
  }
}

module.exports = DatabaseHelper;