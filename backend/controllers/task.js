const taskModel = require('../models/task');
const db = require('../config/db');
const { STATUS_MAP, TYPE_MAP, CODE } = require('../constants');

exports.list = async (req, res) => {
  try {
    let { page = 1, limit = 10, status, type, keyword } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    status = status === undefined ? undefined : parseInt(status);
    type = type === undefined ? undefined : parseInt(type);

    const { total, list } = await taskModel.getList({ page, limit, status, type, keyword });
    res.json({ code: CODE.SUCCESS, data: { total, page, limit, list } });
  } catch (err) {
    console.error('任务列表出错:', err);
    res.status(500).json({ code: CODE.SERVER_ERROR, message: '服务器内部错误' });
  }
};

// 使用统一常量（从 constants.js 导入 STATUS_MAP、TYPE_MAP、CODE）

// 1. 获取任务详情
exports.getTaskDetail = async (req, res) => {
  const taskId = parseInt(req.params.id);
  if (!taskId || isNaN(taskId)) {
    return res.json({ code: CODE.BAD_REQUEST, message: '无效的任务ID' });
  }
  try {
    const [tasks] = await db.query(`
      SELECT 
        t.*,
        u_pub.id AS pub_id, u_pub.nickname AS pub_nickname, u_pub.avatar AS pub_avatar, u_pub.credit_score AS pub_credit,
        u_acc.id AS acc_id, u_acc.nickname AS acc_nickname, u_acc.avatar AS acc_avatar, u_acc.credit_score AS acc_credit
      FROM tasks t
      LEFT JOIN users u_pub ON t.publisher_id = u_pub.id
      LEFT JOIN users u_acc ON t.acceptor_id = u_acc.id
      WHERE t.id = ?
    `, [taskId]);

    if (tasks.length === 0) {
      return res.json({ code: CODE.NOT_FOUND, message: '任务不存在' });
    }
    const task = tasks[0];
    res.json({
      code: CODE.OK,
      data: {
        id: task.id,
        title: task.title,
        description: task.description,
        reward: task.reward,
        location: task.location,
        type: task.type,
        typeText: TYPE_MAP[task.type],
        status: task.status,
        statusText: STATUS_MAP[task.status],
        deadline: task.deadline,
        createTime: task.created_at,
        publisher: {
          id: task.pub_id,
          nickname: task.pub_nickname,
          avatar: task.pub_avatar || '/images/default-avatar.png',
          credit: task.pub_credit
        },
        acceptor: task.acc_id ? {
          id: task.acc_id,
          nickname: task.acc_nickname,
          avatar: task.acc_avatar || '/images/default-avatar.png',
          credit: task.acc_credit
        } : null
      }
    });
  } catch (err) {
    console.error('获取任务详情失败:', err);
    res.json({ code: CODE.SERVER_ERROR, message: '服务器错误' });
  }
};

// 2. 接单
exports.acceptTask = async (req, res) => {
  const taskId = parseInt(req.params.id);
  if (!taskId || isNaN(taskId)) {
    return res.json({ code: CODE.BAD_REQUEST, message: '无效的任务ID' });
  }
  const userId = req.user.id;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [tasks] = await connection.query('SELECT * FROM tasks WHERE id = ?', [taskId]);
    if (tasks.length === 0) throw new Error('任务不存在');
    const task = tasks[0];
    if (task.status !== 0) throw new Error('任务已被接单/已完成');
    if (task.publisher_id === userId) throw new Error('不能接自己发布的任务');
    await connection.query('UPDATE tasks SET status = 1, acceptor_id = ? WHERE id = ?', [userId, taskId]);
    await connection.commit();
    res.json({ code: CODE.OK, message: '接单成功' });
  } catch (err) {
    await connection.rollback();
    console.error('接单失败:', err);
    res.json({ code: CODE.BAD_REQUEST, message: err.message || '服务器错误' });
  } finally {
    connection.release();
  }
};

// 3. 接单者提交完成（状态改为"待确认"）
exports.completeTask = async (req, res) => {
  const taskId = parseInt(req.params.id);
  if (!taskId || isNaN(taskId)) {
    return res.json({ code: CODE.BAD_REQUEST, message: '无效的任务ID' });
  }
  const userId = req.user.id;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [tasks] = await connection.query('SELECT * FROM tasks WHERE id = ?', [taskId]);
    if (tasks.length === 0) throw new Error('任务不存在');
    const task = tasks[0];
    if (task.acceptor_id !== userId) throw new Error('无权限操作');
    if (task.status !== 1) throw new Error('任务状态异常');
    await connection.query('UPDATE tasks SET status = 2 WHERE id = ?', [taskId]);
    await connection.commit();
    res.json({ code: CODE.OK, message: '已提交完成，等待发布者确认' });
  } catch (err) {
    await connection.rollback();
    console.error('提交完成失败:', err);
    res.json({ code: CODE.BAD_REQUEST, message: err.message || '服务器错误' });
  } finally {
    connection.release();
  }
};

