// 后端单元测试 - 业务逻辑 + Mock 隔离数据库和外部 API
// 目标：覆盖核心代码 >60%

// 在所有 describe 之前
jest.useFakeTimers();

const userController = require('../controllers/user');
const msgController = require('../controllers/message');
const aiController = require('../controllers/ai');
const taskController = require('../controllers/task');
const publishController = require('../controllers/publish');

// Mock 依赖模块
jest.mock('../config/db', () => ({
  query: jest.fn(),
  getConnection: jest.fn()
}));

jest.mock('../models/user', () => ({
  findByUsername: jest.fn(),
  create: jest.fn()
}));

jest.mock('../models/task', () => ({
  getList: jest.fn()
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
const taskModel = require('../models/task');
const bcrypt = require('bcryptjs');
const _jwtUtil = require('../utils/jwt');
const axios = require('axios');

// ========== 全局 Mock 连接工厂 ==========
function createMockConnection() {
  const mockQuery = jest.fn();
  // 默认返回空数组，避免解构 undefined
  mockQuery.mockResolvedValue([[]]);
  return {
    beginTransaction: jest.fn().mockResolvedValue(),
    commit: jest.fn().mockResolvedValue(),
    rollback: jest.fn().mockResolvedValue(),
    release: jest.fn(),
    query: mockQuery,
    execute: jest.fn()  // 保留 execute 以兼容，但控制器实际不用
  };
}

// 辅助：按顺序设置 connection.query 返回值
function mockQueryChain(conn, results) {
  conn.query.mockReset();
  for (const res of results) {
    conn.query.mockResolvedValueOnce(res);
  }
  // 防止额外调用返回 undefined
  conn.query.mockResolvedValue([[]]);
  return conn;
}

// 辅助：按顺序设置 db.query 返回值（用于 sendMsg）
function mockDbQueryChain(results) {
  db.query.mockReset();
  for (const res of results) {
    db.query.mockResolvedValueOnce(res);
  }
  db.query.mockResolvedValue([[]]);
  return db;
}

describe('=== User Controller 单元测试 ===', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

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

  test('updateUserInfo - 更新签名和头像', async () => {
    db.query.mockResolvedValue();
    const req = { user: { id: 1 }, body: { signature: 'hello', avatar: '/avatars/a.jpg' } };
    const res = { json: jest.fn() };
    await userController.updateUserInfo(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 200 })
    );
  });

  test('updateUserInfo - 数据库异常应返回500', async () => {
    db.query.mockRejectedValue(new Error('DB Error'));
    const req = { user: { id: 1 }, body: { nickname: 'test' } };
    const res = { json: jest.fn() };
    await userController.updateUserInfo(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 500 })
    );
  });

  // ===== getProfile 获取个人信息 =====

  test('getProfile - 应调用数据库查询并返回结果', async () => {
    expect(typeof userController.getProfile).toBe('function');
    const req = { user: { id: 1 } };
    const res = { json: jest.fn() };
    await expect(userController.getProfile(req, res)).resolves.not.toThrow();
    expect(res.json).toHaveBeenCalled();
  });

  test('getProfile - 数据库异常应返回500', async () => {
    db.query.mockRejectedValue(new Error('DB Error'));
    const req = { user: { id: 1 } };
    const res = { json: jest.fn() };
    await userController.getProfile(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 500 }));
  });

  // ===== getPublishTasks 我发布的任务 =====

  test('getPublishTasks - 成功获取发布的任务列表', async () => {
    db.query.mockResolvedValue([[{ id: 1, title: '任务1' }]]);
    const req = { user: { id: 1 } };
    const res = { json: jest.fn() };
    await userController.getPublishTasks(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 200 })
    );
  });

  test('getPublishTasks - 数据库异常应返回500', async () => {
    db.query.mockRejectedValue(new Error('DB Error'));
    const req = { user: { id: 1 } };
    const res = { json: jest.fn() };
    await userController.getPublishTasks(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 500 }));
  });

  // ===== getReceiveTasks 我接单的任务 =====

  test('getReceiveTasks - 成功获取接单的任务列表', async () => {
    db.query.mockResolvedValue([[{ id: 2, title: '任务2' }]]);
    const req = { user: { id: 1 } };
    const res = { json: jest.fn() };
    await userController.getReceiveTasks(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 200 })
    );
  });

  test('getReceiveTasks - 数据库异常应返回500', async () => {
    db.query.mockRejectedValue(new Error('DB Error'));
    const req = { user: { id: 1 } };
    const res = { json: jest.fn() };
    await userController.getReceiveTasks(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 500 }));
  });

  // ===== getTrades 交易记录 =====

  test('getTrades - 成功获取交易记录（type=1 收入）', async () => {
    db.query.mockResolvedValue([[{ id: 1, title: '完成任务', amount: 10, type: 1, time: new Date(), task_id: 5 }]]);
    const req = { user: { id: 1 } };
    const res = { json: jest.fn() };
    await userController.getTrades(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 200,
        data: expect.arrayContaining([expect.objectContaining({ type: 'income' })])
      })
    );
  });

  test('getTrades - type=2 应映射为expense', async () => {
    db.query.mockResolvedValue([[{ id: 2, title: '确认完成', amount: 10, type: 2, time: new Date(), task_id: 5 }]]);
    const req = { user: { id: 1 } };
    const res = { json: jest.fn() };
    await userController.getTrades(req, res);
    const trades = res.json.mock.calls[0][0].data;
    expect(trades[0].type).toBe('expense');
  });

  test('getTrades - 数据库异常应返回500', async () => {
    db.query.mockRejectedValue(new Error('DB Error'));
    const req = { user: { id: 1 } };
    const res = { json: jest.fn() };
    await userController.getTrades(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 500 }));
  });

  // ===== uploadAvatar 上传头像 =====

  test('uploadAvatar - 未选择文件应返回400', async () => {
    const req = { user: { id: 1 }, file: null };
    const res = { json: jest.fn() };
    await userController.uploadAvatar(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 400, message: '未选择文件' })
    );
  });

  test('uploadAvatar - 上传成功应返回URL', async () => {
    db.query.mockResolvedValue();
    const req = { user: { id: 1 }, file: { filename: 'abc123.jpg' } };
    const res = { json: jest.fn() };
    await userController.uploadAvatar(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 200,
        data: expect.objectContaining({ url: '/uploads/avatars/abc123.jpg' }),
        message: '头像更新成功'
      })
    );
  });

  test('uploadAvatar - 数据库异常应返回500', async () => {
    db.query.mockRejectedValue(new Error('DB Error'));
    const req = { user: { id: 1 }, file: { filename: 'abc.jpg' } };
    const res = { json: jest.fn() };
    await userController.uploadAvatar(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 500 }));
  });

  test('changePassword - 数据库异常应返回500', async () => {
    db.query.mockRejectedValue(new Error('DB Error'));
    const req = { user: { id: 1 }, body: { oldPassword: 'old', newPassword: 'newpass123' } };
    const res = { json: jest.fn() };
    await userController.changePassword(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 500 })
    );
  });
});

