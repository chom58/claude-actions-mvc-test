/**
 * アクセシビリティ監査スクリプト
 * WCAG 2.1 AA準拠チェック
 */

class AccessibilityAuditor {
  constructor() {
    this.issues = [];
    this.recommendations = [];
  }

  // メイン監査実行
  audit() {
    this.issues = [];
    this.recommendations = [];
    
    console.group('🔍 アクセシビリティ監査開始');
    
    this.checkImages();
    this.checkHeadings();
    this.checkForms();
    this.checkButtons();
    this.checkLinks();
    this.checkKeyboardAccess();
    this.checkColorContrast();
    this.checkAriaLabels();
    this.checkLandmarks();
    
    this.generateReport();
    
    console.groupEnd();
    
    return {
      issues: this.issues,
      recommendations: this.recommendations,
      score: this.calculateScore()
    };
  }

  // 画像のaltテキストチェック
  checkImages() {
    const images = document.querySelectorAll('img');
    let issueCount = 0;
    
    images.forEach((img, index) => {
      if (!img.hasAttribute('alt')) {
        this.addIssue('画像にaltテキストがありません', img, 'critical');
        issueCount++;
      } else if (img.alt === '' && !img.hasAttribute('role')) {
        // 装飾的画像の可能性があるが、明示的にマークされていない
        this.addRecommendation('装飾的画像にはrole="presentation"の追加を検討', img);
      }
    });
    
    console.log(`📷 画像チェック: ${images.length}個中${issueCount}個の問題`);
  }

  // 見出し構造チェック  
  checkHeadings() {
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    let previousLevel = 0;
    let h1Count = 0;
    
    headings.forEach((heading, index) => {
      const level = parseInt(heading.tagName.charAt(1));
      
      if (level === 1) {
        h1Count++;
      }
      
      if (index > 0 && level > previousLevel + 1) {
        this.addIssue(`見出しレベルがスキップされています (${previousLevel} → ${level})`, heading, 'medium');
      }
      
      if (!heading.textContent.trim()) {
        this.addIssue('空の見出しがあります', heading, 'high');
      }
      
      previousLevel = level;
    });
    
    if (h1Count === 0) {
      this.addIssue('ページにh1見出しがありません', document.body, 'high');
    } else if (h1Count > 1) {
      this.addIssue('ページに複数のh1見出しがあります', document.body, 'medium');
    }
    
    console.log(`📝 見出しチェック: ${headings.length}個の見出し, h1: ${h1Count}個`);
  }

  // フォームアクセシビリティチェック
  checkForms() {
    const formElements = document.querySelectorAll('input, textarea, select');
    let issueCount = 0;
    
    formElements.forEach(element => {
      const label = document.querySelector(`label[for="${element.id}"]`) || 
                   element.closest('label');
      
      if (!label && !element.hasAttribute('aria-label') && !element.hasAttribute('aria-labelledby')) {
        this.addIssue('フォーム要素にラベルがありません', element, 'high');
        issueCount++;
      }
      
      if (element.hasAttribute('required') && !element.hasAttribute('aria-required')) {
        this.addRecommendation('必須フィールドにaria-required="true"の追加を推奨', element);
      }
    });
    
    console.log(`📋 フォームチェック: ${formElements.length}個中${issueCount}個の問題`);
  }

  // ボタンアクセシビリティチェック
  checkButtons() {
    const buttons = document.querySelectorAll('button, [role="button"]');
    let issueCount = 0;
    
    buttons.forEach(button => {
      const hasText = button.textContent.trim();
      const hasAriaLabel = button.hasAttribute('aria-label');
      const hasAriaLabelledby = button.hasAttribute('aria-labelledby');
      
      if (!hasText && !hasAriaLabel && !hasAriaLabelledby) {
        this.addIssue('ボタンにアクセシブルな名前がありません', button, 'critical');
        issueCount++;
      }
    });
    
    console.log(`🔘 ボタンチェック: ${buttons.length}個中${issueCount}個の問題`);
  }

  // リンクアクセシビリティチェック
  checkLinks() {
    const links = document.querySelectorAll('a[href]');
    let issueCount = 0;
    
    links.forEach(link => {
      const text = link.textContent.trim();
      const ariaLabel = link.getAttribute('aria-label');
      
      if (!text && !ariaLabel) {
        this.addIssue('リンクにアクセシブルなテキストがありません', link, 'critical');
        issueCount++;
      }
      
      if (text && (text.toLowerCase() === 'こちら' || text.toLowerCase() === 'click here' || text.toLowerCase() === 'read more')) {
        this.addRecommendation('より説明的なリンクテキストの使用を推奨', link);
      }
      
      // 外部リンクのチェック
      if (link.hostname && link.hostname !== location.hostname && !link.hasAttribute('aria-label')) {
        this.addRecommendation('外部リンクにその旨を示すラベルの追加を推奨', link);
      }
    });
    
    console.log(`🔗 リンクチェック: ${links.length}個中${issueCount}個の問題`);
  }

  // キーボードアクセシビリティチェック
  checkKeyboardAccess() {
    const interactiveElements = document.querySelectorAll(
      'a[href], button, input, textarea, select, [tabindex], [role="button"], [role="link"]'
    );
    
    let issueCount = 0;
    
    interactiveElements.forEach(element => {
      const tabIndex = element.getAttribute('tabindex');
      
      if (tabIndex && parseInt(tabIndex) > 0) {
        this.addRecommendation('正の数値のtabindexの使用は推奨されません', element);
      }
      
      // CSSでoutlineが無効化されていないかチェック
      const computedStyle = window.getComputedStyle(element);
      if (computedStyle.outline === 'none' || computedStyle.outline === '0') {
        this.addRecommendation('フォーカス表示が無効化されている可能性があります', element);
      }
    });
    
    console.log(`⌨️ キーボードアクセシビリティチェック: ${interactiveElements.length}個の要素`);
  }

