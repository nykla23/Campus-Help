import { aiChat, getFullAvatarUrl } from '../../utils/api';

interface MsgItem {
  type: 'send' | 'receive';
  content: string;
  time: string;
}

interface ChatHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

Page({
  data: {
    msgList: [] as MsgItem[],
    inputMsg: '',
    loading: false,
    scrollTop: 0,
    myAvatar: '',
    quickQuestions: [
      '如何发布任务？',
      '如何接取任务？',
      '任务状态说明',
      '金币如何获得？',
      '信用评分规则'
    ]
  },

  // 对话历史（用于 AI 上下文）
  chatHistory: [] as ChatHistoryItem[],

  onLoad() {
    // 获取我的头像
    const storedAvatar = wx.getStorageSync('avatar') || '';
    const myAvatar = storedAvatar.startsWith('http') ? storedAvatar : getFullAvatarUrl(storedAvatar);
    this.setData({ myAvatar });

    // 从本地存储读取对话历史
    const savedHistory = wx.getStorageSync('aiChatHistory') || [];
    this.chatHistory = savedHistory;

    // 恢复消息列表
    if (savedHistory.length > 0) {
      // 根据历史重建消息列表
      const msgList: MsgItem[] = [];
      savedHistory.forEach((item: ChatHistoryItem) => {
        msgList.push({
          type: item.role === 'user' ? 'send' : 'receive',
          content: item.content,
          time: ''
        });
      });
      this.setData({ msgList });
    } else {
      // 添加欢迎消息
      const welcomeMsg: MsgItem = {
        type: 'receive',
        content: '你好！我是校园互助平台的小助手。有什么关于任务发布、接取或其他平台问题，都可以问我哦～',
        time: this.formatTime(new Date())
      };
      this.setData({ msgList: [welcomeMsg] });
    }
  },

  onUnload() {
    // 退出时保存对话历史到本地
    if (this.chatHistory.length > 0) {
      wx.setStorageSync('aiChatHistory', this.chatHistory);
    }
  },

  onInput(e: any) {
    this.setData({ inputMsg: e.detail.value });
  },

  // 点击快捷问题
  askQuickQuestion(e: any) {
    const question = e.currentTarget.dataset.question;
    this.setData({ inputMsg: question }, () => {
      this.sendMsg();
    });
  },

  async sendMsg() {
    const content = this.data.inputMsg.trim();
    if (!content || this.data.loading) return;

    // 添加用户消息
    const userMsg: MsgItem = {
      type: 'send',
      content,
      time: this.formatTime(new Date())
    };

    const msgList = [...this.data.msgList, userMsg];
    this.setData({
      msgList,
      inputMsg: '',
      loading: true
    });

    // 添加到对话历史
    this.chatHistory.push({ role: 'user', content });

    // 滚动到底部
    this.scrollToBottom();

    try {
      const res = await aiChat(content, this.chatHistory);
      
      if (res.code === 200 && res.data) {
        const aiMsg: MsgItem = {
          type: 'receive',
          content: res.data.reply,
          time: this.formatTime(new Date())
        };
        
        // 添加到对话历史
        this.chatHistory.push({ role: 'assistant', content: res.data.reply });
        
        this.setData({
          msgList: [...this.data.msgList, aiMsg],
          loading: false
        });

        // 实时保存历史
        wx.setStorageSync('aiChatHistory', this.chatHistory);
      } else {
        this.showError(res.message || 'AI 暂时无法回答，请稍后再试');
        this.chatHistory.pop();
      }
    } catch (err) {
      console.error('AI 请求失败:', err);
      this.showError('网络异常，请检查网络连接');
      this.chatHistory.pop();
    }

    this.scrollToBottom();
  },

  showError(msg: string) {
    const errorMsg: MsgItem = {
      type: 'receive',
      content: `抱歉，${msg}`,
      time: this.formatTime(new Date())
    };
    this.setData({
      msgList: [...this.data.msgList, errorMsg],
      loading: false
    });
  },

  scrollToBottom() {
    setTimeout(() => {
      this.setData({ scrollTop: 99999 });
    }, 100);
  },

  formatTime(date: Date): string {
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  },

  goBack() {
    wx.navigateBack();
  }
});
