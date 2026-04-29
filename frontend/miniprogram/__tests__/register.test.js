/**
 * 注册页面组件测试
 */
jest.mock('../api/user', () => ({
  register: jest.fn(() => Promise.resolve({ code: 0, data: { token: 't' } }))
}));
const { register } = require('../api/user');

require('../pages/register/register.ts');

describe('Register Page', () => {
  const page = global.getPageInstance();

  beforeEach(() => {
    page.setData({ username: '', nickname: '', password: '', confirmPwd: '' });
    register.mockClear();
    wx.showToast.mockClear();
    wx.showLoading.mockClear();
    wx.hideLoading.mockClear();
    wx.setStorageSync.mockClear();
    wx.redirectTo.mockClear();
  });

  describe('component render / interaction', () => {

    test('initial data should be empty strings', () => {
      expect(page.data.username).toBe('');
      expect(page.data.nickname).toBe('');
      expect(page.data.password).toBe('');
      expect(page.data.confirmPwd).toBe('');
    });

    test('onInputChange updates fields', () => {
      page.onInputChange({ currentTarget: { dataset: { name: 'username' } }, detail: { value: 'newuser' } });
      expect(page.data.username).toBe('newuser');
      page.onInputChange({ currentTarget: { dataset: { name: 'nickname' } }, detail: { value: 'xiaoming' } });
      expect(page.data.nickname).toBe('xiaoming');
    });

    test('incomplete form shows toast', async () => {
      page.setData({ username: '', nickname: 'n', password: 'p', confirmPwd: 'p' });
      await page.onRegister();
      expect(wx.showToast).toHaveBeenCalledWith({ title: '请填写完整信息', icon: 'none' });
    });

    test('password mismatch shows toast', async () => {
      page.setData({ username: 'u', nickname: 'n', password: 'abc', confirmPwd: 'xyz' });
      await page.onRegister();
      expect(wx.showToast).toHaveBeenCalledWith({ title: '两次密码不一致', icon: 'none' });
    });

    test('toLogin navigates to login page', () => {
      page.toLogin();
      expect(wx.navigateTo).toHaveBeenCalledWith({ url: '/pages/login/login' });
    });
  });

  describe('Mock API tests', () => {

    test('register success - store token and redirect', async () => {
      register.mockImplementationOnce(() => Promise.resolve({ code: 0, data: { token: 'reg-token' } }));
      page.setData({ username: 'u1', nickname: 'nick', password: '123456', confirmPwd: '123456' });
      await page.onRegister();
      expect(register).toHaveBeenCalled();
      expect(wx.setStorageSync).toHaveBeenCalledWith('token', 'reg-token');
      expect(wx.redirectTo).toHaveBeenCalled();
    });

    test('register failure - show error message', async () => {
      register.mockImplementationOnce(() => Promise.resolve({ code: -1, message: '用户已存在' }));
      page.setData({ username: 'exist', nickname: 'n', password: '123', confirmPwd: '123' });
      await page.onRegister();
      expect(wx.showToast).toHaveBeenCalledWith({ title: '用户已存在', icon: 'none' });
    });

    test('register network error - show network error toast', async () => {
      register.mockImplementation(() => Promise.reject(new Error('net')));
      page.setData({ username: 'u', nickname: 'n', password: '123', confirmPwd: '123' });
      try { await page.onRegister(); } catch(_e) {}
      await new Promise(r => setTimeout(r, 20));
      expect(wx.showToast).toHaveBeenCalledWith({ title: '网络错误', icon: 'none' });
    });
  });
});
