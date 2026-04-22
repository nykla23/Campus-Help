// 微信小程序全局类型声明（用于 Node/Jest 测试环境）

declare namespace WechatMiniprogram {
  interface InputEvent {
    currentTarget: {
      dataset: Record<string, string>;
    };
    detail: { value: string };
  }

  interface TouchEvent {
    currentTarget: {
      dataset: Record<string, string>;
    };
    detail?: any;
  }

  interface PickerChangeEvent {
    detail: { value: string };
  }
}

interface PageInstance<T = any> {
  data: T;
  setData(data: Partial<T>, callback?: () => void): void;
  [key: string]: any;
}

interface PageOptions {
  data?: any;
  [key: string]: any;
}

declare function Page(options: PageOptions): void;

declare const wx: {
  showToast(opts: { title: string; icon?: string; duration?: number }): void;
  showLoading(opts: { title: string; mask?: boolean }): void;
  hideLoading(): void;
  showModal(opts: { title: string; content: string; success: (res: { confirm: boolean }) => void }): void;
  setStorageSync(key: string, value: any): void;
  getStorageSync(key: string): any;
  removeStorageSync(key: string): void;
  navigateTo(opts: { url: string }): void;
  navigateBack(): void;
  switchTab(opts: { url: string }): void;
  reLaunch(opts: { url: string }): void;
  setNavigationBarTitle(opts: { title: string }): void;
  chooseImage(opts: { count: number; sizeType: string[]; sourceType: string[]; success: (res: any) => void; fail?: (err: any) => void }): void;
  uploadFile(opts: { url: string; filePath: string; name: string; header?: any; success: (res: any) => void; fail?: (err: any) => void }): void;
  request(opts: { url: string; method?: string; data?: any; header?: any; success: (res: any) => void; fail?: (err: any) => void }): void;
};

declare function getCurrentPages(): any[];

declare const getApp: () => any;
