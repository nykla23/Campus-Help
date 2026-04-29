// Auth Middleware 单元测试 - JWT Token 验证
// 覆盖：正常token、无token、无效token、过期token、userId映射

const { verifyToken } = require('../middleware/auth');

jest.mock('jsonwebtoken');
jest.mock('dotenv', () => ({ config: jest.fn() }));

const jwt = require('jsonwebtoken');

describe('=== Auth Middleware (verifyToken) 单元测试 ===', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret-key'; // 确保 JWT_SECRET 存在
    req = { headers: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  test('无 Authorization header 应返回401', async () => {
    await verifyToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 401, message: '请先登录' })
    );
    expect(next).not.toHaveBeenCalled();
  });

  test('Authorization 格式不正确（无 Bearer）应返回401', async () => {
    req.headers.authorization = 'invalid_token';
    await verifyToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('有效的 JWT token 应调用 next 并设置 req.user', async () => {
    const mockPayload = { userId: 42, username: 'testuser' };
    jwt.verify.mockReturnValue(mockPayload);

    req.headers.authorization = 'Bearer valid_token_123';
    await verifyToken(req, res, next);

    expect(jwt.verify).toHaveBeenCalledWith('valid_token_123', expect.any(String));
    expect(req.user).toEqual({ ...mockPayload, id: 42 });
    expect(next).toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  test('JWT 验证失败（过期/篡改）应返回401', async () => {
    jwt.verify.mockImplementation(() => {
      throw new Error('JsonWebTokenError: invalid signature');
    });

    req.headers.authorization = 'Bearer expired_or_invalid_token';
    await verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 401, message: '登录已失效' })
    );
    expect(next).not.toHaveBeenCalled();
  });

  test('req.user.id 应正确从 userId 映射', async () => {
    jwt.verify.mockReturnValue({ userId: 99, username: 'alice' });

    req.headers.authorization = 'Bearer some_token';
    await verifyToken(req, res, next);

    expect(req.user.id).toBe(99);
    expect(req.user.username).toBe('alice');
    expect(next).toHaveBeenCalled();
  });
});
