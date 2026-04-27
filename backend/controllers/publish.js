const db = require('../config/db');
const { CODE } = require('../constants');

// 发布任务 - 真实数据库操作
exports.publishTask = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const { type, title, description, reward, location, deadline } = req.body;

    const userId = req.user.id;

    // 参数校验
    if (!type || !title || !description || !reward || reward <= 0) {
      return res.status(400).json({ code: CODE.BAD_REQUEST, message: '必填参数不能为空' });
    }

    // 使用原子操作检查并扣除余额（防止并发竞态条件）
    const [deductResult] = await connection.query(
      'UPDATE users SET coins = coins - ? WHERE id = ? AND coins >= ?',
      [reward, userId, reward]
    );
    if (deductResult.affectedRows === 0) {
      await connection.rollback();
      return res.status(400).json({ code: CODE.BAD_REQUEST, message: '虚拟币余额不足' });
    }

    // 插入任务（余额已通过原子操作扣除）
    const [taskResult] = await connection.query(
      'INSERT INTO tasks (type, title, description, reward, location, deadline, publisher_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, 0)',
      [type, title, description, reward, location || null, deadline || null, userId]
    );

    await connection.commit();
    res.json({ code: CODE.OK, message: '任务发布成功', data: { taskId: taskResult.insertId } });

  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ code: CODE.SERVER_ERROR, message: '服务器错误' });
  } finally {
    connection.release();
  }
};