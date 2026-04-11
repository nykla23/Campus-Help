const db = require('../config/db');

// 查询带分页的任务列表，并联查发布者昵称和头像
exports.getList = async ({ page = 1, limit = 10, status, type }) => {
  let wheres = [];
  let params = [];
  if (status !== undefined && status !== '' && !isNaN(status)) {
    wheres.push('tasks.status = ?');
    params.push(status);
  }
  if (type !== undefined && type !== '' && !isNaN(type)) {
    wheres.push('tasks.type = ?');
    params.push(type);
  }

  const whereSql = wheres.length ? 'WHERE ' + wheres.join(' AND ') : '';

  // 查总数
  const [[{ cnt }]] = await db.query(
    `SELECT COUNT(*) as cnt FROM tasks ${whereSql}`, params
  );

  // 查当前页
  const offset = (page - 1) * limit;
  const taskSql = `
    SELECT 
      tasks.id as taskId, tasks.title, tasks.description, tasks.reward, tasks.location,
      tasks.type, tasks.status, tasks.created_at as createdAt, tasks.deadline,
      users.id as userId, users.nickname, users.avatar, users.credit_score as creditScore
    FROM tasks
    LEFT JOIN users ON users.id = tasks.publisher_id
    ${whereSql}
    ORDER BY tasks.created_at DESC, tasks.id DESC
    LIMIT ?, ?
  `;
  // 增加分页参数
  const paramsWithLimit = params.concat([offset, limit]);
  const [rows] = await db.query(taskSql, paramsWithLimit);
  // 结构转成API标准格式
  const list = rows.map(row => ({
    taskId: row.taskId,
    title: row.title,
    description: row.description,
    reward: row.reward,
    location: row.location,
    type: row.type,
    status: row.status,
    createdAt: row.createdAt,
    deadline: row.deadline,
    publisher: {
      userId: row.userId,
      nickname: row.nickname,
      avatar: row.avatar,
      creditScore: row.creditScore
    }
  }));

  return {
    total: cnt,
    list
  };
};