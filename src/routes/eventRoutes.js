const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const eventValidation = require('../utils/eventValidation');

// 全てのイベントを取得
router.get('/', eventController.getAllEvents);

// 近日開催のイベントを取得
router.get('/upcoming', eventController.getUpcomingEvents);

// イベント統計情報を取得
router.get('/statistics', eventController.getEventStatistics);

// 特定のイベントを取得
router.get('/:id', eventController.getEventById);

// イベント参加者一覧を取得
router.get('/:id/participants', eventController.getEventParticipants);

// 新しいイベントを作成
router.post('/', eventValidation.create, eventController.createEvent);

// イベントに参加登録
router.post('/:id/register', eventValidation.register, eventController.registerForEvent);

// イベント情報を更新
router.put('/:id', eventValidation.update, eventController.updateEvent);

// イベントを削除
router.delete('/:id', eventController.deleteEvent);

module.exports = router;