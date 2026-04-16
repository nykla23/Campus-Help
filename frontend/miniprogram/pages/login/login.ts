import { login, getProfile } from '../../api/user';
import { getFullAvatarUrl } from '../../utils/api';

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
        if (res.code === 0) {
          wx.setStorageSync('token', res.data.token);
          wx.setStorageSync('userId', res.data.userId);
          
          // 登录成功后获取头像
          getProfile().then(profileRes => {
            console.log('登录获取头像:', profileRes);
            wx.hideLoading();
            console.log('code:', profileRes.code, 'data:', profileRes.data);
            const user = profileRes.data?.user;
            if (user && user.avatar) {
              const avatar = user.avatar;
              const fullAvatar = getFullAvatarUrl(avatar);
              wx.setStorageSync('avatar', fullAvatar);
              console.log('保存的头像:', fullAvatar);
            } else {
              console.log('没有头像数据');
            }
            wx.showToast({ title: "登录成功" });
            wx.switchTab({ url: "/pages/index/index" });
          }).catch((err) => {
            console.log('获取头像失败:', err);
            wx.hideLoading();
            wx.showToast({ title: "登录成功" });
            wx.switchTab({ url: "/pages/index/index" });
          });
        } else {
          wx.hideLoading();
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