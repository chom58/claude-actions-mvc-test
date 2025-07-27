/**
 * セキュリティテンプレート エクスポート
 * 
 * 統一されたセキュリティ機能へのアクセスポイント
 */

const AuthTemplate = require('./auth.template');
const permissionTemplate = require('./permission.template');
const OWASPSecurityMiddleware = require('./owasp.middleware');
const improvedSecurity = require('../../middleware/security.improved');

module.exports = {
  // 認証・認可
  Auth: AuthTemplate,
  permissions: permissionTemplate,
  
  // OWASPセキュリティ
  OWASPSecurity: OWASPSecurityMiddleware,
  
  // 改善されたセキュリティミドルウェア
  securityMiddleware: improvedSecurity,
  
  // クイックセットアップ
  quickSetup: (app, config = {}) => {
    const auth = new AuthTemplate(config.auth);
    const owasp = new OWASPSecurityMiddleware(config.owasp);
    
    // 基本的なセキュリティ設定を適用
    app.use(owasp.applyAll());
    
    // 認証ルートの保護
    const authProtection = owasp.protectAuthRoutes();
    Object.entries(authProtection).forEach(([route, middleware]) => {
      app.use(route, middleware);
    });
    
    return {
      auth,
      permissions: permissionTemplate,
      owasp
    };
  }
};