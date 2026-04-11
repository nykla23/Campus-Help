const express = require('express');
const router = express.Router();
const userController = require('../controllers/user');
const auth = require('../middleware/auth');

// 注册
router.post('/', userController.register);

// 个人信息+统计（使用 auth.verifyToken）
router.get('/profile', auth.verifyToken, userController.getProfile);
// 我发布的任务
router.get('/tasks/publish', auth.verifyToken, userController.getPublishTasks);
// 我接单的任务
router.get('/tasks/receive', auth.verifyToken, userController.getReceiveTasks);
// 交易记录
router.get('/trades', auth.verifyToken, userController.getTrades);


// 登录（和接口文档保持一致，挂到 /auth/login，需在主路由再挂载一层 /auth）
module.exports = router;