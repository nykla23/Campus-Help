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