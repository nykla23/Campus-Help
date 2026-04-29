/**
 * 前端共享工具函数
 * - 时间格式化（统一各页面的时间显示逻辑）
 * - 状态/类型映射（统一前后端一致）
 */

// ========== 任务状态映射（与后端 constants.js STATUS_MAP 完全一致：0待接取 1进行中 2待确认 3已完成 4已取消）==========
export function getStatusText(status: number): string {
  const map: Record<number, string> = {
    0: '待接取',
    1: '进行中',
    2: '待确认',
    3: '已完成',
    4: '已取消'
  };
  return map[status] || '';
}

// ========== 任务类型映射（与后端 constants.js TYPE_MAP 一致）==========
export function getTypeText(type: number): string {
  const map = ['', '取件代送', '跑腿代办', '学习辅导', '其他'];
  return map[type] || '';
}

// 类型映射（用于个人主页等不含"全部"的场景，type 从 1 开始）
export function getTypeTextNoAll(type: number): string {
  const map = ['', '取件代送', '跑腿代办', '学习辅导', '其他'];
  return map[type] || '其他';
}

// ========== 时间格式化 ==========

/** 列表页卡片时间：优先显示截止时间，否则显示创建时间 */
export function formatListTime(create: string, deadline: string): string {
  if (deadline) return `截止 ${deadline.substring(0, 16).replace('T', ' ')}`;
  if (create) return create.substring(0, 16).replace('T', ' ', );
  return '';
}

/** 聊天气泡时间短格式：HH:mm */
export function formatChatTimeShort(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

/** 聊天分割线时间：今天 / 昨天 / 前天 / M/D */
export function formatChatTimeDivider(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((today.getTime() - msgDate.getTime()) / (24 * 3600 * 1000));
  if (diffDays === 0) return '今天';
  if (diffDays === 1) return '昨天';
  if (diffDays === 2) return '前天';
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

/** 消息列表时间：HH:mm / 昨天 / M/D （与后端 message.js formatTime 保持一致）*/
export function formatMsgListTime(timeStr: string): string {
  if (!timeStr) return '';
  const date = new Date(timeStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((today - msgDate) / (24 * 3600 * 1000));
  if (diffDays === 0) {
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  } else if (diffDays === 1) {
    return '昨天';
  } else {
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }
}
