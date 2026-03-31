const db = require('../config/db');

// 查询用户(根据用户名)
exports.findByUsername = async (username) => {
  const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
  return rows[0];
};

// 新增用户
exports.create = async (user) => {
  const { username, password, nickname } = user;
  const [result] = await db.query(
    'INSERT INTO users (username, password, nickname) VALUES (?, ?, ?)',
    [username, password, nickname]
  );
  return result.insertId;
};