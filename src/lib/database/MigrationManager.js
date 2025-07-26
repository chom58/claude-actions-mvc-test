const fs = require('fs').promises;
const path = require('path');

/**
 * データベースマイグレーション管理クラス
 */
class MigrationManager {
  constructor(manager) {
    this.manager = manager;
    this.migrationsDir = path.join(process.cwd(), 'src/migrations');
    this.migrationsTable = 'migrations';
  }

  /**
   * マイグレーションシステムを初期化
   */
  async init() {
    await this.ensureMigrationsDirectory();
    await this.ensureMigrationsTable();
  }

  /**
   * マイグレーションディレクトリが存在することを確認
   */
  async ensureMigrationsDirectory() {
    try {
      await fs.access(this.migrationsDir);
    } catch (error) {
      await fs.mkdir(this.migrationsDir, { recursive: true });
      console.log(`Migrations directory created: ${this.migrationsDir}`);
    }
  }

  /**
   * マイグレーション管理テーブルを作成
   */
  async ensureMigrationsTable() {
    const schema = {
      id: { type: 'increments', primary: true },
      migration: { type: 'string', unique: true, nullable: false },
      batch: { type: 'integer', nullable: false },
      created_at: { type: 'timestamp', default: 'now' }
    };

    try {
      await this.manager.createTable(this.migrationsTable, schema);
    } catch (error) {
      // テーブルが既に存在する場合はエラーを無視
      if (!error.message.includes('already exists')) {
        throw error;
      }
    }
  }

  /**
   * 新しいマイグレーションファイルを作成
   * @param {string} name - マイグレーション名
   * @returns {string} 作成されたファイルパス
   */
  async create(name) {
    const timestamp = new Date().toISOString()
      .replace(/[-:]/g, '')
      .replace(/\./g, '')
      .slice(0, 14);
    
    const filename = `${timestamp}_${name.replace(/\s+/g, '_').toLowerCase()}.js`;
    const filepath = path.join(this.migrationsDir, filename);
    
    const template = this.getMigrationTemplate(name);
    await fs.writeFile(filepath, template);
    
    console.log(`Migration created: ${filename}`);
    return filepath;
  }

  /**
   * 未実行のマイグレーションを実行
   */
  async up() {
    await this.init();
    
    const pendingMigrations = await this.getPendingMigrations();
    
    if (pendingMigrations.length === 0) {
      console.log('No pending migrations');
      return;
    }

    const batch = await this.getNextBatch();
    
    for (const migration of pendingMigrations) {
      console.log(`Running migration: ${migration.name}`);
      
      try {
        await this.manager.transaction(async (trx) => {
          // マイグレーションファイルを実行
          const migrationModule = require(migration.path);
          await migrationModule.up(this.createMigrationAdapter(trx));
          
          // マイグレーション記録を挿入
          await trx.insert(this.migrationsTable, {
            migration: migration.name,
            batch: batch
          });
        });
        
        console.log(`Migration completed: ${migration.name}`);
      } catch (error) {
        console.error(`Migration failed: ${migration.name}`, error);
        throw error;
      }
    }
    
    console.log(`Batch ${batch} completed (${pendingMigrations.length} migrations)`);
  }

  /**
   * 最後のバッチをロールバック
   */
  async down() {
    await this.init();
    
    const lastBatch = await this.getLastBatch();
    
    if (!lastBatch) {
      console.log('No migrations to rollback');
      return;
    }

    const batchMigrations = await this.getBatchMigrations(lastBatch);
    
    // 逆順で実行
    for (let i = batchMigrations.length - 1; i >= 0; i--) {
      const migration = batchMigrations[i];
      console.log(`Rolling back: ${migration.migration}`);
      
      try {
        await this.manager.transaction(async (trx) => {
          // マイグレーションファイルのdown関数を実行
          const migrationPath = await this.findMigrationFile(migration.migration);
          const migrationModule = require(migrationPath);
          
          if (migrationModule.down) {
            await migrationModule.down(this.createMigrationAdapter(trx));
          }
          
          // マイグレーション記録を削除
          await trx.delete(this.migrationsTable, { id: migration.id });
        });
        
        console.log(`Rollback completed: ${migration.migration}`);
      } catch (error) {
        console.error(`Rollback failed: ${migration.migration}`, error);
        throw error;
      }
    }
    
    console.log(`Batch ${lastBatch} rolled back (${batchMigrations.length} migrations)`);
  }

  /**
   * マイグレーション状態を表示
   */
  async status() {
    await this.init();
    
    const allMigrations = await this.getAllMigrationFiles();
    const runMigrations = await this.getRunMigrations();
    
    console.log('\nMigration Status:');
    console.log('================');
    
    for (const migration of allMigrations) {
      const isRun = runMigrations.find(r => r.migration === migration.name);
      const status = isRun ? `[RUN] Batch ${isRun.batch}` : '[PENDING]';
      console.log(`${status} ${migration.name}`);
    }
  }

