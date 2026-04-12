import { getTaskDetail, acceptTask, completeTask, cancelTask, giveUpTask } from '../../utils/api';

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

  /**
   * 私信功能：区分私信对象
   * @param type 私信类型：publisher(发布者)/acceptor(接单者)
   * @param targetId 目标用户ID
   */
  sendMsg(type: 'publisher' | 'acceptor', targetId: number) {
    const { task, userId } = this.data;
    const targetUser = type === 'publisher' ? task.publisher : task.acceptor;

    // 权限二次校验（防止前端逻辑被绕过）
    if (targetId == userId) {
      wx.showToast({ title: '不能给自己发私信', icon: 'none' });
      return;
    }

    // 非发布者私信接单者的权限校验（仅发布者可私信接单者）
    if (type === 'acceptor' && task.publisher.id != userId) {
      wx.showToast({ title: '仅发布者可私信接单者', icon: 'none' });
      return;
    }

    // 任务已取消/已完成时，禁止发起新私信（可选）
    if (task.status >= 2) {
      wx.showToast({ title: '任务已结束，无法发送私信', icon: 'none' });
      return;
    }

    // 实际业务中：跳转到私信聊天页，传入目标用户ID和任务ID
    try {
      // 示例：跳转到聊天页面（需自行实现聊天页）
      wx.navigateTo({
        url: `/pages/chat/chat?targetId=${targetId}&taskId=${task.id}&targetName=${targetUser.nickname}`,
        fail: () => {
          wx.showToast({ title: '聊天页面暂未开放', icon: 'none' });
        }
      });
    } catch (err) {
      console.error('跳转私信失败:', err);
      wx.showToast({ title: '私信功能开发中', icon: 'none' });
    }
  },

  // 接单
  async acceptTask() {
    wx.showLoading({ title: '接取中...' });
    try {
      const res = await acceptTask(this.data.taskId);
      if (res.code === 200) {
        wx.showToast({ title: '接取成功', icon: 'success' });
        this.loadTaskDetail(); // 刷新详情
      } else {
        wx.showToast({ title: res.message, icon: 'none' });
      }
    } catch (err) {
      console.error('接取失败:', err);
      wx.showToast({ title: '接取失败', icon: 'none' });
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
  },

  // 取消任务（发布者）
  async cancelTask() {
    wx.showModal({
      title: '确认取消',
      content: '确定要取消该任务吗？取消后虚拟币将返还',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '取消中...' });
          try {
            const res = await cancelTask(this.data.taskId);
            if (res.code === 200) {
              wx.showToast({ title: '任务已取消', icon: 'success' });
              this.loadTaskDetail(); // 刷新详情
            } else {
              wx.showToast({ title: res.message, icon: 'none' });
            }
          } catch (err) {
            console.error('取消任务失败:', err);
            wx.showToast({ title: '操作失败', icon: 'none' });
          } finally {
            wx.hideLoading();
          }
        }
      }
    });
  },

  // 新增：放弃任务（接单者）
  async giveUpTask() {
    wx.showModal({
      title: '确认放弃',
      content: '确定要放弃该任务吗？放弃后任务将恢复待接取状态',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '放弃中...' });
          try {
            const res = await giveUpTask(this.data.taskId);
            if (res.code === 200) {
              wx.showToast({ title: '任务已放弃', icon: 'success' });
              this.loadTaskDetail(); // 刷新详情
            } else {
              wx.showToast({ title: res.message, icon: 'none' });
            }
          } catch (err) {
            console.error('放弃任务失败:', err);
            wx.showToast({ title: '操作失败', icon: 'none' });
          } finally {
            wx.hideLoading();
          }
        }
      }
    });
  }
});