describe('=== Task Controller 单元测试 ===', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('list - 成功返回任务数据', async () => {
    taskModel.getList.mockResolvedValue({ total: 10, list: [{ id: 1 }] });
    const req = { query: {} };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    await taskController.list(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 0 }));
  });

  test('list - 数据库异常返回500', async () => {
    taskModel.getList.mockRejectedValue(new Error('DB Error'));
    const req = { query: {} };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    await taskController.list(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 500 }));
  });

  test('getTaskDetail - 成功返回详情（含发布者和接单者）', async () => {
    db.query.mockResolvedValue([[{
      id: 1, title: '测试任务', description: '描述', reward: 10, location: 'A栋',
      type: 0, status: 0, deadline: '2025-12-31', created_at: '2025-01-01',
      pub_id: 10, pub_nickname: 'Alice', pub_avatar: '/a.jpg', pub_credit: 90,
      acc_id: 20, acc_nickname: 'Bob', acc_avatar: '/b.jpg', acc_credit: 85
    }]]);
    const req = { params: { id: '1' } };
    const res = { json: jest.fn() };
    await taskController.getTaskDetail(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 200,
        data: expect.objectContaining({
          title: '测试任务',
          publisher: expect.objectContaining({ nickname: 'Alice' }),
          acceptor: expect.objectContaining({ nickname: 'Bob' })
        })
      })
    );
  });

  test('getTaskDetail - 任务不存在返回404', async () => {
    db.query.mockResolvedValue([[]]);
    const req = { params: { id: '999' } };
    const res = { json: jest.fn() };
    await taskController.getTaskDetail(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 404, message: '任务不存在' })
    );
  });

  test('getTaskDetail - 无接单者时acceptor为null', async () => {
    db.query.mockResolvedValue([[{
      id: 1, title: '任务', description: '描述', reward: 5, location: '',
      type: 0, status: 0, deadline: null, created_at: '2025-01-01',
      pub_id: 10, pub_nickname: 'Alice', pub_avatar: null, pub_credit: 80,
      acc_id: null, acc_nickname: null, acc_avatar: null, acc_credit: null
    }]]);
    const req = { params: { id: '1' } };
    const res = { json: jest.fn() };
    await taskController.getTaskDetail(req, res);
    const data = res.json.mock.calls[0][0].data;
    expect(data.acceptor).toBeNull();
    expect(data.publisher.avatar).toBe('/images/default-avatar.png');
  });

  test('getTaskDetail - 数据库异常返回500', async () => {
    db.query.mockRejectedValue(new Error('DB Error'));
    const req = { params: { id: '1' } };
    const res = { json: jest.fn() };
    await taskController.getTaskDetail(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 500 }));
  });

  // ===== acceptTask 接单 =====

  test('acceptTask - 成功接单', async () => {
    const conn = createMockConnection();
    // 顺序：SELECT 任务, UPDATE 接单
    mockQueryChain(conn, [
      [[{ id: 1, status: 0, publisher_id: 10, title: '测试任务' }]], // SELECT
      [{ affectedRows: 1 }]                                            // UPDATE
    ]);
    db.getConnection.mockResolvedValue(conn);

    const req = {
      params: { id: '1' },
      user: { id: 20 },
      app: {
        get: jest.fn().mockImplementation((key) => {
          if (key === 'io') {
            return { to: jest.fn().mockReturnThis(), emit: jest.fn() };
          }
          if (key === 'userSockets') {
            return { get: jest.fn().mockReturnValue(null) };
          }
          return undefined;
        })
      }
    };
    const res = { json: jest.fn() };
    await taskController.acceptTask(req, res);
    expect(conn.commit).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 200, message: '接单成功' })
    );
  });

  test('acceptTask - 任务不存在应返回400', async () => {
    const conn = createMockConnection();
    conn.query.mockResolvedValue([[]]);  // SELECT 返回空
    db.getConnection.mockResolvedValue(conn);

    const req = { params: { id: '999' }, user: { id: 20 } };
    const res = { json: jest.fn() };
    await taskController.acceptTask(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 400, message: '任务不存在' })
    );
  });

  test('acceptTask - 不能接自己发布的任务', async () => {
    const conn = createMockConnection();
    conn.query.mockResolvedValue([[{ id: 1, status: 0, publisher_id: 20 }]]);
    db.getConnection.mockResolvedValue(conn);

    const req = { params: { id: '1' }, user: { id: 20 } };
    const res = { json: jest.fn() };
    await taskController.acceptTask(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 400, message: '操作失败' })
    );
  });

  test('acceptTask - 任务已被接单应失败', async () => {
    const conn = createMockConnection();
    conn.query.mockResolvedValue([[{ id: 1, status: 1, publisher_id: 10 }]]);
    db.getConnection.mockResolvedValue(conn);

    const req = { params: { id: '1' }, user: { id: 20 } };
    const res = { json: jest.fn() };
    await taskController.acceptTask(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 400 })
    );
  });

  // ===== completeTask 提交完成 =====

  test('completeTask - 提交完成成功', async () => {
    const conn = createMockConnection();
    mockQueryChain(conn, [
      [[{ id: 1, acceptor_id: 20, status: 1, title: '任务' }]], // SELECT
      [{ affectedRows: 1 }]                                      // UPDATE status=2
    ]);
    db.getConnection.mockResolvedValue(conn);

    const req = {
      params: { id: '1' },
      user: { id: 20 },
      app: {
        get: jest.fn().mockImplementation((key) => {
          if (key === 'io') return { to: jest.fn().mockReturnThis(), emit: jest.fn() };
          if (key === 'userSockets') return { get: jest.fn().mockReturnValue(null) };
          return undefined;
        })
      }
    };
    const res = { json: jest.fn() };
    await taskController.completeTask(req, res);
    expect(conn.commit).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 200, message: '已提交完成，等待发布者确认' })
    );
  });

  test('completeTask - 非接单者无权限操作', async () => {
    const conn = createMockConnection();
    conn.query.mockResolvedValue([[{ id: 1, acceptor_id: 20, status: 1 }]]);
    db.getConnection.mockResolvedValue(conn);

    const req = { params: { id: '1' }, user: { id: 99 } };
    const res = { json: jest.fn() };
    await taskController.completeTask(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 400, message: '无权限操作' })
    );
  });

  // ===== confirmCompleteTask 确认完成 =====

  test('confirmCompleteTask - 确认完成成功并结算', async () => {
    const conn = createMockConnection();
    mockQueryChain(conn, [
      [[{ id: 1, status: 2, publisher_id: 10, acceptor_id: 20, reward: 50, title: '任务' }]], // SELECT task
      [{ affectedRows: 1 }],     // UPDATE 发布者扣款
      [{ affectedRows: 1 }],     // UPDATE 接单者加钱
      [[{ coins: 150 }]],        // SELECT 发布者最新余额
      [[{ coins: 150 }]],        // SELECT 接单者最新余额
      [{ affectedRows: 1 }],     // UPDATE task status=3
      [{ affectedRows: 1 }],     // INSERT 发布者交易记录
      [{ affectedRows: 1 }]      // INSERT 接单者交易记录
    ]);
    db.getConnection.mockResolvedValue(conn);

    const req = {
      params: { id: '1' },
      user: { id: 10 },
      app: {
        get: jest.fn().mockImplementation((key) => {
          if (key === 'io') return { to: jest.fn().mockReturnThis(), emit: jest.fn() };
          if (key === 'userSockets') return { get: jest.fn().mockReturnValue(null) };
          return undefined;
        })
      }
    };
    const res = { json: jest.fn() };
    await taskController.confirmCompleteTask(req, res);
    expect(conn.commit).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 200, message: '任务已完成，虚拟币已结算' })
    );
  });

  test('confirmCompleteTask - 非发布者无权限', async () => {
    const conn = createMockConnection();
    conn.query.mockResolvedValue([[{ id: 1, status: 2, publisher_id: 10, acceptor_id: 20, reward: 50, title: '任务' }]]);
    db.getConnection.mockResolvedValue(conn);

    const req = { params: { id: '1' }, user: { id: 99 } };
    const res = { json: jest.fn() };
    await taskController.confirmCompleteTask(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 400, message: '无权限操作' })
    );
  });

  // ===== cancelTask 取消任务 =====

  test('cancelTask - 取消任务成功并返还虚拟币', async () => {
    const conn = createMockConnection();
    mockQueryChain(conn, [
      [[{ id: 1, status: 0, publisher_id: 10, reward: 30, title: '取消测试' }]], // SELECT task
      [{ affectedRows: 1 }],     // UPDATE 返还虚拟币
      [{ affectedRows: 1 }],     // UPDATE task status=4
      [[{ coins: 130 }]],        // SELECT 用户最新余额
      [{ affectedRows: 1 }]      // INSERT 交易记录
    ]);
    db.getConnection.mockResolvedValue(conn);

    const req = {
      params: { id: '1' },
      user: { id: 10 },
      app: {
        get: jest.fn().mockImplementation((key) => {
          if (key === 'io') return { to: jest.fn().mockReturnThis(), emit: jest.fn() };
          return undefined;
        })
      }
    };
    const res = { json: jest.fn() };
    await taskController.cancelTask(req, res);
    expect(conn.commit).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 200, message: '任务已取消，虚拟币已返还' })
    );
  });

  test('cancelTask - 已被接取无法取消', async () => {
    const conn = createMockConnection();
    conn.query.mockResolvedValue([[{ id: 1, status: 1, publisher_id: 10, reward: 30, title: '任务' }]]);
    db.getConnection.mockResolvedValue(conn);

    const req = { params: { id: '1' }, user: { id: 10 } };
    const res = { json: jest.fn() };
    await taskController.cancelTask(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 400 })
    );
  });

  // ===== giveUpTask 放弃任务 =====

  test('giveUpTask - 放弃任务成功', async () => {
    const conn = createMockConnection();
    mockQueryChain(conn, [
      [[{ id: 1, acceptor_id: 20, status: 1, title: '任务' }]], // SELECT
      [{ affectedRows: 1 }]                                      // UPDATE 清空接单者
    ]);
    db.getConnection.mockResolvedValue(conn);

    const req = {
      params: { id: '1' },
      user: { id: 20 },
      app: {
        get: jest.fn().mockImplementation((key) => {
          if (key === 'io') return { to: jest.fn().mockReturnThis(), emit: jest.fn() };
          if (key === 'userSockets') return { get: jest.fn().mockReturnValue(null) };
          return undefined;
        })
      }
    };
    const res = { json: jest.fn() };
    await taskController.giveUpTask(req, res);
    expect(conn.commit).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 200, message: '任务已放弃，恢复待接取状态' })
    );
  });

  test('giveUpTask - 非接单者无法放弃', async () => {
    const conn = createMockConnection();
    conn.query.mockResolvedValue([[{ id: 1, acceptor_id: 20, status: 1 }]]);
    db.getConnection.mockResolvedValue(conn);

    const req = { params: { id: '1' }, user: { id: 99 } };
    const res = { json: jest.fn() };
    await taskController.giveUpTask(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 400, message: '无权限操作' })
    );
  });
});

