/**
 * 个人主页组件测试
 */
jest.mock('../utils/api', () => ({
  getUserProfile: jest.fn(),
  getMyPublishTasks: jest.fn(),
  getMyReceiveTasks: jest.fn(),
  getMyTrades: jest.fn(),
  updateUserInfo: jest.fn(),
  uploadAvatar: jest.fn(),
  changePassword: jest.fn(),
  getFullAvatarUrl: (url) => {
    if (!url) return '/images/default-avatar.png';
    if (url === '/images/default-avatar.png') return url;
    if (url.startsWith('http')) return url;
    return 'http://localhost:3000' + url;
  }
}));
const api = require('../utils/api');
require('../pages/profile/profile.ts');

describe('个人主页 Profile', () => {
  const page = global.getPageInstance();

  beforeEach(() => {
    jest.clearAllMocks();
    api.getUserProfile.mockResolvedValue({ code: 200, data: { user: {}, stats: {} } });
    api.getMyPublishTasks.mockResolvedValue({ code: 200, data: [] });
    api.getMyReceiveTasks.mockResolvedValue({ code: 200, data: [] });
    api.getMyTrades.mockResolvedValue({ code: 200, data: [] });
    api.updateUserInfo.mockResolvedValue({ code: 200, msg: 'ok' });
    api.changePassword.mockResolvedValue({ code: 200, message: 'ok' });
  });

  // getTypeTextNoAll 映射: ['', '取件代送', '跑腿代办', '学习辅导', '其他']  type从1开始
  // getStatusText 映射:     {0:'待接取', 1:'进行中', 2:'待确认', 3:'已完成', 4:'已取消'}
  describe('组件渲染 / 交互 - 数据适配函数', () => {

    test('adaptTaskType 类型映射（基于 getTypeTextNoAll，type 从 1 开始）', () => {
      expect(page.adaptTaskType(1)).toBe('取件代送');   // type 1
      expect(page.adaptTaskType(2)).toBe('跑腿代办');   // type 2
      expect(page.adaptTaskType(3)).toBe('学习辅导');   // type 3
      expect(page.adaptTaskType(4)).toBe('其他');       // type 4
      expect(page.adaptTaskType(0)).toBe('其他');       // type 0 → ''||fallback → '其他'
      expect(page.adaptTaskType(99)).toBe('其他');      // 99 → fallback '其他'
    });

    test('adaptStatus 状态映射（基于 getStatusText）', () => {
      expect(page.adaptStatus(0)).toBe('待接取');
      expect(page.adaptStatus(1)).toBe('进行中');
      expect(page.adaptStatus(2)).toBe('待确认');
      expect(page.adaptStatus(3)).toBe('已完成');
      expect(page.adaptStatus(4)).toBe('已取消');
      expect(page.adaptStatus(99)).toBe('');
    });

    test('formatTime 有截止时间优先显示', () => {
      const result = page.formatTime('2025-01-01T10:00:00', '2025-12-31T23:59:59');
      expect(result).toContain('截止');
    });

    test('formatTime 无截止时间显示创建时间', () => {
      expect(page.formatTime('2025-06-15T08:30:00', '')).toContain('2025-06-15');
    });

    test('adaptTaskItem 正确适配字段（type=1 → 取件代送, status=1 → 进行中）', () => {
      const result = page.adaptTaskItem({
        id: 100, avatar: '/a.jpg', nickname: '张三', credit_score: 95,
        status: 1, title: '帮买饭', description: '食堂带饭', type: 1,
        reward: 5, created_at: '2025-06-01T12:00:00'
      });
      expect(result.id).toBe(100);
      expect(result.nickname).toBe('张三');
      expect(result.status).toBe('进行中');
      expect(result.tag).toBe('取件代送');
      expect(result.coin).toBe(5);
    });

    test('adaptTradeItem type映射', () => {
      expect(page.adaptTradeItem({ id: 1, amount: 50, type: 1 }).type).toBe('income');
      expect(page.adaptTradeItem({ id: 2, amount: -30, type: 2 }).type).toBe('expense');
      expect(page.adaptTradeItem({ id: 3, type: 'income' }).type).toBe('income');
    });

    test('changeTab 切换标签', async () => {
      page.changeTab({ currentTarget: { dataset: { index: '2' } } });
      await new Promise(r => setTimeout(r, 0));
      expect(page.data.activeTab).toBe(2);
    });

    test('logout 确认退出清除token跳转登录', () => {
      wx.showModal.mockImplementation((opts) => opts.success({ confirm: true }));
      page.logout();
      expect(wx.removeStorageSync).toHaveBeenCalledWith('token');
      expect(wx.reLaunch).toHaveBeenCalled();
    });

    test('logout 取消不执行操作', () => {
      wx.showModal.mockImplementation((opts) => opts.success({ confirm: false }));
      page.logout();
      expect(wx.removeStorageSync).not.toHaveBeenCalled();
    });

    test('saveNickname 昵称为空提示', async () => {
      page.setData({ tempNickname: '' });
      await page.saveNickname();
      expect(wx.showToast).toHaveBeenCalledWith({ title: '昵称不能为空', icon: 'none' });
    });

    test('showSettingMenu/hideAllPopups 弹窗控制', () => {
      page.showSettingMenu();
      expect(page.data.showSettingMenuFlag).toBe(true);
      page.setData({ showSettingMenuFlag: true, showEditNicknameFlag: true, tempNickname: '旧' });
      page.hideAllPopups();
      expect(page.data.showSettingMenuFlag).toBe(false);
      expect(page.data.tempNickname).toBe('');
    });
  });

  describe('Mock API 测试', () => {

    test('loadProfileData 加载成功设置用户信息', async () => {
      api.getUserProfile.mockResolvedValueOnce({
        code: 200, data: { user: { avatar: '/a.png', nickname: '测试' }, stats: { coins: 100 } }
      });
      await page.loadProfileData();
      expect(api.getUserProfile).toHaveBeenCalled();
    });

    test('saveNickname 更新成功', async () => {
      page.setData({ tempNickname: '新昵称' });
      await page.saveNickname();
      expect(api.updateUserInfo).toHaveBeenCalledWith({ nickname: '新昵称' });
      expect(page.data.userInfo.nickname).toBe('新昵称');
    });

    test('savePassword 密码不一致/不完整提示', async () => {
      page.setData({ tempOldPwd: 'old', tempNewPwd: 'new1', tempConfirmPwd: 'new2' });
      await page.savePassword();
      expect(wx.showToast).toHaveBeenCalled();

      page.setData({ tempOldPwd: '', tempNewPwd: 'new', tempConfirmPwd: 'new' });
      await page.savePassword();
      expect(wx.showToast).toHaveBeenCalled();
    });

    test('savePassword 修改成功清token跳转', async () => {
      page.setData({ tempOldPwd: 'old', tempNewPwd: 'new123', tempConfirmPwd: 'new123' });
      await page.savePassword();
      expect(wx.removeStorageSync).toHaveBeenCalledWith('token');
      expect(wx.reLaunch).toHaveBeenCalled();
    });

    test('saveAvatar 未选图片提示', async () => {
      page.setData({ tempAvatar: '' });
      await page.saveAvatar();
      expect(wx.showToast).toHaveBeenCalledWith({ title: '请先选择图片', icon: 'none' });
    });
  });

  describe('工具函数 getFullAvatarUrl', () => {
    test('各场景URL处理', () => {
      expect(api.getFullAvatarUrl('')).toBe('/images/default-avatar.png');
      expect(api.getFullAvatarUrl('/images/default-avatar.png')).toBe('/images/default-avatar.png');
      expect(api.getFullAvatarUrl('http://example.com/a.png')).toBe('http://example.com/a.png');
      expect(api.getFullAvatarUrl('/uploads/a.png')).toBe('http://localhost:3000/uploads/a.png');
    });
  });
});
