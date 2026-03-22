// pages/index/index.ts
Page({

  /**
   * 页面的初始数据
   */
  data: {
    activeTab: 0,
    taskList: [
      {
        id: 1,
        avatar: "/images/avatar-zhangsan.png",
        nickname: "张三",
        credit: 100,
        title: "代买午餐",
        desc: "在食堂帮我带一份红烧肉套餐和一瓶矿泉水到图书馆门口，中午12点半前送达",
        tag: "跑腿代办",
        location: "食堂 → 图书馆",
        coin: 5,
        time: "已截止 2天前",
        status: "待接单"
      },
      {
        id: 2,
        avatar: "/images/avatar-zhangsan.png",
        nickname: "张三",
        credit: 100,
        title: "帮忙取快递",
        desc: "菜鸟驿站，一个快递",
        tag: "快递代取",
        location: "菜鸟驿站 → 5号楼",
        coin: 5,
        time: "已截止 2天前",
        status: "待接单"
      }
    ]
  },

  changeTab(e: WechatMiniprogram.TouchEvent) {
    const index = parseInt(e.currentTarget.dataset.index as string);
    this.setData({ activeTab: index });
  },

  showFilter() {
    wx.showToast({ title: "筛选功能开发中", icon: "none" });
  },

  toTaskDetail(e: WechatMiniprogram.TouchEvent) {
    const id = e.currentTarget.dataset.id as string;
    wx.navigateTo({ url: `/pages/task/task?id=${id}` });
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