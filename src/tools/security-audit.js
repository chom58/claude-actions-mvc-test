#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

/**
 * セキュリティ監査ツール
 * 
 * プロジェクトのセキュリティ状態を包括的にチェック
 */
class SecurityAudit {
  constructor() {
    this.results = {
      passed: [],
      warnings: [],
      failures: [],
      info: []
    };
    
    this.projectRoot = process.cwd();
  }

  /**
   * 監査の実行
   */
  async run() {
    console.log('🔒 セキュリティ監査を開始します...\n');
    
    try {
      // 各種チェックの実行
      await this.checkDependencies();
      await this.checkEnvironmentVariables();
      await this.checkSecurityHeaders();
      await this.checkAuthImplementation();
      await this.checkFilePermissions();
      await this.checkSensitiveData();
      await this.checkSSLConfiguration();
      await this.checkRateLimiting();
      await this.checkInputValidation();
      await this.checkCryptography();
      
      // 結果の表示
      this.displayResults();
      
      // 監査レポートの生成
      await this.generateReport();
      
    } catch (error) {
      console.error('❌ 監査中にエラーが発生しました:', error);
      process.exit(1);
    }
  }

  /**
   * 依存関係の脆弱性チェック
   */
  async checkDependencies() {
    console.log('📦 依存関係の脆弱性をチェック中...');
    
    try {
      // npm audit の実行
      const { stdout } = await execAsync('npm audit --json');
      const auditResult = JSON.parse(stdout);
      
      if (auditResult.metadata.vulnerabilities.total === 0) {
        this.addResult('passed', '依存関係に既知の脆弱性はありません');
      } else {
        const vulns = auditResult.metadata.vulnerabilities;
        this.addResult('failure', 
          `${vulns.total}個の脆弱性が見つかりました ` +
          `(critical: ${vulns.critical}, high: ${vulns.high}, ` +
          `moderate: ${vulns.moderate}, low: ${vulns.low})`
        );
      }
    } catch (error) {
      if (error.code === 1) {
        // npm auditがエラーコード1を返す場合は脆弱性が存在
        this.addResult('failure', '依存関係に脆弱性が見つかりました。npm audit を実行してください。');
      } else {
        this.addResult('warning', 'npm audit の実行に失敗しました');
      }
    }
  }

  /**
   * 環境変数の設定チェック
   */
  async checkEnvironmentVariables() {
    console.log('🔐 環境変数の設定をチェック中...');
    
    const requiredEnvVars = [
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
      'SESSION_SECRET'
    ];
    
    const envFile = path.join(this.projectRoot, '.env');
    const envExampleFile = path.join(this.projectRoot, '.env.example');
    
    // .envファイルの存在チェック
    try {
      await fs.access(envFile);
      this.addResult('warning', '.envファイルが存在します。本番環境にコミットされていないことを確認してください');
    } catch {
      this.addResult('info', '.envファイルは存在しません');
    }
    
    // .env.exampleの存在チェック
    try {
      await fs.access(envExampleFile);
      this.addResult('passed', '.env.exampleファイルが存在します');
      
      // 必須環境変数の記載チェック
      const exampleContent = await fs.readFile(envExampleFile, 'utf-8');
      const missingVars = requiredEnvVars.filter(varName => 
        !exampleContent.includes(varName)
      );
      
      if (missingVars.length > 0) {
        this.addResult('warning', 
          `.env.exampleに以下の環境変数が記載されていません: ${missingVars.join(', ')}`
        );
      }
    } catch {
      this.addResult('failure', '.env.exampleファイルが存在しません');
    }
    
    // 環境変数の強度チェック（開発環境のみ）
    if (process.env.NODE_ENV !== 'production') {
      requiredEnvVars.forEach(varName => {
        const value = process.env[varName];
        if (!value) {
          this.addResult('warning', `環境変数 ${varName} が設定されていません`);
        } else if (value.length < 32) {
          this.addResult('warning', `環境変数 ${varName} の値が短すぎます（32文字以上推奨）`);
        }
      });
    }
  }

