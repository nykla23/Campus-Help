// app.ts
// @ts-ignore
const config = require('./utils/config');

App<IAppOption>({
  globalData: {
    eventEmitter: null,
    socketTask: null as WechatMiniprogram.SocketTask | null,
    isSocketConnected: false,
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
      this.connectSocket();
      wx.reLaunch({
        url: '/pages/index/index',
      })
    } else {
      console.log('No token found')
      wx.reLaunch({
        url: '/pages/login/login',
      })  
    }
  },

  // 🌐 全局 WebSocket 连接（手动实现 Socket.IO v4 协议）
  connectSocket() {
    const userId = wx.getStorageSync('userId');
    if (!userId) return;

    const socketTask = wx.connectSocket({
      url: config.WS_HOST + '/socket.io/?EIO=4&transport=websocket',
      fail: (err) => console.error('[Global Socket] 连接失败:', err)
    });

    socketTask.onOpen(() => {
      console.log('[Global Socket] 已连接');
      this.globalData.isSocketConnected = true;
    });

    socketTask.onMessage((res) => {
      try {
        const data = res.data as string;
        const type = data.charAt(0);

        if (type === '0') {
          // Socket.IO opening 包：{sid, pingInterval, pingTimeout}
          // 使用 transport=websocket 时，服务端会自动连接 namespace /
          // 无需手动发送 "40"，等收到服务器的 "40" 即可
          console.log('[Global Socket] 握手成功:', data);
        } else if (type === '4' && data.length >= 2 && data.charAt(1) === '0') {
          // 命名空间 / 连接确认："40" 或 "40{...}"
          console.log('[Global Socket] 命名空间就绪，注册用户');
          // 注册用户 ID，服务端绑定 userId ↔ socketId
          socketTask.send({
            data: `42${JSON.stringify(['register', String(userId)])}`
          });
        } else if (data.startsWith('42')) {
          // Socket.IO EVENT 包：42["eventName", data]
          const payload = JSON.parse(data.slice(2));
          const eventName = payload[0];
          const eventData = payload[1];
          const emitter = this.globalData.eventEmitter;
          if (emitter) {
            emitter.emit(eventName, eventData);
          }
        } else if (type === '3') {
          // Socket.IO pong 回复 -> 2 (ping)
          socketTask.send({ data: '2' });
        }
      } catch (_e) {
        // 忽略非 JSON 消息
      }
    });

    socketTask.onError((err) => {
      console.error('[Global Socket] 错误:', err);
      this.globalData.isSocketConnected = false;
    });

    socketTask.onClose(() => {
      console.log('[Global Socket] 连接已关闭');
      this.globalData.isSocketConnected = false;
      // 自动重连
      setTimeout(() => {
        if (!this.globalData.socketTask) {
          this.connectSocket();
        }
      }, 10000);
    });

    this.globalData.socketTask = socketTask;
  },
})