// pages/publish/publish.ts

import { publishTask } from '../../utils/api'; // 引入接口方法

Page({

  /**
   * 页面的初始数据
   */
  data: {
    activeType: 1,
    title: "",
    desc: "",
    coin: "",
    location: "",
    deadline: ""

  },

  goBack() {
    wx.navigateBack();
  },
  
  changeType(e: WechatMiniprogram.TouchEvent) {
    const index = parseInt(e.currentTarget.dataset.index as string);
    this.setData({ activeType: index });
  },

  onInput(e: WechatMiniprogram.InputEvent) {
    const name = e.currentTarget.dataset.name as string;
    this.setData({ [name]: e.detail.value });
  },

  async submitTask() {
    try {
      // 1. 前端参数校验
      const { activeType, title, desc, coin, location, deadline } = this.data;
      if (!title.trim()) {
        wx.showToast({ title: "请填写任务标题", icon: "none" });
        return;
      }
      if (!desc.trim()) {
        wx.showToast({ title: "请填写任务描述", icon: "none" });
        return;
      }
      const rewardNum = Number(coin);
      if (isNaN(rewardNum) || rewardNum <= 0) {
        wx.showToast({ title: "请填写有效的奖励数量", icon: "none" });
        return;
      }

      // 2. 构造请求参数（字段名与后端匹配）
      const requestData = {
        type: activeType,
        title: title.trim(),
        description: desc.trim(),  
        reward: rewardNum,
        ...(location && { location: location.trim() }),
        ...(deadline && { deadline: deadline.trim() })
      };

      // 3. 调用发布接口
      wx.showLoading({ title: '发布中...', mask: true });

      console.log('发送数据:', JSON.stringify(requestData));
      const res = await publishTask(requestData);
      console.log('发布响应:', res);

      // 4. 处理成功响应
      if (res.code === 200) {
        wx.showToast({ title: res.message || "发布成功" });
        setTimeout(() => {
          wx.switchTab({ url: "/pages/index/index" });
        }, 1000);

        // const app = getApp();
        // app.globalData.eventEmitter.emit('taskPublished');

      } else {
        wx.showToast({ title: res.message || "发布失败", icon: "none" });
      }
    } catch (err) {
      console.error("发布任务失败：", err);
      wx.showToast({ title: "发布失败，请稍后重试", icon: "none" });
    } finally {
      wx.hideLoading();
    }
  },
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad() {

  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  }
})