  /**
   * セキュリティヘッダーの実装チェック
   */
  async checkSecurityHeaders() {
    console.log('🛡️ セキュリティヘッダーの実装をチェック中...');
    
    const securityFiles = [
      'src/middleware/security.js',
      'src/middleware/security.improved.js',
      'src/templates/security/owasp.middleware.js'
    ];
    
    let hasSecurityMiddleware = false;
    
    for (const file of securityFiles) {
      try {
        const filePath = path.join(this.projectRoot, file);
        await fs.access(filePath);
        hasSecurityMiddleware = true;
        
        const content = await fs.readFile(filePath, 'utf-8');
        
        // 必須ヘッダーのチェック
        const requiredHeaders = [
          'Content-Security-Policy',
          'X-Frame-Options',
          'X-Content-Type-Options',
          'Strict-Transport-Security'
        ];
        
        const missingHeaders = requiredHeaders.filter(header => 
          !content.includes(header)
        );
        
        if (missingHeaders.length === 0) {
          this.addResult('passed', `${file} に必要なセキュリティヘッダーが実装されています`);
        } else {
          this.addResult('warning', 
            `${file} に以下のヘッダーが不足しています: ${missingHeaders.join(', ')}`
          );
        }
      } catch {
        // ファイルが存在しない
      }
    }
    
    if (!hasSecurityMiddleware) {
      this.addResult('failure', 'セキュリティミドルウェアが実装されていません');
    }
  }

  /**
   * 認証実装のチェック
   */
  async checkAuthImplementation() {
    console.log('🔑 認証実装をチェック中...');
    
    const authFiles = [
      'src/controllers/authController.js',
      'src/middleware/auth.js',
      'src/templates/security/auth.template.js'
    ];
    
    let hasAuth = false;
    
    for (const file of authFiles) {
      try {
        const filePath = path.join(this.projectRoot, file);
        const content = await fs.readFile(filePath, 'utf-8');
        hasAuth = true;
        
        // セキュリティチェック
        const checks = [
          {
            pattern: /bcrypt|argon2/i,
            message: 'パスワードハッシュ化'
          },
          {
            pattern: /jwt\.sign/i,
            message: 'JWT実装'
          },
          {
            pattern: /rate.?limit/i,
            message: 'レート制限'
          }
        ];
        
        checks.forEach(check => {
          if (check.pattern.test(content)) {
            this.addResult('passed', `${file} に${check.message}が実装されています`);
          } else {
            this.addResult('warning', `${file} に${check.message}が見つかりません`);
          }
        });
        
      } catch {
        // ファイルが存在しない
      }
    }
    
    if (!hasAuth) {
      this.addResult('failure', '認証実装が見つかりません');
    }
  }

  /**
   * ファイル権限のチェック
   */
  async checkFilePermissions() {
    console.log('📁 ファイル権限をチェック中...');
    
    const sensitiveFiles = [
      '.env',
      'private.key',
      'cert.pem',
      'id_rsa'
    ];
    
    for (const file of sensitiveFiles) {
      try {
        const filePath = path.join(this.projectRoot, file);
        const stats = await fs.stat(filePath);
        const mode = (stats.mode & parseInt('777', 8)).toString(8);
        
        if (mode !== '600' && mode !== '400') {
          this.addResult('warning', 
            `${file} の権限が緩すぎます (現在: ${mode}, 推奨: 600 または 400)`
          );
        } else {
          this.addResult('passed', `${file} の権限が適切に設定されています`);
        }
      } catch {
        // ファイルが存在しない（正常）
      }
    }
  }

