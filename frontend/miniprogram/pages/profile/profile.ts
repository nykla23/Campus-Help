// pages/profile/profile.ts
Page({

  /**
   * 页面的初始数据
   */
  data: {
    activeTab: 0,
    publishList: [
      { id: 1, avatar: "/images/avatar-zhangsan.png", nickname: "张三", credit: 100, title: "帮忙取快递", desc: "菜鸟驿站，一个快递", tag: "快递代取", location: "菜鸟驿站 → 5号楼", coin: 5, time: "已截止 2天前", status: "待接单" },
      { id: 2, avatar: "/images/avatar-zhangsan.png", nickname: "张三", credit: 100, title: "帮忙打印资料", desc: "需要帮忙打印50页A4资料，黑白单面", tag: "跑腿代办", location: "南门打印店 → 3号楼", coin: 5, time: "已截止 2天前", status: "待接单" }
    ],
    acceptList: [
      { id: 3, avatar: "/images/avatar-lisi.png", nickname: "李四", credit: 100, title: "帮忙取快递", desc: "菜鸟驿站，一个快递", tag: "快递代取", location: "菜鸟驿站 → 10号楼", coin: 5, time: "已截止 2天前", status: "进行中" }
    ],
    tradeList: [
      { id: 1, title: "完成任务：英语口语练习", time: "3/11 12:00", amount: "+10", type: "income" },
      { id: 2, title: "发布任务：帮忙取快递", time: "3/11 18:30", amount: "-5", type: "expense" }
    ]

  },

  changeTab(e: WechatMiniprogram.TouchEvent) {
    const index = parseInt(e.currentTarget.dataset.index as string);
    this.setData({ activeTab: index });
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