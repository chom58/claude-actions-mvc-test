const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
  }

  async initialize() {
    try {
      // 開発環境用のテスト設定
      if (process.env.NODE_ENV === 'development') {
        this.transporter = nodemailer.createTransporter({
          host: 'localhost',
          port: 1025,
          ignoreTLS: true,
          auth: null
        });
      } else {
        // 本番環境用の設定（環境変数から取得）
        this.transporter = nodemailer.createTransporter({
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: process.env.SMTP_PORT || 587,
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        });
      }

      // 接続テスト
      if (process.env.NODE_ENV !== 'development') {
        await this.transporter.verify();
      }
      
      this.initialized = true;
      logger.info('Email service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize email service:', error);
      // 開発環境では失敗してもアプリを停止しない
      if (process.env.NODE_ENV === 'production') {
        throw error;
      }
    }
  }

  async sendEmail({ to, subject, html, text }) {
    if (!this.initialized) {
      logger.warn('Email service not initialized, skipping email send');
      return { success: false, message: 'Email service not initialized' };
    }

    try {
      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@harajuku-creative.jp',
        to,
        subject,
        html,
        text
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent successfully to ${to}: ${subject}`);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      logger.error(`Failed to send email to ${to}:`, error);
      return { success: false, error: error.message };
    }
  }

  // メッセージ通知メール
  async sendMessageNotification(userEmail, senderUsername, messagePreview) {
    const subject = `新しいメッセージが届きました - 原宿クリエイティブコミュニティ`;
    const html = `
      <div style="font-family: 'Noto Sans JP', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0a0a0a; color: #ffffff;">
        <div style="background: linear-gradient(45deg, #FF1493, #00FFFF, #00FF00); padding: 2px;">
          <div style="background-color: #0a0a0a; padding: 30px;">
            <h1 style="color: #FF1493; font-size: 24px; margin-bottom: 20px; text-align: center;">
              ⚡ 新しいメッセージ ⚡
            </h1>
            
            <div style="background-color: #1a1a1a; padding: 20px; border-radius: 8px; border-left: 4px solid #00FFFF;">
              <p style="margin: 0 0 15px 0; font-size: 16px;">
                <strong style="color: #00FFFF;">${senderUsername}</strong> さんからメッセージが届きました:
              </p>
              
              <blockquote style="margin: 0; padding: 15px; background-color: #2a2a2a; border-radius: 4px; font-style: italic; color: #f0f0f0;">
                "${messagePreview}"
              </blockquote>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/chat" 
                 style="display: inline-block; background: linear-gradient(45deg, #FF1493, #00FFFF); color: #0a0a0a; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; text-transform: uppercase;">
                メッセージを確認
              </a>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #333; text-align: center; color: #888; font-size: 12px;">
              <p>このメールは原宿クリエイティブコミュニティから送信されました</p>
              <p>通知設定を変更したい場合は、アプリ内の設定ページをご確認ください</p>
            </div>
          </div>
        </div>
      </div>
    `;
    
    const text = `
新しいメッセージが届きました - 原宿クリエイティブコミュニティ

${senderUsername} さんからメッセージが届きました:
"${messagePreview}"

メッセージを確認: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/chat

このメールは原宿クリエイティブコミュニティから送信されました
    `;

    return await this.sendEmail({
      to: userEmail,
      subject,
      html,
      text
    });
  }

  // コラボレーション申請通知メール
  async sendCollaborationNotification(userEmail, applicantName, projectDetails) {
    const subject = `コラボレーション申請が届きました - 原宿クリエイティブコミュニティ`;
    const html = `
      <div style="font-family: 'Noto Sans JP', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0a0a0a; color: #ffffff;">
        <div style="background: linear-gradient(45deg, #FF1493, #00FFFF, #00FF00); padding: 2px;">
          <div style="background-color: #0a0a0a; padding: 30px;">
            <h1 style="color: #00FF00; font-size: 24px; margin-bottom: 20px; text-align: center;">
              🤝 コラボレーション申請 🤝
            </h1>
            
            <div style="background-color: #1a1a1a; padding: 20px; border-radius: 8px; border-left: 4px solid #00FF00;">
              <p style="margin: 0 0 15px 0; font-size: 16px;">
                <strong style="color: #00FF00;">${applicantName}</strong> さんからコラボレーション申請が届きました
              </p>
              
              <div style="margin: 15px 0; padding: 15px; background-color: #2a2a2a; border-radius: 4px;">
                <h3 style="color: #FF1493; margin: 0 0 10px 0;">プロジェクト詳細:</h3>
                <p style="color: #f0f0f0; margin: 0;">${projectDetails}</p>
              </div>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/collaborations" 
                 style="display: inline-block; background: linear-gradient(45deg, #00FF00, #00FFFF); color: #0a0a0a; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; text-transform: uppercase;">
                申請を確認
              </a>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #333; text-align: center; color: #888; font-size: 12px;">
              <p>このメールは原宿クリエイティブコミュニティから送信されました</p>
            </div>
          </div>
        </div>
      </div>
    `;

    const text = `
コラボレーション申請が届きました - 原宿クリエイティブコミュニティ

${applicantName} さんからコラボレーション申請が届きました

プロジェクト詳細:
${projectDetails}

申請を確認: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/collaborations
    `;

    return await this.sendEmail({
      to: userEmail,
      subject,
      html,
      text
    });
  }

  // イベント参加通知メール
  async sendEventNotification(userEmail, eventName, eventDate, eventLocation) {
    const subject = `イベント参加確認 - ${eventName}`;
    const html = `
      <div style="font-family: 'Noto Sans JP', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0a0a0a; color: #ffffff;">
        <div style="background: linear-gradient(45deg, #FF1493, #00FFFF, #00FF00); padding: 2px;">
          <div style="background-color: #0a0a0a; padding: 30px;">
            <h1 style="color: #FFFF00; font-size: 24px; margin-bottom: 20px; text-align: center;">
              🎉 イベント参加確認 🎉
            </h1>
            
            <div style="background-color: #1a1a1a; padding: 20px; border-radius: 8px; border-left: 4px solid #FFFF00;">
              <h2 style="color: #FFFF00; margin: 0 0 15px 0;">${eventName}</h2>
              <p style="margin: 0 0 10px 0;"><strong>日時:</strong> ${eventDate}</p>
              <p style="margin: 0 0 15px 0;"><strong>場所:</strong> ${eventLocation}</p>
              <p style="color: #00FFFF;">イベント参加を確認いたしました。当日お会いできることを楽しみにしています！</p>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/events" 
                 style="display: inline-block; background: linear-gradient(45deg, #FFFF00, #FF1493); color: #0a0a0a; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; text-transform: uppercase;">
                イベント詳細
              </a>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #333; text-align: center; color: #888; font-size: 12px;">
              <p>このメールは原宿クリエイティブコミュニティから送信されました</p>
            </div>
          </div>
        </div>
      </div>
    `;

    const text = `
イベント参加確認 - ${eventName}

日時: ${eventDate}
場所: ${eventLocation}

イベント参加を確認いたしました。当日お会いできることを楽しみにしています！

イベント詳細: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/events
    `;

    return await this.sendEmail({
      to: userEmail,
      subject,
      html,
      text
    });
  }

  // ウェルカムメール
  async sendWelcomeEmail(userEmail, username) {
    const subject = `原宿クリエイティブコミュニティへようこそ！`;
    const html = `
      <div style="font-family: 'Noto Sans JP', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0a0a0a; color: #ffffff;">
        <div style="background: linear-gradient(45deg, #FF1493, #00FFFF, #00FF00); padding: 2px;">
          <div style="background-color: #0a0a0a; padding: 30px;">
            <h1 style="color: #FF1493; font-size: 28px; margin-bottom: 20px; text-align: center;">
              🌟 Welcome to HCC! 🌟
            </h1>
            
            <div style="text-align: center; margin-bottom: 30px;">
              <p style="font-size: 18px; color: #00FFFF;">
                <strong>${username}</strong> さん、原宿クリエイティブコミュニティへようこそ！
              </p>
            </div>
            
            <div style="background-color: #1a1a1a; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #00FF00; margin-top: 0;">🎨 できること</h2>
              <ul style="color: #f0f0f0; line-height: 1.6;">
                <li>クリエイターとの直接メッセージ交換</li>
                <li>コラボレーション案件の発見・応募</li>
                <li>原宿エリアのクリエイティブイベント参加</li>
                <li>ポートフォリオ公開・共有</li>
                <li>デザイン会社・ブランドとのマッチング</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" 
                 style="display: inline-block; background: linear-gradient(45deg, #FF1493, #00FFFF); color: #0a0a0a; padding: 15px 40px; text-decoration: none; border-radius: 25px; font-weight: bold; text-transform: uppercase; margin-bottom: 15px;">
                プラットフォームを探索
              </a>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #333; text-align: center; color: #888; font-size: 12px;">
              <p>CREATE. CONNECT. INSPIRE.</p>
              <p>原宿クリエイティブコミュニティ</p>
            </div>
          </div>
        </div>
      </div>
    `;

    const text = `
原宿クリエイティブコミュニティへようこそ！

${username} さん、原宿クリエイティブコミュニティへようこそ！

できること:
- クリエイターとの直接メッセージ交換
- コラボレーション案件の発見・応募
- 原宿エリアのクリエイティブイベント参加
- ポートフォリオ公開・共有
- デザイン会社・ブランドとのマッチング

プラットフォームを探索: ${process.env.FRONTEND_URL || 'http://localhost:3000'}

CREATE. CONNECT. INSPIRE.
原宿クリエイティブコミュニティ
    `;

    return await this.sendEmail({
      to: userEmail,
      subject,
      html,
      text
    });
  }
}

const emailService = new EmailService();

module.exports = emailService;