const express = require('express');
const router = express.Router();
const userController = require('../controllers/user');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

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

// 修改个人信息
router.post('/update', auth.verifyToken, userController.updateUserInfo);

// 修改密码
router.post('/change-password', auth.verifyToken, userController.changePassword);

// 确保上传目录存在
const avatarDir = path.join(__dirname, '../uploads/avatars');
if (!fs.existsSync(avatarDir)) {
  fs.mkdirSync(avatarDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, avatarDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    // 允许的图片类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('仅支持 JPG/PNG/GIF/WEBP 格式的图片'), false);
    }
  }
});

router.post('/upload-avatar', auth.verifyToken, upload.single('avatar'), userController.uploadAvatar);

module.exports = router;