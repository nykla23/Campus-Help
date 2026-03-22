// pages/publish/publish.ts
Page({

  /**
   * 页面的初始数据
   */
  data: {
    activeType: 0,
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

  submitTask() {
    const { title, desc, coin } = this.data;
    if (!title || !desc || !coin) {
      wx.showToast({ title: "请填写必填项", icon: "none" });
      return;
    }
    wx.showToast({ title: "发布成功" });
    wx.switchTab({ url: "/pages/index/index" });
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