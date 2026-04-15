import { getTaskList } from '../../api/task';

Page({
  data: {
    activeTab: 0,     // 0全部 1待接取 2进行中 3已完成
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
    const keyword = e.detail.value.trim();
    this.setData({ keyword });
    // 输入时启动防抖，500ms后执行搜索
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.refreshList(true);  // 传入true表示搜索模式，重置筛选
    }, 500);
  },

  onSearchConfirm() {
    console.log('回车搜索，keyword:', this.data.keyword);
    // 回车时立即执行搜索，清除防抖定时器
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.refreshList(true);  // 搜索模式下重置筛选
  },

  // 清空搜索
  clearSearch() {
    this.setData({ keyword: '' }, () => {
      this.refreshList(false);  // 恢复默认筛选
    });
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
    console.log('切换到 tab:', i);
    this.setData({ activeTab: i }, () => {
      console.log('activeTab 已设为:', this.data.activeTab);
      this.refreshList();
    });
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
  hideFilter() { 
    this.setData({ showFilter: false });
    // this.refreshList();
  },

  // 弹窗内类型点击
  popupChangeType(e: WechatMiniprogram.TouchEvent) {
    const type = Number(e.currentTarget.dataset.type || 0);
    // 先设置页面activeType、关弹窗，再刷新列表
    this.setData({ activeType: type}, () => {
      this.refreshList();
    });
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

  // 跳转到消息页面
  goToMessage() {
    wx.switchTab({ url: '/pages/message/message' });
  },

  // 核心：刷新任务列表（带所有筛选参数）
  refreshList(isSearch = false) {
    console.log('refreshList 调用，keyword:', this.data.keyword, 'isSearch:', isSearch);
    let { activeTab, activeType, limit, selectedFilter, keyword } = this.data;
    
    // 搜索模式下重置其他筛选条件为"全部"
    if (isSearch && keyword.trim()) {
      activeTab = 0;
      activeType = 0;
    }
    
    let status: number | undefined = undefined;
    if (activeTab === 1) status = 0;
    else if (activeTab === 2) status = 1;
    else if (activeTab === 3) status = 3;
    let type: number | undefined = activeType === 0 ? undefined : activeType;
    let sort = selectedFilter;
    let searchKeyword = keyword.trim() || undefined;

    console.log('请求参数:', { page: 1, limit, status, type, sort, keyword: searchKeyword });
    this.setData({ page: 1, loading: true });
    getTaskList({ page: 1, limit, status, type, sort, keyword: searchKeyword }).then(res => {
      console.log('API响应:', res);
      if (res.code === 0 && res.data) {
        this.setData({
          taskList: this._adaptTaskList(res.data.list),
          total: res.data.total,
          page: 1
        });
        if (res.data.list.length === 0) {
          wx.showToast({ title: "没有找到相关任务", icon: "none" });
        }
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
    console.log('=== loadMore 被调用 ===');
    console.log('当前状态: page =', this.data.page, 'total =', this.data.total, 'taskList长度 =', this.data.taskList.length, 'loading =', this.data.loading);
    
    if (this.data.taskList.length < this.data.total && !this.data.loading) {
      console.log('条件满足，准备加载下一页');
      const nextPage = this.data.page + 1;
      const { activeTab, activeType, limit, selectedFilter, keyword } = this.data;
      let status: number | undefined = undefined;
      if (activeTab === 1) status = 0;
      else if (activeTab === 2) status = 1;
      else if (activeTab === 3) status = 3;
      let type: number | undefined = activeType === 0 ? undefined : activeType;
      let sort = selectedFilter;

      //console.log('请求参数:', { page: nextPage, limit, status, type, sort, keyword });
      this.setData({ loading: true });
      getTaskList({ page: nextPage, limit, status, type, sort, keyword })
        .then(res => {
          console.log('loadMore 收到响应:', res);
          if (res.code === 0 && res.data) {
            const newTasks = this._adaptTaskList(res.data.list);
            console.log('新任务数量:', newTasks.length);
            this.setData({
              taskList: this.data.taskList.concat(newTasks),
              total: res.data.total,
              page: nextPage
            });
            console.log('拼接后 taskList 长度:', this.data.taskList.length);
          } else {
            console.warn('响应异常:', res);
          }
        })
        .catch(err => {
          console.error('loadMore 请求失败:', err);
        })
        .finally(() => {
          this.setData({ loading: false });
        });
    } else {
      console.log('条件不满足，跳过加载');
    }
  },

  // 字段适配
  _adaptTaskList(list: any[]) {
    return (list || []).map(item => ({
      id: item.taskId ,
      avatar: item.avatar || item.publisher?.avatar || '/images/default-avatar.png',
      nickname: item.nickname || item.publisher?.nickname || '匿名用户',
      credit: item.credit_score || item.publisher?.creditScore || '0',
      title: item.title,
      desc: item.description,
      tag: this._adaptTaskType(item.type),
      location: item.location,
      coin: item.reward,
      time: this._formatTime(item.createdAt, item.deadline),
      status: this._adaptStatus(item.status)
    }));
  },

  // 类型映射（与数据库保持一致：0全部 1取件代送 2跑腿代办 3学习辅导 4其他）
  _adaptTaskType(type: number) {
    const dict = ['全部','取件代送','跑腿代办','学习辅导','其他'];
    return dict[type] || '';
  },

  _adaptStatus(status: number) {
    const dict = ['待接取','进行中','待确认','已完成','已取消'];
    return dict[status] || '';
  },

  _formatTime(create: string, deadline: string) {
    if (deadline) return `截止 ${deadline.substring(0,16).replace('T',' ')}`;
    return create ? create.substring(0,16).replace('T',' ') : '';
  },

  onLoad() {
    this.refreshList();
    
  },

  onShow() {

    console.log('index onShow 触发')
    
    // 如果当前正在搜索中（keyword 不为空），不要清空搜索条件
    if (this.data.keyword && this.data.keyword.trim()) {
      console.log('搜索模式，跳过重置')
      return
    }
    
    this.setData({
      activeTab: 0,
      activeType: 0,
      keyword: '',
      selectedFilter: 'time'
    }, () => {
      this.refreshList()
    })
  },

  // 滚动到底部加载更多
  onScrollToLower() {
    console.log('滚动到底部了');
    if (this.data.taskList.length < this.data.total && !this.data.loading) {
      this.loadMore();
    }
  },

});