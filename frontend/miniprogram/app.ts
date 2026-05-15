// app.ts
const WS_BASE = 'ws://192.168.129.128:3000';

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
      this.connectSocket(); // 全局连接 WebSocket
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

  // 🌐 全局 WebSocket 连接（Socket.IO 协议）
  connectSocket() {
    const userId = wx.getStorageSync('userId');
    if (!userId) return;

    const socketTask = wx.connectSocket({
      url: WS_BASE + '/socket.io/?EIO=4&transport=websocket',
      fail: (err) => console.error('[Global Socket] 连接失败:', err)
    });

    socketTask.onOpen(() => {
      console.log('[Global Socket] 已连接');
      this.globalData.isSocketConnected = true;
      // 等待 Socket.IO 握手完成后注册
      setTimeout(() => {
        socketTask.send({
          data: `42${JSON.stringify(['register', String(userId)])}`
        });
      }, 300);
    });

    socketTask.onMessage((res) => {
      try {
        const data = res.data as string;
        if (data.startsWith('42')) {
          const payload = JSON.parse(data.slice(2));
          const eventName = payload[0];
          const eventData = payload[1];
          // 通过事件总线分发到各页面
          const emitter = this.globalData.eventEmitter;
          if (emitter) {
            emitter.emit(eventName, eventData);
          }
        } else if (data.startsWith('3')) {
          // Socket.IO ping - 回复 pong
          socketTask.send({ data: '2' });
        } else if (data.startsWith('40')) {
          console.log('[Global Socket] 命名空间已就绪');
        } else if (data.startsWith('0')) {
          // Socket.IO 升级或错误
          console.log('[Global Socket] 协议消息:', data);
        }
      } catch (_e) {
        // 忽略非 JSON 消息（如二进制数据）
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