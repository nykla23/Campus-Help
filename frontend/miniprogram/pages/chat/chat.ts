import { getChatDetail, sendMsgApi, getTaskDetail, getFullAvatarUrl } from '../../utils/api';
import { formatChatTimeShort, formatChatTimeDivider } from '../../utils/common';

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
    // 解码并处理头像URL
    const rawTargetAvatar = decodeURIComponent(options.targetAvatar || '');
    const targetAvatar = getFullAvatarUrl(rawTargetAvatar);
    // 从本地存储获取自己的头像
    const storedAvatar = wx.getStorageSync('avatar') || '';
    const myAvatar = storedAvatar.startsWith('http') ? storedAvatar : getFullAvatarUrl(storedAvatar);
    
    this.setData({
      taskId,
      targetId,
      targetName,
      targetAvatar,
      myId: Number(wx.getStorageSync('userId') || 0),
      myAvatar
    });
    console.log('头像信息 - myAvatar:', myAvatar, 'targetAvatar:', targetAvatar);
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

        // 获取对方用户信息 - 优先使用任务详情中的数据（更准确）
        let targetNickname = this.data.targetName;
        let targetAvatar = this.data.targetAvatar;
        
        if (task.publisher.id == this.data.targetId) {
          targetNickname = task.publisher.nickname;
          targetAvatar = task.publisher.avatar;
        } else if (task.acceptor && task.acceptor.id == this.data.targetId) {
          targetNickname = task.acceptor.nickname;
          targetAvatar = task.acceptor.avatar;
        }
        
        if (targetNickname) {
          this.setData({
            targetName: targetNickname,
            targetAvatar: getFullAvatarUrl(targetAvatar),
            'chatInfo.nickname': targetNickname
          });
          wx.setNavigationBarTitle({ title: targetNickname });
        } else {
          this.setData({
            'chatInfo.nickname': this.data.targetName || '聊天'
          });
        }
      } else {
        this.setData({ 'chatInfo.taskTitle': `任务${this.data.taskId}` });
        this.setData({ 'chatInfo.nickname': this.data.targetName || '聊天' });
      }
    } catch (_err) {
      console.error('获取任务信息失败', _err);
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
        const myId = this.data.myId;
        const myAvatar = this.data.myAvatar;
        const targetAvatar = this.data.targetAvatar;
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
          
          // 优先使用后端返回的头像，否则使用初始化时保存的头像
          const isSend = item.from_id == myId;
          const fromAvatar = getFullAvatarUrl(item.from_avatar || '');
          const avatar = isSend 
            ? (fromAvatar !== '/images/default-avatar.png' ? fromAvatar : myAvatar)
            : (fromAvatar !== '/images/default-avatar.png' ? fromAvatar : targetAvatar);
          
          return {
            ...item,
            type: isSend ? 'send' : 'receive',
            avatar: avatar,
            timeShort,
            showTime,
            timeStr,
            created_at: item.created_at
          };
        });
        
        // 更新对方头像（如果之前没有获取到）
        if (list.length > 0) {
          const firstReceive = list.find((m: any) => m.type === 'receive');
          if (firstReceive && firstReceive.avatar !== '/images/default-avatar.png') {
            this.setData({ targetAvatar: firstReceive.avatar });
          }
        }
        
        this.setData({
          msgList: list,
          lastMsgId: 'msg-' + (list[list.length - 1]?.id || ''),
          'chatInfo.nickname': this.data.targetName
        });
      } else {
        wx.showToast({ title: res.message || '加载失败', icon: 'none' });
      }
    } catch (_err) {
      console.error('加载聊天记录失败', _err);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  // 时间格式化 — 使用共享工具函数 (utils/common.ts)
  formatTimeShort(date: Date): string { return formatChatTimeShort(date); },
  formatTimeDivider(date: Date): string { return formatChatTimeDivider(date); },

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
    } catch (_err) {
      wx.showToast({ title: '发送失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  goBack() {
    wx.navigateBack();
  }
});