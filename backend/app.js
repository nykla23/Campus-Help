require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./config/db');
const path = require('path');
const app = express();
// 主路由（如 app.js）



app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 中间件 - CORS 限制来源
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',');
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.some(allowed => origin.includes(allowed))) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy: not allowed'));
    }
  },
  credentials: true,
}));
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads', (req, res, next) => {
  console.log('静态文件请求:', req.url);
  console.log('静态目录:', path.join(__dirname, 'uploads'));
  next();
}, express.static(path.join(__dirname, 'uploads')));


const userRouter = require('./routes/user');
const authRouter = require('./routes/auth');
const taskRouter = require('./routes/task');

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

// 路由占位（后续添加）
app.get('/', (req, res) => {
    res.send('校园帮 API 服务运行中');
});

// 错误处理中间件（占位）
app.use((_err, req, res, _next) => {
    console.error(_err.stack);
    res.status(500).json({ code: 5000, message: '服务器内部错误' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`服务器启动成功，端口 ${PORT}`);
});