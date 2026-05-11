const BASE_URL = 'http://10.234.51.12:3000/api';

// 处理头像URL，拼接完整服务器地址
const SERVER_BASE = 'http://10.234.51.12:3000';

/**
 * 获取头像的完整 URL
 * 对于网络图片（/uploads 开头），拼接服务器地址
 */
export function getFullAvatarUrl(avatarUrl: string): string {
  if (!avatarUrl) return '/images/default-avatar.png';
  if (avatarUrl === '/images/default-avatar.png') return avatarUrl;
  if (avatarUrl.startsWith('http') || avatarUrl.startsWith('wxfile://')) return avatarUrl;
  if (avatarUrl.startsWith('/images/')) return avatarUrl;
  if (avatarUrl.startsWith('/uploads')) {
    return SERVER_BASE + avatarUrl;
  }
  return SERVER_BASE + avatarUrl;
}

/**
 * 通过后端 API 获取头像 base64（解决小程序真机网络图片限制）
 * 使用缓存避免重复请求
 */
const avatarBase64Cache: Map<string, string> = new Map();
export function fetchAvatarBase64(userId: number | string): Promise<string> {
  const cacheKey = String(userId);
  if (avatarBase64Cache.has(cacheKey)) {
    return Promise.resolve(avatarBase64Cache.get(cacheKey)!);
  }
  return new Promise((resolve) => {
    wx.request({
      url: BASE_URL + '/user/avatar/' + cacheKey,
      method: 'GET',
      success: (res: any) => {
        if (res.statusCode === 200 && res.data && res.data.code === 200 && res.data.data && res.data.data.base64) {
          avatarBase64Cache.set(cacheKey, res.data.data.base64);
          resolve(res.data.data.base64);
        } else {
          resolve('/images/default-avatar.png');
        }
      },
      fail: () => {
        resolve('/images/default-avatar.png');
      }
    });
  });
}

/**
 * 将网络图片下载为本地临时路径（使用 downloadFile）
 * 也尝试通过 API 获取 base64
 */
export function downloadAvatar(avatarUrl: string): Promise<string> {
  const fullUrl = getFullAvatarUrl(avatarUrl);
  // 如果是本地图片路径，直接返回
  if (fullUrl.startsWith('/images/') || fullUrl.startsWith('wxfile://') || !fullUrl.startsWith('http')) {
    return Promise.resolve(fullUrl);
  }
  // 默认头像
  if (avatarUrl === '/images/default-avatar.png' || !avatarUrl) {
    return Promise.resolve('/images/default-avatar.png');
  }
  // 本地缓存
  if (avatarCache.has(fullUrl)) {
    return Promise.resolve(avatarCache.get(fullUrl)!);
  }
  // 通过 downloadFile 下载
  return new Promise((resolve) => {
    wx.downloadFile({
      url: fullUrl,
      success: (res) => {
        if (res.statusCode === 200 && res.tempFilePath) {
          avatarCache.set(fullUrl, res.tempFilePath);
          resolve(res.tempFilePath);
        } else {
          resolve('/images/default-avatar.png');
        }
      },
      fail: () => {
        resolve('/images/default-avatar.png');
      }
    });
  });
}

// 定义发布任务的请求参数类型


// 定义发布任务的响应类型
export interface PublishTaskResponse {
  taskId: string;
}

function getToken() {
  return wx.getStorageSync('token') || '';
}

interface ApiResponse<T = any> {
  code: number;
  data: T;
  message: string;
}