  /**
   * 全てのマイグレーションをリセット
   */
  async reset() {
    await this.init();
    
    const runMigrations = await this.getRunMigrations();
    
    // すべてのマイグレーションを逆順でロールバック
    for (let i = runMigrations.length - 1; i >= 0; i--) {
      const migration = runMigrations[i];
      console.log(`Resetting: ${migration.migration}`);
      
      try {
        const migrationPath = await this.findMigrationFile(migration.migration);
        const migrationModule = require(migrationPath);
        
        if (migrationModule.down) {
          await migrationModule.down(this.createMigrationAdapter(this.manager));
        }
      } catch (error) {
        console.error(`Reset failed: ${migration.migration}`, error);
      }
    }
    
    // マイグレーション記録をクリア
    await this.manager.delete(this.migrationsTable, {});
    console.log('All migrations reset');
  }

  /**
   * 未実行のマイグレーションを取得
   */
  async getPendingMigrations() {
    const allMigrations = await this.getAllMigrationFiles();
    const runMigrations = await this.getRunMigrations();
    
    return allMigrations.filter(migration => 
      !runMigrations.find(run => run.migration === migration.name)
    );
  }

  /**
   * 実行済みマイグレーションを取得
   */
  async getRunMigrations() {
    try {
      return await this.manager.select(this.migrationsTable, {
        orderBy: 'batch ASC, id ASC'
      });
    } catch (error) {
      return [];
    }
  }

  /**
   * すべてのマイグレーションファイルを取得
   */
  async getAllMigrationFiles() {
    try {
      const files = await fs.readdir(this.migrationsDir);
      const migrationFiles = files
        .filter(file => file.endsWith('.js'))
        .sort()
        .map(file => ({
          name: file,
          path: path.join(this.migrationsDir, file)
        }));
      
      return migrationFiles;
    } catch (error) {
      return [];
    }
  }

  /**
   * 特定のバッチのマイグレーションを取得
   */
  async getBatchMigrations(batch) {
    return await this.manager.select(this.migrationsTable, {
      where: { batch },
      orderBy: 'id ASC'
    });
  }

  /**
   * 次のバッチ番号を取得
   */
  async getNextBatch() {
    const result = await this.manager.select(this.migrationsTable, {
      select: 'MAX(batch) as max_batch'
    });
    
    const maxBatch = result[0]?.max_batch || 0;
    return maxBatch + 1;
  }

  /**
   * 最後のバッチ番号を取得
   */
  async getLastBatch() {
    const result = await this.manager.select(this.migrationsTable, {
      select: 'MAX(batch) as max_batch'
    });
    
    return result[0]?.max_batch || null;
  }

  /**
   * マイグレーションファイルを検索
   */
  async findMigrationFile(migrationName) {
    const migrationPath = path.join(this.migrationsDir, migrationName);
    
    try {
      await fs.access(migrationPath);
      return migrationPath;
    } catch (error) {
      throw new Error(`Migration file not found: ${migrationName}`);
    }
  }

  /**
   * マイグレーション用のアダプターを作成
   */
  createMigrationAdapter(manager) {
    return {
      createTable: (tableName, schema) => manager.createTable(tableName, schema),
      dropTable: (tableName) => manager.dropTable(tableName),
      raw: (query, params) => manager.raw(query, params),
      insert: (table, data) => manager.insert(table, data),
      update: (table, data, where) => manager.update(table, data, where),
      delete: (table, where) => manager.delete(table, where),
      select: (table, options) => manager.select(table, options)
    };
  }

  /**
   * マイグレーションテンプレートを取得
   */
  getMigrationTemplate(name) {
    return `/**
 * Migration: ${name}
 * Created: ${new Date().toISOString()}
 */

module.exports = {
  /**
   * マイグレーション実行
   * @param {Object} db - データベースアダプター
   */
  async up(db) {
    // テーブル作成例
    /*
    await db.createTable('example_table', {
      id: { type: 'increments', primary: true },
      name: { type: 'string', nullable: false },
      email: { type: 'string', unique: true },
      created_at: { type: 'timestamp', default: 'now' }
    });
    */
    
    // データ挿入例
    /*
    await db.insert('example_table', {
      name: 'Example User',
      email: 'user@example.com'
    });
    */
  },

  /**
   * マイグレーションロールバック
   * @param {Object} db - データベースアダプター
   */
  async down(db) {
    // テーブル削除例
    /*
    await db.dropTable('example_table');
    */
  }
};
`;
  }
}

module.exports = MigrationManager;