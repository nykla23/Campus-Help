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
    // 任务列表
    publishList: [],
    acceptList: [],
    // 交易列表
    tradeList: []
  },

  onLoad() {
    this.loadProfileData();
  },

  onShow() {
    // 每次进入页面刷新数据
    this.loadProfileData();
  },

  // 加载个人主页所有数据
  async loadProfileData() {
    wx.showLoading({ title: '加载中...' });
    try {
      // 1. 加载个人信息+统计
      const profileRes = await getUserProfile();

      console.log('profileRes 完整数据:', JSON.stringify(profileRes));
      
      if (profileRes.code === 200) {
        console.log('user 对象:', profileRes.data.user);
        console.log('stats 对象:', profileRes.data.stats);
        this.setData({
          userInfo: profileRes.data.user,
          stats: profileRes.data.stats
        });

        console.log('赋值后的 userInfo:', this.data.userInfo);
        console.log('赋值后的 stats:', this.data.stats);

      }

      // 2. 加载我发布的任务
      const publishRes = await getMyPublishTasks();
      if (publishRes.code === 200) {
        this.setData({ publishList: publishRes.data });
      }

      // 3. 加载我接单的任务
      const acceptRes = await getMyReceiveTasks();
      if (acceptRes.code === 200) {
        this.setData({ acceptList: acceptRes.data });
      }

      // 4. 加载交易记录
      const tradeRes = await getMyTrades();
      if (tradeRes.code === 200) {
        this.setData({ tradeList: tradeRes.data });
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