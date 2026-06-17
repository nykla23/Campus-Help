const BASE_URL = 'http://112.124.21.214:3000/api';

// 处理头像URL，拼接完整服务器地址
const SERVER_BASE = 'http://112.124.21.214:3000';

/**
 * 获取头像的完整 URL（用于 downloadFile 下载）
 * 仅作为内部辅助函数使用
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
 * 下载头像到本地临时路径
 * 
 * 由于PC端微信禁止<image>直接加载HTTP图片，
 * 本函数使用 wx.downloadFile 将网络图片下载到本地临时路径（wxfile://），
 * 该路径可直接用于 <image src>，不受HTTP限制。
 * 
 * 使用两级缓存：
 * 1. 内存缓存 — 避免重复下载
 * 2. Storage缓存 — 跨页面/跨生命周期复用
 * 
 * @param userId  用户ID（数字或字符串）
 * @param avatarUrl  数据库中的原始avatar字段值，用于获取下载URL
 * @returns  本地临时路径 或 默认头像路径
 */
const avatarCache: Map<string, string> = new Map();
const CACHE_PREFIX = 'avatar_tmp_';

/**
 * 通过后端 /api/user/avatar/:userId 获取 base64（备选方案）
 * 当 downloadFile 不可用时 fallback 使用
 * 
 * 但推荐使用 downloadAvatar 方案，因为 base64 太大容易超出 setData 限制
 */
const avatarBase64Cache: Map<string, string> = new Map();

export function fetchAvatarBase64(userId: number | string): Promise<string> {
  const cacheKey = String(userId);

  if (avatarBase64Cache.has(cacheKey)) {
    return Promise.resolve(avatarBase64Cache.get(cacheKey)!);
  }

  const stored = wx.getStorageSync('avatar_b64_' + cacheKey);
  if (stored) {
    avatarBase64Cache.set(cacheKey, stored);
    return Promise.resolve(stored);
  }

  return new Promise((resolve) => {
    wx.request({
      url: BASE_URL + '/user/avatar/' + cacheKey,
      method: 'GET',
      success: (res: any) => {
        if (res.statusCode === 200 && res.data && res.data.code === 200 && res.data.data && res.data.data.base64) {
          const b64 = res.data.data.base64;
          avatarBase64Cache.set(cacheKey, b64);
          try { wx.setStorageSync('avatar_b64_' + cacheKey, b64); } catch (_e) { /* 忽略 */ }
          resolve(b64);
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
 * 下载头像到本地临时文件（推荐方案，性能更好）
 * 
 * 先查内存缓存 → Storage缓存 → downloadFile下载 → 缓存
 * 
 * @param userId  用户ID
 * @param avatarUrl  原始avatar URL（用于拼接下载地址）
 * @returns  本地临时路径（wxfile://...）或 默认头像路径
 */
export async function downloadAvatar(userId: number | string, avatarUrl?: string): Promise<string> {
  const cacheKey = String(userId);

  // 1. 内存缓存
  if (avatarCache.has(cacheKey)) {
    return avatarCache.get(cacheKey)!;
  }

  // 2. Storage缓存
  const stored = wx.getStorageSync(CACHE_PREFIX + cacheKey);
  if (stored) {
    avatarCache.set(cacheKey, stored);
    return stored;
  }

  // 3. 如果没有提供 avatarUrl，通过 base64 接口获取（只能获得 base64，但作为兜底）
  if (!avatarUrl) {
    const b64 = await fetchAvatarBase64(userId);
    return b64;
  }

  // 4. 通过 downloadFile 下载
  const fullUrl = getFullAvatarUrl(avatarUrl);
  // 如果已经是本地路径或默认路径，直接返回
  if (fullUrl.startsWith('/images/') || fullUrl.startsWith('wxfile://') || !fullUrl.startsWith('http')) {
    if (fullUrl.startsWith('/images/')) {
      avatarCache.set(cacheKey, fullUrl);
      return fullUrl;
    }
    return fullUrl;
  }

  return new Promise((resolve) => {
    wx.downloadFile({
      url: fullUrl,
      success: (res) => {
        if (res.statusCode === 200 && res.tempFilePath) {
          avatarCache.set(cacheKey, res.tempFilePath);
          try { wx.setStorageSync(CACHE_PREFIX + cacheKey, res.tempFilePath); } catch (_e) { /* 忽略 */ }
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

/**
 * 批量预加载头像到本地临时文件
 */
export async function preloadAvatars(userIds: (string | number)[]): Promise<void> {
  const uniqueIds = [...new Set(userIds.map(String))];
  await Promise.allSettled(
    uniqueIds.map(id => downloadAvatar(id).catch(() => {}))
  );
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
      dataType: 'json',
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