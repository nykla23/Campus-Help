const taskModel = require('../models/task');
const db = require('../config/db');

exports.list = async (req, res) => {

  try {
    // 支持参数：page/limit/status/type等
    let { page = 1, limit = 10, status, type } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    status = status === undefined ? undefined : parseInt(status);
    type = type === undefined ? undefined : parseInt(type);

    // 交给模型层查数据，返回合适的list（包含发布者基础资料）
    const { total, list } = await taskModel.getList({ page, limit, status, type });

    res.json({
      code: 0,
      data: {
        total,
        page,
        limit,
        list
      }
    });
} catch (err) {
  console.error('任务列表出错:', err); // <---关键！ 
  res.status(500).json({ code: 5000, message: '服务器内部错误' });
}
};

// 状态/类型映射
const statusMap = { 0: '待接单', 1: '进行中', 2: '待确认', 3: '已完成', 4: '已取消' };
const typeMap = { 0: '取件代送', 1: '跑腿代办', 2: '学习辅导', 3: '其他' };

// 1. 获取任务详情
exports.getTaskDetail = async (req, res) => {
  const taskId = req.params.id;
  const userId = req.user.id;
  try {
    // 查询任务+发布者+接单者信息
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
      return res.json({ code: 404, message: '任务不存在' });
    }

    const task = tasks[0];
    res.json({
      code: 200,
      data: {
        id: task.id,
        title: task.title,
        description: task.description,
        reward: task.reward,
        location: task.location,
        type: task.type,
        typeText: typeMap[task.type],
        status: task.status,
        statusText: statusMap[task.status],
        deadline: task.deadline,
        createTime: task.created_at,
        publisher: {
          id: task.pub_id,
          nickname: task.pub_nickname,
          avatar: task.pub_avatar || '/images/default-avatar.png',
          credit: task.pub_credit
        },
        acceptor: {
          id: task.acc_id,
          nickname: task.acc_nickname || '/images/default-avatar.png',
          avatar: task.acc_avatar,
          credit: task.acc_credit
        }
      }
    });
  } catch (err) {
    console.error('获取任务详情失败:', err);
    res.json({ code: 500, message: '服务器错误' });
  }
};

// 2. 接单
exports.acceptTask = async (req, res) => {
  const taskId = req.params.id;
  const userId = req.user.id;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 检查任务状态
    const [tasks] = await connection.query('SELECT * FROM tasks WHERE id = ?', [taskId]);
    if (tasks.length === 0) {
      await connection.rollback();
      return res.json({ code: 404, message: '任务不存在' });
    }
    const task = tasks[0];

    // 状态校验：必须是待接单，且不是自己发布的
    if (task.status !== 0) {
      await connection.rollback();
      return res.json({ code: 400, message: '任务已被接单/已完成' });
    }
    if (task.publisher_id === userId) {
      await connection.rollback();
      return res.json({ code: 400, message: '不能接自己发布的任务' });
    }

    // 更新任务状态+接单者ID
    await connection.query(
      'UPDATE tasks SET status = 1, acceptor_id = ? WHERE id = ?',
      [userId, taskId]
    );

    await connection.commit();
    res.json({ code: 200, message: '接单成功' });
  } catch (err) {
    await connection.rollback();
    console.error('接单失败:', err);
    res.json({ code: 500, message: '服务器错误' });
  } finally {
    connection.release();
  }
};

