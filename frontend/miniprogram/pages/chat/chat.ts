import { getChatDetail, sendMsgApi, getTaskDetail } from '../../utils/api';

Page({
  data: {
    taskId: '',
    targetId: '',
    targetName: '',
    targetAvatar: '',
    chatInfo: { nickname: '', taskTitle: '' },
    msgList: [] as any[],
    inputMsg: '',
    lastMsgId: '',
    myAvatar: '',
    myId: 0
  },

  onLoad(options: any) {

    console.log('聊天页接收参数:', options);
    console.log('taskId:', options.taskId, 'targetId:', options.targetId);

    const taskId = options.taskId;
    const targetId = options.targetId;
    const targetName = decodeURIComponent(options.targetName || '聊天');
    const targetAvatar = decodeURIComponent(options.targetAvatar || '/images/default-avatar.png');
    this.setData({
      taskId,
      targetId,
      targetName,
      targetAvatar,
      myId: Number(wx.getStorageSync('userId') || 0),
      myAvatar: wx.getStorageSync('avatar') || '/images/default-avatar.png'
    });
    // 先设置默认导航标题，等获取到真实昵称后再更新
    wx.setNavigationBarTitle({ title: targetName || '聊天' });
    this.loadTaskAndUserInfo(); // 获取任务标题和对方信息
    this.loadChat();
  },

  async loadTaskAndUserInfo() {
    try {
      const res = await getTaskDetail(this.data.taskId);
      if (res.code === 200 && res.data) {
        const task = res.data;
        // 设置任务标题
        this.setData({ 'chatInfo.taskTitle': task.title });

        // 获取对方用户信息
        let targetNickname = this.data.targetName;
        let targetAvatar = this.data.targetAvatar;
        if (!targetNickname) {
          if (task.publisher.id == this.data.targetId) {
            targetNickname = task.publisher.nickname;
            targetAvatar = task.publisher.avatar;
          } else if (task.acceptor && task.acceptor.id == this.data.targetId) {
            targetNickname = task.acceptor.nickname;
            targetAvatar = task.acceptor.avatar;
          }
        }
        if (targetNickname) {
          this.setData({
            targetName: targetNickname,
            targetAvatar: targetAvatar || '/images/default-avatar.png',
            'chatInfo.nickname': targetNickname   // 关键：更新顶部昵称
          });
          wx.setNavigationBarTitle({ title: targetNickname });
        } else {
          // 降级：从参数中获取或显示默认
          this.setData({
            'chatInfo.nickname': this.data.targetName || '聊天'
          });
        }
      } else {
        this.setData({ 'chatInfo.taskTitle': `任务${this.data.taskId}` });
        this.setData({ 'chatInfo.nickname': this.data.targetName || '聊天' });
      }
    } catch (err) {
      console.error('获取任务信息失败', err);
      this.setData({ 'chatInfo.taskTitle': `任务${this.data.taskId}` });
      this.setData({ 'chatInfo.nickname': this.data.targetName || '聊天' });
    }
  },

  async loadChat() {
    wx.showLoading({ title: '加载中...' });
    try {
      const res = await getChatDetail(this.data.taskId, this.data.targetId);
      console.log('聊天记录原始响应:', JSON.stringify(res));
      if (res.code === 200 && Array.isArray(res.data)) {
        let lastTime: Date | null = null;
        const list = res.data.map((item: any, index: number) => {
          const msgDate = new Date(item.created_at);
          const timeShort = this.formatTimeShort(msgDate);
          let showTime = false;
          let timeStr = '';
          if (index === 0 || (lastTime && (msgDate.getTime() - lastTime.getTime()) > 5 * 60 * 1000)) {
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
          lastMsgId: 'msg-' + (list[list.length - 1]?.id || ''),
          'chatInfo.nickname': this.data.targetName
        });
      } else {
        wx.showToast({ title: res.message || '加载失败', icon: 'none' });
      }
    } catch (err) {
      console.error('加载聊天记录失败', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  formatTimeShort(date: Date): string {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  },

  formatTimeDivider(date: Date): string {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.floor((today.getTime() - msgDate.getTime()) / (24 * 3600 * 1000));
    if (diffDays === 0) return '今天';
    if (diffDays === 1) return '昨天';
    if (diffDays === 2) return '前天';
    return `${date.getMonth() + 1}/${date.getDate()}`;
  },

  onInput(e: any) {
    this.setData({ inputMsg: e.detail.value });
  },

  async sendMsg() {
    const content = this.data.inputMsg.trim();
    if (!content) return;
    wx.showLoading({ title: '发送中...' });
    try {
      const res = await sendMsgApi({
        toId: this.data.targetId,
        taskId: this.data.taskId,
        content
      });
      if (res.code === 200) {
        this.setData({ inputMsg: '' });
        this.loadChat(); // 重新加载消息列表
      } else {
        wx.showToast({ title: res.message || '发送失败', icon: 'none' });
      }
    } catch (err) {
      wx.showToast({ title: '发送失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  goBack() {
    wx.navigateBack();
  }
});