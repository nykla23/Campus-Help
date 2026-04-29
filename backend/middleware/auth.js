const jwt = require('jsonwebtoken');
require('dotenv').config();

exports.verifyToken = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ code: 401, message: '请先登录' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      ...decoded,
      id: decoded.userId   // 将 userId 赋值给 id
    };
    
    next();
  } catch (_err) {
    return res.status(401).json({ code: 401, message: '登录已失效' });
  }
};