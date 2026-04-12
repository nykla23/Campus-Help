const db = require('../config/db');

// 获取消息列表
exports.getMsgList = async (req, res) => {
  const userId = req.user.id;
  try {
    const [list] = await db.query(`
      SELECT 
        m.id,
        m.task_id,
        m.content AS preview,
        m.created_at AS time,
        u.id AS user_id,
        u.nickname,
        u.avatar
      FROM messages m
      JOIN users u ON (
        (m.from_id = ? AND m.to_id = u.id) OR 
        (m.to_id = ? AND m.from_id = u.id)
      )
      WHERE m.from_id = ? OR m.to_id = ?
      GROUP BY u.id
      ORDER BY m.created_at DESC
    `, [userId, userId, userId, userId]);

    res.json({ code: 200, data: list });
  } catch (e) {
    res.json({ code: 500 });
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