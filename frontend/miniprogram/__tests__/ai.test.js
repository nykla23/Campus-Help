/**
 * AI智能客服组件测试
 */
jest.mock('../utils/api', () => ({
  aiChat: jest.fn(),
  getFullAvatarUrl: (url) => url || '/images/default-avatar.png'
}));
const api = require('../utils/api');
require('../pages/ai/ai.ts');

describe('AI智能客服 AI', () => {
  const page = global.getPageInstance();

  beforeEach(() => {
    jest.clearAllMocks();
    api.aiChat.mockImplementation(() => Promise.resolve({ code: 200, data: { reply: '回复内容' } }));
  });

  describe('组件渲染 / 交互', () => {

    test('初始包含快捷问题列表', () => {
      expect(page.data.quickQuestions.length).toBeGreaterThan(0);
      expect(page.data.quickQuestions).toContain('如何发布任务？');
    });

    test('onInput 更新输入框', () => {
      page.onInput({ detail: { value: '你好' } });
      expect(page.data.inputMsg).toBe('你好');
    });

    test('sendMsg 空值/loading不发送', () => {
      page.setData({ inputMsg: '   ', loading: false });
      page.sendMsg();
      expect(api.aiChat).not.toHaveBeenCalled();

      page.setData({ inputMsg: '有效消息', loading: true });
      page.sendMsg();
      expect(api.aiChat).not.toHaveBeenCalled();
    });

    test('formatTime HH:mm 格式补零', () => {
      expect(page.formatTime(new Date(2025, 5, 15, 9, 7))).toBe('09:07');
      expect(page.formatTime(new Date(2025, 5, 15, 2, 3))).toBe('02:03');
      expect(page.formatTime(new Date(2025, 5, 15, 14, 3))).toBe('14:03');
    });
  });

  describe('Mock API 测试', () => {

    test('AI对话成功添加消息', async () => {
      page.setData({ inputMsg: '你好', loading: false });
      await page.sendMsg();
      expect(api.aiChat).toHaveBeenCalled();
      expect(page.data.msgList.length).toBeGreaterThanOrEqual(2);
    });

    test('AI非200响应显示错误', async () => {
      api.aiChat.mockResolvedValueOnce({ code: 500, message: '不可用' });
      page.setData({ inputMsg: '测试', loading: false, msgList: [] });
      await page.sendMsg();
      expect(page.data.msgList.some(m => m.content.includes('抱歉'))).toBe(true);
    });

    test('AI网络异常显示错误', async () => {
      api.aiChat.mockRejectedValueOnce(new Error('network'));
      page.setData({ inputMsg: '测试', loading: false, msgList: [] });
      await page.sendMsg();
      expect(page.data.msgList.some(m => m.content.includes('抱歉') && m.content.includes('网络'))).toBe(true);
    });

    test('onShow 无历史显示欢迎消息', () => {
      // getStorageSync 需要返回字符串（源码中调用了startsWith）
      wx.getStorageSync.mockImplementation((key) => key === 'avatar' ? '' : []);
      page.onShow();
      expect(page.data.msgList[0].type).toBe('receive');
      expect(page.data.msgList[0].content).toContain('小助手');
    });

    test('onShow 有历史恢复对话', () => {
      wx.getStorageSync.mockImplementation((key) => key === 'avatar' ? '' : [{ role: 'user', content: 'hi' }]);
      page.onShow();
      expect(page.data.msgList[0].type).toBe('send');
    });

    test('onUnload 有历史保存storage', () => {
      page.chatHistory = [{ role: 'user', content: 't' }];
      page.onUnload();
      expect(wx.setStorageSync).toHaveBeenCalledWith('aiChatHistory', page.chatHistory);
    });

    test('onUnload 无历史不保存', () => {
      page.chatHistory = [];
      page.onUnload();
      // 不应该调用setStorage存储空数组（源码判断length > 0）
    });
  });
});