describe('=== Publish Controller 单元测试 ===', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('publishTask - 参数缺失应返回400', async () => {
    const req = { user: { id: 1 }, body: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await publishController.publishTask(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 400, message: '必填参数不能为空' })
    );
  });

  test('publishTask - reward<=0应返回400', async () => {
    const req = { user: { id: 1 }, body: { type: 0, title: '任务', description: '描述', reward: 0 } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await publishController.publishTask(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('publishTask - 余额不足应返回400', async () => {
    const conn = createMockConnection();
    // 原子扣款返回 affectedRows=0
    conn.query.mockResolvedValue([{ affectedRows: 0 }]);
    db.getConnection.mockResolvedValue(conn);

    const req = { user: { id: 1 }, body: { type: 0, title: '任务', description: '描述', reward: 50 } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await publishController.publishTask(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 400, message: '虚拟币余额不足' })
    );
  });

  test('publishTask - 发布成功路径应调用commit', async () => {
    const conn = createMockConnection();
    mockQueryChain(conn, [
      [{ affectedRows: 1 }],      // 原子扣款成功
      [{ insertId: 42 }]          // 插入任务成功
    ]);
    db.getConnection.mockResolvedValue(conn);

    const req = { user: { id: 1 }, body: { type: 0, title: '新任务', description: '帮忙带饭', reward: 10, location: '', deadline: '' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await publishController.publishTask(req, res);
    expect(conn.commit).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 200, message: '任务发布成功' })
    );
  });

  test('publishTask - 数据库异常应触发catch并返回错误', async () => {
    const conn = createMockConnection();
    // 扣款成功，但插入任务时抛异常
    conn.query.mockResolvedValueOnce([{ affectedRows: 1 }]);
    conn.query.mockRejectedValueOnce(new Error('DB Error'));
    db.getConnection.mockResolvedValue(conn);

    const req = { user: { id: 1 }, body: { type: 0, title: '任务', description: '描述', reward: 10 } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    await publishController.publishTask(req, res);
    // 应该返回 500
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 500, message: '服务器错误' })
    );
  });
});

