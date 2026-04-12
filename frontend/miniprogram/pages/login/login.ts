import { login } from '../../api/user';

Page({
  data: {
    username: "",
    password: ""
  },

  onInputChange(e: WechatMiniprogram.InputEvent) {
    const name = e.currentTarget.dataset.name as string;
    this.setData({ [name]: e.detail.value });
  },

  onLogin() {
    const { username, password } = this.data;
    if (!username || !password) {
      wx.showToast({ title: "请填写完整信息", icon: "none" });
      return;
    }
    wx.showLoading({ title: '登录中...' });
    login({ username, password })
      .then(res => {
        wx.hideLoading();
        if (res.code === 0) {
          wx.setStorageSync('token', res.data.token);
          wx.setStorageSync('userId', res.data.userId);
          wx.showToast({ title: "登录成功" });
          wx.switchTab({ url: "/pages/index/index" });
        } else {
          wx.showToast({ title: res.message, icon: 'none' });
        }
      })
      .catch(() => {
        wx.hideLoading();
        wx.showToast({ title: "网络错误", icon: "none" });
      });
  },

  toRegister() {
    wx.navigateTo({ url: "/pages/register/register" });
  },
});