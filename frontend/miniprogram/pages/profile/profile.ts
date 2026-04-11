// pages/profile/profile.ts

import {
  getUserProfile,
  getMyPublishTasks,
  getMyReceiveTasks,
  getMyTrades
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
    tradeList: []
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
    const dict = ['待接单', '进行中', '待确认', '已完成', '已取消'];
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
      avatar: item.avatar || '/images/default-avatar.png',
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
    return {
      id: item.id,
      title: item.description || '交易',
      time: item.created_at ? item.created_at.substring(0, 16).replace('T', ' ') : '',
      type: item.amount > 0 ? 'income' : 'expense',   // 正数收入，负数支出
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
        this.setData({
          userInfo: profileRes.data.user,
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
    wx.navigateTo({ url: `/pages/taskDetail/taskDetail?id=${id}` });
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
  }
});