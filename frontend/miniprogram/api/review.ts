import { request } from '../utils/api';

// 提交评价
export function submitReview(data: {
  taskId: number;
  toUserId: number;
  rating: number;
  comment: string;
}) {
  return request('/reviews', 'POST', data);
}

// 获取评价列表（收到的评价）
export function getReviews(params: { userId: number; page?: number; limit?: number }) {
  return request('/reviews', 'GET', params);
}