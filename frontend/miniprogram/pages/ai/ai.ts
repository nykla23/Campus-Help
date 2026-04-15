import { aiChat, getFullAvatarUrl } from '../../utils/api';

interface MsgItem {
  type: 'send' | 'receive';
  content: string;
  time: string;
}

Page({
  data: {
    msgList: [] as MsgItem[],
    inputMsg: '',
    loading: false,
    scrollTop: 0,
    myAvatar: ''
  },

  // 快捷问题
  quickQuestions: [
    '如何发布任务？',
    '如何接取任务？',
    '任务状态说明',
    '金币如何获得？',
    '信用评分规则'
  ],

  onLoad() {
    // 获取我的头像
    const storedAvatar = wx.getStorageSync('avatar') || '';
    const myAvatar = storedAvatar.startsWith('http') ? storedAvatar : getFullAvatarUrl(storedAvatar);
    this.setData({ myAvatar });

    // 添加欢迎消息
    const welcomeMsg: MsgItem = {
      type: 'receive',
      content: '你好！我是校园互助平台的小助手。有什么关于任务发布、接取或其他平台问题，都可以问我哦～',
      time: this.formatTime(new Date())
    };
    this.setData({ msgList: [welcomeMsg] });
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

    // 滚动到底部
    this.scrollToBottom();

    try {
      const res = await aiChat(content);
      
      if (res.code === 200 && res.data) {
        const aiMsg: MsgItem = {
          type: 'receive',
          content: res.data.reply,
          time: this.formatTime(new Date())
        };
        this.setData({
          msgList: [...this.data.msgList, aiMsg],
          loading: false
        });
      } else {
        this.showError(res.message || 'AI 暂时无法回答，请稍后再试');
      }
    } catch (err) {
      console.error('AI 请求失败:', err);
      this.showError('网络异常，请检查网络连接');
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
