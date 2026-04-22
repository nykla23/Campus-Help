/**
 * 聊天页面组件测试
 */
jest.mock('../utils/api', () => ({
  getChatDetail: jest.fn(),
  sendMsgApi: jest.fn(),
  getTaskDetail: jest.fn(),
  getFullAvatarUrl: (url) => !url ? '/images/default-avatar.png' : (url.startsWith('http') ? url : 'http://localhost:3000' + url)
}));
const api = require('../utils/api');
require('../pages/chat/chat.ts');

describe('聊天页面 Chat', () => {
  const page = global.getPageInstance();

  beforeEach(() => {
    jest.clearAllMocks();
    api.sendMsgApi.mockImplementation(() => Promise.resolve({ code: 200, message: 'ok' }));
    api.getChatDetail.mockImplementation(() => Promise.resolve({ code: 200, data: [] }));
    api.getTaskDetail.mockImplementation(() => Promise.resolve({ code: 200, data: {} }));
  });

  describe('组件渲染 / 交互', () => {

    test('onInput 更新输入框', () => {
      page.onInput({ detail: { value: 'hello' } });
      expect(page.data.inputMsg).toBe('hello');
    });

    test('sendMsg 空消息不发送', async () => {
      page.setData({ inputMsg: '' });
      await page.sendMsg();
      expect(api.sendMsgApi).not.toHaveBeenCalled();
    });

    test('formatTimeShort/formatTimeDivider 格式化', () => {
      expect(page.formatTimeShort(new Date(2025, 5, 15, 8, 5))).toBe('08:05');
      expect(page.formatTimeShort(new Date(2025, 5, 15, 2, 3))).toBe('02:03');
      expect(page.formatTimeDivider(new Date())).toBe('今天');

      const yesterday = new Date(Date.now() - 24 * 3600 * 1000);
      expect(page.formatTimeDivider(yesterday)).toBe('昨天');

      const older = new Date(2025, 0, 15);
      expect(page.formatTimeDivider(older)).toBe('1/15');
    });

    test('goBack 调用 navigateBack', () => {
      page.goBack();
      expect(wx.navigateBack).toHaveBeenCalled();
    });
  });

  describe('Mock API 测试', () => {

    test('sendMsg 发送成功清空输入', async () => {
      page.setData({ inputMsg: '测试消息', taskId: '1', targetId: '2' });
      await page.sendMsg();
      expect(api.sendMsgApi).toHaveBeenCalledWith({ toId: '2', taskId: '1', content: '测试消息' });
      expect(page.data.inputMsg).toBe('');
    });

    test('sendMsg 发送失败/异常显示错误', async () => {
      api.sendMsgApi.mockResolvedValueOnce({ code: 500, message: '失败' });
      page.setData({ inputMsg: '消息', taskId: '1', targetId: '2' });
      await page.sendMsg();
      expect(wx.showToast).toHaveBeenCalled();

      api.sendMsgApi.mockRejectedValueOnce(new Error('net'));
      page.setData({ inputMsg: '消息', taskId: '1', targetId: '2' });
      await page.sendMsg();
      expect(wx.showToast).toHaveBeenCalledWith({ title: '发送失败', icon: 'none' });
    });

    test('loadChat 加载成功解析列表', async () => {
      api.getChatDetail.mockResolvedValueOnce({
        code: 200, data: [{ id: 1, from_id: 10, from_avatar: '/a.png', content: '你好', created_at: '2025-06-15T10:00:00' }]
      });
      page.setData({ taskId: '1', targetId: '2', myId: 10, myAvatar: '/me.png', targetAvatar: '/target.png' });
      await page.loadChat();
      expect(page.data.msgList.length).toBe(1);
      expect(page.data.msgList[0].type).toBe('send');
    });

    test('loadChat 加载失败/非200显示错误', async () => {
      api.getChatDetail.mockRejectedValueOnce(new Error('fail'));
      page.setData({ taskId: '1', targetId: '2' });
      await page.loadChat();
      expect(wx.showToast).toHaveBeenCalledWith({ title: '加载失败', icon: 'none' });

      api.getChatDetail.mockResolvedValueOnce({ code: 404, message: '无数据' });
      page.setData({ taskId: '1', targetId: '2' });
      await page.loadChat();
      expect(wx.showToast).toHaveBeenCalled();
    });

    test('loadTaskAndUserInfo 匹配publisher/acceptor', async () => {
      api.getTaskDetail.mockResolvedValueOnce({
        code: 200, data: { id: 1, title: '任务',
          publisher: { id: '99', nickname: '真实昵称', avatar: '/real.png' },
          acceptor: null }
      });
      page.setData({ taskId: '1', targetId: '99', targetName: '原始名称' });
      await page.loadTaskAndUserInfo();
      expect(page.data.targetName).toBe('真实昵称');

      api.getTaskDetail.mockResolvedValueOnce({
        code: 200, data: { id: 1, publisher: { id: '1', nickname: '发布者' }, acceptor: { id: '88', nickname: '接单者' } }
      });
      page.setData({ taskId: '1', targetId: '88', targetName: '旧名' });
      await page.loadTaskAndUserInfo();
      expect(page.data.targetName).toBe('接单者');
    });

    test('loadTaskAndUserInfo 获取失败设默认值', async () => {
      api.getTaskDetail.mockRejectedValueOnce(new Error('err'));
      page.setData({ taskId: '999', targetId: '1', targetName: '聊天' });
      await page.loadTaskAndUserInfo();
      expect(page.data.chatInfo.taskTitle || page.data.chatInfo.nickname).toBeTruthy();
    });
  });
});