// 4. 发布者确认完成（状态改为"已完成"并结算）
exports.confirmCompleteTask = async (req, res) => {
  const taskId = parseInt(req.params.id);
  if (!taskId || isNaN(taskId)) {
    return res.json({ code: CODE.BAD_REQUEST, message: '无效的任务ID' });
  }
  const userId = req.user.id;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 查询任务
    const [tasks] = await connection.query('SELECT * FROM tasks WHERE id = ?', [taskId]);
    if (tasks.length === 0) throw new Error('任务不存在');
    const task = tasks[0];

    // 权限校验：只有发布者可以确认
    if (task.publisher_id !== userId) throw new Error('无权限操作');
    if (task.status !== 2) throw new Error('任务状态异常，当前状态不是"待确认"');

    // 查询发布者和接单者当前余额，使用原子操作更新
    const [pubResult] = await connection.query(
      'UPDATE users SET coins = coins - ? WHERE id = ? AND coins >= ?',
      [task.reward, task.publisher_id, task.reward]
    );
    if (pubResult.affectedRows === 0) throw new Error('发布者余额不足');

    await connection.query(
      'UPDATE users SET coins = coins + ? WHERE id = ?',
      [task.reward, task.acceptor_id]
    );

    // 查询最新余额用于交易记录
    const [pubUser] = await connection.query('SELECT coins FROM users WHERE id = ?', [task.publisher_id]);
    const [accUser] = await connection.query('SELECT coins FROM users WHERE id = ?', [task.acceptor_id]);

    // 1. 更新任务状态为已完成
    await connection.query('UPDATE tasks SET status = 3 WHERE id = ?', [taskId]);

    // 2. 插入交易记录（发布者支出，type=2）
    await connection.query(
      `INSERT INTO transactions (user_id, type, amount, balance, task_id, description)
       VALUES (?, 2, ?, ?, ?, ?)`,
      [task.publisher_id, task.reward, pubUser[0].coins, taskId, `确认完成任务-${task.title}`]
    );

    // 3. 插入交易记录（接单者收入，type=1）
    await connection.query(
      `INSERT INTO transactions (user_id, type, amount, balance, task_id, description)
       VALUES (?, 1, ?, ?, ?, ?)`,
      [task.acceptor_id, task.reward, accUser[0].coins, taskId, `完成任务-${task.title}`]
    );

    await connection.commit();
    res.json({ code: CODE.OK, message: '任务已完成，虚拟币已结算' });
  } catch (err) {
    await connection.rollback();
    console.error('确认完成失败:', err);
    res.json({ code: CODE.BAD_REQUEST, message: err.message || '服务器错误' });
  } finally {
    connection.release();
  }
};

// 5. 发布者取消任务（待接取状态）
exports.cancelTask = async (req, res) => {
  const taskId = parseInt(req.params.id);
  if (!taskId || isNaN(taskId)) {
    return res.json({ code: CODE.BAD_REQUEST, message: '无效的任务ID' });
  }
  const userId = req.user.id;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [tasks] = await connection.query('SELECT * FROM tasks WHERE id = ?', [taskId]);
    if (tasks.length === 0) throw new Error('任务不存在');
    const task = tasks[0];

    if (task.publisher_id !== userId) throw new Error('无权限操作');
    if (task.status !== 0) throw new Error('任务已被接单，无法取消');

    // 使用原子操作返还虚拟币给发布者
    await connection.query(
      'UPDATE users SET coins = coins + ? WHERE id = ?',
      [task.reward, userId]
    );

    // 更新任务状态为已取消
    await connection.query('UPDATE tasks SET status = 4 WHERE id = ?', [taskId]);

    // 查询最新余额用于交易记录
    const [userAfter] = await connection.query('SELECT coins FROM users WHERE id = ?', [userId]);

    // 插入交易记录（收入，type=1）
    await connection.query(
      `INSERT INTO transactions (user_id, type, amount, balance, task_id, description)
       VALUES (?, 1, ?, ?, ?, ?)`,
      [userId, task.reward, userAfter[0].coins, taskId, `取消任务-${task.title}`]
    );

    await connection.commit();
    res.json({ code: CODE.OK, message: '任务已取消，虚拟币已返还' });
  } catch (err) {
    await connection.rollback();
    console.error('取消任务失败:', err);
    res.json({ code: CODE.BAD_REQUEST, message: err.message || '服务器错误' });
  } finally {
    connection.release();
  }
};

// 6. 接单者放弃任务
exports.giveUpTask = async (req, res) => {
  const taskId = parseInt(req.params.id);
  if (!taskId || isNaN(taskId)) {
    return res.json({ code: CODE.BAD_REQUEST, message: '无效的任务ID' });
  }
  const userId = req.user.id;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [tasks] = await connection.query('SELECT * FROM tasks WHERE id = ?', [taskId]);
    if (tasks.length === 0) throw new Error('任务不存在');
    const task = tasks[0];
    if (task.acceptor_id !== userId) throw new Error('无权限操作');
    if (task.status !== 1) throw new Error('任务状态异常，无法放弃');
    await connection.query('UPDATE tasks SET status = 0, acceptor_id = NULL WHERE id = ?', [taskId]);
    await connection.commit();
    res.json({ code: CODE.OK, message: '任务已放弃，恢复待接取状态' });
  } catch (err) {
    await connection.rollback();
    console.error('放弃任务失败:', err);
    res.json({ code: CODE.BAD_REQUEST, message: err.message || '服务器错误' });
  } finally {
    connection.release();
  }
};
