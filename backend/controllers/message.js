const db = require('../config/db');
const { CODE } = require('../constants');

// 获取消息列表（按任务+对方用户分组，每个任务显示最新一条消息）
exports.getMsgList = async (req, res) => {
  const userId = req.user.id;
  try {
    const [list] = await db.query(`
      SELECT 
        t.task_id,
        t.other_user_id AS user_id,
        u.nickname,
        u.avatar,
        latest.id AS msg_id,
        latest.content AS preview,
        latest.created_at AS time
      FROM (
        -- 找出当前用户参与的所有任务和对应的对方用户
        SELECT DISTINCT 
          task_id,
          CASE WHEN from_id = ? THEN to_id ELSE from_id END AS other_user_id
        FROM messages
        WHERE from_id = ? OR to_id = ?
      ) t
      JOIN users u ON u.id = t.other_user_id
      LEFT JOIN (
        -- 获取每个任务+对方用户组合的最新一条消息
        SELECT m1.*
        FROM messages m1
        INNER JOIN (
          SELECT 
            task_id,
            LEAST(from_id, to_id) AS user_a,
            GREATEST(from_id, to_id) AS user_b,
            MAX(created_at) AS max_time
          FROM messages
          WHERE from_id = ? OR to_id = ?
          GROUP BY task_id, LEAST(from_id, to_id), GREATEST(from_id, to_id)
        ) m2 ON (
          m1.task_id = m2.task_id
          AND LEAST(m1.from_id, m1.to_id) = m2.user_a
          AND GREATEST(m1.from_id, m1.to_id) = m2.user_b
          AND m1.created_at = m2.max_time
        )
      ) latest ON (
        latest.task_id = t.task_id
        AND LEAST(latest.from_id, latest.to_id) = LEAST(?, t.other_user_id)
        AND GREATEST(latest.from_id, latest.to_id) = GREATEST(?, t.other_user_id)
      )
      ORDER BY latest.created_at DESC
    `, [userId, userId, userId, userId, userId, userId, userId]);

    // 时间格式化由前端 common.ts 的 formatMsgListTime 统一处理，后端返回原始时间
    const formatted = list.map(item => ({
      ...item,
      avatar: item.avatar || null  // 保留原始值，前端处理默认头像
    }));
    res.json({ code: 200, data: formatted });
  } catch (err) {
    console.error('getMsgList error:', err);
    res.json({ code: CODE.SERVER_ERROR, message: '服务器错误' });
  }
};

// 获取聊天记录
exports.getChatDetail = async (req, res) => {
  const { taskId, targetId } = req.params;
  const userId = req.user.id;

  try {
    // 校验当前用户是否为任务参与者（防止越权读取他人私聊）
    const [tasks] = await db.query(
      'SELECT publisher_id, acceptor_id FROM tasks WHERE id = ?',
      [parseInt(taskId)]
    );
    if (tasks.length === 0 || (tasks[0].publisher_id !== userId && tasks[0].acceptor_id !== userId)) {
      return res.json({ code: CODE.FORBIDDEN, message: '无权查看该聊天' });
    }
    // 查询双方用户信息，用于获取头像
    const [users] = await db.query(`
      SELECT id, avatar FROM users WHERE id IN (?, ?)
    `, [userId, targetId]);

    // 创建用户信息映射
    const userMap = {};
    users.forEach((u) => {
      userMap[u.id] = u.avatar;
    });

    const [msgs] = await db.query(`
      SELECT m.*, u.avatar AS from_avatar
      FROM messages m
      JOIN users u ON m.from_id = u.id
      WHERE m.task_id = ? 
      AND ((m.from_id = ? AND m.to_id = ?) OR (m.from_id = ? AND m.to_id = ?))
      ORDER BY m.created_at ASC
    `, [taskId, userId, targetId, targetId, userId]);

    // 添加 to_id 用户的头像
    const result = msgs.map((m) => ({
      ...m,
      from_avatar: m.from_avatar || null,
      to_avatar: userMap[m.to_id] || null
    }));

    res.json({ code: 200, data: result });
  } catch (e) {
    res.json({ code: CODE.SERVER_ERROR });   // getChatDetail catch
  }
};

// 发送消息
exports.sendMsg = async (req, res) => {
  const { toId, taskId, content } = req.body;
  const fromId = req.user.id;

  if (!content) return res.json({ code: CODE.BAD_REQUEST, message: '内容不能为空' });
  if (!toId || !taskId) return res.json({ code: CODE.BAD_REQUEST, message: '参数不完整' });

  try {
    // 校验目标用户是否存在
    const [users] = await db.query('SELECT id FROM users WHERE id = ?', [toId]);
    if (users.length === 0) return res.json({ code: CODE.NOT_FOUND, message: '目标用户不存在' });

    // 校验任务是否存在且当前用户是参与者（发布者或接单者）
    const [tasks] = await db.query('SELECT publisher_id, acceptor_id FROM tasks WHERE id = ?', [taskId]);
    if (tasks.length === 0) return res.json({ code: CODE.NOT_FOUND, message: '任务不存在' });
    const task = tasks[0];
    if (task.publisher_id !== fromId && task.acceptor_id !== fromId) {
      return res.json({ code: CODE.FORBIDDEN, message: '无权向该任务发送消息' });
    }

    await db.query(
      'INSERT INTO messages (from_id, to_id, task_id, content) VALUES (?,?,?,?)',
      [fromId, toId, taskId, content]
    );
    res.json({ code: 200, message: '发送成功' });
  } catch (e) {
    res.json({ code: CODE.SERVER_ERROR });   // sendMsg catch
  }
};

