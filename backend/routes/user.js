const express = require('express');
const router = express.Router();
const userController = require('../controllers/user');

// 注册
router.post('/', userController.register);

// 登录（和接口文档保持一致，挂到 /auth/login，需在主路由再挂载一层 /auth）
module.exports = router;