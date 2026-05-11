import { getTaskDetail, acceptTask, completeTask, cancelTask, giveUpTask, confirmCompleteTask, getFullAvatarUrl } from '../../utils/api';

const WS_BASE = 'ws://10.234.51.12:3000';

Page({
  data: {
    taskId: '',
    userId: 0,           // 改为数字类型
    task: {
      id: 0,
      title: '',
      description: '',
      reward: 0,
      location: '',
      type: 0,
      typeText: '',
      status: 0,
      statusText: '',
      deadline: '',
      createTime: '',
      publisher: { id: 0, nickname: '', avatar: '', credit: 0 },
      acceptor: null as { id: number; nickname: string; avatar: string; credit: number } | null
    },
    statusBarHeight: 0
  },

    onLoad(options: { id: string }) {
    this.setData({ statusBarHeight: wx.getSystemInfoSync().statusBarHeight });
    const taskId = options.id;
    let userId = wx.getStorageSync('userId');
    userId = Number(userId || 0);
    this.setData({ taskId, userId });
    this.loadTaskDetail();
    // 🔗 建立 WebSocket，实时接收任务状态变更
    this.connectSocket();
  },

  onUnload() {
    if (this.socketTask) {
      this.socketTask.close({});
      this.socketTask = null;
    }
  },

  // 🔗 WebSocket 连接
  connectSocket() {
    const userId = wx.getStorageSync('userId');
    if (!userId) return;

    this.socketTask = wx.connectSocket({
      url: WS_BASE + '/socket.io/?EIO=4&transport=websocket',
      fail: (err) => console.error('[Task Socket] 连接失败:', err)
    });

    this.socketTask.onOpen(() => {
      setTimeout(() => {
        if (this.socketTask) {
          this.socketTask.send({
            data: `42${JSON.stringify(['register', String(userId)])}`
          });
          this.socketTask.send({
            data: `42${JSON.stringify(['joinTask', String(this.data.taskId)])}`
          });
        }
      }, 200);
    });

    this.socketTask.onMessage((res) => {
      try {
        const data = res.data as string;
        if (data.startsWith('42')) {
          const payload = JSON.parse(data.slice(2));
          const eventName = payload[0];
          const eventData = payload[1];

          if (eventName === 'taskUpdate' && String(eventData.taskId) === String(this.data.taskId)) {
            console.log('[Task Socket] 任务状态变更:', eventData);
            this.loadTaskDetail();
            if (eventData.message) {
              wx.showToast({ title: eventData.message, icon: 'none', duration: 3000 });
            }
          }
        } else if (data === '3') {
          if (this.socketTask) {
            this.socketTask.send({ data: '2' });
          }
        }
      } catch (e) {
        console.error('[Task Socket] 消息解析失败:', e);
      }
    });

    this.socketTask.onClose(() => {
      console.log('[Task Socket] 连接关闭');
      this.socketTask = null;
      setTimeout(() => {
        if (!this.socketTask && this.data.taskId) {
          this.connectSocket();
        }
      }, 10000);
    });
  },

  async loadTaskDetail() {
    wx.showLoading({ title: '加载中...' });
    try {
      const res = await getTaskDetail(this.data.taskId);
      if (res.code === 200) {
        const taskData = res.data;
        // 统一转换 ID 类型为数字
        if (taskData.publisher) taskData.publisher.id = Number(taskData.publisher.id);
        if (taskData.acceptor && taskData.acceptor.id) {
          taskData.acceptor.id = Number(taskData.acceptor.id);
        }
        // 处理头像URL
        if (taskData.publisher) taskData.publisher.avatar = getFullAvatarUrl(taskData.publisher.avatar);
        if (taskData.acceptor) taskData.acceptor.avatar = getFullAvatarUrl(taskData.acceptor.avatar);
        // 格式化时间显示
        taskData.deadlineStr = taskData.deadline ? taskData.deadline.substring(0, 16).replace('T', ' ') : '';
        taskData.createTimeStr = taskData.createTime ? taskData.createTime.substring(0, 16).replace('T', ' ') : '';
        this.setData({ task: taskData });
        console.log('task.acceptor:', taskData.acceptor);
        console.log('userId:', this.data.userId);
      } else {
        wx.showToast({ title: res.message, icon: 'none' });
      }
    } catch (err) {
      console.error('加载详情失败:', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  goBack() {
    wx.navigateBack();
  },

  // 私信发布者
  sendMsgPublisher() {
    const { task, userId } = this.data;
    if (task.publisher.id === userId) {
      wx.showToast({ title: '不能给自己发私信', icon: 'none' });
      return;
    }
    wx.navigateTo({
      url: `/pages/chat/chat?taskId=${task.id}&targetId=${task.publisher.id}&targetName=${encodeURIComponent(task.publisher.nickname)}&targetAvatar=${encodeURIComponent(task.publisher.avatar || '')}`
    });
  },

  // 私信接单者（仅发布者可见）
  sendMsgAcceptor() {
    const { task, userId } = this.data;
    if (!task.acceptor || !task.acceptor.id) {
      wx.showToast({ title: '暂无接单者', icon: 'none' });
      return;
    }
    if (task.publisher.id !== userId) {
      wx.showToast({ title: '仅发布者可私信接单者', icon: 'none' });
      return;
    }
    wx.navigateTo({
      url: `/pages/chat/chat?taskId=${task.id}&targetId=${task.acceptor.id}&targetName=${encodeURIComponent(task.acceptor.nickname)}&targetAvatar=${encodeURIComponent(task.acceptor.avatar || '')}`
    });
  },

  // 接单
  async acceptTask() {
    wx.showLoading({ title: '接取中...' });
    try {
      const res = await acceptTask(this.data.taskId);
      if (res.code === 200) {
        wx.hideLoading();
        wx.showToast({ title: '接取成功', icon: 'success' });
        setTimeout(() => this.loadTaskDetail(), 500);
      } else {
      wx.showToast({ title: res.message, icon: 'none' });
    }
  } catch (_err) {
    wx.showToast({ title: '接取失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  // 接单者提交完成（状态 1→2）
  async completeTask() {
    wx.showModal({
      title: '确认完成',
      content: '您已完成任务？提交后将等待发布者确认。',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '提交中...' });
          try {
            const result = await completeTask(this.data.taskId);
            if (result.code === 200) {
              wx.hideLoading();
              wx.showToast({ title: '已提交，等待确认', icon: 'success' });
              setTimeout(() => this.loadTaskDetail(), 500);
            } else {
              wx.showToast({ title: result.message, icon: 'none' });
            }
          } catch (_err) {
            wx.showToast({ title: '操作失败', icon: 'none' });
          } finally {
            wx.hideLoading();
          }
        }
      }
    });
  },

  // 发布者确认完成（状态 2→3）
  async confirmCompleteTask() {
    wx.showModal({
      title: '确认完成',
      content: '确认接单者已完成任务？虚拟币将结算给接单者。',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '确认中...' });
          try {
            const result = await confirmCompleteTask(this.data.taskId);
            if (result.code === 200) {
              wx.hideLoading();
              wx.showToast({ title: '任务已完成', icon: 'success' });
              setTimeout(() => this.loadTaskDetail(), 500);
            } else {
              wx.showToast({ title: result.message, icon: 'none' });
            }
          } catch (_err) {
            wx.showToast({ title: '操作失败', icon: 'none' });
          } finally {
            wx.hideLoading();
          }
        }
      }
    });
  },

  // 发布者取消任务（待接取状态）
  async cancelTask() {
    wx.showModal({
      title: '确认取消',
      content: '确定要取消该任务吗？取消后虚拟币将返还。',
      success: async (modalRes) => {
        if (modalRes.confirm) {
          wx.showLoading({ title: '取消中...' });
          try {
            const res = await cancelTask(this.data.taskId);
            if (res.code === 200) {
              wx.hideLoading();
              wx.showToast({ title: '任务已取消', icon: 'success' });
              setTimeout(() => this.loadTaskDetail(), 500);
            } else {
              wx.showToast({ title: res.message, icon: 'none' });
            }
          } catch (_err) {
            wx.showToast({ title: '操作失败', icon: 'none' });
          } finally {
            wx.hideLoading();
          }
        }
      }
    });
  },

  // 查看他人主页
  viewUserProfile(e: any) {
    const userId = e.currentTarget.dataset.userid;
    if (userId) {
      wx.navigateTo({ url: `/pages/user-profile/user-profile?userId=${userId}` });
    }
  },

  // 接单者放弃任务
  async giveUpTask() {
    wx.showModal({
      title: '确认放弃',
      content: '确定要放弃该任务吗？放弃后任务将恢复待接取状态。',
      success: async (modalRes) => {
        if (modalRes.confirm) {
          wx.showLoading({ title: '放弃中...' });
          try {
            const res = await giveUpTask(this.data.taskId);
            if (res.code === 200) {
              wx.hideLoading();
              wx.showToast({ title: '任务已放弃', icon: 'success' });
              setTimeout(() => this.loadTaskDetail(), 500);
            } else {
              wx.showToast({ title: res.message, icon: 'none' });
            }
          } catch (_err) {
            wx.showToast({ title: '操作失败', icon: 'none' });
          } finally {
            wx.hideLoading();
          }
        }
      }
    });
  }
});