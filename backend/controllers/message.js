const db = require('../config/db');

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

    // 格式化时间（可选）
    const formatted = list.map(item => ({
      ...item,
      avatar: item.avatar || '/images/default-avatar.png',
      time: this.formatTime(item.time)
    }));
    res.json({ code: 200, data: formatted });
  } catch (err) {
    console.error('getMsgList error:', err);
    res.json({ code: 500, message: '服务器错误' });
  }
};

// 辅助时间格式化函数
exports.formatTime = (timeStr) => {
  if (!timeStr) return '';
  const date = new Date(timeStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((today - msgDate) / (24 * 3600 * 1000));
  if (diffDays === 0) {
    return `${date.getHours().toString().padStart(2,'0')}:${date.getMinutes().toString().padStart(2,'0')}`;
  } else if (diffDays === 1) {
    return '昨天';
  } else {
    return `${date.getMonth()+1}/${date.getDate()}`;
  }
};

// 获取聊天记录
exports.getChatDetail = async (req, res) => {
  const { taskId, targetId } = req.params;
  const userId = req.user.id;

  try {
    const [msgs] = await db.query(`
      SELECT * FROM messages 
      WHERE task_id = ? 
      AND ((from_id = ? AND to_id = ?) OR (from_id = ? AND to_id = ?))
      ORDER BY created_at ASC
    `, [taskId, userId, targetId, targetId, userId]);

    res.json({ code: 200, data: msgs });
  } catch (e) {
    res.json({ code: 500 });
  }
};

// 发送消息
exports.sendMsg = async (req, res) => {
  const { toId, taskId, content } = req.body;
  const fromId = req.user.id;

  if (!content) return res.json({ code: 400, message: '内容不能为空' });

  try {
    await db.query(
      'INSERT INTO messages (from_id, to_id, task_id, content) VALUES (?,?,?,?)',
      [fromId, toId, taskId, content]
    );
    res.json({ code: 200, message: '发送成功' });
  } catch (e) {
    res.json({ code: 500 });
  }
};

