import { register } from '../../api/user';

Page({
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
    wx.showLoading({ title: '注册中...' });
    register({
      username,
      password,
      confirmPassword: confirmPwd,
      nickname
    })
      .then(res => {
        wx.hideLoading();
        if (res.code === 0) {
          wx.setStorageSync('token', res.data.token);
          wx.showToast({ title: '注册成功' });
          wx.redirectTo({ url: "/pages/login/login" });
        } else {
          wx.showToast({ title: res.message, icon: 'none' });
        }
      })
      .catch(() => {
        wx.hideLoading();
        wx.showToast({ title: "网络错误", icon: "none" });
      });
  },

  toLogin() {
    wx.navigateTo({ url: "/pages/login/login" });
  },
});