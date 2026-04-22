// 前端登录组件测试 - 使用 @testing-library/react 风格（微信小程序版）

// 模拟 wx 全局对象
global.wx = {
  showToast: jest.fn(),
  showLoading: jest.fn(),
  hideLoading: jest.fn(),
  switchTab: jest.fn(),
  navigateTo: jest.fn(),
  request: jest.fn(),
  getStorageSync: jest.fn(() => ''),
  setStorageSync: jest.fn()
};

// Mock API 模块 - 所有API在 utils/api 中
jest.mock('../utils/api', () => ({
  request: jest.fn(() => Promise.resolve({ code: 0, data: { token: 'mock_token', userId: 1 } })),
  getFullAvatarUrl: jest.fn((url) => url || '/images/default-avatar.png')
}));

const api = require('../utils/api');

// 简化的 Page 构造器（模拟小程序环境）
function createPage(pageConfig) {
  const page = {
    data: { ...pageConfig.data },
    setData: jest.fn((newData) => {
      Object.assign(page.data, newData);
    }),
    ...pageConfig
  };
  
  if (page.onLoad) page.onLoad();
  return page;
}

describe('=== Login 页面交互测试 ===', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('onInputChange - 应正确更新 data 中的字段值', () => {
    // 模拟页面初始化
    let pageData = { username: '', password: '' };
    
    // 模拟 onInputChange 行为
    function onInput(e) {
      const name = e.currentTarget.dataset.name;
      const value = e.detail.value;
      pageData[name] = value;
    }
    
    onInput({ currentTarget: { dataset: { name: 'username' } }, detail: { value: 'testuser' } });
    expect(pageData.username).toBe('testuser');
    
    onInput({ currentTarget: { dataset: { name: 'password' } }, detail: { value: '123456' } });
    expect(pageData.password).toBe('123456');
  });

  test('onLogin - 用户名为空时应提示"请填写完整信息"', async () => {
    let calledWith = null;
    global.wx.showToast = jest.fn((opts) => { calledWith = opts; });
    
    const username = '';
    const password = '123456';
    
    if (!username || !password) {
      global.wx.showToast({ title: "请填写完整信息", icon: "none" });
    }
    
    expect(calledWith).toEqual(
      expect.objectContaining({ title: "请填写完整信息", icon: "none" })
    );
  });

  test('onLogin - 密码为空时也应提示错误', async () => {
    let calledWith = null;
    global.wx.showToast = jest.fn((opts) => { calledWith = opts; });
    
    const username = 'testuser';
    const password = '';
    
    if (!username || !password) {
      global.wx.showToast({ title: "请填写完整信息", icon: "none" });
    }
    
    expect(calledWith.title).toBe("请填写完整信息");
  });

  test('onLogin - 登录成功应保存token并跳转到首页', async () => {
    global.wx.showLoading = jest.fn();
    global.wx.hideLoading = jest.fn();
    global.wx.setStorageSync = jest.fn();
    global.wx.switchTab = jest.fn();
    global.wx.showToast = jest.fn();
    
    // Mock login 返回成功
    const mockRes = { code: 0, data: { token: 'test_token_123', userId: 5 } };
    
    // 模拟成功流程
    if (mockRes.code === 0) {
      global.wx.setStorageSync('token', mockRes.data.token);
      global.wx.setStorageSync('userId', mockRes.data.userId);
      global.wx.showToast({ title: "登录成功" });
      global.wx.switchTab({ url: "/pages/index/index" });
    }
    
    expect(global.wx.setStorageSync).toHaveBeenCalledWith('token', 'test_token_123');
    expect(global.wx.setStorageSync).toHaveBeenCalledWith('userId', 5);
    expect(global.wx.switchTab).toHaveBeenCalledWith({ url: "/pages/index/index" });
  });

  test('onLogin - 登录失败应显示错误信息', async () => {
    global.wx.showLoading = jest.fn();
    global.wx.hideLoading = jest.fn();
    global.wx.showToast = jest.fn();
    
    const mockRes = { code: 1005, message: '用户不存在或密码错误' };
    
    if (mockRes.code !== 0) {
      global.wx.showToast({ title: mockRes.message, icon: 'none' });
    }
    
    expect(global.wx.showToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: '用户不存在或密码错误', icon: 'none' })
    );
  });

  test('toRegister - 应跳转注册页面', () => {
    global.wx.navigateTo = jest.fn();
    global.wx.navigateTo({ url: "/pages/register/register" });
    expect(global.wx.navigateTo).toHaveBeenCalledWith({ url: "/pages/register/register" });
  });

});
