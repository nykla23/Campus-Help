// app.ts
App<IAppOption>({
  globalData: {
    eventEmitter: null,
  },
  onLaunch() {
    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)
    // 简易事件总线（替代 Node.js events 模块）
    const emitter = {
      _handlers: {},
      on(event, fn) { (this._handlers[event] = this._handlers[event] || []).push(fn); },
      off(event, fn) { this._handlers[event] = (this._handlers[event] || []).filter(h => h !== fn); },
      emit(event, ...args) { (this._handlers[event] || []).forEach(fn => fn(...args)); }
    };
    this.globalData.eventEmitter = emitter;

    const token = wx.getStorageSync('token')
    if (token) {
      console.log('Token exists:', token)
      wx.reLaunch({
        url: '/pages/index/index',
      })
    } else {
      console.log('No token found')
      wx.reLaunch({
        url: '/pages/login/login',
      })  
    }
    // // 登录
    // wx.login({
    //   success: res => {
    //     console.log(res.code)
    //     // 发送 res.code 到后台换取 openId, sessionKey, unionId
    //   },
    // })
  },
})