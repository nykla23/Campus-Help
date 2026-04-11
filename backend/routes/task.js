const express = require('express');
const router = express.Router();
const taskController = require('../controllers/task');
const {verifyToken} = require('../middleware/auth');
const {publishTask} = require('../controllers/publish');

// 获取任务列表
router.get('/', taskController.list);

router.post('/', verifyToken, publishTask);

router.post('/', verifyToken, publishTask);
// ...可补充其它任务相关 API
module.exports = router;