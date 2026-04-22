/**
 * 任务详情页组件测试
 */
jest.mock('../utils/api', () => ({
  getTaskDetail: jest.fn(),
  acceptTask: jest.fn(),
  completeTask: jest.fn(),
  cancelTask: jest.fn(),
  giveUpTask: jest.fn(),
  confirmCompleteTask: jest.fn(),
  getFullAvatarUrl: (url) => url || '/images/default-avatar.png'
}));
const api = require('../utils/api');

wx.getStorageSync.mockReturnValue('42');
require('../pages/task/task.ts');

describe('Task Detail Page', () => {
  const page = global.getPageInstance();

  const confirmModal = () => { wx.showModal.mockImplementation((o) => o.success({ confirm: true })); };

  beforeEach(() => {
    Object.values(api).forEach(m => typeof m === 'function' && m.mockClear && m.mockClear());
    wx.getStorageSync.mockReturnValue('42');
    wx.showToast.mockClear();
    wx.showLoading.mockClear();
    wx.hideLoading.mockClear();
    api.acceptTask.mockResolvedValue({ code: 200, message: 'ok' });
    api.completeTask.mockResolvedValue({ code: 200, message: 'ok' });
    api.cancelTask.mockResolvedValue({ code: 200, message: 'ok' });
    api.giveUpTask.mockResolvedValue({ code: 200, message: 'ok' });
    api.confirmCompleteTask.mockResolvedValue({ code: 200, message: 'ok' });
  });

  describe('component render / interaction', () => {

    test('sendMsgPublisher cannot send to self', () => {
      page.setData({ task: { publisher: { id: 42 } }, userId: 42 });
      page.sendMsgPublisher();
      expect(wx.showToast).toHaveBeenCalledWith({ title: '不能给自己发私信', icon: 'none' });
    });

    test('sendMsgPublisher normal navigation', () => {
      page.setData({ task: { id: 5, publisher: { id: 99, nickname: '对方', avatar: '/a.png' }, acceptor: null }, userId: 10 });
      page.sendMsgPublisher();
      expect(wx.navigateTo).toHaveBeenCalled();
    });

    test('sendMsgAcceptor no acceptor or not publisher', () => {
      page.setData({ task: { publisher: { id: 42 }, acceptor: null }, userId: 42 });
      page.sendMsgAcceptor();
      expect(wx.showToast).toHaveBeenCalledWith({ title: '暂无接单者', icon: 'none' });

      page.setData({ task: { publisher: { id: 42 }, acceptor: { id: 88 } }, userId: 88 });
      page.sendMsgAcceptor();
      expect(wx.showToast).toHaveBeenCalledWith({ title: '仅发布者可私信接单者', icon: 'none' });
    });
  });

  describe('Mock API tests', () => {

    test('loadTaskDetail success handles response', async () => {
      api.getTaskDetail.mockResolvedValueOnce({
        code: 200,
        data: { id: 1, title: '测试任务', publisher: { id: '1' }, acceptor: null }
      });
      page.setData({ taskId: '1' });
      await page.loadTaskDetail();
      expect(api.getTaskDetail).toHaveBeenCalledWith('1');
      expect(page.data.task.id).toBe(1);
    });

    test('loadTaskDetail non-200 shows error', async () => {
      api.getTaskDetail.mockResolvedValueOnce({ code: 404, message: '任务不存在' });
      page.setData({ taskId: '999' });
      await page.loadTaskDetail();
      expect(wx.showToast).toHaveBeenCalledWith({ title: '任务不存在', icon: 'none' });
    });

    test('acceptTask success and failure', async () => {
      api.acceptTask.mockResolvedValueOnce({ code: 200, message: '接取成功' });
      page.setData({ taskId: '1' });
      await page.acceptTask();
      expect(api.acceptTask).toHaveBeenCalledWith('1');

      api.acceptTask.mockResolvedValueOnce({ code: 400, message: '已被接取' });
      await page.acceptTask();
      expect(wx.showToast).toHaveBeenCalledWith({ title: '已被接取', icon: 'none' });
    });

    test('completeTask success completes task', async () => {
      api.completeTask.mockResolvedValueOnce({ code: 200, message: 'ok' });
      confirmModal(); page.setData({ taskId: '1' }); await page.completeTask();
      expect(api.completeTask).toHaveBeenCalledWith('1');
      expect(wx.showToast).toHaveBeenCalled();
    });

    test('cancelTask cancels successfully', async () => {
      api.cancelTask.mockResolvedValueOnce({ code: 200, message: '已取消' });
      confirmModal(); page.setData({ taskId: '1' }); await page.cancelTask();
      expect(api.cancelTask).toHaveBeenCalledWith('1');
    });

    test('giveUpTask gives up successfully', async () => {
      api.giveUpTask.mockResolvedValueOnce({ code: 200, message: '已放弃' });
      confirmModal(); page.setData({ taskId: '1' }); await page.giveUpTask();
      expect(api.giveUpTask).toHaveBeenCalledWith('1');
    });

    test('confirmCompleteTask confirms completion', async () => {
      api.confirmCompleteTask.mockResolvedValueOnce({ code: 200, message: '已完成' });
      confirmModal(); page.setData({ taskId: '1' }); await page.confirmCompleteTask();
      expect(api.confirmCompleteTask).toHaveBeenCalledWith('1');
      expect(wx.showToast).toHaveBeenCalledWith(expect.objectContaining({ icon: 'success' }));
    });
  });
});
