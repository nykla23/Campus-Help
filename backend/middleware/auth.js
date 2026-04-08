// middleware/auth.js
const { verify } = require('../utils/jwt'); // 引入你已有的jwt验证方法

// JWT认证中间件
const authMiddleware = (req, res, next) => {
  try {
    // 1. 从请求头获取token（约定格式：Bearer <token>）
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ code: 4010, message: '未授权：请先登录' });
    }

    // 2. 提取并验证token
    const token = authHeader.split(' ')[1];
    const decoded = verify(token); // 调用jwt.js的verify方法

    // 3. 验证通过：将用户信息挂载到req对象，供后续路由使用
    req.user = decoded;
    next(); // 放行到下一个路由/中间件
  } catch (err) {
    // token过期/无效的处理
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ code: 4011, message: '授权过期：请重新登录' });
    }
    return res.status(401).json({ code: 4012, message: 'token无效：请重新登录' });
  }
};

module.exports = authMiddleware;