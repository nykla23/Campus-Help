// pages/register/register.ts
Page({

  /**
   * 页面的初始数据
   */
  data: {
    username: "",
    nickname: "",
    password: "",
    confirmPwd: ""
  },

  onInputChange(e: WechatMiniprogram.InputEvent) {
    const name = e.currentTarget.dataset.name as string;
    this.setData({ [name]: e.detail.value });
  },

  onRegister() {
    const { username, nickname, password, confirmPwd } = this.data;
    if (!username || !nickname || !password || !confirmPwd) {
      wx.showToast({ title: "请填写完整信息", icon: "none" });
      return;
    }
    if (password !== confirmPwd) {
      wx.showToast({ title: "两次密码不一致", icon: "none" });
      return;
    }
    wx.showToast({ title: "注册成功" });
    wx.redirectTo({ url: "/pages/login/login" });
  },

  toLogin() {
    wx.navigateTo({ url: "/pages/login/login" });
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