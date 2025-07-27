/**
 * 権限管理テンプレート
 * 
 * 柔軟な権限管理システムの実装
 */
class PermissionTemplate {
  constructor() {
    // 権限定義
    this.permissions = new Map();
    this.roles = new Map();
    
    // デフォルト権限の初期化
    this.initializeDefaultPermissions();
    this.initializeDefaultRoles();
  }

  /**
   * デフォルト権限の定義
   */
  initializeDefaultPermissions() {
    // ユーザー管理権限
    this.definePermission('user.create', 'ユーザー作成');
    this.definePermission('user.read', 'ユーザー閲覧');
    this.definePermission('user.update', 'ユーザー更新');
    this.definePermission('user.delete', 'ユーザー削除');
    this.definePermission('user.list', 'ユーザー一覧');
    
    // 投稿管理権限
    this.definePermission('post.create', '投稿作成');
    this.definePermission('post.read', '投稿閲覧');
    this.definePermission('post.update', '投稿更新');
    this.definePermission('post.delete', '投稿削除');
    this.definePermission('post.publish', '投稿公開');
    this.definePermission('post.moderate', '投稿モデレート');
    
    // システム管理権限
    this.definePermission('system.config', 'システム設定');
    this.definePermission('system.logs', 'ログ閲覧');
    this.definePermission('system.backup', 'バックアップ');
    this.definePermission('system.maintenance', 'メンテナンス');
    
    // API権限
    this.definePermission('api.access', 'API アクセス');
    this.definePermission('api.unlimited', 'API 無制限アクセス');
  }

  /**
   * デフォルトロールの定義
   */
  initializeDefaultRoles() {
    // ゲストロール
    this.defineRole('guest', 'ゲスト', [
      'post.read',
      'api.access'
    ]);
    
    // ユーザーロール
    this.defineRole('user', '一般ユーザー', [
      'post.read',
      'post.create',
      'post.update:own',  // 自分の投稿のみ
      'post.delete:own',  // 自分の投稿のみ
      'user.read:own',    // 自分の情報のみ
      'user.update:own',  // 自分の情報のみ
      'api.access'
    ]);
    
    // モデレーターロール
    this.defineRole('moderator', 'モデレーター', [
      ...this.getRole('user').permissions,
      'post.moderate',
      'post.update',
      'post.delete',
      'user.list',
      'user.read'
    ]);
    
    // 管理者ロール
    this.defineRole('admin', '管理者', [
      ...this.getRole('moderator').permissions,
      'user.create',
      'user.update',
      'user.delete',
      'post.publish',
      'system.config',
      'system.logs',
      'api.unlimited'
    ]);
    
    // スーパー管理者ロール
    this.defineRole('superadmin', 'スーパー管理者', ['*']); // 全権限
  }

  /**
   * 権限を定義
   */
  definePermission(key, description, metadata = {}) {
    this.permissions.set(key, {
      key,
      description,
      metadata,
      createdAt: new Date()
    });
  }

  /**
   * ロールを定義
   */
  defineRole(key, name, permissions = [], metadata = {}) {
    this.roles.set(key, {
      key,
      name,
      permissions,
      metadata,
      createdAt: new Date()
    });
  }

  /**
   * ロールを取得
   */
  getRole(roleKey) {
    return this.roles.get(roleKey);
  }

  /**
   * 権限チェック
   */
  hasPermission(userRole, permission, context = {}) {
    const role = this.getRole(userRole);
    if (!role) return false;
    
    // スーパー管理者は全権限を持つ
    if (role.permissions.includes('*')) return true;
    
    // 直接的な権限チェック
    if (role.permissions.includes(permission)) return true;
    
    // コンテキスト付き権限チェック（例: post.update:own）
    const permissionWithContext = `${permission}:${context.ownership || 'any'}`;
    if (role.permissions.includes(permissionWithContext)) {
      return this.checkOwnership(context);
    }
    
    // ワイルドカード権限チェック（例: post.* ）
    const [resource] = permission.split('.');
    if (role.permissions.includes(`${resource}.*`)) return true;
    
    return false;
  }

  /**
   * 複数権限の一括チェック（AND条件）
   */
  hasAllPermissions(userRole, permissions, context = {}) {
    return permissions.every(permission => 
      this.hasPermission(userRole, permission, context)
    );
  }

  /**
   * 複数権限の一括チェック（OR条件）
   */
  hasAnyPermission(userRole, permissions, context = {}) {
    return permissions.some(permission => 
      this.hasPermission(userRole, permission, context)
    );
  }

  /**
   * 所有権チェック
   */
  checkOwnership(context) {
    if (!context.userId || !context.resourceOwnerId) return false;
    return context.userId === context.resourceOwnerId;
  }

