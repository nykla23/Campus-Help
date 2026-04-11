import { getTaskDetail, acceptTask, completeTask } from '../../utils/api';

Page({
  data: {
    taskId: '',
    userId: '',
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
      acceptor: { id: 0, nickname: '', avatar: '', credit: 0 }
    }
  },

  onLoad(options: { id: string }) {
    const taskId = options.id;
    const userId = wx.getStorageSync('userId') || '';
    this.setData({ taskId, userId });
    this.loadTaskDetail();
  },

  // 加载任务详情
  async loadTaskDetail() {
    wx.showLoading({ title: '加载中...' });
    try {
      const res = await getTaskDetail(this.data.taskId);
      if (res.code === 200) {
        this.setData({ task: res.data });
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

  // 返回
  goBack() {
    wx.navigateBack();
  },

  // 私信
  sendMsg() {
    wx.showToast({ title: '私信功能开发中', icon: 'none' });
  },

  // 接单
  async acceptTask() {
    wx.showLoading({ title: '接单中...' });
    try {
      const res = await acceptTask(this.data.taskId);
      if (res.code === 200) {
        wx.showToast({ title: '接单成功', icon: 'success' });
        this.loadTaskDetail(); // 刷新详情
      } else {
        wx.showToast({ title: res.message, icon: 'none' });
      }
    } catch (err) {
      console.error('接单失败:', err);
      wx.showToast({ title: '接单失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  // 完成任务
  async completeTask() {
    wx.showModal({
      title: '确认完成',
      content: '确认任务已完成，将结算虚拟币给接单者',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '处理中...' });
          try {
            const completeRes = await completeTask(this.data.taskId);
            if (completeRes.code === 200) {
              wx.showToast({ title: '任务完成', icon: 'success' });
              this.loadTaskDetail(); // 刷新详情
            } else {
              wx.showToast({ title: completeRes.message, icon: 'none' });
            }
          } catch (err) {
            console.error('完成任务失败:', err);
            wx.showToast({ title: '操作失败', icon: 'none' });
          } finally {
            wx.hideLoading();
          }
        }
      }
    });
  }
});