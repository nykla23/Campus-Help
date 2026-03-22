// pages/message/message.ts
Page({

  /**
   * 页面的初始数据
   */
  data: {
    msgList: [
      { id: 1, avatar: "/images/lisi.png", nickname: "李四", preview: "好的，我马上去买。", time: "2天前" },
      { id: 2, avatar: "/images/wangwu.png", nickname: "王五", preview: "好的，我马上去取。", time: "2小时前" }
    ]
  },

  toChat(e: WechatMiniprogram.TouchEvent) {
    const id = e.currentTarget.dataset.id as string;
    wx.navigateTo({ url: `/pages/chat/chat?id=${id}` });
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