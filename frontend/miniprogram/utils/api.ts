import { SERVER_HOST } from './config';
const BASE_URL = `${SERVER_HOST}/api`;

// 处理头像URL，拼接完整服务器地址
export function getFullAvatarUrl(avatarUrl: string): string {
  if (!avatarUrl) return '/images/default-avatar.png';
  // 默认头像是小程序本地资源，不需要拼接服务器地址
  if (avatarUrl === '/images/default-avatar.png' || avatarUrl === '/images/default-avatar.png') {
    return avatarUrl;
  }
  if (avatarUrl.startsWith('http')) return avatarUrl;
  return SERVER_HOST + avatarUrl;
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

// AI 智能客服聊天 (直接调用 Cloudflare Workers AI)
// 配置从本地存储读取，首次使用需在 app.js 中初始化（延迟读取，避免顶层调用 wx 导致测试环境报错）
let _CF_ACCOUNT_ID: string | undefined;
let _CF_API_TOKEN: string | undefined;
function getCFAccountId(): string {
  if (_CF_ACCOUNT_ID === undefined) _CF_ACCOUNT_ID = wx.getStorageSync('CF_ACCOUNT_ID') || '';
  return _CF_ACCOUNT_ID;
}
function getCFApiToken(): string {
  if (_CF_API_TOKEN === undefined) _CF_API_TOKEN = wx.getStorageSync('CF_API_TOKEN') || '';
  return _CF_API_TOKEN;
}

export function aiChat(message: string, history: any[] = []): Promise<{ code: number; data: { reply: string }; message?: string }> {
  return new Promise((resolve, reject) => {
    // 构建消息历史用于上下文
    let prompt = message;
    if (history.length > 0) {
      const recentHistory = history.slice(-6);
      prompt = recentHistory.map((h: any) => `${h.role === 'user' ? '用户' : '助手'}: ${h.content}`).join('\n') + `\n用户: ${message}`;
    }

    wx.request({
      url: `https://api.cloudflare.com/client/v4/accounts/${getCFAccountId()}/ai/run/@cf/meta/llama-3.1-8b-instruct`,
      method: 'POST',
      data: {
        prompt: `你是一个友善的校园互助平台智能助手。

关于平台功能：
- 发布任务：用户可以发布取件代送、跑腿代办、学习辅导、其他类型的互助任务
- 接取任务：用户可以浏览并接取其他用户发布的任务
- 任务状态：待接取 → 进行中 → 待确认 → 已完成
- 奖励机制：完成任务可获得金币奖励
- 信用评分：用户的信用评分会影响接单资格

请用友好、简洁的方式回答用户的问题。如果问题与平台无关，请礼貌引导用户咨询平台相关问题。

用户问题：${prompt}`
      },
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getCFApiToken()}`
      },
      success(res: any) {
        if (res.statusCode === 200 && res.data && res.data.success) {
          resolve({
            code: 200,
            data: {
              reply: res.data.result?.response || '抱歉，我暂时无法回答这个问题。'
            }
          });
        } else {
          console.error('Cloudflare AI 错误:', res.data);
          reject(new Error('AI 服务暂时不可用'));
        }
      },
      fail(err: any) {
        console.error('AI 请求失败:', err);
        reject(err);
      }
    });
  });
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
