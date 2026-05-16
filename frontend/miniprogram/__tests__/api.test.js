/**
 * API 工具函数单元测试
 */

// Mock global wx before importing api
let mockRequestSuccess = null;
let mockRequestFail = false;
let mockUploadFileSuccess = null;
let mockUploadFileFail = false;

global.wx.request = jest.fn((opts) => {
  if (mockRequestFail) {
    opts.fail({ errMsg: 'request:fail net' });
  } else if (mockRequestSuccess !== null) {
    opts.success(mockRequestSuccess);
  }
});
global.wx.uploadFile = jest.fn((opts) => {
  if (mockUploadFileFail) {
    opts.fail({ errMsg: 'upload fail' });
  } else if (mockUploadFileSuccess !== null) {
    opts.success(mockUploadFileSuccess);
  }
});
global.wx.downloadFile = jest.fn();
global.wx.getStorageSync = jest.fn(() => 'mock-token');
global.wx.showToast = jest.fn();

const api = require('../utils/api');

describe('API 工具函数', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequestSuccess = null;
    mockRequestFail = false;
    mockUploadFileSuccess = null;
    mockUploadFileFail = false;
  });

  describe('getFullAvatarUrl', () => {

    test('空值应返回默认头像', () => {
      expect(api.getFullAvatarUrl('')).toBe('/images/default-avatar.png');
      expect(api.getFullAvatarUrl(null)).toBe('/images/default-avatar.png');
      expect(api.getFullAvatarUrl(undefined)).toBe('/images/default-avatar.png');
    });

    test('默认头像路径直接返回', () => {
      expect(api.getFullAvatarUrl('/images/default-avatar.png')).toBe('/images/default-avatar.png');
    });

    test('完整的http链接直接返回', () => {
      expect(api.getFullAvatarUrl('http://example.com/a.png')).toBe('http://example.com/a.png');
    });

    test('wxfile协议直接返回', () => {
      expect(api.getFullAvatarUrl('wxfile://tmp/abc.jpg')).toBe('wxfile://tmp/abc.jpg');
    });

    test('/images/路径直接返回', () => {
      expect(api.getFullAvatarUrl('/images/custom.png')).toBe('/images/custom.png');
    });

    test('/uploads路径拼接服务器地址', () => {
      const result = api.getFullAvatarUrl('/uploads/avatar.jpg');
      expect(result).toContain('http://');
      expect(result).toContain('/uploads/avatar.jpg');
    });

    test('其他相对路径拼接服务器地址', () => {
      const result = api.getFullAvatarUrl('/avatar/me.png');
      expect(result).toContain('/avatar/me.png');
    });
  });

  describe('fetchAvatarBase64', () => {

    test('请求成功返回base64', async () => {
      mockRequestSuccess = {
        statusCode: 200,
        data: { code: 200, data: { base64: 'data:image/png;base64,abc123' } }
      };
      const result = await api.fetchAvatarBase64(123);
      expect(result).toBe('data:image/png;base64,abc123');
    });

    test('请求失败返回默认头像', async () => {
      mockRequestSuccess = {
        statusCode: 200,
        data: { code: 500, message: 'error' }
      };
      const result = await api.fetchAvatarBase64(456);
      expect(result).toBe('/images/default-avatar.png');
    });

    test('网络异常返回默认头像', async () => {
      mockRequestFail = true;
      const result = await api.fetchAvatarBase64(789);
      expect(result).toBe('/images/default-avatar.png');
    });

    test('缓存机制相同userId应从缓存返回', async () => {
      mockRequestSuccess = {
        statusCode: 200,
        data: { code: 200, data: { base64: 'cached_data' } }
      };
      await api.fetchAvatarBase64(999);
      expect(wx.request).toHaveBeenCalledTimes(1);

      // 第二次调用应使用缓存，不请求
      await api.fetchAvatarBase64(999);
      expect(wx.request).toHaveBeenCalledTimes(1); // 未增加
    });
  });

  describe('request 通用请求', () => {

    test('GET请求拼接查询参数', async () => {
      mockRequestSuccess = { statusCode: 200, data: { code: 0, data: [] } };
      await api.request('/tasks', 'GET', { page: 1, limit: 10 });
      expect(wx.request).toHaveBeenCalled();
      const callUrl = wx.request.mock.calls[0][0].url;
      expect(callUrl).toContain('page=1');
      expect(callUrl).toContain('limit=10');
    });

    test('GET请求过滤无效参数', async () => {
      mockRequestSuccess = { statusCode: 200, data: { code: 0, data: [] } };
      await api.request('/tasks', 'GET', { page: 1, keyword: undefined, empty: '' });
      const callUrl = wx.request.mock.calls[0][0].url;
      expect(callUrl).toContain('page=1');
      expect(callUrl).not.toContain('keyword');
      expect(callUrl).not.toContain('empty');
    });

    test('POST请求传递body', async () => {
      mockRequestSuccess = { statusCode: 200, data: { code: 0 } };
      await api.request('/auth/login', 'POST', { username: 'admin', password: '123' });
      expect(wx.request.mock.calls[0][0].data).toEqual({ username: 'admin', password: '123' });
    });

    test('非200状态码reject', async () => {
      mockRequestSuccess = { statusCode: 500, data: { error: 'server error' } };
      await expect(api.request('/tasks')).rejects.toBeTruthy();
      expect(wx.showToast).toHaveBeenCalledWith({ title: '服务器错误', icon: 'none' });
    });

    test('网络异常reject', async () => {
      mockRequestFail = true;
      await expect(api.request('/tasks')).rejects.toBeTruthy();
      expect(wx.showToast).toHaveBeenCalledWith({ title: '网络异常', icon: 'none' });
    });

    test('noAuth选项不传Authorization', async () => {
      mockRequestSuccess = { statusCode: 200, data: { code: 0 } };
      await api.request('/public', 'GET', undefined, { noAuth: true });
      const headers = wx.request.mock.calls[0][0].header;
      expect(headers.Authorization).toBeUndefined();
    });

    test('默认带Authorization', async () => {
      mockRequestSuccess = { statusCode: 200, data: { code: 0 } };
      await api.request('/tasks');
      const headers = wx.request.mock.calls[0][0].header;
      expect(headers.Authorization).toBe('Bearer mock-token');
    });
  });

  describe('uploadAvatar', () => {

    test('上传成功解析返回数据', async () => {
      mockUploadFileSuccess = { data: JSON.stringify({ code: 200, data: { url: '/uploads/avatar.jpg' }, message: '成功' }) };
      const result = await api.uploadAvatar('temp/avatar.jpg');
      expect(result.code).toBe(200);
      expect(result.data.url).toBe('/uploads/avatar.jpg');
    });

    test('上传失败返回reject', async () => {
      mockUploadFileFail = true;
      await expect(api.uploadAvatar('temp/avatar.jpg')).rejects.toBeTruthy();
    });

    test('上传返回非JSON格式reject', async () => {
      mockUploadFileSuccess = { data: 'not-json' };
      await expect(api.uploadAvatar('temp/avatar.jpg')).rejects.toBeTruthy();
    });
  });
});