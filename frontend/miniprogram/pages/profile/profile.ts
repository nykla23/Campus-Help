// pages/profile/profile.ts

import {
  getUserProfile,
  getMyPublishTasks,
  getMyReceiveTasks,
  getMyTrades,
  updateUserInfo,
  uploadAvatar,
  changePassword,
  getFullAvatarUrl
} from '../../utils/api';

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

  // ========== 数据适配函数 ==========
  // 类型映射（数字 -> 中文）
  adaptTaskType(type: number): string {
    const dict = ['取件代送', '跑腿代办', '学习辅导', '其他'];
    return dict[type] || '其他';
  },

  // 状态映射（数字 -> 中文）
  adaptStatus(status: number): string {
    const dict = ['待接取', '进行中', '待确认', '已完成', '已取消'];
    return dict[status] || '未知';
  },

  // 时间格式化
  formatTime(create: string, deadline: string): string {
    if (deadline) return `截止 ${deadline.substring(0, 16).replace('T', ' ')}`;
    if (create) return create.substring(0, 16).replace('T', ' ');
    return '';
  },

  // 单个任务数据适配（后端字段 -> 前端卡片字段）
  adaptTaskItem(item: any): any {
    return {
      id: item.id,
      avatar: getFullAvatarUrl(item.avatar),
      nickname: item.nickname || '匿名用户',
      credit: item.credit_score || 0,
      status: this.adaptStatus(item.status),
      title: item.title,
      desc: item.description,           // 后端 description 映射到 desc
      tag: this.adaptTaskType(item.type),
      location: item.location,
      coin: item.reward,               // 后端 reward 映射到 coin
      time: this.formatTime(item.created_at, item.deadline)
    };
  },

  // 交易记录适配
  adaptTradeItem(item: any): any {
    // 假设后端返回的 type 是数字 1(收入) 或 2(支出)
    // 如果后端已经映射为字符串 'income'/'expense'，则直接使用 item.type
    let typeStr = '';
    if (typeof item.type === 'number') {
      typeStr = item.type === 1 ? 'income' : 'expense';
    } else {
      typeStr = item.type; // 已经是字符串
    }
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
        // 处理头像URL，拼接完整服务器地址
        userData.avatar = getFullAvatarUrl(userData.avatar);
        this.setData({
          userInfo: userData,
          stats: profileRes.data.stats
        });
      }

      // 2. 我发布的任务（适配后）
      const publishRes = await getMyPublishTasks();
      if (publishRes.code === 200) {
        const adapted = publishRes.data.map((item: any) => this.adaptTaskItem(item));
        this.setData({ publishList: adapted });
      }

      // 3. 我接单的任务（适配后）
      const acceptRes = await getMyReceiveTasks();
      if (acceptRes.code === 200) {
        const adapted = acceptRes.data.map((item: any) => this.adaptTaskItem(item));
        this.setData({ acceptList: adapted });
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

  // 跳转到设置页
  toSetting() {
    wx.navigateTo({ url: '/pages/setting/setting' });
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

  // ========== 新增：弹窗交互逻辑 ==========
  // 显示设置菜单
  showSettingMenu() {
    this.setData({
      showSettingMenuFlag: true
    });
  },
  // 隐藏设置菜单
  hideSettingMenu() {
    this.setData({
      showSettingMenuFlag: false
    });
  },
  // 隐藏所有弹窗
  hideAllPopups() {
    this.setData({
      showSettingMenuFlag: false,
      showEditNicknameFlag: false,
      showEditSignatureFlag: false,
      showEditAvatarFlag: false,
      showChangePasswordFlag: false,  
      // 可选：清空临时数据
      tempNickname: '',
      tempSignature: '',
      tempAvatar: '',
      tempOldPwd: '',
      tempNewPwd: '',
      tempConfirmPwd: ''
    });
  },

  // 显示修改昵称弹窗
  showEditNickname() {
    this.setData({
      showSettingMenuFlag: false, // 先隐藏菜单
      showEditNicknameFlag: true
    });
  },
  // 输入昵称
  inputNickname(e: WechatMiniprogram.InputEvent) {
    this.setData({
      tempNickname: e.detail.value
    });
  },
  // 保存昵称
  async saveNickname() {
    if (!this.data.tempNickname) {
      wx.showToast({ title: '昵称不能为空', icon: 'none' });
      return;
    }
    try {
      const res = await updateUserInfo({ nickname: this.data.tempNickname });
      if (res.code === 200) {
        wx.showToast({ title: '修改成功' });
        // 更新本地数据
        this.setData({
          'userInfo.nickname': this.data.tempNickname,
          showEditNicknameFlag: false
        });
      } else {
        wx.showToast({ title: res.msg || '修改失败', icon: 'none' });
      }
    } catch (err) {
      console.error('修改昵称失败:', err);
      wx.showToast({ title: '修改失败', icon: 'none' });
    }
  },

  // 显示修改签名弹窗
  showEditSignature() {
    this.setData({
      showSettingMenuFlag: false,
      showEditSignatureFlag: true
    });
  },
  // 输入签名
  inputSignature(e: WechatMiniprogram.InputEvent) {
    this.setData({
      tempSignature: e.detail.value
    });
  },
  // 保存签名
  async saveSignature() {
    try {
      const res = await updateUserInfo({ signature: this.data.tempSignature });
      if (res.code === 200) {
        wx.showToast({ title: '修改成功' });
        this.setData({
          'userInfo.signature': this.data.tempSignature,
          showEditSignatureFlag: false
        });
      } else {
        wx.showToast({ title: res.msg || '修改失败', icon: 'none' });
      }
    } catch (err) {
      console.error('修改签名失败:', err);
      wx.showToast({ title: '修改失败', icon: 'none' });
    }
  },

  // 显示修改头像弹窗
  showEditAvatar() {
    this.setData({
      showSettingMenuFlag: false,
      showEditAvatarFlag: true
    });
  },
  // 选择头像（仅预览，不上传）
  chooseAvatar() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.setData({ tempAvatar: res.tempFilePaths[0] });
      },
      fail: (err) => {
        console.error('选择图片失败:', err);
        wx.showToast({ title: '选择图片失败', icon: 'none' });
      }
    });
  },
  // 保存头像（上传）
  async saveAvatar() {
    if (!this.data.tempAvatar) {
      wx.showToast({ title: '请先选择图片', icon: 'none' });
      return;
    }
    wx.showLoading({ title: '上传中...' });
    try {
      const res = await uploadAvatar(this.data.tempAvatar);
      if (res.code === 200 && res.data && res.data.url) {
        // 处理头像URL，拼接完整服务器地址
        const newAvatarUrl = getFullAvatarUrl(res.data.url);
        // 强制添加时间戳避免缓存
        const avatarWithTimestamp = `${newAvatarUrl}${newAvatarUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
        
        this.setData({
          'userInfo.avatar': avatarWithTimestamp,
          showEditAvatarFlag: false,
          tempAvatar: ''
        });
        wx.showToast({ title: '头像更新成功' });
        // 更新本地存储
        wx.setStorageSync('avatar', avatarWithTimestamp);
        
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
    this.setData({
      showSettingMenuFlag: false,
      showChangePasswordFlag: true
    });
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
        // 清空 token 并跳转到登录页
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