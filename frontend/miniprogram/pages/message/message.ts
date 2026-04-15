import { getMsgList, getFullAvatarUrl } from '../../utils/api';

Page({
  data: { msgList: [] as any[] },

  onShow() {
    this.loadList();
  },

  async loadList() {
    wx.showLoading({ title: '加载中...' });
    try {
      const res = await getMsgList();
      console.log('消息列表原始数据:', res);
      if (res.code === 200 && Array.isArray(res.data)) {
        // 确保每个 item 都有 avatar、nickname、preview、time、task_id、user_id
        // avatar: 存储完整URL用于显示，同时保存原始路径用于传递
        const list = res.data.map(item => {
          const fullAvatar = getFullAvatarUrl(item.avatar);
          return {
            id: item.msg_id || item.id,
            user_id: item.user_id,
            nickname: item.nickname || '未知用户',
            avatar: fullAvatar,
            avatarRaw: item.avatar || '',  // 原始路径，用于传递参数
            preview: item.preview || '暂无消息',
            time: item.time || '',
            task_id: item.task_id  // 如果需要跳转时带上任务ID
          };
        });
        this.setData({ msgList: list });
      } else {
        console.warn('消息列表数据异常', res);
        this.setData({ msgList: [] });
        if (res.message) wx.showToast({ title: res.message, icon: 'none' });
      }
    } catch (err) {
      console.error('加载消息列表失败', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  formatTime(timeStr: string) {
    if (!timeStr) return '';
    const date = new Date(timeStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 24 * 3600 * 1000) {
      return `${date.getHours().toString().padStart(2,'0')}:${date.getMinutes().toString().padStart(2,'0')}`;
    }
    return `${date.getMonth()+1}/${date.getDate()}`;
  },

  toChat(e: any) {
    const { task, target, name, avatarraw } = e.currentTarget.dataset;
    // 传递原始路径，聊天页面会统一处理
    wx.navigateTo({
      url: `/pages/chat/chat?taskId=${task}&targetId=${target}&targetName=${encodeURIComponent(name || '')}&targetAvatar=${encodeURIComponent(avatarraw || '')}`
    });
  }
});