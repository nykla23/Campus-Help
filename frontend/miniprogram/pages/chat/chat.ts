import { getChatDetail, sendMsgApi, getTaskDetail, getFullAvatarUrl, downloadAvatar, fetchAvatarBase64 } from '../../utils/api';
import { formatChatTimeShort, formatChatTimeDivider } from '../../utils/common';

const app = getApp<IAppOption>();

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
    // 轮询
    _pollTimer: null as any,
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
    const myId = Number(wx.getStorageSync('userId') || 0);
    
    this.setData({
      taskId,
      targetId,
      targetName,
      targetAvatar: '/images/default-avatar.png', // 先使用默认值
      myId,
      myAvatar: '/images/default-avatar.png' // 先使用默认值
    });
    
    // 异步加载双方头像为 base64（每次显示页面时也刷新）
    this.loadAvatars(targetId, myId);
    
    wx.setNavigationBarTitle({ title: targetName || '聊天' });
    this.loadTaskAndUserInfo();
    this.loadChat();

    // 注册全局事件监听
    const emitter = app.globalData.eventEmitter;
    if (emitter) {
      emitter.on('newMessage', this._onNewMessage);
    }

    // 启动轮询（兜底：Socket.IO 未连通时自动拉取新消息）
    this._startPolling();
  },

  // 轮询最新消息（每 3 秒检查一次）
  _startPolling() {
    const timer = setInterval(() => {
      if (!this.data.taskId || !this.data.targetId) return;
      getChatDetail(this.data.taskId, this.data.targetId).then((res) => {
        if (res.code === 200 && Array.isArray(res.data) && res.data.length > 0) {
          const list = this.data.msgList;
          const latest = res.data[res.data.length - 1];
          // 只有确实有新消息才更新，避免覆盖未保存的本地临时消息
          const lastId = list.length > 0 ? (list[list.length - 1].id || 0) : 0;
          if (latest.id > lastId) {
            this.loadChat(false);
          }
        }
      }).catch(() => {});
    }, 3000);
    this.data._pollTimer = timer;
  },

  // 加载双方头像
  async loadAvatars(targetId: string, myId: number) {
    const [myAvatarPath, targetAvatarPath] = await Promise.all([
      downloadAvatar(myId),
      downloadAvatar(targetId)
    ]);
    const updateData: any = {};
    if (myAvatarPath) updateData.myAvatar = myAvatarPath;
    if (targetAvatarPath) updateData.targetAvatar = targetAvatarPath;
    if (Object.keys(updateData).length > 0) {
      this.setData(updateData);
      // 同时更新消息列表中用到的头像
      this._refreshMsgAvatars();
    }
  },

  // 用最新的 myAvatar / targetAvatar 刷新消息列表中的头像
  _refreshMsgAvatars() {
    if (this.data.msgList.length === 0) return;
    const { myAvatar, targetAvatar, myId } = this.data;
    const list = this.data.msgList.map((item: any) => {
      const isSend = String(item.from_id) === String(myId) || item.type === 'send';
      return {
        ...item,
        avatar: isSend ? (myAvatar || '/images/default-avatar.png') : (targetAvatar || '/images/default-avatar.png')
      };
    });
    this.setData({ msgList: list });
  },

  onUnload() {
    // 移除全局事件监听
    const emitter = app.globalData.eventEmitter;
    if (emitter) {
      emitter.off('newMessage', this._onNewMessage);
    }
    // 停止轮询
    if (this.data._pollTimer) {
      clearInterval(this.data._pollTimer);
      this.data._pollTimer = null;
    }
  },

  // 处理新消息事件
  _onNewMessage(msg: any) {
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
      from_id: msg.from_id,
      type: isSend ? 'send' : 'receive',
      content: msg.content,
      avatar: avatar || '/images/default-avatar.png',
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
        this.setData({ 'chatInfo.taskTitle': task.title });
        let targetNickname = this.data.targetName;
        
        if (task.publisher.id == this.data.targetId) {
          targetNickname = task.publisher.nickname;
        } else if (task.acceptor && task.acceptor.id == this.data.targetId) {
          targetNickname = task.acceptor.nickname;
        }
        
        if (targetNickname) {
          this.setData({
            targetName: targetNickname,
            'chatInfo.nickname': targetNickname
          });
          wx.setNavigationBarTitle({ title: targetNickname });
        } else {
          this.setData({ 'chatInfo.nickname': this.data.targetName || '聊天' });
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

  async loadChat(showLoading = true) {
    if (showLoading) wx.showLoading({ title: '加载中...' });
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
          
          const isSend = item.from_id == myId;
          // PC端兼容：始终使用已加载的 base64 头像
          const avatar = isSend
            ? (myAvatar || '/images/default-avatar.png')
            : (targetAvatar || '/images/default-avatar.png');
          
          return {
            id: item.id,
            from_id: item.from_id,
            type: isSend ? 'send' : 'receive',
            content: item.content,
            avatar: avatar,
            timeShort,
            showTime,
            timeStr,
            created_at: item.created_at
          };
        });
        
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

  formatTimeShort(date: Date): string { return formatChatTimeShort(date); },
  formatTimeDivider(date: Date): string { return formatChatTimeDivider(date); },

  onInput(e: any) {
    this.setData({ inputMsg: e.detail.value });
  },

  async sendMsg() {
    const content = this.data.inputMsg.trim();
    if (!content) return;
    
    const _myId = this.data.myId;
    const tempId = Date.now() + Math.random(); // 临时 ID

    // 乐观更新：立即在列表中添加自己发送的消息
    const msgDate = new Date();
    const list = this.data.msgList;
    const lastItem = list[list.length - 1];
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

    list.push({
      id: tempId,
      from_id: _myId,
      type: 'send',
      content: content,
      avatar: this.data.myAvatar || '/images/default-avatar.png',
      timeShort: this.formatTimeShort(msgDate),
      showTime,
      timeStr,
      created_at: msgDate.toISOString(),
      _sending: true  // 标记为发送中
    });

    this.setData({
      msgList: list,
      inputMsg: '',
      lastMsgId: 'msg-' + tempId
    });

    // 发送 HTTP 请求
    try {
      const res = await sendMsgApi({
        toId: this.data.targetId,
        taskId: this.data.taskId,
        content
      });
      if (res.code === 200) {
        // 更新消息 ID（从临时 ID 替换为真实 ID）
        const updatedList = this.data.msgList.map((msg: any) => {
          if (msg.id === tempId) {
            return { ...msg, id: res.data.id, _sending: false };
          }
          return msg;
        });
        this.setData({
          msgList: updatedList,
          lastMsgId: 'msg-' + res.data.id
        });
      } else {
        // 发送失败，标记为失败
        const failedList = this.data.msgList.map((msg: any) => {
          if (msg.id === tempId) {
            return { ...msg, _failed: true, _sending: false };
          }
          return msg;
        });
        this.setData({ msgList: failedList });
        wx.showToast({ title: res.message || '发送失败', icon: 'none' });
      }
    } catch (_err) {
      const failedList = this.data.msgList.map((msg: any) => {
        if (msg.id === tempId) {
          return { ...msg, _failed: true, _sending: false };
        }
        return msg;
      });
      this.setData({ msgList: failedList });
      wx.showToast({ title: '发送失败', icon: 'none' });
    }
  },

  goBack() {
    wx.navigateBack();
  },

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