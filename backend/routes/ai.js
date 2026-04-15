const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai');

// AI 聊天接口
router.post('/chat', aiController.chat);

module.exports = router;
