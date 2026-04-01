const express = require('express');
const router = express.Router();
const taskController = require('../controllers/task');

// 获取任务列表
router.get('/', taskController.list);

// ...可补充其它任务相关 API
module.exports = router;