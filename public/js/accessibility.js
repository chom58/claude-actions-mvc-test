/**
 * アクセシビリティ機能強化スクリプト
 * WCAG 2.1 AA準拠のための機能実装
 */

class AccessibilityEnhancer {
  constructor() {
    this.init();
  }

  init() {
    this.addSkipLinks();
    this.enhanceKeyboardNavigation();
    this.addAriaLiveRegion();
    this.enhanceFocus();
    this.addScreenReaderSupport();
    this.improveFormAccessibility();
    this.handleReducedMotion();
  }

  // スキップリンクを追加
  addSkipLinks() {
    const skipLinks = document.createElement('div');
    skipLinks.className = 'skip-links';
    skipLinks.innerHTML = `
      <a href="#main-content">メインコンテンツにスキップ</a>
      <a href="#navigation">ナビゲーションにスキップ</a>
    `;
    document.body.insertBefore(skipLinks, document.body.firstChild);

    // メインコンテンツにIDを追加
    const heroSection = document.querySelector('.hero');
    if (heroSection) {
      heroSection.id = 'main-content';
      heroSection.setAttribute('tabindex', '-1');
    }

    // ナビゲーションにIDを追加
    const nav = document.querySelector('.nav-container');
    if (nav) {
      nav.id = 'navigation';
    }
  }

  // キーボードナビゲーションの強化
  enhanceKeyboardNavigation() {
    // Escキーでモーダルやメニューを閉じる
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeActiveModals();
      }
    });

    // ハンバーガーメニューのキーボード操作
    const hamburger = document.getElementById('hamburger');
    if (hamburger) {
      hamburger.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          hamburger.click();
        }
      });
    }

    // タブキーでフォーカス可能な要素のみに移動
    this.manageTabOrder();
  }

  // ARIA Live Regionを追加
  addAriaLiveRegion() {
    const liveRegion = document.createElement('div');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';
    liveRegion.id = 'live-region';
    document.body.appendChild(liveRegion);

    // グローバル関数として公開
    window.announceToScreenReader = (message) => {
      liveRegion.textContent = message;
      setTimeout(() => {
        liveRegion.textContent = '';
      }, 1000);
    };
  }

  // フォーカス管理の改善
  enhanceFocus() {
    // フォーカス可能な要素を追跡
    this.focusableElements = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

    // モバイルナビゲーションのフォーカス管理
    const mobileNav = document.getElementById('mobileNav');
    const hamburger = document.getElementById('hamburger');
    
    if (mobileNav && hamburger) {
      hamburger.addEventListener('click', () => {
        const isExpanded = hamburger.getAttribute('aria-expanded') === 'true';
        
        if (isExpanded) {
          // メニューが開いている場合、最初のリンクにフォーカス
          const firstLink = mobileNav.querySelector('a');
          if (firstLink) {
            setTimeout(() => firstLink.focus(), 100);
          }
        }
      });

      // モバイルナビ内でのTabキートラップ
      mobileNav.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
          this.trapFocus(e, mobileNav);
        }
      });
    }
  }

  // スクリーンリーダー対応の改善
  addScreenReaderSupport() {
    // 動的コンテンツの変更を通知
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // 新しいコンテンツが追加された時の処理
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              this.enhanceNewContent(node);
            }
          });
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // ページロード時の状態を通知
    document.addEventListener('DOMContentLoaded', () => {
      window.announceToScreenReader?.('ページが読み込まれました');
    });
  }

  // フォームのアクセシビリティ改善
  improveFormAccessibility() {
    // 必須フィールドにaria-required属性を追加
    document.querySelectorAll('input[required], textarea[required], select[required]').forEach(field => {
      field.setAttribute('aria-required', 'true');
    });

    // エラーメッセージとフィールドを関連付け
    document.querySelectorAll('.error-message').forEach(errorMsg => {
      const field = errorMsg.previousElementSibling;
      if (field && field.tagName.match(/INPUT|TEXTAREA|SELECT/)) {
        const errorId = `error-${field.id || Math.random().toString(36).substr(2, 9)}`;
        errorMsg.id = errorId;
        field.setAttribute('aria-describedby', errorId);
        field.setAttribute('aria-invalid', 'true');
      }
    });

    // フォーム送信時の処理
    document.querySelectorAll('form').forEach(form => {
      form.addEventListener('submit', (e) => {
        const firstError = form.querySelector('.error-message');
        if (firstError) {
          e.preventDefault();
          const errorField = firstError.previousElementSibling;
          if (errorField) {
            errorField.focus();
            window.announceToScreenReader?.('フォームにエラーがあります。エラーを修正してください。');
          }
        }
      });
    });
  }

  // 動作を減らす設定への対応
  handleReducedMotion() {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    const handleMotionPreference = (e) => {
      if (e.matches) {
        document.body.classList.add('reduce-motion');
        // アニメーションを無効化
        document.querySelectorAll('*').forEach(el => {
          el.style.animationDuration = '0.01ms';
          el.style.animationIterationCount = '1';
          el.style.transitionDuration = '0.01ms';
        });
      } else {
        document.body.classList.remove('reduce-motion');
      }
    };

    prefersReducedMotion.addEventListener('change', handleMotionPreference);
    handleMotionPreference(prefersReducedMotion);
  }

  // タブオーダーの管理
  manageTabOrder() {
    // 非表示要素をタブオーダーから除外
    const hiddenElements = document.querySelectorAll('[hidden], .hidden, [style*="display: none"]');
    hiddenElements.forEach(el => {
      if (el.getAttribute('tabindex') !== '-1') {
        el.setAttribute('data-original-tabindex', el.getAttribute('tabindex') || '');
        el.setAttribute('tabindex', '-1');
      }
    });
  }

  // フォーカストラップ（モーダル等で使用）
  trapFocus(e, container) {
    const focusableEls = container.querySelectorAll(this.focusableElements);
    const firstFocusableEl = focusableEls[0];
    const lastFocusableEl = focusableEls[focusableEls.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === firstFocusableEl) {
        lastFocusableEl.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === lastFocusableEl) {
        firstFocusableEl.focus();
        e.preventDefault();
      }
    }
  }

  // アクティブなモーダルやメニューを閉じる
  closeActiveModals() {
    // モバイルナビゲーション
    const hamburger = document.getElementById('hamburger');
    const mobileNav = document.getElementById('mobileNav');
    
    if (hamburger && hamburger.getAttribute('aria-expanded') === 'true') {
      hamburger.click();
    }

    // その他のモーダル要素があれば追加
  }

  // 新しく追加されたコンテンツの拡張
  enhanceNewContent(element) {
    // 新しいフォーム要素の処理
    const newFormElements = element.querySelectorAll('input, textarea, select');
    newFormElements.forEach(field => {
      if (field.hasAttribute('required')) {
        field.setAttribute('aria-required', 'true');
      }
    });

    // 新しいボタンの処理
    const newButtons = element.querySelectorAll('button:not([aria-label])');
    newButtons.forEach(button => {
      if (!button.textContent.trim()) {
        button.setAttribute('aria-label', 'ボタン');
      }
    });
  }

  // ユーティリティ関数: 要素が表示されているかチェック
  isVisible(element) {
    return !!(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
  }

  // ユーティリティ関数: 安全なフォーカス移動
  safeFocus(element) {
    if (element && this.isVisible(element)) {
      element.focus();
      return true;
    }
    return false;
  }
}

