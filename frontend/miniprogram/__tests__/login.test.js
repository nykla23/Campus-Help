/**
 * 登录页面组件测试
 */
jest.mock('../api/user', () => ({
  login: jest.fn(() => Promise.resolve({ code: 0, data: { token: 't', userId: 1 } })),
  getProfile: jest.fn(() => Promise.resolve({ code: 200, data: { user: {} } }))
}));
jest.mock('../utils/api', () => ({
  downloadAvatar: jest.fn().mockResolvedValue('/images/default-avatar.png'),
  getFullAvatarUrl: (url) => !url ? '/images/default-avatar.png' : (url.startsWith('http') ? url : 'http://localhost:3000' + url)
}));
const { login, getProfile } = require('../api/user');

require('../pages/login/login.ts');

describe('Login Page', () => {
  const page = global.getPageInstance();

  beforeEach(() => {
    jest.clearAllMocks();
    page.setData({ username: '', password: '' });
    login.mockClear();
    getProfile.mockClear();
    wx.showToast.mockClear();
    wx.showLoading.mockClear();
    wx.hideLoading.mockClear();
    wx.setStorageSync.mockClear();
    wx.switchTab.mockClear();
  });

  describe('component render / interaction', () => {

    test('initial data should be empty strings', () => {
      expect(page.data.username).toBe('');
      expect(page.data.password).toBe('');
    });

    test('onInputChange updates username', () => {
      page.onInputChange({ currentTarget: { dataset: { name: 'username' } }, detail: { value: 'testuser' } });
      expect(page.data.username).toBe('testuser');
    });

    test('onInputChange updates password', () => {
      page.onInputChange({ currentTarget: { dataset: { name: 'password' } }, detail: { value: '123456' } });
      expect(page.data.password).toBe('123456');
    });

    test('empty username shows validation toast', async () => {
      page.setData({ username: '', password: '123456' });
      await page.onLogin();
      expect(wx.showToast).toHaveBeenCalledWith({ title: '请填写完整信息', icon: 'none' });
    });

    test('empty password shows validation toast', async () => {
      page.setData({ username: 'test', password: '' });
      await page.onLogin();
      expect(wx.showToast).toHaveBeenCalledWith({ title: '请填写完整信息', icon: 'none' });
    });

    test('toRegister navigates to register page', () => {
      page.toRegister();
      expect(wx.navigateTo).toHaveBeenCalledWith({ url: '/pages/register/register' });
    });
  });

  describe('Mock API tests', () => {

    test('login success - stores token and switches tab', async () => {
      login.mockImplementationOnce(() => Promise.resolve({ code: 0, data: { token: 'abc-123', userId: 1 } }));
      getProfile.mockImplementationOnce(() => Promise.resolve({
        code: 200, data: { user: { avatar: '/uploads/avatar.jpg' } }
      }));

      page.setData({ username: 'admin', password: '123456' });

      await page.onLogin();

      expect(login).toHaveBeenCalledWith({ username: 'admin', password: '123456' });
      expect(wx.setStorageSync).toHaveBeenCalledWith('token', 'abc-123');
    });

    test('login failure - shows error message from server', async () => {
      login.mockImplementationOnce(() => Promise.resolve({ code: -1, message: '用户名或密码错误' }));
      page.setData({ username: 'wrong', password: 'wrong' });
      await page.onLogin();
      expect(wx.showToast).toHaveBeenCalledWith({ title: '用户名或密码错误', icon: 'none' });
    });

    test('login success triggers switch tab', async () => {
      login.mockResolvedValueOnce({ code: 0, data: { token: 'ok', userId: 99 } });
      getProfile.mockResolvedValueOnce({ code: 200, data: { user: { avatar: '' } } });
      page.setData({ username: 'u', password: 'p' });
      page.onLogin();
      // onLogin 使用 void，无法直接 await，等待微任务执行完成
      await new Promise(r => setTimeout(r, 50));
      expect(wx.switchTab).toHaveBeenCalled();
    });
  });
});