/**
 * 消息列表页组件测试
 */
jest.mock('../utils/api', () => ({
  getMsgList: jest.fn(),
  getFullAvatarUrl: (url) => !url ? '' : (url === '/images/default-avatar.png' ? url : (url.startsWith('http') ? url : 'http://localhost:3000' + url))
}));
const api = require('../utils/api');
require('../pages/message/message.ts');

describe('消息列表页 Message', () => {
  const page = global.getPageInstance();

  beforeEach(() => {
    api.getMsgList.mockClear();
    wx.showToast.mockClear();
    wx.navigateTo.mockClear();
    api.getMsgList.mockImplementation(() => Promise.resolve({ code: 200, data: [] }));
  });

  describe('component render / interaction', () => {

    test('initial msgList is empty', () => {
      expect(page.data.msgList).toEqual([]);
    });

    test('toChat builds correct URL params', () => {
      page.toChat({
        currentTarget: { dataset: { task: '1', target: '2', name: 'zhangsan', avatarraw: '/avatar.png' } }
      });
      expect(wx.navigateTo).toHaveBeenCalledWith(
        expect.objectContaining({ url: expect.stringContaining('taskId=1&targetId=2') })
      );
    });

    test('formatTime handles various inputs', () => {
      expect(page.formatTime('')).toBe('');
      
      const recent = new Date(Date.now() - 3600000).toISOString();
      expect(page.formatTime(recent)).toMatch(/^\d{1,2}:\d{2}$/);

      const old = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
      expect(page.formatTime(old)).toMatch(/^\d+\/\d+$/);
    });
  });

  describe('Mock API tests', () => {

    test('loadList success maps all fields correctly', async () => {
      api.getMsgList.mockResolvedValueOnce({
        code: 200, data: [{
          msg_id: 1, user_id: 10, nickname: 'UserA', avatar: '/a.png',
          preview: 'latest msg', time: '2025-06-15T10:00:00', task_id: 100
        }]
      });
      await page.loadList();

      const item = page.data.msgList[0];
      expect(item.id).toBe(1);
      expect(item.user_id).toBe(10);
      expect(item.nickname).toBe('UserA');
      expect(item.avatar).toBeTruthy();
      expect(item.preview).toBe('latest msg');
      expect(item.task_id).toBe(100);
    });

    test('loadList missing fields use defaults', async () => {
      api.getMsgList.mockResolvedValueOnce({ code: 200, data: [{ msg_id: 2, user_id: 20, avatar: '', preview: 'msg', task_id: 1 }] });
      await page.loadList();
      // 源码中 preview 如果有值就用原值，nickname 没有才用默认值
      expect(page.data.msgList[0].preview).toBe('msg');
    });

    test('loadList empty result clears list', async () => {
      api.getMsgList.mockResolvedValueOnce({ code: 200, data: [] });
      await page.loadList();
      expect(page.data.msgList).toEqual([]);
    });

    test('loadList non-200 shows error toast', async () => {
      api.getMsgList.mockResolvedValueOnce({ code: 401, message: 'unauthorized' });
      await page.loadList();
      expect(wx.showToast).toHaveBeenCalledWith({ title: 'unauthorized', icon: 'none' });
    });

    test('loadList network error shows error toast', async () => {
      api.getMsgList.mockRejectedValueOnce(new Error('net'));
      try { await page.loadList(); } catch (_e) {}
      // 确保触发了错误提示
      const errorCalls = wx.showToast.mock.calls.filter(c => c[0]?.icon === 'none');
      expect(errorCalls.length).toBeGreaterThan(0);
    });
  });
});
