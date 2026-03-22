// pages/chat/chat.ts
Page({

  /**
   * 页面的初始数据
   */
  data: {
    chatInfo: { nickname: "李四", taskTitle: "代买午餐" },
    msgList: [
      { id: 1, type: "receive", avatar: "/images/avatar-lisi.png", content: "你好，我可以帮你买午餐" },
      { id: 2, type: "send", avatar: "/images/avatar-zhangsan.png", content: "太好了，麻烦你了，红烧肉在二楼" },
      { id: 3, type: "receive", avatar: "/images/avatar-lisi.png", content: "好的，我马上去买" }
    ],
    inputMsg: "",
    lastMsgId: "msg-3"

  },

  goBack() {
    wx.navigateBack();
  },

  onInput(e: WechatMiniprogram.InputEvent) {
    this.setData({ inputMsg: e.detail.value });
  },

  sendMsg() {
    if (!this.data.inputMsg) return;
    const newId = this.data.msgList.length + 1;
    const newMsg = {
      id: newId,
      type: "send",
      avatar: "/images/avatar-zhangsan.png",
      content: this.data.inputMsg
    };
    this.setData({
      msgList: [...this.data.msgList, newMsg],
      inputMsg: "",
      lastMsgId: `msg-${newId}`
    });
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