  /**
   * センシティブデータの漏洩チェック
   */
  async checkSensitiveData() {
    console.log('🔍 センシティブデータの漏洩をチェック中...');
    
    const patterns = [
      {
        pattern: /(?:api[_-]?key|apikey)\s*[:=]\s*['"]?[a-zA-Z0-9]{20,}/gi,
        name: 'APIキー'
      },
      {
        pattern: /(?:secret|password)\s*[:=]\s*['"]?[^\s'"]{8,}/gi,
        name: 'シークレット/パスワード'
      },
      {
        pattern: /-----BEGIN (?:RSA )?PRIVATE KEY-----/,
        name: '秘密鍵'
      },
      {
        pattern: /(?:aws[_-]?access[_-]?key[_-]?id|aws[_-]?secret[_-]?access[_-]?key)/gi,
        name: 'AWSクレデンシャル'
      }
    ];
    
    const filesToCheck = await this.getSourceFiles();
    
    for (const file of filesToCheck) {
      const content = await fs.readFile(file, 'utf-8');
      
      patterns.forEach(({ pattern, name }) => {
        if (pattern.test(content)) {
          this.addResult('failure', 
            `${file} に${name}がハードコードされている可能性があります`
          );
        }
      });
    }
    
    if (this.results.failures.filter(f => f.includes('ハードコード')).length === 0) {
      this.addResult('passed', 'ソースコードにセンシティブデータのハードコードは見つかりませんでした');
    }
  }

  /**
   * SSL/TLS設定のチェック
   */
  async checkSSLConfiguration() {
    console.log('🔐 SSL/TLS設定をチェック中...');
    
    // Nginx設定のチェック
    const nginxConfig = path.join(this.projectRoot, 'nginx/nginx.conf');
    
    try {
      const content = await fs.readFile(nginxConfig, 'utf-8');
      
      const sslChecks = [
        {
          pattern: /ssl_protocols\s+TLSv1\.2\s+TLSv1\.3/,
          message: '安全なTLSバージョン（1.2以上）'
        },
        {
          pattern: /ssl_ciphers.*ECDHE/,
          message: '強力な暗号スイート'
        },
        {
          pattern: /ssl_prefer_server_ciphers\s+on/,
          message: 'サーバー暗号スイートの優先'
        }
      ];
      
      sslChecks.forEach(check => {
        if (check.pattern.test(content)) {
          this.addResult('passed', `Nginx設定に${check.message}が設定されています`);
        } else {
          this.addResult('warning', `Nginx設定に${check.message}が見つかりません`);
        }
      });
    } catch {
      this.addResult('info', 'Nginx設定ファイルが見つかりません');
    }
  }

  /**
   * レート制限の実装チェック
   */
  async checkRateLimiting() {
    console.log('⏱️ レート制限の実装をチェック中...');
    
    const rateLimitFiles = [
      'src/middleware/rateLimit.js',
      'src/middleware/rateLimit.improved.js'
    ];
    
    let hasRateLimit = false;
    
    for (const file of rateLimitFiles) {
      try {
        const filePath = path.join(this.projectRoot, file);
        await fs.access(filePath);
        hasRateLimit = true;
        
        const content = await fs.readFile(filePath, 'utf-8');
        
        // 異なるレート制限の実装チェック
        if (content.includes('auth()') || content.includes('login')) {
          this.addResult('passed', '認証エンドポイントにレート制限が実装されています');
        }
        
        if (content.includes('api()') || content.includes('general')) {
          this.addResult('passed', 'APIエンドポイントにレート制限が実装されています');
        }
      } catch {
        // ファイルが存在しない
      }
    }
    
    if (!hasRateLimit) {
      this.addResult('failure', 'レート制限が実装されていません');
    }
  }

  /**
   * 入力検証の実装チェック
   */
  async checkInputValidation() {
    console.log('✅ 入力検証の実装をチェック中...');
    
    const validationPatterns = [
      /express-validator/,
      /joi\./,
      /yup\./,
      /validator\./,
      /sanitize/i
    ];
    
    const files = await this.getSourceFiles();
    let hasValidation = false;
    
    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      
      if (validationPatterns.some(pattern => pattern.test(content))) {
        hasValidation = true;
        break;
      }
    }
    
    if (hasValidation) {
      this.addResult('passed', '入力検証ライブラリが使用されています');
    } else {
      this.addResult('warning', '入力検証ライブラリの使用が検出されませんでした');
    }
  }

  /**
   * 暗号化の実装チェック
   */
  async checkCryptography() {
    console.log('🔐 暗号化の実装をチェック中...');
    
    const files = await this.getSourceFiles();
    
    const weakPatterns = [
      {
        pattern: /crypto\.createCipher(?!iv)/,
        message: '弱い暗号化メソッド（createCipher）'
      },
      {
        pattern: /md5|sha1/i,
        message: '弱いハッシュアルゴリズム（MD5/SHA1）'
      },
      {
        pattern: /Math\.random\(\)/,
        message: '暗号学的に安全でない乱数生成'
      }
    ];
    
    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      
      weakPatterns.forEach(({ pattern, message }) => {
        if (pattern.test(content)) {
          this.addResult('warning', `${file} で${message}が使用されています`);
        }
      });
    }
  }

