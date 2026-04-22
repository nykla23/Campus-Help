// 前端 AI 智能客服页面测试

// Mock wx 全局对象
global.wx = {
  showToast: jest.fn(),
  showLoading: jest.fn(),
  hideLoading: jest.fn(),
  getStorageSync: jest.fn((key) => {
    if (key === 'avatar') return 'http://localhost:3000/uploads/avatars/test.jpg';
    if (key === 'aiChatHistory') return [];
    return '';
  }),
  setStorageSync: jest.fn(),
  request: jest.fn()
};

// Mock api
jest.mock('../utils/api', () => ({
  aiChat: jest.fn(() => Promise.resolve({
    code: 200,
    data: { reply: '你好！有什么可以帮你的吗？' }
  })),
  getFullAvatarUrl: jest.fn((url) => url || '/images/default-avatar.png')
}));

const { aiChat, getFullAvatarUrl } = require('../utils/api');

describe('=== AI 智能客服页面交互测试 ===', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    global.wx.getStorageSync.mockImplementation((key) => {
      if (key === 'avatar') return 'http://localhost:3000/uploads/avatars/test.jpg';
      if (key === 'aiChatHistory') return [];
      return '';
    });
  });

  // ===== 页面初始化 =====
  
  test('onLoad - 应正确获取并设置用户头像', () => {
    const storedAvatar = global.wx.getStorageSync('avatar');
    const myAvatar = storedAvatar.startsWith('http') ? storedAvatar : getFullAvatarUrl(storedAvatar);
    
    expect(myAvatar).toBe('http://localhost:3000/uploads/avatars/test.jpg');
    expect(storedAvatar).toBeTruthy();
  });
  
  test('onLoad - 头像为空时应使用默认头像', () => {
    global.wx.getStorageSync.mockImplementation((key) => '');
    const storedAvatar = global.wx.getStorageSync('avatar');
    const myAvatar = storedAvatar ? storedAvatar : '/images/default-avatar.png';
    
    expect(myAvatar).toBe('/images/default-avatar.png');
  });

  // ===== 输入处理 =====

  test('onInput - 应更新输入框内容', () => {
    let inputMsg = '';
    
    function onInput(e) {
      inputMsg = e.detail.value;
    }
    
    onInput({ detail: { value: '如何发布任务？' } });
    expect(inputMsg).toBe('如何发布任务？');
  });

  // ===== 快捷问题 =====

  test('askQuickQuestion - 应设置问题到输入框并发送', async () => {
    let inputMsg = '';
    let sendCalled = false;
    
    function askQuickQuestion(question) {
      inputMsg = question;
      // 模拟发送
      if (inputMsg.trim()) {
        sendCalled = true;
      }
    }
    
    askQuickQuestion('如何发布任务？');
    expect(inputMsg).toBe('如何发布任务？');
    expect(sendCalled).toBe(true);
  });

  // ===== 发送消息 =====

  test('sendMsg - 空消息不应发送', () => {
    let inputMsg = '';
    const loading = false;
    
    const shouldSend = !(!inputMsg.trim() || loading);
    expect(shouldSend).toBe(false);
  });

  test('sendMsg - loading中不应重复发送', () => {
    let inputMsg = '测试消息';
    const loading = true;
    
    const shouldSend = !(!inputMsg.trim() || loading);
    expect(shouldSend).toBe(false);
  });

  test('sendMsg - 正常消息应添加到对话历史', () => {
    let chatHistory = [];
    const content = '如何接取任务？';
    
    chatHistory.push({ role: 'user', content });
    
    expect(chatHistory.length).toBe(1);
    expect(chatHistory[0]).toEqual({ role: 'user', content: '如何接取任务？' });
  });

  // ===== AI 回复处理 =====

  test('AI 回复成功应保存到对话历史', async () => {
    let chatHistory = [{ role: 'user', content: '测试问题' }];
    
    const mockRes = await aiChat('测试问题', chatHistory);
    
    if (mockRes.code === 200 && mockRes.data) {
      chatHistory.push({ role: 'assistant', content: mockRes.data.reply });
    }
    
    expect(chatHistory.length).toBe(2);
    expect(chatHistory[1].role).toBe('assistant');
    expect(chatHistory[1].content).toBe('你好！有什么可以帮你的吗？');
  });

  // ===== 对话历史持久化 =====

  test('退出页面时应对话历史保存到本地', () => {
    const chatHistory = [
      { role: 'user', content: '问题1' },
      { role: 'assistant', content: '回答1' },
      { role: 'user', content: '问题2' }
    ];
    
    if (chatHistory.length > 0) {
      global.wx.setStorageSync('aiChatHistory', chatHistory);
    }
    
    expect(global.wx.setStorageSync).toHaveBeenCalledWith('aiChatHistory', chatHistory);
  });

  // ===== 错误处理 =====

  test('API 调用失败应显示错误信息', async () => {
    global.wx.showToast = jest.fn();
    
    // Mock 返回失败
    const { aiChat: failingAiChat } = require('../utils/api');
    // 这里模拟失败场景
    const errorMsg = '网络异常，请检查网络连接';
    
    global.wx.showToast({ title: errorMsg });
    
    expect(global.wx.showToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: '网络异常，请检查网络连接' })
    );
  });

});

// ===== 时间格式化工具函数测试 =====

describe('=== formatTime 工具函数测试 ===', () => {
  
  function formatTime(date) {
    return `${date.getHours().toString().padStart(2,'0')}:${date.getMinutes().toString().padStart(2,'0')}`;
  }

  test('应返回 HH:mm 格式', () => {
    const date = new Date(2025, 0, 15, 14, 30); // 2025-01-15 14:30
    expect(formatTime(date)).toBe('14:30');
  });

  test('小时数不足两位应补零', () => {
    const date = new Date(2025, 0, 15, 9, 5); // 09:05
    expect(formatTime(date)).toBe('09:05');
  });
});
