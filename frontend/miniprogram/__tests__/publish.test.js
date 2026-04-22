/**
 * 发布任务页面组件测试
 */
jest.mock('../utils/api', () => ({
  publishTask: jest.fn(),
  getFullAvatarUrl: (url) => url || '/images/default-avatar.png'
}));
const { publishTask } = require('../utils/api');
require('../pages/publish/publish.ts');

describe('发布任务页面 Publish', () => {
  const page = global.getPageInstance();

  beforeEach(() => {
    jest.clearAllMocks();
    publishTask.mockImplementation(() => Promise.resolve({ code: 200, message: '发布成功' }));
    page.setData({
      activeType: 1, title: '', desc: '', coin: '', location: '',
      deadline: '', deadlineDate: '', deadlineTime: '', minDate: ''
    });
  });

  describe('组件渲染 / 交互', () => {

    test('初始 activeType 为 1', () => {
      expect(page.data.activeType).toBe(1);
    });

    test('onLoad 设置 minDate 为今天日期格式', () => {
      page.onLoad();
      const today = new Date();
      const expected = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      expect(page.data.minDate).toBe(expected);
    });

    test('changeType 切换 activeType', () => {
      page.changeType({ currentTarget: { dataset: { type: '3' } } });
      expect(page.data.activeType).toBe(3);
    });

    test('onInput 更新对应字段', () => {
      page.onInput({ currentTarget: { dataset: { name: 'title' } }, detail: { value: '帮我取快递' } });
      expect(page.data.title).toBe('帮我取快递');
    });

    test('updateDeadline 日期时间都有时拼接正确', () => {
      page.setData({ deadlineDate: '2025-06-01', deadlineTime: '14:30' });
      page.updateDeadline();
      expect(page.data.deadline).toBe('2025-06-01T14:30:00');
    });

    test('updateDeadline 缺少日期时不设置', () => {
      page.setData({ deadlineDate: '', deadlineTime: '14:30' });
      page.updateDeadline();
      expect(page.data.deadline).toBe('');
    });

    test('submitTask 标题为空提示错误', async () => {
      page.setData({ title: '', desc: '描述内容', coin: '5' });
      await page.submitTask();
      expect(wx.showToast).toHaveBeenCalledWith({ title: '请填写任务标题', icon: 'none' });
    });

    test('submitTask 描述为空提示错误', async () => {
      page.setData({ title: '标题', desc: '', coin: '5' });
      await page.submitTask();
      expect(wx.showToast).toHaveBeenCalledWith({ title: '请填写任务描述', icon: 'none' });
    });

    test('submitTask 奖励非数字提示错误', async () => {
      page.setData({ title: '标', desc: '描', coin: 'abc' });
      await page.submitTask();
      expect(wx.showToast).toHaveBeenCalledWith({ title: '请填写有效的奖励数量', icon: 'none' });
    });

    test('submitTask 奖励为0提示错误', async () => {
      page.setData({ title: '标', desc: '描', coin: '0' });
      await page.submitTask();
      expect(wx.showToast).toHaveBeenCalledWith({ title: '请填写有效的奖励数量', icon: 'none' });
    });

    test('submitTask 奖励为负数提示错误', async () => {
      page.setData({ title: '标', desc: '描', coin: '-5' });
      await page.submitTask();
      expect(wx.showToast).toHaveBeenCalledWith({ title: '请填写有效的奖励数量', icon: 'none' });
    });
  });

  describe('Mock API 测试', () => {

    test('发布成功 code=200 调用API并显示toast', async () => {
      publishTask.mockResolvedValueOnce({ code: 200, message: '发布成功' });
      page.setData({ title: '测试任务', desc: '测试描述', coin: '10', activeType: 2 });
      await page.submitTask();

      expect(publishTask).toHaveBeenCalledWith(
        expect.objectContaining({ type: 2, title: '测试任务', description: '测试描述', reward: 10 })
      );
      expect(wx.showToast).toHaveBeenCalledWith(expect.objectContaining({ title: expect.stringContaining('成功') }));
    });

    test('发布失败 显示失败消息', async () => {
      publishTask.mockResolvedValueOnce({ code: 500, message: '服务器内部错误' });
      page.setData({ title: '任务', desc: '描述', coin: '5', activeType: 1 });
      await page.submitTask();

      expect(wx.showToast).toHaveBeenCalled(); // 失败消息
    });

    test('发布网络异常 catch 显示重试提示', async () => {
      publishTask.mockRejectedValueOnce(new Error('timeout'));
      page.setData({ title: '任务', desc: '描述', coin: '5', activeType: 1 });
      await page.submitTask();

      expect(wx.showToast).toHaveBeenCalledWith({ title: '发布失败，请稍后重试', icon: 'none' });
    });
  });
});