  /**
   * ソースファイルの取得
   */
  async getSourceFiles() {
    const files = [];
    
    async function walk(dir) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          if (!['node_modules', '.git', 'coverage', 'dist'].includes(entry.name)) {
            await walk(fullPath);
          }
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
          files.push(fullPath);
        }
      }
    }
    
    await walk(path.join(this.projectRoot, 'src'));
    return files;
  }

  /**
   * 結果の追加
   */
  addResult(type, message) {
    this.results[type].push(message);
  }

  /**
   * 結果の表示
   */
  displayResults() {
    console.log('\n📊 監査結果サマリー\n');
    
    // 成功
    if (this.results.passed.length > 0) {
      console.log('✅ 合格項目:');
      this.results.passed.forEach(msg => console.log(`   - ${msg}`));
      console.log();
    }
    
    // 警告
    if (this.results.warnings.length > 0) {
      console.log('⚠️  警告:');
      this.results.warnings.forEach(msg => console.log(`   - ${msg}`));
      console.log();
    }
    
    // 失敗
    if (this.results.failures.length > 0) {
      console.log('❌ 失敗:');
      this.results.failures.forEach(msg => console.log(`   - ${msg}`));
      console.log();
    }
    
    // 情報
    if (this.results.info.length > 0) {
      console.log('ℹ️  情報:');
      this.results.info.forEach(msg => console.log(`   - ${msg}`));
      console.log();
    }
    
    // スコア計算
    const total = this.results.passed.length + 
                  this.results.warnings.length + 
                  this.results.failures.length;
    
    const score = total > 0 
      ? Math.round((this.results.passed.length / total) * 100)
      : 0;
    
    console.log(`📈 セキュリティスコア: ${score}%`);
    console.log(`   合格: ${this.results.passed.length}`);
    console.log(`   警告: ${this.results.warnings.length}`);
    console.log(`   失敗: ${this.results.failures.length}\n`);
  }

  /**
   * 監査レポートの生成
   */
  async generateReport() {
    const reportPath = path.join(this.projectRoot, 'security-audit-report.json');
    
    const report = {
      timestamp: new Date().toISOString(),
      projectPath: this.projectRoot,
      results: this.results,
      summary: {
        passed: this.results.passed.length,
        warnings: this.results.warnings.length,
        failures: this.results.failures.length,
        score: Math.round(
          (this.results.passed.length / 
           (this.results.passed.length + this.results.warnings.length + this.results.failures.length)) * 100
        )
      },
      recommendations: this.generateRecommendations()
    };
    
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`📝 詳細なレポートが生成されました: ${reportPath}`);
  }

  /**
   * 推奨事項の生成
   */
  generateRecommendations() {
    const recommendations = [];
    
    if (this.results.failures.some(f => f.includes('脆弱性'))) {
      recommendations.push('npm audit fix を実行して脆弱性を修正してください');
    }
    
    if (this.results.warnings.some(w => w.includes('環境変数'))) {
      recommendations.push('本番環境では強力な環境変数を使用してください');
    }
    
    if (this.results.failures.some(f => f.includes('レート制限'))) {
      recommendations.push('DDoS攻撃を防ぐためレート制限を実装してください');
    }
    
    return recommendations;
  }
}

// CLIとして実行
if (require.main === module) {
  const audit = new SecurityAudit();
  audit.run();
}

module.exports = SecurityAudit;