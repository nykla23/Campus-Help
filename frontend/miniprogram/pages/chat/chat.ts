import { getChatDetail, sendMsgApi, getTaskDetail, getFullAvatarUrl } from '../../utils/api';
import { formatChatTimeShort, formatChatTimeDivider } from '../../utils/common';

const WS_BASE = 'ws://10.234.51.12:3000';

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
    myId: 0,
    statusBarHeight: 0,
    // 滑动返回
    touchStartX: 0,
    touchCurrentX: 0,
    isSwipingBack: false
  },

  onLoad(options: any) {
    this.setData({ statusBarHeight: wx.getSystemInfoSync().statusBarHeight });

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
    // 🔗 建立 WebSocket 连接，实现消息实时推送
    this.connectSocket();
  },

  onUnload() {
    // 页面卸载时断开 WebSocket 连接
    if (this.socketTask) {
      this.socketTask.close({});
      this.socketTask = null;
    }
  },

  // 🔗 建立 WebSocket 连接
  connectSocket() {
    const userId = wx.getStorageSync('userId');
    if (!userId) return;

    this.socketTask = wx.connectSocket({
      url: WS_BASE + '/socket.io/?EIO=4&transport=websocket',
      success: () => console.log('[Socket] 连接请求已发送'),
      fail: (err) => console.error('[Socket] 连接失败:', err)
    });

    this.socketTask.onOpen(() => {
      console.log('[Socket] 连接已建立');
      // Socket.IO v4 协议: 发送 42["register","userId"]
      setTimeout(() => {
        if (this.socketTask) {
          this.socketTask.send({
            data: `42${JSON.stringify(['register', String(userId)])}`
          });
        }
      }, 200);
    });

    this.socketTask.onMessage((res) => {
      try {
        const data = res.data as string;
        // 处理 Socket.IO 协议
        if (data.startsWith('42')) {
          // 42["eventName", payload]
          const payload = JSON.parse(data.slice(2));
          const eventName = payload[0];
          const eventData = payload[1];

          if (eventName === 'newMessage') {
            this.handleNewMessage(eventData);
          }
        } else if (data === '40') {
          console.log('[Socket] 命名空间已打开');
        } else if (data === '3') {
          // Socket.IO ping - 回复 pong
          if (this.socketTask) {
            this.socketTask.send({ data: '2' });
          }
        }
      } catch (e) {
        console.error('[Socket] 消息解析失败:', e);
      }
    });

    this.socketTask.onError((err) => {
      console.error('[Socket] 错误:', err);
    });

    this.socketTask.onClose(() => {
      console.log('[Socket] 连接已关闭');
      this.socketTask = null;
      // 自动重连
      setTimeout(() => {
        if (!this.socketTask && this.data.taskId) {
          this.connectSocket();
        }
      }, 10000);
    });
  },

  // 📩 处理实时收到的新消息
  handleNewMessage(msg: any) {
    // 只处理当前聊天相关的消息
    if (String(msg.task_id) !== String(this.data.taskId)) return;
    const isTarget = String(msg.from_id) === String(this.data.targetId);
    const isSelf = String(msg.from_id) === String(this.data.myId);
    if (!isTarget && !isSelf) return;

    const list = this.data.msgList;
    const lastItem = list[list.length - 1];
    // 防止重复添加
    if (lastItem && lastItem.id === msg.id) return;

    const msgDate = new Date(msg.created_at);
    let showTime = false;
    let timeStr = '';
    if (!lastItem) {
      showTime = true;
      timeStr = this.formatTimeDivider(msgDate);
    } else {
      const lastTime = new Date(lastItem.created_at);
      if (msgDate.getTime() - lastTime.getTime() > 5 * 60 * 1000) {
        showTime = true;
        timeStr = this.formatTimeDivider(msgDate);
      }
    }

    const isSend = String(msg.from_id) === String(this.data.myId);
    const avatar = isSend ? this.data.myAvatar : this.data.targetAvatar;

    list.push({
      id: msg.id,
      type: isSend ? 'send' : 'receive',
      content: msg.content,
      avatar: avatar,
      timeShort: this.formatTimeShort(msgDate),
      showTime,
      timeStr,
      created_at: msg.created_at
    });

    this.setData({
      msgList: list,
      lastMsgId: 'msg-' + msg.id
    });

    if (isSend) {
      this.setData({ inputMsg: '' });
    }
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
          
          // 确定消息方向和头像
          const isSend = item.from_id == myId;
          const rawFromAvatar = item.from_avatar || '';
          // 判断是否为有效图片URL（http开头或以/uploads开头）
          const isValidImageUrl = rawFromAvatar && (rawFromAvatar.startsWith('http') || rawFromAvatar.startsWith('/uploads'));
          const fromAvatar = isValidImageUrl ? getFullAvatarUrl(rawFromAvatar) : '';
          const avatar = isSend 
            ? (fromAvatar || myAvatar)
            : (fromAvatar || targetAvatar);
          
          return {
            id: item.id,
            type: isSend ? 'send' : 'receive',
            content: item.content,
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
          lastMsgId: 'msg-' + ((list[list.length - 1] && list[list.length - 1].id) || ''),
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
        // 不再手动 loadChat，WebSocket 会推送新消息回来
        this.setData({ inputMsg: '' });
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
  },

  // 查看对方主页
  viewUserProfile(e: any) {
    const userId = e.currentTarget.dataset.userid;
    if (userId) {
      wx.navigateTo({ url: `/pages/user-profile/user-profile?userId=${userId}` });
    }
  },

  // 滑动返回
  onTouchStart(e: any) {
    this.setData({ touchStartX: e.touches[0].clientX, isSwipingBack: false });
  },
  onTouchMove(e: any) {
    const dx = e.touches[0].clientX - this.data.touchStartX;
    if (dx > 60) {
      this.setData({ touchCurrentX: Math.min(dx, 200), isSwipingBack: true });
    } else {
      this.setData({ touchCurrentX: 0, isSwipingBack: false });
    }
  },
  onTouchEnd() {
    if (this.data.touchCurrentX > 120 && this.data.isSwipingBack) {
      wx.navigateBack();
    } else {
      this.setData({ touchCurrentX: 0, isSwipingBack: false });
    }
  }
});