// 3. 完成任务（结算虚拟币）
exports.completeTask = async (req, res) => {
  const taskId = req.params.id;
  const userId = req.user.id;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 检查任务
    const [tasks] = await connection.query('SELECT * FROM tasks WHERE id = ?', [taskId]);
    if (tasks.length === 0) {
      await connection.rollback();
      return res.json({ code: 404, message: '任务不存在' });
    }
    const task = tasks[0];

    // 权限校验：只有发布者能确认完成
    if (task.publisher_id !== userId) {
      await connection.rollback();
      return res.json({ code: 403, message: '无权限操作' });
    }
    if (task.status !== 1) {
      await connection.rollback();
      return res.json({ code: 400, message: '任务状态异常' });
    }

    // 1. 更新任务状态为已完成
    await connection.query('UPDATE tasks SET status = 2 WHERE id = ?', [taskId]);

    // 2. 给接单者结算虚拟币
    await connection.query(
      'UPDATE users SET coins = coins + ? WHERE id = ?',
      [task.reward, task.acceptor_id]
    );

    // 3. 插入交易记录（可选，用于个人主页交易列表）
    await connection.query(
      'INSERT INTO trades (user_id, title, amount, type) VALUES (?, ?, ?, ?), (?, ?, ?, ?)',
      [
        task.publisher_id, `完成任务-${task.title}`, task.reward, 'expense',
        task.acceptor_id, `完成任务-${task.title}`, task.reward, 'income'
      ]
    );

    await connection.commit();
    res.json({ code: 200, message: '任务完成，虚拟币已结算' });
  } catch (err) {
    await connection.rollback();
    console.error('完成任务失败:', err);
    res.json({ code: 500, message: '服务器错误' });
  } finally {
    connection.release();
  }
};

// 4. 取消任务（发布者）
exports.cancelTask = async (req, res) => {
  const taskId = req.params.id;
  const userId = req.user.id;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 检查任务
    const [tasks] = await connection.query('SELECT * FROM tasks WHERE id = ?', [taskId]);
    if (tasks.length === 0) {
      await connection.rollback();
      return res.json({ code: 404, message: '任务不存在' });
    }
    const task = tasks[0];

    // 权限校验：只有发布者能取消，且必须是待接单状态
    if (task.publisher_id !== userId) {
      await connection.rollback();
      return res.json({ code: 403, message: '无权限操作' });
    }
    if (task.status !== 0) {
      await connection.rollback();
      return res.json({ code: 400, message: '任务已被接单，无法取消' });
    }

    // 1. 更新任务状态为已取消
    await connection.query('UPDATE tasks SET status = 3 WHERE id = ?', [taskId]);

    // 2. 返还虚拟币给发布者
    await connection.query(
      'UPDATE users SET coins = coins + ? WHERE id = ?',
      [task.reward, userId]
    );

    // 3. 插入交易记录（返还）
    await connection.query(
      'INSERT INTO trades (user_id, title, amount, type) VALUES (?, ?, ?, ?)',
      [userId, `取消任务-${task.title}`, task.reward, 'income']
    );

    await connection.commit();
    res.json({ code: 200, message: '任务已取消，虚拟币已返还' });
  } catch (err) {
    await connection.rollback();
    console.error('取消任务失败:', err);
    res.json({ code: 500, message: '服务器错误' });
  } finally {
    connection.release();
  }
};

// 5. 放弃任务（接单者）
exports.giveUpTask = async (req, res) => {
  const taskId = req.params.id;
  const userId = req.user.id;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 检查任务
    const [tasks] = await connection.query('SELECT * FROM tasks WHERE id = ?', [taskId]);
    if (tasks.length === 0) {
      await connection.rollback();
      return res.json({ code: 404, message: '任务不存在' });
    }
    const task = tasks[0];

    // 权限校验：只有接单者能放弃，且必须是进行中状态
    if (task.acceptor_id !== userId) {
      await connection.rollback();
      return res.json({ code: 403, message: '无权限操作' });
    }
    if (task.status !== 1) {
      await connection.rollback();
      return res.json({ code: 400, message: '任务状态异常，无法放弃' });
    }

    // 更新任务状态为待接单，清空接单者ID
    await connection.query(
      'UPDATE tasks SET status = 0, acceptor_id = NULL WHERE id = ?',
      [taskId]
    );

    await connection.commit();
    res.json({ code: 200, message: '任务已放弃，恢复待接单状态' });
  } catch (err) {
    await connection.rollback();
    console.error('放弃任务失败:', err);
    res.json({ code: 500, message: '服务器错误' });
  } finally {
    connection.release();
  }
};