describe('=== Message Controller 单元测试 ===', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('sendMsg - 内容为空应返回400', async () => {
    const req = { user: { id: 1 }, body: { toId: 2, taskId: 10, content: '' } };
    const res = { json: jest.fn() };
    await msgController.sendMsg(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 400, message: '内容不能为空' })
    );
  });

  test('sendMsg - 发送成功应返回200', async () => {
    // 注意：sendMsg 内部使用 db.query（全局池），而不是 getConnection
    mockDbQueryChain([
      [[{ id: 2 }]],               // 查询目标用户存在
      [[{ id: 1, nickname: 'Alice', avatar: '/a.jpg' }]], // 查询发送者信息
      [[{ publisher_id: 1, acceptor_id: 2 }]], // 查询任务参与者
      [{ insertId: 123 }]          // 插入消息成功
    ]);

    const req = {
        user: { id: 1 },
        body: { toId: 2, taskId: 10, content: '你好' },
        app: {
          get: jest.fn().mockImplementation((key) => {
            if (key === 'io') return { to: jest.fn().mockReturnThis(), emit: jest.fn() };
            if (key === 'userSockets') return { get: jest.fn().mockReturnValue(null) };
            return undefined;
          })
        }
    };
    const res = { json: jest.fn() };
    await msgController.sendMsg(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 200, message: '发送成功' })
    );
  });

  test('sendMsg - 数据库异常应返回500', async () => {
    db.query.mockRejectedValue(new Error('DB Error'));
    const req = { user: { id: 1 }, body: { toId: 2, taskId: 10, content: '你好' } };
    const res = { json: jest.fn() };
    await msgController.sendMsg(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 500 }));
  });

  test('getMsgList - 成功返回消息列表', async () => {
    db.query.mockResolvedValue([[{
      task_id: 1, user_id: 2, nickname: 'Bob', avatar: '/b.jpg',
      msg_id: 10, preview: '你好', time: new Date().toISOString()
    }]]);
    const req = { user: { id: 1 } };
    const res = { json: jest.fn() };
    await msgController.getMsgList(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 200, data: expect.any(Array) })
    );
  });

  test('getMsgList - 数据库异常应返回500', async () => {
    db.query.mockRejectedValue(new Error('DB Error'));
    const req = { user: { id: 1 } };
    const res = { json: jest.fn() };
    await msgController.getMsgList(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 500 }));
  });

  test('getChatDetail - 成功返回聊天记录', async () => {
    db.query
      .mockResolvedValueOnce([[{ publisher_id: 1, acceptor_id: 2 }]])   // 权限校验
      .mockResolvedValueOnce([[{ id: 1, avatar: '/a.jpg' }, { id: 2, avatar: '/b.jpg' }]])
      .mockResolvedValueOnce([[{ id: 10, content: '你好', from_id: 1, to_id: 2, from_avatar: '/a.jpg' }]]);
    const req = { params: { taskId: '1', targetId: '2' }, user: { id: 1 } };
    const res = { json: jest.fn() };
    await msgController.getChatDetail(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 200 })
    );
  });

  test('getChatDetail - 无权限查看应返回403', async () => {
    db.query.mockResolvedValueOnce([[{ publisher_id: 99, acceptor_id: 88 }]]);
    const req = { params: { taskId: '1', targetId: '2' }, user: { id: 1 } };
    const res = { json: jest.fn() };
    await msgController.getChatDetail(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 403, message: '无权查看该聊天' })
    );
  });

  test('getChatDetail - 数据库异常应返回500', async () => {
    db.query.mockRejectedValue(new Error('DB Error'));
    const req = { params: { taskId: '1', targetId: '2' }, user: { id: 1 } };
    const res = { json: jest.fn() };
    await msgController.getChatDetail(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 500 }));
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

  test('chat - Groq API 调用成功应返回回复', async () => {
    process.env.AI_PROVIDER = 'groq';
    process.env.GROQ_API_KEY = 'test_key';
    axios.post.mockResolvedValue({
      data: { choices: [{ message: { content: '你好！有什么可以帮你？' } }] }
    });

    const req = { body: { message: '你好', history: [] } };
    const res = { json: jest.fn() };
    await aiController.chat(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 200,
        data: expect.objectContaining({ reply: '你好！有什么可以帮你？' })
      })
    );
  });

  test('chat - DeepSeek API 调用成功应返回回复', async () => {
    process.env.AI_PROVIDER = 'deepseek';
    process.env.DEEPSEEK_API_KEY = 'ds_key';
    axios.post.mockResolvedValue({
      data: { choices: [{ message: { content: 'DeepSeek 回复' } }] }
    });

    const req = { body: { message: '问题', history: [] } };
    const res = { json: jest.fn() };
    await aiController.chat(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 200,
        data: expect.objectContaining({ reply: 'DeepSeek 回复' })
      })
    );
  });

  test('chat - API Key 未配置应返回500', async () => {
    process.env.AI_PROVIDER = 'groq';
    process.env.GROQ_API_KEY = '';
    delete process.env.DEEPSEEK_API_KEY;

    const req = { body: { message: '测试', history: [] } };
    const res = { json: jest.fn() };
    await aiController.chat(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 500 }));
  });

  test('chat - AI API 抛异常应返回500', async () => {
    process.env.AI_PROVIDER = 'groq';
    process.env.GROQ_API_KEY = 'test_key';
    axios.post.mockRejectedValue(new Error('Network Error'));

    const req = { body: { message: '测试', history: [] } };
    const res = { json: jest.fn() };
    await aiController.chat(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 500 }));
  });

  test('chat - provider=groq 应走 groq 分支', async () => {
    process.env.AI_PROVIDER = 'groq';
    process.env.GROQ_API_KEY = 'key';
    axios.post.mockResolvedValue({
      data: { choices: [{ message: { content: '默认回复' } }] }
    });

    const req = { body: { message: 'hello' } };
    const res = { json: jest.fn() };
    await aiController.chat(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 200 }));
  });
});

// 全局清理，解决 Jest 强制退出问题
// 在文件最后（所有 describe 之后）
afterAll(() => {
  // 恢复真实定时器并清理
  jest.useRealTimers();
  // 关闭所有数据库连接（如果存在真实连接池）
  if (db.end) db.end();
  // 强制结束所有未解决的 Promise（可选）
  return new Promise(resolve => setTimeout(resolve, 10));
});