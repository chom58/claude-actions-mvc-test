const { JobApplication, User, DesignerJob, Message, ChatRoom, sequelize } = require('../models');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const notificationService = require('../services/notificationService');

// 応募関連のメッセージルーム作成・取得
const getOrCreateApplicationChatRoom = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const userId = req.user.id;

    // 応募の存在確認と権限チェック
    const application = await JobApplication.findByPk(applicationId, {
      include: [
        { model: User, as: 'applicant' },
        { model: DesignerJob, as: 'job' }
      ]
    });

    if (!application) {
      return res.status(404).json({ error: '応募が見つかりません' });
    }

    // 応募者または企業側（将来的には企業権限チェックを追加）のみアクセス可能
    if (application.userId !== userId) {
      // 将来的にはここで企業権限をチェック
      // if (!userIsCompanyOwnerOfJob(userId, application.job)) {
      //   return res.status(403).json({ error: 'アクセス権限がありません' });
      // }
    }

    // チャットルームIDは "application_" + applicationId の形式
    const roomId = `application_${applicationId}`;

    // 既存のチャットルームを検索
    let chatRoom = await ChatRoom.findOne({ where: { roomId } });

    if (!chatRoom) {
      // チャットルームが存在しない場合は作成
      chatRoom = await ChatRoom.create({
        roomId,
        name: `応募相談: ${application.job.title}`,
        type: 'application',
        participants: JSON.stringify([application.userId]), // 初期は応募者のみ
        isActive: true,
        metadata: {
          applicationId: applicationId,
          jobId: application.jobId,
          jobTitle: application.job.title,
          company: application.job.company
        }
      });
    }

    res.json({
      chatRoom,
      application: {
        id: application.id,
        status: application.status,
        job: {
          title: application.job.title,
          company: application.job.company
        }
      }
    });

  } catch (error) {
    console.error('チャットルーム取得エラー:', error);
    res.status(500).json({ 
      error: 'チャットルームの取得中にエラーが発生しました',
      details: error.message 
    });
  }
};

// 応募メッセージ一覧取得
const getApplicationMessages = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const userId = req.user.id;
    const offset = (page - 1) * limit;

    // 応募の権限チェック
    const application = await JobApplication.findByPk(applicationId);
    if (!application) {
      return res.status(404).json({ error: '応募が見つかりません' });
    }

    if (application.userId !== userId) {
      // 将来的には企業権限チェック
      return res.status(403).json({ error: 'アクセス権限がありません' });
    }

    const roomId = `application_${applicationId}`;

    const { count, rows } = await Message.findAndCountAll({
      where: { roomId },
      include: [
        { 
          model: User, 
          as: 'sender', 
          attributes: ['id', 'username', 'email'] 
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // メッセージを既読にマーク
    await Message.update(
      { 
        readBy: sequelize.fn('JSON_ARRAY_APPEND', 
          sequelize.col('readBy'), 
          '$', 
          userId
        )
      },
      { 
        where: { 
          roomId,
          senderId: { [Op.ne]: userId },
          readBy: { [Op.notLike]: `%${userId}%` }
        }
      }
    );

    res.json({
      messages: rows.reverse(), // 古い順に並び替え
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('メッセージ取得エラー:', error);
    res.status(500).json({ 
      error: 'メッセージの取得中にエラーが発生しました',
      details: error.message 
    });
  }
};

// 応募メッセージ送信
const sendApplicationMessage = async (req, res) => {
  try {
    // バリデーションエラーチェック
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'バリデーションエラー',
        details: errors.array()
      });
    }

    const { applicationId } = req.params;
    const { content, type = 'text' } = req.body;
    const userId = req.user.id;

    // 応募の権限チェック
    const application = await JobApplication.findByPk(applicationId, {
      include: [
        { model: User, as: 'applicant' },
        { model: DesignerJob, as: 'job' }
      ]
    });

    if (!application) {
      return res.status(404).json({ error: '応募が見つかりません' });
    }

    if (application.userId !== userId) {
      // 将来的には企業権限チェック
      return res.status(403).json({ error: 'メッセージ送信権限がありません' });
    }

    const roomId = `application_${applicationId}`;

    // チャットルームの存在確認
    let chatRoom = await ChatRoom.findOne({ where: { roomId } });
    if (!chatRoom) {
      // チャットルームが存在しない場合は作成
      chatRoom = await ChatRoom.create({
        roomId,
        name: `応募相談: ${application.job.title}`,
        type: 'application',
        participants: JSON.stringify([application.userId]),
        isActive: true,
        metadata: {
          applicationId: applicationId,
          jobId: application.jobId,
          jobTitle: application.job.title,
          company: application.job.company
        }
      });
    }

    // メッセージ作成
    const message = await Message.create({
      roomId,
      senderId: userId,
      content,
      type,
      readBy: [userId] // 送信者は既読
    });

    // 送信者情報を含めて返す
    const messageWithSender = await Message.findByPk(message.id, {
      include: [
        { 
          model: User, 
          as: 'sender', 
          attributes: ['id', 'username', 'email'] 
        }
      ]
    });

    // リアルタイム通知（Socket.io経由）
    // この部分は websocket/handlers/chatHandler.js で処理される

    // 応募の最終連絡日時を更新
    application.lastContactedAt = new Date();
    await application.save();

    res.status(201).json({
      message: 'メッセージを送信しました',
      data: messageWithSender
    });

  } catch (error) {
    console.error('メッセージ送信エラー:', error);
    res.status(500).json({ 
      error: 'メッセージの送信中にエラーが発生しました',
      details: error.message 
    });
  }
};

// ユーザーの応募メッセージ履歴一覧
const getUserApplicationChats = async (req, res) => {
  try {
    const userId = req.user.id;

    // ユーザーの応募一覧を取得し、それぞれのチャットルームの最新メッセージを含める
    const applications = await JobApplication.findAll({
      where: { userId },
      include: [
        {
          model: DesignerJob,
          as: 'job'
        }
      ],
      order: [['lastContactedAt', 'DESC']]
    });

    const chatList = [];

    for (const application of applications) {
      const roomId = `application_${application.id}`;
      
      // 最新メッセージを取得
      const latestMessage = await Message.findOne({
        where: { roomId },
        include: [
          { 
            model: User, 
            as: 'sender', 
            attributes: ['id', 'username'] 
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      // 未読メッセージ数を取得
      const unreadCount = await Message.count({
        where: { 
          roomId,
          senderId: { [Op.ne]: userId },
          readBy: { [Op.notLike]: `%${userId}%` }
        }
      });

      chatList.push({
        applicationId: application.id,
        roomId,
        job: {
          title: application.job.title,
          company: application.job.company
        },
        status: application.status,
        latestMessage,
        unreadCount,
        lastContactedAt: application.lastContactedAt
      });
    }

    res.json({ chats: chatList });

  } catch (error) {
    console.error('チャット履歴取得エラー:', error);
    res.status(500).json({ 
      error: 'チャット履歴の取得中にエラーが発生しました',
      details: error.message 
    });
  }
};

module.exports = {
  getOrCreateApplicationChatRoom,
  getApplicationMessages,
  sendApplicationMessage,
  getUserApplicationChats
};