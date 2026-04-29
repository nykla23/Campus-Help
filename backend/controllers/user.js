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

// 状态映射和类型映射已统一到 ../constants.js (STATUS_MAP, TYPE_MAP)
// 此处不再重复定义，直接引用共享常量

// 获取个人信息
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const [user] = await db.query('SELECT id, nickname, avatar, signature, coins, credit_score FROM users WHERE id = ?', [userId]);
    if (!user || user.length === 0) {
      return res.json({ code: 404, message: '用户不存在' });
    }
    // 统计用户作为接单者且任务已完成的数目（更合理）
    const [finish] = await db.query('SELECT COUNT(*) AS count FROM tasks WHERE acceptor_id = ? AND status = 3', [userId]);
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
  } catch (_err) {
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
  } catch (_e) {
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
  } catch (_e) {
    res.json({ code: 500 });
  }
};

// 交易记录
exports.getTrades = async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await db.query(
      `SELECT id, description as title, amount, type, created_at as time, task_id
       FROM transactions
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [userId]
    );
    // 将 type 数字转换为 'income' / 'expense'
    const trades = rows.map(row => ({
      id: row.id,
      title: row.title,
      amount: row.amount,
      type: row.type === 1 ? 'income' : 'expense',
      time: row.time,
      taskId: row.task_id
    }));
    res.json({ code: 200, data: trades });
  } catch (err) {
    console.error('获取交易记录失败:', err);
    res.json({ code: 500, message: '服务器错误' });
  }
};

// 更新个人信息
exports.updateUserInfo = async (req, res) => {
  try {
    const userId = req.user.id; // 从 token 获取用户ID
    const { nickname, signature, avatar } = req.body;

    // 动态构建更新字段
    const updates = [];
    const params = [];
    if (nickname !== undefined) {
      updates.push('nickname = ?');
      params.push(nickname);
    }
    if (signature !== undefined) {
      updates.push('signature = ?');
      params.push(signature);
    }
    if (avatar !== undefined) {
      updates.push('avatar = ?');
      params.push(avatar);
    }
    if (updates.length === 0) {
      return res.json({ code: 400, message: '没有要更新的字段' });
    }
    params.push(userId);
    const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
    await db.query(sql, params);
    res.json({ code: 200, message: '更新成功' });
  } catch (err) {
    console.error('更新用户信息失败:', err);
    res.json({ code: 500, message: '服务器错误' });
  }
};

// 修改密码
exports.changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { oldPassword, newPassword } = req.body;
    console.log('修改密码请求:', { userId }); // 调试日志（脱敏）
    if (!oldPassword || !newPassword) {
      return res.json({ code: 400, message: '原密码和新密码不能为空' });
    }
    const [rows] = await db.query('SELECT password FROM users WHERE id = ?', [userId]);
    if (rows.length === 0) return res.json({ code: 404, message: '用户不存在' });
    const isValid = await bcrypt.compare(oldPassword, rows[0].password);
    if (!isValid) return res.json({ code: 401, message: '原密码错误' });
    const hashed = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password = ? WHERE id = ?', [hashed, userId]);
    res.json({ code: 200, message: '密码修改成功，请重新登录' });
  } catch (err) {
    console.error('修改密码失败:', err);
    res.json({ code: 500, message: '服务器错误' });
  }
};

// 上传头像
exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.json({ code: 400, message: '未选择文件' });
    }
    const userId = req.user.id;
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    await db.query('UPDATE users SET avatar = ? WHERE id = ?', [avatarUrl, userId]);
    res.json({ code: 200, data: { url: avatarUrl }, message: '头像更新成功' });
  } catch (err) {
    console.error('上传头像失败:', err);
    res.json({ code: 500, message: err.message || '服务器错误'  });
  }
};
