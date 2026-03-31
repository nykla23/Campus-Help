const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'campushelp'; // .env中可配置

exports.sign = (payload) => jwt.sign(payload, SECRET, { expiresIn: '7d' });
exports.verify = (token) => jwt.verify(token, SECRET);