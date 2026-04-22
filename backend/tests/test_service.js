// 后端单元测试 - 业务逻辑 + Mock 隔离数据库和外部 API

const userController = require('../controllers/user');
const msgController = require('../controllers/message');
const aiController = require('../controllers/ai');

// Mock 依赖模块
jest.mock('../config/db', () => ({
  query: jest.fn()
}));

jest.mock('../models/user', () => ({
  findByUsername: jest.fn(),
  create: jest.fn()
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn(() => Promise.resolve('hashed_password')),
  compare: jest.fn()
}));

jest.mock('../utils/jwt', () => ({
  sign: jest.fn(() => 'mock_token_123')
}));

jest.mock('axios');

const db = require('../config/db');
const userModel = require('../models/user');
const bcrypt = require('bcryptjs');
const jwtUtil = require('../utils/jwt');

describe('=== User Controller 单元测试 ===', () => {

  // ===== register 注册功能 =====

  test('register - 参数缺失应返回1001', async () => {
    const req = { body: {} };
    const res = { json: jest.fn() };
    await userController.register(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 1001, message: '参数缺失' })
    );
  });

  test('register - 两次密码不一致应返回1007', async () => {
    const req = { body: { username: 'test', nickname: 'Test', password: '123', confirmPassword: '456' } };
    const res = { json: jest.fn() };
    await userController.register(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 1007, message: '两次密码不一致' })
    );
  });

  test('register - 用户名已存在应返回1004', async () => {
    userModel.findByUsername.mockResolvedValue({ id: 1 });
    const req = { body: { username: 'exist', nickname: 'Test', password: '123456', confirmPassword: '123456' } };
    const res = { json: jest.fn() };
    await userController.register(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 1004, message: '用户名已存在' })
    );
  });

  test('register - 注册成功应返回token', async () => {
    userModel.findByUsername.mockResolvedValue(null);
    userModel.create.mockResolvedValue(42);
    const req = { body: { username: 'newuser', nickname: 'NewUser', password: '123456', confirmPassword: '123456' } };
    const res = { json: jest.fn() };
    await userController.register(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 0,
        data: expect.objectContaining({ userId: 42, token: 'mock_token_123' })
      })
    );
  });

  // ===== login 登录功能 =====

  test('login - 参数缺失应返回1001', async () => {
    const req = { body: {} };
    const res = { json: jest.fn() };
    await userController.login(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 1001 })
    );
  });

  test('login - 用户不存在应返回1005', async () => {
    userModel.findByUsername.mockResolvedValue(null);
    const req = { body: { username: 'nouser', password: '123456' } };
    const res = { json: jest.fn() };
    await userController.login(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 1005 })
    );
  });

  test('login - 密码错误应返回1005', async () => {
    userModel.findByUsername.mockResolvedValue({ id: 1, username: 'alice', password: 'real_hash' });
    bcrypt.compare.mockResolvedValue(false);
    const req = { body: { username: 'alice', password: 'wrong' } };
    const res = { json: jest.fn() };
    await userController.login(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 1005 })
    );
  });

  test('login - 登录成功应返回token和用户信息', async () => {
    userModel.findByUsername.mockResolvedValue({ id: 5, username: 'bob', password: 'real_hash' });
    bcrypt.compare.mockResolvedValue(true);
    const req = { body: { username: 'bob', password: 'correct' } };
    const res = { json: jest.fn() };
    await userController.login(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 0,
        data: expect.objectContaining({ userId: 5, token: 'mock_token_123' })
      })
    );
  });

  // ===== changePassword 修改密码 =====

  test('changePassword - 密码为空应返回400', async () => {
    const req = { user: { id: 1 }, body: {} };
    const res = { json: jest.fn() };
    await userController.changePassword(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 400, message: '原密码和新密码不能为空' })
    );
  });

  test('changePassword - 原密码错误应返回401', async () => {
    db.query.mockResolvedValue([[{ password: 'real_hash' }]]);
    bcrypt.compare.mockResolvedValue(false);
    const req = { user: { id: 1 }, body: { oldPassword: 'wrong', newPassword: 'newpass' } };
    const res = { json: jest.fn() };
    await userController.changePassword(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 401, message: '原密码错误' })
    );
  });

  test('changePassword - 用户不存在应返回404', async () => {
    db.query.mockResolvedValue([[]]);
    const req = { user: { id: 999 }, body: { oldPassword: 'old', newPassword: 'new' } };
    const res = { json: jest.fn() };
    await userController.changePassword(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 404, message: '用户不存在' })
    );
  });

  test('changePassword - 修改成功应返回200', async () => {
    db.query.mockResolvedValue([[{ password: 'real_hash' }]]);
    bcrypt.compare.mockResolvedValue(true);
    bcrypt.hash.mockResolvedValue('new_hashed_pass');
    const req = { user: { id: 1 }, body: { oldPassword: 'correct', newPassword: 'newpass123' } };
    const res = { json: jest.fn() };
    await userController.changePassword(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 200, message: '密码修改成功，请重新登录' })
    );
  });

  // ===== updateUserInfo 更新信息 =====

  test('updateUserInfo - 没有更新字段应返回400', async () => {
    const req = { user: { id: 1 }, body: {} };
    const res = { json: jest.fn() };
    await userController.updateUserInfo(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 400, message: '没有要更新的字段' })
    );
  });

  test('updateUserInfo - 更新昵称成功', async () => {
    db.query.mockResolvedValue();
    const req = { user: { id: 1 }, body: { nickname: 'NewNick' } };
    const res = { json: jest.fn() };
    await userController.updateUserInfo(req, res);
    expect(db.query).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 200, message: '更新成功' })
    );
  });

});

