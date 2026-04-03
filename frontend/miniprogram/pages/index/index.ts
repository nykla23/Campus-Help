import { getTaskList } from '../../api/task';

Page({
  data: {
    activeTab: 0,     // 0全部 1待接单 2进行中 3已完成
    activeType: 0,    // 页面当前类型（选中的）
    showFilter: false,
    popupActiveType: 0, // 弹窗内选择的类型
    showTypeBar: false, // 是否显示类型横条（在筛选弹窗打开时显示）
    selectedFilter: 'time',
    keyword: '',
    testKeyword: '',
    taskList: [],
    page: 1,
    limit: 10,
    total: 0,
    loading: false
  },
  searchTimer: null as any,

  testInput(e) {
  this.setData({ testKeyword: e.detail.value });
  console.log('输入了：', e.detail.value);
},

  onSearchInput(e: WechatMiniprogram.Input) {
    console.log('输入了:',e.detail.value);
    const keyword = e.detail.value;
    this.setData({ keyword });
    this.refreshList();
    // // 输入时启动防抖，500ms后执行搜索
    // if (this.searchTimer) clearTimeout(this.searchTimer);
    // this.searchTimer = setTimeout(() => {
    //   this.refreshList();
    // }, 500);
  },

  onSearchConfirm() {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.refreshList();
  },
  onSearchBlur() {
    setTimeout(() => {
      this.refreshList();
    }, 500);
  },

  // 点筛选按钮：出现/收起类型横条
  toggleTypeBar() {
    this.setData({ showTypeBar: !this.data.showTypeBar });
  },

  // 选类型+隐藏类型条+刷新
  chooseType(e) {
    const t = Number(e.currentTarget.dataset.type || 0);
    this.setData({ activeType: t}, this.refreshList);
  },

  // 切换标签
  changeTab(e) {
    const i = Number(e.currentTarget.dataset.index);
    this.setData({ activeTab: i }, this.refreshList);
  },

  // 类型筛选
  changeType(e: WechatMiniprogram.TouchEvent) {
    const type = Number(e.currentTarget.dataset.type || 0);
    this.setData({ activeType: type }, this.refreshList);
  },

  // 显示/隐藏筛选弹窗
  // 筛选按钮
  toggleFilter() {
    // 弹窗打开时，将弹窗选择项同步为当前页面类型
    this.setData({ showFilter: true, popupActiveType: this.data.activeType });
  },
  // 遮罩点击：关闭弹窗
  hideFilter() { this.setData({ showFilter: false });
    this.refreshList();
  },

  // 弹窗内类型点击
  popupChangeType(e: WechatMiniprogram.TouchEvent) {
    const type = Number(e.currentTarget.dataset.type || 0);
    // 先设置页面activeType、关弹窗，再刷新列表
    this.setData({ activeType: type});
  },

  // 筛选项点击
  onFilterOption(e: WechatMiniprogram.BaseEvent) {
    const value = e.currentTarget.dataset.value as string;
    this.setData({ selectedFilter: value});
  },

  // 跳转到任务详情
  toTaskDetail(e: WechatMiniprogram.TouchEvent) {
    const id = e.currentTarget.dataset.id as string;
    wx.navigateTo({ url: `/pages/task/task?id=${id}` });
  },

  // 核心：刷新任务列表（带所有筛选参数）
  refreshList() {
    console.log('当前 keyword:', this.data.keyword);
    const { activeTab, activeType, limit, selectedFilter, keyword } = this.data;
    let status: number | undefined = undefined;
    if (activeTab === 1) status = 0;
    else if (activeTab === 2) status = 1;
    else if (activeTab === 3) status = 3;
    let type: number | undefined = activeType === 0 ? undefined : activeType;
    let sort = selectedFilter;

    console.log('请求参数:', {page:1,limit, status, type, sort, keyword})
    this.setData({ page: 1, loading: true });
    getTaskList({ page: 1, limit, status, type, sort, keyword }).then(res => {
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

  // 加载更多（页码增加，带所有筛选）
  loadMore() {
    const nextPage = this.data.page + 1;
    const { activeTab, activeType, limit, selectedFilter, keyword } = this.data;
    let status: number | undefined = undefined;
    if (activeTab === 1) status = 0;
    else if (activeTab === 2) status = 1;
    else if (activeTab === 3) status = 3;
    let type: number | undefined = activeType === 0 ? undefined : activeType;
    let sort = selectedFilter;

    this.setData({ loading: true });
    getTaskList({ page: nextPage, limit, status, type, sort, keyword }).then(res => {
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

  // 字段适配
  _adaptTaskList(list: any[]) {
    return (list || []).map(item => ({
      id: item.taskId,
      avatar: item.publisher?.avatar || '/images/default-avatar.png',
      nickname: item.publisher?.nickname || '',
      credit: item.publisher?.creditScore || '',
      title: item.title,
      desc: item.description,
      tag: this._adaptTaskType(item.type),
      location: item.location,
      coin: item.reward,
      time: this._formatTime(item.createdAt, item.deadline),
      status: this._adaptStatus(item.status)
    }));
  },

  // 类型映射
  _adaptTaskType(type: number) {
    const dict = ['全部','取件代送','跑腿代办','学习辅导','其他'];
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