const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai');
const { verifyToken } = require('../middleware/auth');

// AI 聊天接口（需登录）
router.post('/chat', verifyToken, aiController.chat);

module.exports = router;
