const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is not set');
}

exports.sign = (payload) => jwt.sign(payload, SECRET, { expiresIn: '7d' });
exports.verify = (token) => jwt.verify(token, SECRET);