import { getOtherUserInfo, getUserPublishTasks, getFullAvatarUrl, downloadAvatar } from '../../utils/api';
import { getStatusText, getTypeTextNoAll, formatListTime } from '../../utils/common';

Page({
  data: {
    userId: '' as string,
    userInfo: {} as any,
    stats: { credit: 0, finishCount: 0 },
    loading: true,
    isSelf: false,
    taskList: [] as any[]
  },

  onLoad(options: any) {
    const userId = options.userId;
    if (!userId) {
      this.setData({ loading: false });
      wx.showToast({ title: '参数缺失', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }
    const myId = Number(wx.getStorageSync('userId') || 0);
    this.setData({ userId, isSelf: Number(userId) === myId });
    this.loadAllData();
  },

  async loadAllData() {
    this.setData({ loading: true });
    try {
      // 并行加载用户信息和任务列表
      const [userRes, taskRes] = await Promise.all([
        getOtherUserInfo(this.data.userId),
        getUserPublishTasks(this.data.userId)
      ]);

      // 处理用户信息
      if (userRes.code === 200 && userRes.data) {
        const user = userRes.data.user;
        // PC端微信禁止HTTP图片，使用base64加载头像
        const avatarSrc = await downloadAvatar(this.data.userId);
        user.avatar = avatarSrc;
        this.setData({
          userInfo: user,
          stats: userRes.data.stats,
          loading: false
        });
        wx.setNavigationBarTitle({ title: user.nickname + '的主页' });
      } else {
        this.setData({ loading: false });
        wx.showToast({ title: userRes.message || '加载失败', icon: 'none' });
        return;
      }

      // 处理任务列表
      if (taskRes.code === 200 && Array.isArray(taskRes.data)) {
        const list = (taskRes.data as any[]).map(item => ({
          id: item.id,
          title: item.title,
          description: item.description,
          reward: item.reward,
          location: item.location,
          status: item.status,
          statusText: getStatusText(item.status),
          type: item.type,
          typeText: getTypeTextNoAll(item.type),
          timeStr: formatListTime(item.created_at, item.deadline)
        }));
        this.setData({ taskList: list });
      }
    } catch (_err) {
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  toTaskDetail(e: any) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/task/task?id=${id}` });
  },

  goToChat() {
    wx.showModal({
      title: '提示',
      content: '请从任务详情页发起私信',
      showCancel: false
    });
  }
});
