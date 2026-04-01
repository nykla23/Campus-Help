import { getTaskList } from '../../api/task';

Page({
  data: {
    activeTab: 0,
    taskList: [],
    page: 1,
    limit: 10,
    total: 0,
    loading: false
  },

  // 顶部tab切换、触发不同状态筛选
  changeTab(e: WechatMiniprogram.TouchEvent) {
    const index = parseInt(e.currentTarget.dataset.index as string);
    this.setData({ activeTab: index }, () => {
      this.refreshList();
    });
  },

  // 筛选按钮
  showFilter() {
    wx.showToast({ title: "筛选功能开发中", icon: "none" });
  },

  // 跳转到任务详情
  toTaskDetail(e: WechatMiniprogram.TouchEvent) {
    const id = e.currentTarget.dataset.id as string;
    wx.navigateTo({ url: `/pages/task/task?id=${id}` });
  },

  // 获取任务列表
  refreshList() {
    this.setData({ loading: true });
    // 根据 tab 类型筛选 status 参数
    let status = undefined;
    if (this.data.activeTab === 1) status = 0;      // 待接单
    else if (this.data.activeTab === 2) status = 1; // 进行中
    else if (this.data.activeTab === 3) status = 3; // 已完成

    getTaskList({ page: 1, limit: this.data.limit, status })
      .then(res => {
        if (res.code === 0 && res.data) {
          this.setData({
            taskList: this._adaptTaskList(res.data.list),
            total: res.data.total,
            page: 1
          });
        } else {
          wx.showToast({ title: res.message, icon: 'none' });
        }
      }).catch(() => {
        wx.showToast({ title: "网络异常", icon: "none" });
      }).finally(() => {
        this.setData({ loading: false });
      });
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.setData({ page: 1 }, () => {
      this.refreshList();
      wx.stopPullDownRefresh();
    });
  },

  // 上拉加载更多
  onReachBottom() {
    if (this.data.taskList.length < this.data.total && !this.data.loading) {
      this.loadMore();
    }
  },

  loadMore() {
    const nextPage = this.data.page + 1;
    let status = undefined;
    if (this.data.activeTab === 1) status = 0;
    else if (this.data.activeTab === 2) status = 1;
    else if (this.data.activeTab === 3) status = 3;

    this.setData({ loading: true });
    getTaskList({ page: nextPage, limit: this.data.limit, status })
      .then(res => {
        if (res.code === 0 && res.data) {
          this.setData({
            taskList: this.data.taskList.concat(this._adaptTaskList(res.data.list)),
            total: res.data.total,
            page: nextPage
          });
        }
      }).finally(() => {
        this.setData({ loading: false });
      });
  },

  // 关键字段适配，将后端API返回list转前端渲染格式
  _adaptTaskList(list: any[]) {
    return (list || []).map(item => ({
      id: item.taskId,
      avatar: item.publisher?.avatar || '/images/default-avatar.png',
      nickname: item.publisher?.nickname || '',
      credit: item.publisher?.creditScore || '',
      title: item.title,
      desc: item.description,
      tag: this._adaptTaskType(item.type), // 任务类型标签
      location: item.location,
      coin: item.reward,
      time: this._formatTime(item.createdAt, item.deadline),
      status: this._adaptStatus(item.status)
    }));
  },

  // 类型映射
  _adaptTaskType(type: number) {
    const dict = ['全部','快递代取','跑腿代办','学习辅导','其他'];
    return dict[type] || '';
  },

  _adaptStatus(status: number) {
    const dict = ['待接单','进行中','待确认','已完成','已取消'];
    return dict[status] || '';
  },

  _formatTime(create: string, deadline: string) {
    if (deadline) return `截止 ${deadline.substring(0,16).replace('T',' ')}`;
    return create ? create.substring(0,16).replace('T',' ') : '';
  },

  onLoad() {
    this.refreshList();
  }
});