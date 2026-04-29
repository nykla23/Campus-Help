const express = require('express');
const router = express.Router();
const taskController = require('../controllers/task');
const {verifyToken} = require('../middleware/auth');
const {publishTask} = require('../controllers/publish');

// 获取任务列表（需登录）
router.get('/', verifyToken, taskController.list);

// 发布任务
router.post('/', verifyToken, publishTask);

// 任务详情
router.get('/:id', verifyToken, taskController.getTaskDetail);

// 接单
router.post('/:id/accept', verifyToken, taskController.acceptTask);

// 完成任务
router.post('/:id/complete', verifyToken, taskController.completeTask);

// 取消任务
router.post('/:id/cancel', verifyToken, taskController.cancelTask);

// 放弃任务
router.post('/:id/giveup', verifyToken, taskController.giveUpTask);

// 发布者确认完成
router.post('/:id/confirm', verifyToken, taskController.confirmCompleteTask);
// ...可补充其它任务相关 API
module.exports = router;