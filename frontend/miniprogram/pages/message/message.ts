import { getMsgList, downloadAvatar } from '../../utils/api';
import { formatMsgListTime } from '../../utils/common';

Page({
  data: { msgList: [] }, // any[] (MsgListItem[])

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
        const list = res.data.map(item => {
          return {
            id: item.msg_id || item.id,
            user_id: item.user_id,
            nickname: item.nickname || '未知用户',
            avatar: '/images/default-avatar.png', // 先用默认图片占位
            avatarRaw: item.avatar || '',  // 原始路径，用于传递参数
            preview: item.preview || '暂无消息',
            time: item.time || '',
            task_id: item.task_id  // 如果需要跳转时带上任务ID
          };
        });
        this.setData({ msgList: list });

        // PC端兼容：批量加载消息列表中用户的头像
        const userIds = list.map(item => item.user_id).filter(id => id);
        userIds.forEach((userId: string) => {
          downloadAvatar(userId).then(avatarPath => {
            if (avatarPath) {
              const idx = this.data.msgList.findIndex((m: any) => String(m.user_id) === String(userId));
              if (idx !== -1) {
                this.setData({ [`msgList[${idx}].avatar`]: avatarPath });
              }
            }
          });
        });
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

  // 时间格式化 — 使用共享工具函数 (utils/common.ts，与后端 message.js formatTime 保持一致)
  formatTime(timeStr: string) { return formatMsgListTime(timeStr); },

  toChat(e: any) {
    const { task, target, name, avatarraw } = e.currentTarget.dataset;
    // 传递原始路径，聊天页面会统一处理
    wx.navigateTo({
      url: `/pages/chat/chat?taskId=${task}&targetId=${target}&targetName=${encodeURIComponent(name || '')}&targetAvatar=${encodeURIComponent(avatarraw || '')}`
    });
  },

  // 查看他人主页
  viewUserProfile(e: any) {
    const userId = e.currentTarget.dataset.userid;
    if (userId) {
      wx.navigateTo({ url: `/pages/user-profile/user-profile?userId=${userId}` });
    }
  },

  // 阻止事件冒泡（头像点击不触发会话点击）
  stopPropagation() {},
});