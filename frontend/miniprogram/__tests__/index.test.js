/**
 * 首页（任务列表页）测试
 */
jest.mock('../api/task', () => ({
  getTaskList: jest.fn()
}));
jest.mock('../utils/api', () => ({
  getFullAvatarUrl: (url) => url || '/images/default-avatar.png'
}));

const taskApi = require('../api/task');
require('../pages/index/index.ts');

describe('Index Page (任务列表)', () => {
  const page = global.getPageInstance();

  beforeEach(() => {
    taskApi.getTaskList.mockClear();
    wx.showToast.mockClear();
    wx.showLoading.mockClear();
    wx.hideLoading.mockClear();
    wx.navigateTo.mockClear();
    wx.switchTab.mockClear();
    taskApi.getTaskList.mockResolvedValue({ code: 0, data: { total: 0, list: [], page: 1, limit: 10 } });
  });

  describe('初始数据', () => {
    test('初始 activeTab 应为 0（全部）', () => {
      expect(page.data.activeTab).toBe(0);
    });
    test('初始 activeType 应为 0', () => {
      expect(page.data.activeType).toBe(0);
    });
    test('初始 showFilter 应为 false', () => {
      expect(page.data.showFilter).toBe(false);
    });
    test('初始 taskList 应为空数组', () => {
      expect(page.data.taskList).toEqual([]);
    });
  });

  describe('标签切换 changeTab', () => {
    test('切换到待接取标签（index=1）应设置 activeTab=1', async () => {
      page.changeTab({ currentTarget: { dataset: { index: 1 } } });
      await new Promise(r => setTimeout(r, 0));
      expect(page.data.activeTab).toBe(1);
    });
    test('切换到进行中标签（index=2）', async () => {
      page.changeTab({ currentTarget: { dataset: { index: 2 } } });
      await new Promise(r => setTimeout(r, 0));
      expect(page.data.activeTab).toBe(2);
    });
    test('切换到已完成标签（index=3）', async () => {
      page.changeTab({ currentTarget: { dataset: { index: 3 } } });
      await new Promise(r => setTimeout(r, 0));
      expect(page.data.activeTab).toBe(3);
    });
  });

  describe('类型筛选 chooseType / changeType', () => {
    test('chooseType 切换类型应更新 activeType', async () => {
      page.chooseType({ currentTarget: { dataset: { type: 2 } } });
      await new Promise(r => setTimeout(r, 0));
      expect(page.data.activeType).toBe(2);
    });
    test('changeType 切换类型应更新 activeType', async () => {
      page.changeType({ currentTarget: { dataset: { type: 3 } } });
      await new Promise(r => setTimeout(r, 0));
      expect(page.data.activeType).toBe(3);
    });
  });

  describe('筛选弹窗 toggleFilter / hideFilter', () => {
    test('toggleFilter 打开弹窗时应同步当前类型到 popupActiveType', () => {
      page.setData({ activeType: 2 });
      page.toggleFilter();
      expect(page.data.showFilter).toBe(true);
      expect(page.data.popupActiveType).toBe(2);
    });
    test('hideFilter 关闭弹窗', () => {
      page.setData({ showFilter: true });
      page.hideFilter();
      expect(page.data.showFilter).toBe(false);
    });
  });

  describe('搜索 onSearchInput / clearSearch', () => {
    test('onSearchInput 更新 keyword', () => {
      page.onSearchInput({ detail: { value: '快递' } });
      expect(page.data.keyword).toBe('快递');
    });
    test('clearSearch 清空关键词', async () => {
      page.setData({ keyword: 'test' });
      page.clearSearch();
      await new Promise(r => setTimeout(r, 0));
      expect(page.data.keyword).toBe('');
    });
  });

  describe('跳转 toTaskDetail / goToMessage / goToAI', () => {
    test('toTaskDetail 跳转到任务详情', () => {
      page.toTaskDetail({ currentTarget: { dataset: { id: '42' } } });
      expect(wx.navigateTo).toHaveBeenCalledWith(
        expect.objectContaining({ url: expect.stringContaining('/pages/task/task?id=42') })
      );
    });
    test('goToMessage 切换到消息 Tab', () => {
      page.goToMessage();
      expect(wx.switchTab).toHaveBeenCalledWith({ url: '/pages/message/message' });
    });
    test('goToAI 跳转到智能客服', () => {
      page.goToAI();
      expect(wx.navigateTo).toHaveBeenCalledWith({ url: '/pages/ai/ai' });
    });
  });

  // getTypeText 映射: ['', '全部', '取件代送', '跑腿代办', '学习辅导', '其他']
  describe('数据适配 _adaptTaskList', () => {
    test('_adaptTaskType 返回正确映射（基于 getTypeText）', () => {
      expect(page._adaptTaskType(1)).toBe('全部');     // type 1 = 全部
      expect(page._adaptTaskType(2)).toBe('取件代送');   // type 2
      expect(page._adaptTaskType(3)).toBe('跑腿代办');   // type 3
      expect(page._adaptTaskType(4)).toBe('学习辅导');   // type 4
      expect(page._adaptTaskType(5)).toBe('其他');       // type 5+
      expect(page._adaptTaskType(0)).toBe('');           // type 0 = 空
      expect(page._adaptTaskType(99)).toBe('');
    });

    // getStatusText 映射: {0:'待接取', 1:'进行中', 2:'待确认', 3:'已完成', 4:'已取消'}
    test('_adaptStatus 返回正确映射（基于 getStatusText）', () => {
      expect(page._adaptStatus(0)).toBe('待接取');
      expect(page._adaptStatus(1)).toBe('进行中');
      expect(page._adaptStatus(2)).toBe('待确认');
      expect(page._adaptStatus(3)).toBe('已完成');
      expect(page._adaptStatus(4)).toBe('已取消');
      expect(page._adaptStatus(99)).toBe('');
    });

    test('_formatTime 有截止时间优先返回截止时间', () => {
      const result = page._formatTime('2026-01-01T10:00:00', '2026-12-31T23:59:00');
      expect(result).toContain('截止');
      expect(result).toContain('2026-12-31 23:59');
    });
    test('_formatTime 无截止时间返回创建时间', () => {
      expect(page._formatTime('2026-04-27T10:30:00', '')).toBe('2026-04-27 10:30');
    });
    test('_formatTime 都为空返回空串', () => {
      expect(page._formatTime('', '')).toBe('');
    });

    test('_adaptTaskList 正确适配后端字段', () => {
      const rawItem = {
        taskId: 1, avatar: '/avatar.png', nickname: '张三', credit_score: 100,
        title: '代取快递', description: '帮忙取个快递', type: 2,
        location: '东门', reward: 5, createdAt: '2026-04-27T10:00:00', deadline: '', status: 0
      };
      const adapted = page._adaptTaskList([rawItem]);
      expect(adapted).toHaveLength(1);
      expect(adapted[0].id).toBe(1);
      expect(adapted[0].title).toBe('代取快递');
      expect(adapted[0].tag).toBe('取件代送');  // type 2 → 取件代送
      expect(adapted[0].status).toBe('待接取');  // status 0 → 待接取
      expect(adapted[0].coin).toBe(5);
      expect(adapted[0].nickname).toBe('张三');
    });
  });

  describe('API 调用 refreshList', () => {
    test('refreshList 成功时更新 taskList', async () => {
      const mockData = [
        { taskId: 1, title: '任务1', type: 2, status: 0, reward: 5,
          nickname: '用户A', credit_score: 90, description: '', location: '',
          createdAt: '2026-01-01T00:00:00', deadline: '' }
      ];
      taskApi.getTaskList.mockResolvedValueOnce({
        code: 0, data: { total: 1, list: mockData, page: 1, limit: 10 }
      });
      await page.refreshList();
      expect(taskApi.getTaskList).toHaveBeenCalled();
      expect(page.data.taskList.length).toBe(1);
      expect(page.data.total).toBe(1);
    });

    test('refreshList 失败显示错误 toast', async () => {
      taskApi.getTaskList.mockResolvedValueOnce({ code: 500, message: '服务器错误' });
      await page.refreshList();
      expect(wx.showToast).toHaveBeenCalled();
    });

    test('refreshList 网络异常显示网络异常 toast', async () => {
      taskApi.getTaskList.mockRejectedValueOnce(new Error('network error'));
      await page.refreshList();
      // refreshList 内部 .catch() 调用 showToast，等待微任务
      await new Promise(r => setTimeout(r, 0));
      expect(wx.showToast).toHaveBeenCalledWith({ title: '网络异常', icon: 'none' });
    });
  });

  describe('加载更多 loadMore', () => {
    test('loadMore 条件满足时应加载下一页', async () => {
      page.setData({ taskList: [{ id: 1 }], total: 5, loading: false, page: 1 });
      const mockData = [
        { taskId: 2, title: '任务2', type: 2, status: 1, reward: 3,
          nickname: '用户B', credit_score: 80, description: '', location: '',
          createdAt: '2026-02-01T00:00:00', deadline: '' }
      ];
      taskApi.getTaskList.mockResolvedValueOnce({
        code: 0, data: { total: 5, list: mockData, page: 2, limit: 10 }
      });
      await page.loadMore();
      await new Promise(r => setTimeout(r, 0));
      expect(page.data.page).toBe(2);
      expect(page.data.taskList.length).toBe(2);
    });

    test('loadMore 已全部加载完毕时不请求', async () => {
      page.setData({ taskList: [{ id: 1 }, { id: 2 }], total: 2, loading: false, page: 1 });
      page.loadMore();
      await new Promise(r => setTimeout(r, 0));
      expect(taskApi.getTaskList).not.toHaveBeenCalled();
    });

    test('loadMore 正在加载中不重复请求', async () => {
      page.setData({ taskList: [{ id: 1 }], total: 5, loading: true, page: 1 });
      page.loadMore();
      await new Promise(r => setTimeout(r, 0));
      expect(taskApi.getTaskList).not.toHaveBeenCalled();
    });
  });

  describe('生命周期 onShow / onPullDownRefresh', () => {
    test('onShow 有搜索关键词时跳过重置', async () => {
      page.setData({ keyword: '搜索词', activeTab: 2, activeType: 3 });
      page.onShow();
      await new Promise(r => setTimeout(r, 0));
      expect(page.data.activeTab).toBe(2);
      expect(page.data.activeType).toBe(3);
    });

    test('onShow 无搜索关键词时重置筛选条件并刷新', async () => {
      page.setData({ keyword: '', activeTab: 2, activeType: 3, selectedFilter: 'credit' });
      page.onShow();
      await new Promise(r => setTimeout(r, 0));
      expect(page.data.activeTab).toBe(0);
      expect(page.data.activeType).toBe(0);
      expect(page.data.selectedFilter).toBe('time');
    });

    test('onPullDownRefresh 应重置页码并刷新', async () => {
      page.setData({ page: 3, total: 30 });
      taskApi.getTaskList.mockResolvedValueOnce({
        code: 0, data: { total: 0, list: [], page: 1, limit: 10 }
      });
      await page.onPullDownRefresh();
      await new Promise(r => setTimeout(r, 0));
      expect(page.data.page).toBe(1);
      expect(wx.stopPullDownRefresh).toHaveBeenCalled();
    });
  });

  describe('类型横条与弹窗', () => {
    test('toggleTypeBar 切换显示状态', () => {
      page.toggleTypeBar();
      expect(page.data.showTypeBar).toBe(true);
      page.toggleTypeBar();
      expect(page.data.showTypeBar).toBe(false);
    });

    test('popupChangeType 更新类型并刷新', async () => {
      page.setData({ showFilter: true, activeType: 0 });
      page.popupChangeType({ currentTarget: { dataset: { type: 3 } } });
      await new Promise(r => setTimeout(r, 0));
      expect(page.data.activeType).toBe(3);
    });

    test('onFilterOption 更新排序方式', () => {
      page.onFilterOption({ currentTarget: { dataset: { value: 'credit' } } });
      expect(page.data.selectedFilter).toBe('credit');
    });
  });
});