// ハイコントラストモード検出
function detectHighContrast() {
  const testElement = document.createElement('div');
  testElement.style.borderStyle = 'solid';
  testElement.style.borderWidth = '1px';
  testElement.style.borderColor = 'red green';
  testElement.style.position = 'absolute';
  testElement.style.left = '-9999px';
  
  document.body.appendChild(testElement);
  
  const computedStyle = window.getComputedStyle(testElement);
  const isHighContrast = computedStyle.borderTopColor === computedStyle.borderRightColor;
  
  document.body.removeChild(testElement);
  
  if (isHighContrast) {
    document.body.classList.add('high-contrast');
  }
  
  return isHighContrast;
}

// キーボードユーザー検出
function detectKeyboardUser() {
  let isKeyboardUser = false;
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      isKeyboardUser = true;
      document.body.classList.add('keyboard-user');
    }
  });
  
  document.addEventListener('mousedown', () => {
    if (isKeyboardUser) {
      isKeyboardUser = false;
      document.body.classList.remove('keyboard-user');
    }
  });
}

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  new AccessibilityEnhancer();
  detectHighContrast();
  detectKeyboardUser();
  
  console.log('アクセシビリティ機能が初期化されました');
});

// エクスポート（モジュール環境用）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AccessibilityEnhancer, detectHighContrast, detectKeyboardUser };
}