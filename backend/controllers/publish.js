const db = require('../config/db');

// 发布任务 - 真实数据库操作
exports.publishTask = async (req, res) => {

  console.log('后端收到的 body:', req.body);

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const { type, title, description, reward, location, deadline } = req.body;

    const userId = req.user.id;
    console.log('从 token 解析出的 userId:', userId);

    // 参数校验
    if (!type || !title || !description || !reward || reward <= 0) {
      return res.status(400).json({ code: 400, message: '必填参数不能为空' });
    }

    // 检查用户余额
    const [user] = await connection.query('SELECT coins FROM users WHERE id = ?', [userId]);

    console.log('查询到的用户:', user);
    console.log('用户余额:', user[0]?.coins, '奖励:', reward);

    if (user.length === 0 || user[0].coins < reward) {
      await connection.rollback();

      console.log('余额不足，用户余额:', user[0]?.coins, '奖励:', reward);

      return res.status(400).json({ code: 400, message: '虚拟币余额不足' });
    }

    // 插入任务
    const [taskResult] = await connection.query(
      'INSERT INTO tasks (type, title, description, reward, location, deadline, publisher_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, 0)',
      [type, title, description, reward, location || null, deadline || null, userId]
    );

    // 扣除余额
    await connection.query('UPDATE users SET coins = coins - ? WHERE id = ?', [reward, userId]);

    await connection.commit();
    res.json({ code: 200, message: '任务发布成功', data: { taskId: taskResult.insertId } });

  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  } finally {
    connection.release();
  }
};