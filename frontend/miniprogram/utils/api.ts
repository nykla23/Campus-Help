const BASE_URL = 'http://127.0.0.1:3000/api';

// 处理头像URL，拼接完整服务器地址
export function getFullAvatarUrl(avatarUrl: string): string {
  if (!avatarUrl) return '/images/default-avatar.png';
  // 默认头像是小程序本地资源，不需要拼接服务器地址
  if (avatarUrl === '/images/default-avatar.png' || avatarUrl === '/images/default-avatar.png') {
    return avatarUrl;
  }
  if (avatarUrl.startsWith('http')) return avatarUrl;
  return 'http://127.0.0.1:3000' + avatarUrl;
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

// AI 智能客服聊天（通过后端代理，用户无需配置 API Key）
export function aiChat(message: string, history: any[] = []): Promise<{ code: number; data: { reply: string }; message?: string }> {
  return request('/ai/chat', 'POST', { message, history }, { noAuth: true });
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
