import { getMsgList } from '../../utils/api';

Page({
  data: { msgList: [] },

  onShow() {
    this.loadList();
  },

  async loadList() {
    const res = await getMsgList();
    if (res.code === 200) this.setData({ msgList: res.data });
  },

  toChat(e) {
    const taskId = e.currentTarget.dataset.task;
    const targetId = e.currentTarget.dataset.target;
    wx.navigateTo({
      url: `/pages/chat/chat?taskId=${taskId}&targetId=${targetId}`
    });
  }
});