  // カラーコントラストチェック（簡易版）
  checkColorContrast() {
    const textElements = document.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6, a, button');
    let checkCount = 0;
    
    textElements.forEach(element => {
      const style = window.getComputedStyle(element);
      const fontSize = parseFloat(style.fontSize);
      
      // 小さなテキスト（18px未満）のコントラスト比は4.5:1以上が必要
      if (fontSize < 18 && element.textContent.trim()) {
        checkCount++;
        // 実際のコントラスト比計算は複雑なため、ここでは警告のみ
        this.addRecommendation('小さなテキストのコントラスト比を確認してください (4.5:1以上)', element);
      }
    });
    
    console.log(`🎨 カラーコントラストチェック: ${checkCount}個の要素をチェック`);
  }

  // ARIAラベルチェック
  checkAriaLabels() {
    const ariaElements = document.querySelectorAll('[aria-labelledby], [aria-describedby]');
    let issueCount = 0;
    
    ariaElements.forEach(element => {
      const labelledBy = element.getAttribute('aria-labelledby');
      const describedBy = element.getAttribute('aria-describedby');
      
      if (labelledBy) {
        const ids = labelledBy.split(' ');
        ids.forEach(id => {
          if (!document.getElementById(id)) {
            this.addIssue(`aria-labelledbyで参照されているID "${id}" が存在しません`, element, 'high');
            issueCount++;
          }
        });
      }
      
      if (describedBy) {
        const ids = describedBy.split(' ');
        ids.forEach(id => {
          if (!document.getElementById(id)) {
            this.addIssue(`aria-describedbyで参照されているID "${id}" が存在しません`, element, 'high');
            issueCount++;
          }
        });
      }
    });
    
    console.log(`🏷️ ARIAラベルチェック: ${ariaElements.length}個中${issueCount}個の問題`);
  }

  // ランドマークチェック
  checkLandmarks() {
    const landmarks = {
      header: document.querySelectorAll('header, [role="banner"]'),
      nav: document.querySelectorAll('nav, [role="navigation"]'),
      main: document.querySelectorAll('main, [role="main"]'),
      footer: document.querySelectorAll('footer, [role="contentinfo"]')
    };
    
    if (landmarks.main.length === 0) {
      this.addIssue('メインコンテンツ領域(main要素)がありません', document.body, 'medium');
    } else if (landmarks.main.length > 1) {
      this.addIssue('複数のmain要素があります', document.body, 'medium');
    }
    
    if (landmarks.header.length === 0) {
      this.addRecommendation('header要素またはrole="banner"の追加を検討', document.body);
    }
    
    if (landmarks.nav.length === 0) {
      this.addRecommendation('nav要素またはrole="navigation"の追加を検討', document.body);
    }
    
    console.log(`🗺️ ランドマークチェック: main: ${landmarks.main.length}, header: ${landmarks.header.length}, nav: ${landmarks.nav.length}`);
  }

  // 問題を追加
  addIssue(message, element, severity = 'medium') {
    this.issues.push({
      message,
      element,
      severity,
      selector: this.getElementSelector(element)
    });
  }

  // 推奨事項を追加  
  addRecommendation(message, element) {
    this.recommendations.push({
      message,
      element,
      selector: this.getElementSelector(element)
    });
  }

  // 要素のセレクターを取得
  getElementSelector(element) {
    if (element.id) return `#${element.id}`;
    if (element.className) return `${element.tagName.toLowerCase()}.${element.className.split(' ')[0]}`;
    return element.tagName.toLowerCase();
  }

  // スコア計算
  calculateScore() {
    const criticalIssues = this.issues.filter(i => i.severity === 'critical').length;
    const highIssues = this.issues.filter(i => i.severity === 'high').length;
    const mediumIssues = this.issues.filter(i => i.severity === 'medium').length;
    
    const totalElements = document.querySelectorAll('*').length;
    const penaltyPoints = (criticalIssues * 10) + (highIssues * 5) + (mediumIssues * 2);
    const score = Math.max(0, 100 - (penaltyPoints / totalElements * 100));
    
    return Math.round(score);
  }

  // レポート生成
  generateReport() {
    const score = this.calculateScore();
    
    console.log(`\n📊 アクセシビリティスコア: ${score}/100`);
    
    if (this.issues.length > 0) {
      console.group('❌ 問題 (' + this.issues.length + '件)');
      this.issues.forEach(issue => {
        const emoji = issue.severity === 'critical' ? '🚨' : 
                     issue.severity === 'high' ? '⚠️' : '⚡';
        console.log(`${emoji} ${issue.message} (${issue.selector})`);
      });
      console.groupEnd();
    }
    
    if (this.recommendations.length > 0) {
      console.group('💡 推奨改善 (' + this.recommendations.length + '件)');
      this.recommendations.forEach(rec => {
        console.log(`💡 ${rec.message} (${rec.selector})`);
      });
      console.groupEnd();
    }
    
    if (this.issues.length === 0) {
      console.log('✅ 重大な問題は見つかりませんでした！');
    }
  }
}

// 使用方法のための関数
function runAccessibilityAudit() {
  const auditor = new AccessibilityAuditor();
  return auditor.audit();
}

// コンソールで簡単に実行できるようにグローバルに公開
window.accessibilityAudit = runAccessibilityAudit;

// 開発環境でのみ自動実行
if (process?.env?.NODE_ENV === 'development') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      console.log('🔍 自動アクセシビリティ監査を実行中...');
      runAccessibilityAudit();
    }, 2000);
  });
}

console.log('💫 アクセシビリティ監査ツールが利用可能です。コンソールで accessibilityAudit() を実行してください。');