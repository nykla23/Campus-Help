require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./config/db');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const logger = require('./utils/logger');
const app = express();
const { metricsMiddleware, metricsEndpoint, updateActiveUsers } = require('./middleware/metrics');
// ... existing code ...
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  logger.info('请求日志', { method: req.method, url: req.url, ip: req.ip, module: 'http' });
  next();
});


// CORS 配置 - 允许所有来源（开发环境）
app.use(cors({
  origin: '*',
  credentials: true,
}));
app.use('/uploads', (req, res, next) => {
  console.log('静态文件请求:', req.url);
  console.log('静态目录:', path.join(__dirname, 'uploads'));
  next();
}, express.static(path.join(__dirname, 'uploads')));

// ... existing routes ...

const userRouter = require('./routes/user');
const authRouter = require('./routes/auth');
const taskRouter = require('./routes/task');
const { _url } = require('inspector');
const healthRouter = require('./routes/health');


app.use(metricsMiddleware);
app.get('/metrics', metricsEndpoint);
app.use('/health', healthRouter);
app.use('/api/users', userRouter);
app.use('/api/auth', authRouter);
app.use('/api/tasks', taskRouter);
app.use('/api/user', userRouter);

// 消息系统路由
app.use('/api/messages', require('./routes/message'));

// AI 智能客服路由
app.use('/api/ai', require('./routes/ai'));

// 测试数据库连接
db.getConnection()
    .then(() => console.log('数据库连接成功'))
    .catch(err => {
        console.error('数据库连接失败:', err);
        process.exit(1);
    });

app.get('/', (req, res) => {
    res.send('校园帮 API 服务运行中');
});

// 健康检查端点
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((_err, req, res, _next) => {
    logger.error({ message: _err.message, stack: _err.stack, url: req.url });
    res.status(500).json({ code: 5000, message: '服务器内部错误' });
});


const server = http.createServer(app);

// 🔌 Socket.IO 配置
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// 用户ID -> socketId 映射
const userSockets = new Map();

io.on('connection', (socket) => {
  console.log('[Socket.IO] 新连接:', socket.id);

  // 用户登录后绑定 userId
  socket.on('register', (userId) => {
    console.log('[Socket.IO] 用户注册:', userId, 'socket:', socket.id);
    // 清除旧映射
    for (const [key, value] of userSockets) {
      if (value === socket.id) {
        userSockets.delete(key);
      }
    }
    userSockets.set(String(userId), socket.id);
    console.log('[Socket.IO] 当前在线用户:', [...userSockets.keys()]);
    // 更新活跃用户数
    updateActiveUsers(userSockets.size);
  });

  // 用户加入任务房间（用于任务状态变更通知）
  socket.on('joinTask', (taskId) => {
    socket.join(`task:${taskId}`);
    console.log(`[Socket.IO] 用户 ${socket.id} 加入任务房间 task:${taskId}`);
  });

  socket.on('disconnect', () => {
    console.log('[Socket.IO] 断开连接:', socket.id);
    for (const [key, value] of userSockets) {
      if (value === socket.id) {
        userSockets.delete(key);
        break;
      }
    }
    updateActiveUsers(userSockets.size);
  });
});

// 导出 io 和 userSockets 供其他模块使用
app.set('io', io);
app.set('userSockets', userSockets);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`服务器启动成功，端口 ${PORT} (Socket.IO 已启用)`);
});