// 将对象转换为 query string，过滤无效值
function buildQueryString(params: any): string {
  const parts: string[] = [];
  for (const key in params) {
    const value = params[key];
    if (value !== undefined && value !== null && value !== '') {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
  }
  return parts.join('&');
}

export function request<T = any>(
  url: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  data?: any,
  options: { noAuth?: boolean } = {}
): Promise<ApiResponse<T>> {
  let fullUrl = BASE_URL + url;
  let requestData = data;

  if (method === 'GET' && data) {
    const query = buildQueryString(data);
    if (query) {
      fullUrl += (url.includes('?') ? '&' : '?') + query;
    }
    requestData = undefined; // GET 请求没有 body
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url: fullUrl,
      method,
      data: requestData,
      dataType: 'json',  // 明确告诉微信将响应解析为 JSON 对象
      header: {
        'Content-Type': 'application/json',
        ...(options.noAuth ? {} : { Authorization: "Bearer " + getToken() }),
      },
      success(res) {
        console.log('[api.ts] request success:', { statusCode: res.statusCode, data: res.data, typeOfData: typeof res.data });
        if (res.statusCode === 200 && typeof res.data === 'object') {
          resolve(res.data as ApiResponse<T>);
        } else {
          wx.showToast({ title: '服务器错误', icon: 'none' });
          reject(res.data);
        }
      },
      fail(err) {
        console.log('[api.ts] request fail:', err);
        wx.showToast({ title: '网络异常', icon: 'none' });
        reject(err);
      }
    });
  });
}

// 发布任务
export function publishTask(data: {
  type: number;
  title: string;
  description: string;
  reward: number;
  location?: string;
  deadline?: string;
}) {
  return request('/tasks', 'POST', data);
}

// 个人主页相关接口
export function getUserProfile() {
  return request('/user/profile', 'GET');
}

export function getMyPublishTasks() {
  return request('/user/tasks/publish', 'GET');
}

export function getMyReceiveTasks() {
  return request('/user/tasks/receive', 'GET');
}

export function getMyTrades() {
  return request('/user/trades', 'GET');
}

// 获取任务详情
export function getTaskDetail(taskId: string) {
  return request(`/tasks/${taskId}`, 'GET');
}

// 接单
export function acceptTask(taskId: string) {
  return request(`/tasks/${taskId}/accept`, 'POST');
}

// 取消任务（发布者）
export function cancelTask(taskId: string) {
  return request(`/tasks/${taskId}/cancel`, 'POST');
}

// 放弃任务（接单者）
export function giveUpTask(taskId: string) {
  return request(`/tasks/${taskId}/giveup`, 'POST');
}

// 接单者提交完成（状态 1→2）
export function completeTask(taskId: string) {
  return request(`/tasks/${taskId}/complete`, 'POST');
}

// 发布者确认完成（状态 2→3）
export function confirmCompleteTask(taskId: string) {
  return request(`/tasks/${taskId}/confirm`, 'POST');
}

// 消息列表
export function getMsgList() {
  return request('/messages/list', 'GET');
}

// 聊天记录
export function getChatDetail(taskId: string, targetId: string) {
  return request(`/messages/chat/${taskId}/${targetId}`, 'GET');
}

// 发送消息
export function sendMsgApi(data: { toId: string; taskId: string; content: string }) {
  return request('/messages/send', 'POST', data);
}

// 更新个人信息（需后端实现对应接口）
export function updateUserInfo(data: { nickname?: string; avatar?: string }) {
  return request('/user/update', 'POST', data);
}

export function changePassword(data: { oldPassword: string; newPassword: string }) {
  return request('/user/change-password', 'POST', data);
}

// 获取其他用户公开信息
export function getOtherUserInfo(userId: string) {
  return request(`/user/${userId}`, 'GET');
}

// 获取其他用户发布的任务列表
export function getUserPublishTasks(userId: string) {
  return request(`/user/${userId}/tasks`, 'GET');
}

// AI 智能客服聊天（通过后端代理，用户无需配置 API Key）
export function aiChat(message: string, history: any[] = []): Promise<{ code: number; data: { reply: string }; message?: string }> {
  return request('/ai/chat', 'POST', { message, history });
}

// 上传头像（需后端实现对应接口）
export function uploadAvatar(filePath: string): Promise<{ code: number; data: { url: string }; message: string }> {
  const token = getToken();
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: BASE_URL + '/user/upload-avatar',
      filePath: filePath,
      name: 'avatar',
      header: {
        'Authorization': `Bearer ${token}`
      },
      success(res) {
        try {
          const data = JSON.parse(res.data);
          resolve(data);
        } catch (e) {
          reject(e);
        }
      },
      fail(err) {
        reject(err);
      }
    });
  });
}
