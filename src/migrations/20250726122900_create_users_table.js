/**
 * Migration: Create users table
 * Created: 2025-07-26T12:29:00.000Z
 */

module.exports = {
  /**
   * マイグレーション実行
   * @param {Object} db - データベースアダプター
   */
  async up(db) {
    await db.createTable('users', {
      id: { type: 'increments', primary: true },
      username: { type: 'string', unique: true, nullable: false },
      email: { type: 'string', unique: true, nullable: false },
      password: { type: 'string', nullable: false },
      isActive: { type: 'boolean', default: true },
      resetPasswordToken: { type: 'string', nullable: true },
      resetPasswordExpires: { type: 'timestamp', nullable: true },
      refreshToken: { type: 'text', nullable: true },
      lastLoginAt: { type: 'timestamp', nullable: true },
      profileImage: { type: 'string', nullable: true },
      profileImageThumbnail: { type: 'string', nullable: true },
      bio: { type: 'text', nullable: true },
      website: { type: 'string', nullable: true },
      location: { type: 'string', nullable: true },
      skills: { type: 'json', nullable: true },
      created_at: { type: 'timestamp', default: 'now' },
      updated_at: { type: 'timestamp', default: 'now' }
    });

    console.log('Users table created successfully');
  },

  /**
   * マイグレーションロールバック
   * @param {Object} db - データベースアダプター
   */
  async down(db) {
    await db.dropTable('users');
    console.log('Users table dropped successfully');
  }
};