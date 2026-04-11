require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./config/db');
// 主路由（如 app.js）

const userRouter = require('./routes/user');
const authRouter = require('./routes/auth');
const taskRouter = require('./routes/task');
const publishRouter = require('./routes/task'); // 发布任务的路由
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 中间件
app.use(cors());
app.use(express.json());
app.use('/api/users', userRouter); // 注册接口路径变为 POST /users
app.use('/api/auth', authRouter);  // 新增：给 user 路由挂载 /auth 前缀
app.use('/api/tasks', taskRouter); // 任务接口路径变为 /tasks
app.use('/api/tasks', publishRouter); // 发布任务接口路径变为 /tasks POST
// 个人主页路由
app.use('/api/user', require('./routes/user'));

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
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ code: 5000, message: '服务器内部错误' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`服务器启动成功，端口 ${PORT}`);
});