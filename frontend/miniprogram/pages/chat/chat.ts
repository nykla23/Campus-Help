import { getChatDetail, sendMsgApi getTaskDetail } from '../../utils/api';

Page({
  data: {
    taskId: '',
    targetId: '',
    targetName: '',
    targetAvatar: '',
    chatInfo: { nickname: '', taskTitle: '' },
    msgList: [],
    inputMsg: '',
    lastMsgId: '',
    myAvatar: '',
    myId: ''
  },

  onLoad(options: any) {
    const taskId = options.taskId;
    const targetId = options.targetId;
    const targetName = decodeURIComponent(options.targetName || '聊天');
    const targetAvatar = options.targetAvatar || '/images/default-avatar.png';
    const taskRes = await getTaskDetail(taskId);
    if (taskRes.code === 200) {
      this.setData({ 'chatInfo.taskTitle': taskRes.data.title });
    }
    this.setData({
      taskId,
      targetId,
      targetName,
      targetAvatar,
      myId: wx.getStorageSync('userId'),
      myAvatar: wx.getStorageSync('avatar') || '/images/default-avatar.png'
    });
    wx.setNavigationBarTitle({ title: targetName });
    this.loadChat();
  },

  // 格式化时间：用于气泡内（小时:分钟）
  formatTimeShort(date: Date): string {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  },

  // 格式化时间：用于分割线（月/日 或 昨天/今天）
  formatTimeDivider(date: Date): string {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.floor((today.getTime() - msgDate.getTime()) / (24*3600*1000));
    if (diffDays === 0) return '今天';
    if (diffDays === 1) return '昨天';
    if (diffDays === 2) return '前天';
    return `${date.getMonth()+1}/${date.getDate()}`;
  },


  // 在 loadChat 中处理消息列表，为每条消息添加 timeShort、timeStr、showTime
  async loadChat() {
    const res = await getChatDetail(this.data.taskId, this.data.targetId);
    if (res.code === 200) {
      let lastTime: Date | null = null;
      const list = res.data.map((item: any, index: number) => {
        const msgDate = new Date(item.created_at);
        const timeShort = this.formatTimeShort(msgDate);
        let showTime = false;
        let timeStr = '';
        // 与上一条消息时间差超过5分钟，或者第一条消息，则显示时间分割线
        if (index === 0 || (lastTime && (msgDate.getTime() - lastTime.getTime()) > 5*60*1000)) {
          showTime = true;
          timeStr = this.formatTimeDivider(msgDate);
        }
        lastTime = msgDate;
        return {
          ...item,
          type: item.from_id == this.data.myId ? 'send' : 'receive',
          avatar: item.from_id == this.data.myId ? this.data.myAvatar : this.data.targetAvatar,
          timeShort,
          showTime,
          timeStr,
          created_at: item.created_at
        };
      });
      this.setData({
        msgList: list,
        lastMsgId: 'msg-' + (list[list.length-1]?.id || '')
      });
    }
  },

  onInput(e) {
    this.setData({ inputMsg: e.detail.value });
  },

  async sendMsg() {
    const content = this.data.inputMsg.trim();
    if (!content) return;

    await sendMsgApi({
      toId: this.data.targetId,
      taskId: this.data.taskId,
      content
    });

    this.setData({ inputMsg: '' });
    this.loadChat();
  },

  goBack() { wx.navigateBack(); }
});