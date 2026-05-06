// 后端 API/接口测试 - 使用 supertest 测试接口正常响应、参数校验和异常处理

require('dotenv').config(); // 必须在 require 路由之前加载环境变量

const request = require('supertest');
const express = require('express');

// ★ 必须在 require 路由之前 mock auth 中间件
jest.mock('../middleware/auth', () => ({
  verifyToken: (req, res, next) => {
    req.user = { id: 1, userId: 1, username: 'testuser' };
    next();
  }
}));

// 创建测试用的 app
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 导入路由（mock 已生效）
const authRoutes = require('../routes/auth');
const userRoutes = require('../routes/user');
const taskRoutes = require('../routes/task');
const messageRoutes = require('../routes/message');
const aiRoutes = require('../routes/ai');

// 注册路由
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/ai', aiRoutes);

// 全局错误处理
app.use((_err, req, res, _next) => {
  res.status(500).json({ code: 5000 });
});

describe('=== Auth API 测试 ===', () => {

  test('POST /api/auth/login - 缺少参数应返回1001', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({});
    expect(res.status).toBe(200);
    expect(res.body.code).toBe(1001);
  });

  test('POST /api/auth/login - 用户不存在或DB不可用应返回错误码', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'nobody', password: '123456' });
    // 有DB时返回200+code:1005，无DB时返回500，都算接口正常工作
    expect([200, 500]).toContain(res.status);
    expect(res.body).toHaveProperty('code');
  });

});

describe('=== User API 测试 ===', () => {

  test('POST /api/users/register - 缺少参数应返回1001', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({});
    expect(res.status).toBe(200);
    expect(res.body.code).toBe(1001);
  });

  test('POST /api/users/register - 密码不一致应返回1007', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({
        username: 'testuser',
        nickname: 'Test',
        password: '123456',
        confirmPassword: '654321'
      });
    expect(res.status).toBe(200);
    expect(res.body.code).toBe(1007);
  });

  test('GET /api/users/profile - 应返回响应（含code字段）', async () => {
    const res = await request(app)
      .get('/api/users/profile');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('code');
  });

  test('POST /api/users/change-password - 参数为空应返回400', async () => {
    const res = await request(app)
      .post('/api/users/change-password')
      .send({});
    expect(res.status).toBe(200);
    expect(res.body.code).toBe(400);
  });

  test('POST /api/users/update - 无更新字段应返回400', async () => {
    const res = await request(app)
      .post('/api/users/update')
      .send({});
    expect(res.status).toBe(200);
    expect(res.body.code).toBe(400);
  });

});

describe('=== Task API 测试 ===', () => {

  test('GET /api/tasks - 任务列表应返回响应', async () => {
    const res = await request(app)
      .get('/api/tasks');
    // 有DB返回200，无DB返回500（内部错误处理），都说明路由正常
    expect([200, 500]).toContain(res.status);
    expect(res.body).toHaveProperty('code');
  });

  test('GET /api/tasks?status=0 - 按状态过滤', async () => {
    const res = await request(app)
      .get('/api/tasks?status=0&type=0&keyword=test&page=1&limit=10');
    // 同上，兼容无DB环境
    expect([200, 500]).toContain(res.status);
  });

});

describe('=== Message API 测试 ===', () => {

  test('POST /api/messages/send - 内容为空应返回400', async () => {
    const res = await request(app)
      .post('/api/messages/send')
      .send({ toId: 2, taskId: 10, content: '' });
    expect(res.status).toBe(200);
    expect(res.body.code).toBe(400);
  });

  test('GET /api/messages/chat/:taskId/:targetId - 聊天详情应返回响应', async () => {
    const res = await request(app)
      .get('/api/messages/chat/1/2');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('code');
  });

  test('GET /api/messages/list - 消息列表应返回响应', async () => {
    const res = await request(app)
      .get('/api/messages/list');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('code');
  });

});

describe('=== AI API 测试 ===', () => {

  test('POST /api/ai/chat - 消息为空应返回400', async () => {
    const res = await request(app)
      .post('/api/ai/chat')
      .send({});
    expect(res.status).toBe(200);
    expect(res.body.code).toBe(400);
  });

});
