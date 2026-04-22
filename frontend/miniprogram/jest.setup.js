// Jest 全局 Setup: 模拟微信小程序运行环境
let pageInstance = null;

global.wx = {
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
  redirectTo: jest.fn(),
  setNavigationBarTitle: jest.fn(),
  chooseImage: jest.fn(),
  uploadFile: jest.fn(),
  request: jest.fn()
};

global.Page = function(options) {
  const instance = {
    _data: Object.assign({}, options.data),
    _options: options,
    setData(newData, callback) {
      // 支持嵌套路径如 'userInfo.nickname'
      for (const key of Object.keys(newData)) {
        const value = newData[key];
        if (key.includes('.')) {
          const parts = key.split('.');
          let current = this._data;
          for (let i = 0; i < parts.length - 1; i++) {
            if (!current[parts[i]]) current[parts[i]] = {};
            current = current[parts[i]];
          }
          current[parts[parts.length - 1]] = value;
        } else {
          this._data[key] = value;
        }
      }
      if (callback) callback();
    },
    get data() { return this._data; }
  };
  for (const key of Object.keys(options)) {
    if (key !== 'data' && typeof options[key] === 'function') {
      instance[key] = options[key].bind(instance);
    } else if (key !== 'data') {
      instance[key] = options[key];
    }
  }
  pageInstance = instance;
  return instance;
};

global.getPageInstance = () => pageInstance;
global.resetPageInstance = () => { pageInstance = null; };
global.getCurrentPages = () => [{}, {}];
global.getApp = () => ({ globalData: { userId: 1 } });

beforeEach(() => {
  jest.clearAllMocks();
  global.resetPageInstance();
});
