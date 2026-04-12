const BASE_URL = 'http://localhost:3000/api';

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
export function getChatDetail(taskId, targetId) {
  return request(`/messages/chat/${taskId}/${targetId}`, 'GET');
}

// 发送消息
export function sendMsgApi(data) {
  return request('/messages/send', 'POST', data);
}