// Jest 全局 Setup: 模拟微信小程序运行环境
let pageInstance: any = null;

// 模拟 wx 对象
(global as any).wx = {
  showToast: jest.fn(),
  showLoading: jest.fn(),
  hideLoading: jest.fn(),
  showModal: jest.fn(),
  setStorageSync: jest.fn(),
  getStorageSync: jest.fn(() => ''),
  removeStorageSync: jest.fn(),
  navigateTo: jest.fn(),
  navigateBack: jest.fn(),
  switchTab: jest.fn(),
  reLaunch: jest.fn(),
  setNavigationBarTitle: jest.fn(),
  chooseImage: jest.fn(),
  uploadFile: jest.fn(),
  request: jest.fn(),
};

// 模拟 Page 构造器：保存实例供测试使用
(global as any).Page = function(options: any) {
  // 创建一个带 setData 能力的对象
  const instance: any = {
    _data: { ...options.data },
    _options: options,
    setData(newData: any, callback?: () => void) {
      Object.assign(this._data, newData);
      if (callback) callback();
    },
    get data() {
      return this._data;
    }
  };

  // 挂载所有方法
  for (const key of Object.keys(options)) {
    if (key !== 'data') {
      instance[key] = options[key].bind(instance);
    }
  }

  pageInstance = instance;
  return instance;
};

// 辅助函数：获取最近创建的 Page 实例
(global as any).getPageInstance = () => pageInstance;

// 辅助函数：重置 pageInstance
(global as any).resetPageInstance = () => { pageInstance = null; };

// 模拟 getCurrentPages
(global as any).getCurrentPages = () => [{}, {}]; // 默认有上一页

// 模拟 getApp
(global as any).getApp = () => ({ globalData: { userId: 1 } });

beforeEach(() => {
  // 每个 test 前清空所有 mock 调用记录
  jest.clearAllMocks();
  (global as any).resetPageInstance();
});
