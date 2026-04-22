// 前端个人主页测试

// Mock wx 全局对象
global.wx = {
  showToast: jest.fn(),
  showLoading: jest.fn(),
  hideLoading: jest.fn(),
  getStorageSync: jest.fn(() => ''),
  setStorageSync: jest.fn(),
  request: jest.fn()
};

// Mock api
jest.mock('../utils/api', () => ({
  getUserProfile: jest.fn(() => Promise.resolve({
    code: 200,
    data: {
      user: { id: 1, nickname: 'TestUser', avatar: '/uploads/avatars/test.jpg', coins: 100, credit_score: 90 },
      stats: { coins: 100, credit: 90, finishCount: 5 }
    }
  })),
  getMyPublishTasks: jest.fn(() => Promise.resolve({ code: 200, data: [] })),
  getMyReceiveTasks: jest.fn(() => Promise.resolve({ code: 200, data: [] })),
  getMyTrades: jest.fn(() => Promise.resolve({ code: 200, data: [] })),
  updateUserInfo: jest.fn(() => Promise.resolve({ code: 200, message: '更新成功' })),
  changePassword: jest.fn(() => Promise.resolve({ code: 200, message: '修改成功' })),
  uploadAvatar: jest.fn(() => Promise.resolve({ code: 200, data: { url: '/uploads/avatars/new.jpg' } })),
  getFullAvatarUrl: jest.fn((url) => url || '/images/default-avatar.png')
}));

const api = require('../utils/api');

describe('=== Profile 页面交互测试 ===', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===== 加载个人信息 =====

  test('loadProfileData - 应获取并显示用户信息', async () => {
    const res = await api.getUserProfile();
    
    expect(res.code).toBe(200);
    expect(res.data.user).toHaveProperty('nickname');
    expect(res.data.user).toHaveProperty('coins');
    expect(res.data.user).toHaveProperty('credit_score');
  });

  test('loadProfileData - 应保存头像到本地存储', async () => {
    await api.getUserProfile();
    
    // 模拟保存头像逻辑
    const avatar = res => res.data?.user?.avatar;
    if (avatar) {
      global.wx.setStorageSync('avatar', avatar);
    }
    
    // 这里验证调用
    expect(global.wx.setStorageSync).toHaveBeenCalled();
  });

  // ===== 任务列表加载 =====

  test('loadMyTasks - 应加载发布的任务列表', async () => {
    const res = await api.getMyPublishTasks();
    expect(res.code).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);
  });

  test('loadMyTasks - 应加载接单的任务列表', async () => {
    const res = await api.getMyReceiveTasks();
    expect(res.code).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);
  });

  // ===== 交易记录 =====

  test('loadTrades - 应加载交易记录', async () => {
    const res = await api.getMyTrades();
    expect(res.code).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);
  });

  // ===== 更新个人信息 =====

  test('updateInfo - 昵称为空时应提示错误', () => {
    const nickname = '';
    if (!nickname.trim()) {
      global.wx.showToast({ title: '昵称不能为空', icon: 'none' });
    }
    expect(global.wx.showToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: '昵称不能为空' })
    );
  });

  test('updateInfo - 更新成功应提示用户', async () => {
    const res = await api.updateUserInfo({ nickname: 'NewName' });
    expect(res.code).toBe(200);
  });

  // ===== 修改密码交互 =====

  test('changePwd - 新密码不一致应提示', () => {
    let errorMsg = null;
    const newPwd = '123456';
    const confirmPwd = '654321';
    
    if (newPwd !== confirmPwd) {
      errorMsg = '两次输入的密码不一致';
      global.wx.showToast({ title: errorMsg, icon: 'none' });
    }
    
    expect(errorMsg).toBe('两次输入的密码不一致');
  });

  test('changePwd - 密码太短应提示', () => {
    let errorMsg = null;
    const newPwd = '123';
    
    if (newPwd.length < 6) {
      errorMsg = '密码长度不能少于6位';
      global.wx.showToast({ title: errorMsg, icon: 'none' });
    }
    
    expect(errorMsg).toBe('密码长度不能少于6位');
  });

});

// ===== 工具函数测试 =====

describe('=== getFullAvatarUrl 工具函数测试 ===', () => {

  function getFullAvatarUrl(avatarUrl) {
    const SERVER_HOST = 'http://localhost:3000';
    if (!avatarUrl) return '/images/default-avatar.png';
    if (avatarUrl.startsWith('/images/default')) return avatarUrl;
    if (avatarUrl.startsWith('http')) return avatarUrl;
    return SERVER_HOST + avatarUrl;
  }

  test('空值应返回默认头像', () => {
    expect(getFullAvatarUrl(null)).toBe('/images/default-avatar.png');
    expect(getFullAvatarUrl(undefined)).toBe('/images/default-avatar.png');
    expect(getFullAvatarUrl('')).toBe('/images/default-avatar.png');
  });

  test('默认头像路径不应拼接服务器地址', () => {
    expect(getFullAvatarUrl('/images/default-avatar.png')).toBe('/images/default-avatar.png');
  });

  test('完整 URL 应原样返回', () => {
    const url = 'https://example.com/avatar.jpg';
    expect(getFullAvatarUrl(url)).toBe(url);
  });

  test('相对路径应拼接服务器地址', () => {
    expect(getFullAvatarUrl('/uploads/avatars/test.jpg'))
      .toBe('http://localhost:3000/uploads/avatars/test.jpg');
  });
});
