const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const harajukuValidation = require('../utils/harajukuValidation');

// イベント一覧取得
router.get('/', 
  harajukuValidation.validateQuery,
  eventController.getAllEvents
);

// 近日開催イベント取得
router.get('/upcoming', 
  harajukuValidation.validateQuery,
  eventController.getUpcomingEvents
);

// 特定イベント取得
router.get('/:id', 
  harajukuValidation.validateId,
  eventController.getEventById
);

// イベント作成
router.post('/', 
  harajukuValidation.createEvent,
  eventController.createEvent
);

// イベント更新
router.put('/:id', 
  harajukuValidation.updateEvent,
  eventController.updateEvent
);

// イベント削除
router.delete('/:id', 
  harajukuValidation.validateId,
  eventController.deleteEvent
);

// イベント参加登録
router.post('/:id/register', 
  harajukuValidation.registerForEvent,
  eventController.registerForEvent
);

module.exports = router;