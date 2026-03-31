const BASE_URL = 'http://localhost:3000';

function getToken() {
  return wx.getStorageSync('token') || '';
}

interface ApiResponse<T = any> {
  code: number;
  data: T;
  message: string;
}

export function request<T = any>(
  url: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  data?: any,
  options: { noAuth?: boolean } = {}
): Promise<ApiResponse<T>> {
  return new Promise((resolve, reject) => {
    wx.request({
      url: BASE_URL + url,
      method,
      data: method === 'GET' ? undefined : data,
      header: {
        'Content-Type': 'application/json',
        ...(options.noAuth ? {} : { Authorization: "Bearer " + getToken() }),
      },
      success(res) {
        if (res.statusCode === 200 && typeof res.data === 'object') {
          resolve(res.data as ApiResponse<T>);
        } else {
          wx.showToast({ title: '服务器错误', icon: 'none' });
          reject(res.data);
        }
      },
      fail(err) {
        wx.showToast({ title: '网络异常', icon: 'none' });
        reject(err);
      }
    });
  });
}