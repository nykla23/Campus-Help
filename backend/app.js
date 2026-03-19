require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./config/db');

const app = express();

// 中间件
app.use(cors());
app.use(express.json());

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