// pages/profile/profile.ts

import {
  getUserProfile,
  getMyPublishTasks,
  getMyReceiveTasks,
  getMyTrades,
  updateUserInfo,
  uploadAvatar,
  changePassword,
  getFullAvatarUrl,
  downloadAvatar,
  fetchAvatarBase64,
  preloadAvatars
} from '../../utils/api';
import { getStatusText, getTypeTextNoAll, formatListTime } from '../../utils/common';

Page({
  data: {
    // 用户信息
    userInfo: {
      avatar: '',
      nickname: '',
      signature: '',
      coins: 0,
      credit: 0
    },
    // 统计数据
    stats: {
      coins: 0,
      credit: 0,
      finishCount: 0
    },
    // 标签切换
    activeTab: 0,
    // 任务列表（适配后的数据）
    publishList: [],
    acceptList: [],
    // 交易列表（适配后的数据）
    tradeList: [],

    // 新增：弹窗控制
    showSettingMenuFlag: false, // 设置菜单弹窗
    showEditNicknameFlag: false, // 修改昵称弹窗
    showEditSignatureFlag: false, // 修改签名弹窗
    showEditAvatarFlag: false, // 修改头像弹窗

    // 新增：临时存储修改的内容
    tempNickname: '',
    tempSignature: '',
    tempAvatar: '',

    showChangePasswordFlag: false,
    tempOldPwd: '',
    tempNewPwd: '',
    tempConfirmPwd: '',
  },

  onLoad() {
    this.loadProfileData();
  },

  onShow() {
    // 每次进入页面刷新数据
    this.loadProfileData();
  },

  // ========== 数据适配函数（使用共享工具函数 utils/common.ts）==========
  // 类型映射（数字 -> 中文，不含"全部"）
  adaptTaskType(type: number): string { return getTypeTextNoAll(type); },
  // 状态映射（数字 -> 中文）
  adaptStatus(status: number): string { return getStatusText(status); },
  // 时间格式化
  formatTime(create: string, deadline: string): string { return formatListTime(create, deadline); },

  // 单个任务数据适配（后端字段 -> 前端卡片字段）
  adaptTaskItem(item: any): any {
    return {
      id: item.id,
      userId: item.publisher_id,       // 发布者ID，用于加载base64头像
      avatar: '/images/default-avatar.png', // 先用默认头像占位
      nickname: item.nickname || '匿名用户',
      credit: item.credit_score || 0,
      status: this.adaptStatus(item.status),
      title: item.title,
      desc: item.description,
      tag: this.adaptTaskType(item.type),
      location: item.location,
      coin: item.reward,
      time: this.formatTime(item.created_at, item.deadline)
    };
  },

  // 批量加载任务列表头像，返回填充好头像的新数组
  async _resolveTaskAvatars(taskList: any[]): Promise<any[]> {
    const userIds = taskList
      .map(item => item.userId)
      .filter(id => id !== undefined && id !== null);
    if (userIds.length === 0) return taskList;

    // 批量预加载
    await preloadAvatars(userIds);
    
    // 逐个替换头像
    for (const item of taskList) {
      if (!item.userId) continue;
      const avatarPath = await downloadAvatar(item.userId);
      if (avatarPath) {
        item.avatar = avatarPath;
      }
    }
    return taskList;
  },

  // 交易记录适配
  adaptTradeItem(item: any): any {
    const typeStr = typeof item.type === 'number'
      ? (item.type === 1 ? 'income' : 'expense')
      : item.type;
    return {
      id: item.id,
      title: item.description || item.title || '交易',
      time: item.created_at ? item.created_at.substring(0, 16).replace('T', ' ') : (item.time || ''),
      type: typeStr,
      amount: Math.abs(item.amount)
    };
  },

  // ========== 数据加载 ==========
  async loadProfileData() {
    wx.showLoading({ title: '加载中...' });
    try {
      // 1. 个人信息 + 统计
      const profileRes = await getUserProfile();
      console.log('profileRes:', profileRes);
      if (profileRes.code === 200) {
        const userData = profileRes.data.user;
        // PC端兼容：用base64加载自己的头像
        const avatarSrc = await fetchAvatarBase64(userData.id || wx.getStorageSync('userId'));
        userData.avatar = avatarSrc;
        this.setData({
          userInfo: userData,
          stats: profileRes.data.stats
        });
        // 同步存储头像到本地（base64），其他页面可共用
        wx.setStorageSync('avatar', avatarSrc);
      }

      // 2. 我发布的任务（适配后 + 批量加载头像 base64）
      const publishRes = await getMyPublishTasks();
      if (publishRes.code === 200) {
        const adapted = publishRes.data.map((item: any) => this.adaptTaskItem(item));
        const resolved = await this._resolveTaskAvatars(adapted);
        this.setData({ publishList: resolved });
      }

      // 3. 我接单的任务（适配后 + 批量加载头像 base64）
      const acceptRes = await getMyReceiveTasks();
      if (acceptRes.code === 200) {
        const adapted = acceptRes.data.map((item: any) => this.adaptTaskItem(item));
        const resolved = await this._resolveTaskAvatars(adapted);
        this.setData({ acceptList: resolved });
      }

      // 4. 交易记录（适配后）
      const tradeRes = await getMyTrades();
      if (tradeRes.code === 200) {
        const adapted = tradeRes.data.map((item: any) => this.adaptTradeItem(item));
        this.setData({ tradeList: adapted });
      }
    } catch (err) {
      console.error('加载个人主页失败:', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  // 切换标签
  changeTab(e: WechatMiniprogram.TouchEvent) {
    const index = Number(e.currentTarget.dataset.index);
    this.setData({ activeTab: index });
  },

  // 跳转到任务详情
  toTaskDetail(e: WechatMiniprogram.TouchEvent) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/task/task?id=${id}` });
  },

  // 跳转到设置页（在个人主页内切换弹窗）
  toSetting() {
    this.showSettingMenu();
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('token');
          wx.reLaunch({ url: '/pages/login/login' });
        }
      }
    });
  },

  // ========== 弹窗交互逻辑 ==========
  showSettingMenu() {
    this.setData({ showSettingMenuFlag: true });
  },
  hideSettingMenu() {
    this.setData({ showSettingMenuFlag: false });
  },
  hideAllPopups() {
    this.setData({
      showSettingMenuFlag: false,
      showEditNicknameFlag: false,
      showEditSignatureFlag: false,
      showEditAvatarFlag: false,
      showChangePasswordFlag: false,
      tempNickname: '',
      tempSignature: '',
      tempAvatar: '',
      tempOldPwd: '',
      tempNewPwd: '',
      tempConfirmPwd: ''
    });
  },

  showEditNickname() {
    this.setData({ showSettingMenuFlag: false, showEditNicknameFlag: true });
  },
  inputNickname(e: WechatMiniprogram.InputEvent) {
    this.setData({ tempNickname: e.detail.value });
  },
  async saveNickname() {
    if (!this.data.tempNickname) {
      wx.showToast({ title: '昵称不能为空', icon: 'none' });
      return;
    }
    try {
      const res = await updateUserInfo({ nickname: this.data.tempNickname });
      if (res.code === 200) {
        wx.showToast({ title: '修改成功' });
        this.setData({ 'userInfo.nickname': this.data.tempNickname, showEditNicknameFlag: false });
      } else {
        wx.showToast({ title: res.msg || '修改失败', icon: 'none' });
      }
    } catch (err) {
      console.error('修改昵称失败:', err);
      wx.showToast({ title: '修改失败', icon: 'none' });
    }
  },

  showEditSignature() {
    this.setData({ showSettingMenuFlag: false, showEditSignatureFlag: true });
  },
  inputSignature(e: WechatMiniprogram.InputEvent) {
    this.setData({ tempSignature: e.detail.value });
  },
  async saveSignature() {
    try {
      const res = await updateUserInfo({ signature: this.data.tempSignature });
      if (res.code === 200) {
        wx.showToast({ title: '修改成功' });
        this.setData({ 'userInfo.signature': this.data.tempSignature, showEditSignatureFlag: false });
      } else {
        wx.showToast({ title: res.msg || '修改失败', icon: 'none' });
      }
    } catch (err) {
      console.error('修改签名失败:', err);
      wx.showToast({ title: '修改失败', icon: 'none' });
    }
  },

  showEditAvatar() {
    this.setData({ showSettingMenuFlag: false, showEditAvatarFlag: true });
  },
  chooseAvatar() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => { this.setData({ tempAvatar: res.tempFilePaths[0] }); },
      fail: (err) => {
        console.error('选择图片失败:', err);
        wx.showToast({ title: '选择图片失败', icon: 'none' });
      }
    });
  },
  async saveAvatar() {
    if (!this.data.tempAvatar) {
      wx.showToast({ title: '请先选择图片', icon: 'none' });
      return;
    }
    wx.showLoading({ title: '上传中...' });
    try {
      const res = await uploadAvatar(this.data.tempAvatar);
      if (res.code === 200 && res.data && res.data.url) {
        const newAvatarUrl = getFullAvatarUrl(res.data.url);
        const avatarWithTimestamp = `${newAvatarUrl}${newAvatarUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
        this.setData({ 'userInfo.avatar': avatarWithTimestamp, showEditAvatarFlag: false, tempAvatar: '' });
        wx.hideLoading();
        wx.showToast({ title: '头像更新成功' });
        wx.setStorageSync('avatar', newAvatarUrl);
        this.loadProfileData();
      } else {
        wx.showToast({ title: res.message || '上传失败', icon: 'none' });
      }
    } catch (err) {
      console.error('上传头像失败:', err);
      wx.showToast({ title: '上传失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  showChangePassword() {
    this.setData({ showSettingMenuFlag: false, showChangePasswordFlag: true });
  },

  inputOldPwd(e) { this.setData({ tempOldPwd: e.detail.value }); },
  inputNewPwd(e) { this.setData({ tempNewPwd: e.detail.value }); },
  inputConfirmPwd(e) { this.setData({ tempConfirmPwd: e.detail.value }); },

  async savePassword() {
    const { tempOldPwd, tempNewPwd, tempConfirmPwd } = this.data;
    if (!tempOldPwd || !tempNewPwd || !tempConfirmPwd) {
      wx.showToast({ title: '请填写完整', icon: 'none' });
      return;
    }
    if (tempNewPwd !== tempConfirmPwd) {
      wx.showToast({ title: '两次新密码不一致', icon: 'none' });
      return;
    }
    wx.showLoading({ title: '修改中...' });
    try {
      const res = await changePassword({ oldPassword: tempOldPwd, newPassword: tempNewPwd });
      if (res.code === 200) {
        wx.showToast({ title: res.message, icon: 'success' });
        wx.removeStorageSync('token');
        wx.reLaunch({ url: '/pages/login/login' });
      } else {
        wx.showToast({ title: res.message || '修改失败', icon: 'none' });
      }
    } catch (err) {
      console.error(err);
      wx.showToast({ title: '网络错误', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  }
});