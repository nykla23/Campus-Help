const db = require('../config/db');
const userModel = require('../models/user');
const jwtUtil = require('../utils/jwt');
const bcrypt = require('bcryptjs');

exports.register = async (req, res) => {
  const { username, nickname, password, confirmPassword } = req.body;
  if (!username || !nickname || !password || !confirmPassword) {
    return res.json({ code: 1001, message: '参数缺失' });
  }
  if (password !== confirmPassword) {
    return res.json({ code: 1007, message: '两次密码不一致' });
  }
  const old = await userModel.findByUsername(username);
  if (old) {
    return res.json({ code: 1004, message: '用户名已存在' });
  }
  const hash = await bcrypt.hash(password, 10);
  const userId = await userModel.create({ username, password: hash, nickname });
  const token = jwtUtil.sign({ userId, username });
  res.json({ code: 0, data: { userId, token }, message: '注册成功' });
};

exports.login = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.json({ code: 1001, message: '参数缺失' });
  }
  const user = await userModel.findByUsername(username);
  if (!user) {
    return res.json({ code: 1005, message: "用户不存在或密码错误" });
  }
  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    return res.json({ code: 1005, message: "用户不存在或密码错误" });
  }
  const token = jwtUtil.sign({ userId: user.id, username: user.username });
  res.json({ code: 0, data: { userId: user.id, token }, message: '登录成功' });
};

// 状态映射（和前端一致）
const statusMap = {
  0: '待接取',
  1: '进行中',
  2: '已完成',
  3: '已取消'
};

// 类型映射
const typeMap = {
  0: '取件代送',
  1: '跑腿代办',
  2: '学习辅导',
  3: '其他'
};

// 获取个人信息
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const [user] = await db.query('SELECT id, nickname, avatar, signature, coins, credit_score FROM users WHERE id = ?', [userId]);
    const [finish] = await db.query('SELECT COUNT(*) AS count FROM tasks WHERE (publisher_id=? OR acceptor_id=?) AND status=2', [userId, userId]);

    res.json({
      code: 200,
      data: {
        user: user[0],
        stats: {
          coins: user[0].coins,
          credit: user[0].credit_score,
          finishCount: finish[0].count
        }
      }
    });
  } catch (err) {
    res.json({ code: 500 });
  }
};

// 我发布的任务
exports.getPublishTasks = async (req, res) => {
  try {
    const [tasks] = await db.query(`
      SELECT t.*, u.avatar, u.nickname, u.credit_score
      FROM tasks t
      LEFT JOIN users u ON t.publisher_id = u.id
      WHERE t.publisher_id = ?
      ORDER BY t.created_at DESC
    `, [req.user.id]);

    res.json({ code: 200, data: tasks });
  } catch (e) {
    res.json({ code: 500 });
  }
};

// 我接单的任务
exports.getReceiveTasks = async (req, res) => {
  try {
    const [tasks] = await db.query(`
      SELECT t.*, u.avatar, u.nickname, u.credit_score
      FROM tasks t
      LEFT JOIN users u ON t.publisher_id = u.id
      WHERE t.acceptor_id = ?
      ORDER BY t.created_at DESC
    `, [req.user.id]);

    res.json({ code: 200, data: tasks });
  } catch (e) {
    res.json({ code: 500 });
  }
};

// 交易记录
exports.getTrades = async (req, res) => {
  try {
    const [trades] = await db.query('SELECT * FROM trades WHERE user_id=? ORDER BY created_at DESC', [req.user.id]);
    res.json({ code: 200, data: trades });
  } catch (e) {
    res.json({ code: 500 });
  }
};


