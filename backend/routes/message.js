const express = require('express');
const router = express.Router();
const {verifyToken} = require('../middleware/auth');
const msgController = require('../controllers/message');

// 获取消息列表
router.get('/list', verifyToken, msgController.getMsgList);

// 获取聊天详情
router.get('/chat/:taskId/:targetId', verifyToken, msgController.getChatDetail);

// 发送消息
router.post('/send', verifyToken, msgController.sendMsg);

module.exports = router;