describe('=== Message Controller 单元测试 ===', () => {

  // ===== formatTime 时间格式化（纯函数，最易测试）=====

  test('formatTime - 空值应返回空字符串', () => {
    expect(msgController.formatTime(null)).toBe('');
    expect(msgController.formatTime(undefined)).toBe('');
    expect(msgController.formatTime('')).toBe('');
  });

  test('formatTime - 今天的时间应返回 HH:mm', () => {
    const now = new Date();
    const todayStr = now.toISOString();
    const result = msgController.formatTime(todayStr);
    expect(result).toMatch(/^\d{2}:\d{2}$/);
  });

  test('formatTime - 昨天应返回"昨天"', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const result = msgController.formatTime(yesterday.toISOString());
    expect(result).toBe('昨天');
  });

  test('formatTime - 更早的日期应返回 M/D 格式', () => {
    const olderDate = new Date();
    olderDate.setDate(olderDate.getDate() - 3);
    const result = msgController.formatTime(olderDate.toISOString());
    const month = olderDate.getMonth() + 1;
    const day = olderDate.getDate();
    expect(result).toBe(`${month}/${day}`);
  });

  // ===== sendMsg 发送消息 =====

  test('sendMsg - 内容为空应返回400', async () => {
    const req = { user: { id: 1 }, body: { toId: 2, taskId: 10, content: '' } };
    const res = { json: jest.fn() };
    await msgController.sendMsg(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 400, message: '内容不能为空' })
    );
  });

  test('sendMsg - 发送成功应返回200', async () => {
    db.query.mockResolvedValue();
    const req = { user: { id: 1 }, body: { toId: 2, taskId: 10, content: '你好' } };
    const res = { json: jest.fn() };
    await msgController.sendMsg(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 200, message: '发送成功' })
    );
  });

});

describe('=== AI Controller 单元测试 ===', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('chat - 消息为空应返回400', async () => {
    const req = { body: {} };
    const res = { json: jest.fn() };
    await aiController.chat(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 400, message: '消息内容不能为空' })
    );
  });

  test('chat - 消息不是字符串应返回400', async () => {
    const req = { body: { message: 123 } };
    const res = { json: jest.fn() };
    await aiController.chat(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 400, message: '消息内容不能为空' })
    );
  });
});