  /**
   * 権限ミドルウェア生成
   */
  requirePermission(permission, options = {}) {
    return async (req, res, next) => {
      try {
        const user = req.user;
        if (!user) {
          return res.status(401).json({
            success: false,
            error: { message: '認証が必要です' }
          });
        }
        
        // コンテキストの構築
        const context = await this.buildContext(req, options);
        
        // 権限チェック
        if (!this.hasPermission(user.role, permission, context)) {
          return res.status(403).json({
            success: false,
            error: { 
              message: 'この操作を実行する権限がありません',
              required: permission
            }
          });
        }
        
        // 権限情報をリクエストに追加
        req.permissions = {
          checked: permission,
          context,
          userRole: user.role
        };
        
        next();
      } catch (error) {
        return res.status(500).json({
          success: false,
          error: { message: '権限チェック中にエラーが発生しました' }
        });
      }
    };
  }

  /**
   * 複数権限要求ミドルウェア
   */
  requireAnyPermission(...permissions) {
    return async (req, res, next) => {
      const user = req.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          error: { message: '認証が必要です' }
        });
      }
      
      const context = await this.buildContext(req);
      
      if (!this.hasAnyPermission(user.role, permissions, context)) {
        return res.status(403).json({
          success: false,
          error: { 
            message: 'この操作を実行する権限がありません',
            required: permissions
          }
        });
      }
      
      next();
    };
  }

  /**
   * コンテキスト構築
   */
  async buildContext(req, options = {}) {
    const context = {
      userId: req.user?.id,
      method: req.method,
      path: req.path,
      ...options
    };
    
    // リソースの所有者情報を取得
    if (options.resourceType && req.params.id) {
      context.resourceOwnerId = await this.getResourceOwner(
        options.resourceType,
        req.params.id
      );
      context.ownership = context.userId === context.resourceOwnerId ? 'own' : 'other';
    }
    
    return context;
  }

  /**
   * リソース所有者の取得（実装はリソースタイプに依存）
   */
  async getResourceOwner(resourceType, resourceId) {
    // 実際の実装では、データベースからリソースの所有者を取得
    const models = require('../../models');
    
    switch (resourceType) {
      case 'post':
        const post = await models.Post.findByPk(resourceId);
        return post?.userId;
      
      case 'user':
        return resourceId; // ユーザーリソースの場合、IDが所有者
      
      default:
        return null;
    }
  }

  /**
   * 権限の継承
   */
  inheritPermissions(childRole, parentRole) {
    const parent = this.getRole(parentRole);
    const child = this.getRole(childRole);
    
    if (!parent || !child) {
      throw new Error('無効なロールです');
    }
    
    // 親の権限を子に追加（重複を除く）
    const combinedPermissions = new Set([
      ...child.permissions,
      ...parent.permissions
    ]);
    
    child.permissions = Array.from(combinedPermissions);
    this.roles.set(childRole, child);
  }

  /**
   * 動的権限の追加
   */
  grantPermission(roleKey, permission) {
    const role = this.getRole(roleKey);
    if (!role) {
      throw new Error('ロールが見つかりません');
    }
    
    if (!role.permissions.includes(permission)) {
      role.permissions.push(permission);
      this.roles.set(roleKey, role);
    }
  }

  /**
   * 動的権限の削除
   */
  revokePermission(roleKey, permission) {
    const role = this.getRole(roleKey);
    if (!role) {
      throw new Error('ロールが見つかりません');
    }
    
    role.permissions = role.permissions.filter(p => p !== permission);
    this.roles.set(roleKey, role);
  }

  /**
   * ユーザーの権限一覧を取得
   */
  getUserPermissions(userRole) {
    const role = this.getRole(userRole);
    if (!role) return [];
    
    // ワイルドカード権限の展開
    if (role.permissions.includes('*')) {
      return Array.from(this.permissions.keys());
    }
    
    const expandedPermissions = [];
    
    role.permissions.forEach(permission => {
      if (permission.endsWith('*')) {
        // リソースレベルのワイルドカード
        const prefix = permission.slice(0, -1);
        this.permissions.forEach((_, key) => {
          if (key.startsWith(prefix)) {
            expandedPermissions.push(key);
          }
        });
      } else {
        expandedPermissions.push(permission.split(':')[0]);
      }
    });
    
    return [...new Set(expandedPermissions)];
  }

  /**
   * 権限マトリックスの生成
   */
  generatePermissionMatrix() {
    const matrix = {};
    
    this.roles.forEach((role, roleKey) => {
      matrix[roleKey] = {};
      
      this.permissions.forEach((_, permissionKey) => {
        matrix[roleKey][permissionKey] = this.hasPermission(roleKey, permissionKey);
      });
    });
    
    return matrix;
  }
}

// シングルトンインスタンス
const permissionTemplate = new PermissionTemplate();

module.exports = permissionTemplate;