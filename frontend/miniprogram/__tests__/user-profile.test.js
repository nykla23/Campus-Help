/**
 * 他人用户主页组件测试
 */
jest.mock('../utils/api', () => ({
  getOtherUserInfo: jest.fn(),
  getUserPublishTasks: jest.fn(),
  getFullAvatarUrl: (url) => !url ? '/images/default-avatar.png' : (url.startsWith('http') ? url : 'http://localhost:3000' + url)
}));
const api = require('../utils/api');
require('../pages/user-profile/user-profile.ts');

describe('他人主页 UserProfile', () => {
  const page = global.getPageInstance();

  beforeEach(() => {
    jest.clearAllMocks();
    api.getOtherUserInfo.mockResolvedValue({ code: 200, data: { user: { avatar: '', nickname: '路人甲', signature: '' }, stats: { credit: 80, finishCount: 5 } } });
    api.getUserPublishTasks.mockResolvedValue({ code: 200, data: [] });
  });

  describe('加载生命周期 onLoad', () => {

    test('onLoad 无userId参数应提示并返回', () => {
      page.onLoad({});
      expect(wx.showToast).toHaveBeenCalledWith({ title: '参数缺失', icon: 'none' });
      expect(page.data.loading).toBe(false);
      // setTimeout 1.5s 后 navigateBack
      jest.advanceTimersByTime(1500);
      expect(wx.navigateBack).toHaveBeenCalled();
    });

    test('onLoad 有userId应设置字段并加载数据', () => {
      wx.getStorageSync.mockReturnValue('42');
      page.onLoad({ userId: '99' });
      expect(page.data.userId).toBe('99');
      expect(page.data.isSelf).toBe(false);
    });

    test('onLoad 查看自己的主页 isSelf=true', () => {
      wx.getStorageSync.mockReturnValue('5');
      page.onLoad({ userId: '5' });
      expect(page.data.isSelf).toBe(true);
    });
  });

  describe('数据加载 loadAllData', () => {

    test('loadAllData 成功加载用户信息和任务列表', async () => {
      api.getOtherUserInfo.mockResolvedValueOnce({
        code: 200, data: { user: { nickname: '张三', avatar: '/uploads/avatar.jpg' }, stats: { credit: 90, finishCount: 10 } }
      });
      api.getUserPublishTasks.mockResolvedValueOnce({
        code: 200, data: [{ id: 1, title: '任务1', description: '描述', reward: 10, location: 'A栋', status: 1, type: 2, created_at: '2025-06-01T10:00:00' }]
      });
      page.setData({ userId: '99' });
      await page.loadAllData();
      expect(api.getOtherUserInfo).toHaveBeenCalledWith('99');
      expect(api.getUserPublishTasks).toHaveBeenCalledWith('99');
      expect(page.data.userInfo.nickname).toBe('张三');
      expect(page.data.loading).toBe(false);
      expect(page.data.taskList.length).toBe(1);
      expect(page.data.taskList[0].statusText).toBe('进行中');
      expect(page.data.taskList[0].typeText).toBe('跑腿代办');
      expect(wx.setNavigationBarTitle).toHaveBeenCalledWith({ title: '张三的主页' });
    });

    test('loadAllData 用户信息加载失败显示错误', async () => {
      api.getOtherUserInfo.mockResolvedValueOnce({ code: 404, message: '用户不存在' });
      await page.loadAllData();
      expect(wx.showToast).toHaveBeenCalledWith({ title: '用户不存在', icon: 'none' });
      expect(page.data.loading).toBe(false);
    });

    test('loadAllData 无发布任务时 taskList 为空', async () => {
      api.getOtherUserInfo.mockResolvedValueOnce({ code: 200, data: { user: { nickname: '路人', avatar: '' }, stats: {} } });
      api.getUserPublishTasks.mockResolvedValueOnce({ code: 200, data: [] });
      await page.loadAllData();
      expect(page.data.taskList).toEqual([]);
    });

    test('loadAllData 网络异常应显示错误', async () => {
      api.getOtherUserInfo.mockRejectedValueOnce(new Error('net'));
      await page.loadAllData();
      expect(wx.showToast).toHaveBeenCalledWith({ title: '加载失败', icon: 'none' });
      expect(page.data.loading).toBe(false);
    });
  });

  describe('交互功能', () => {

    test('toTaskDetail 跳转到任务详情', () => {
      page.toTaskDetail({ currentTarget: { dataset: { id: '5' } } });
      expect(wx.navigateTo).toHaveBeenCalledWith({ url: '/pages/task/task?id=5' });
    });

    test('goToChat 显示提示信息', () => {
      wx.showModal.mockImplementation((opts) => {});
      page.goToChat();
      expect(wx.showModal).toHaveBeenCalledWith({
        title: '提示',
        content: '请从任务详情页发起私信',
        showCancel: false
      });
    });
  });
});